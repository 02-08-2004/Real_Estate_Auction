// src/components/ParticipateAuctionModal.jsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import Tesseract from "tesseract.js";
import { propertyService } from "../services/propertyService";

export default function ParticipateAuctionModal({ property, onClose, onRegisterSuccess }) {
  const { currentUser } = useAuth();
  const [address, setAddress] = useState("");
  const [fullName, setFullName] = useState(currentUser?.displayName || "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [aadharNumber, setAadharNumber] = useState("");
  const [idFile, setIdFile] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const [step, setStep] = useState(1);
  const [verificationStatus, setVerificationStatus] = useState(null); // 'idle', 'scanning', 'failed', 'passed'
  const [verificationError, setVerificationError] = useState("");
  const [detectedNumbers, setDetectedNumbers] = useState([]);
  const errorRef = useRef(null);

  useEffect(() => {
    if (error || verificationError) {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error, verificationError]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!address.trim()) return setError("Please enter your current address.");
    if (!/^\d{12}$/.test(aadharNumber.replace(/\s+/g,''))) return setError("Please enter a valid 12-digit Aadhar number.");
    if (!idFile) return setError("Please upload your Aadhar Card document.");
    if (!agreed) return setError("You must agree to the auction terms.");

    setLoading(true);
    try {
      setUploadText("Step 1/2 — Processing document...");

      // Compress image to a tiny base64 thumbnail (stored in Firestore, not Storage)
      // Max 400px wide, quality 0.3 → typically 20-80KB as base64 string
      const thumbnailBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_W = 400;
            const scale = Math.min(1, MAX_W / img.width);
            canvas.width  = img.width  * scale;
            canvas.height = img.height * scale;
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.3));
          };
          img.onerror = () => reject(new Error("Could not read image file."));
          img.src = ev.target.result;
        };
        reader.onerror = () => reject(new Error("File read failed. Please re-select the file."));
        reader.readAsDataURL(idFile);
      });

      setUploadText("Step 2/2 — Registering your profile...");

      // Store thumbnail + bidder info in a single Firestore write
      // (registeredBidders subcollection — user has write access here)
      const bidderRef = doc(db, "properties", property.id, "registeredBidders", currentUser.uid);
      await setDoc(bidderRef, {
        registeredAt: serverTimestamp(),
        fullName,
        phoneNumber,
        address,
        aadharNumber: aadharNumber.replace(/\s+/g, ''),
        idProofThumbnail: thumbnailBase64,  // ~20-60KB base64, well under 1MB limit
        agreedToTerms: true,
        verificationStatus: "pending",
      });

      // Increment registeredCount on the property
      await propertyService.incrementBidderCount(property.id);

      onRegisterSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setUploadText("");
    }
  }

  const handleNext = async () => {
    if (step === 1) {
      if (!fullName.trim()) return setError("Please enter your full name.");
      if (!phoneVerified) return setError("Please verify your phone number via OTP.");
      if (!address.trim()) return setError("Please enter your current address.");
      setError("");
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!/^\d{12}$/.test(aadharNumber.replace(/\s+/g,''))) return setError("Enter a valid 12-digit Aadhar number.");
      if (!idFile) return setError("Please upload your Aadhar Card document.");
      
      setLoading(true);
      setVerificationStatus('scanning');
      setError("");

      try {
        setUploadText("AI Scanner: Extracting Text...");
        const { data: { text } } = await Tesseract.recognize(idFile, 'eng');
        const inputDigits = aadharNumber.replace(/\D/g, '');
        
        const twelveDigitRegex = /(\d{4}[\s-]?\d{4}[\s-]?\d{4})|(\d{12})/g;
        const matches = text.match(twelveDigitRegex) || [];
        const normalizedMatches = matches.map(m => m.replace(/\D/g, ''));
        setDetectedNumbers(normalizedMatches);

        setUploadText("AI Scanner: Matching...");

        if (!normalizedMatches.includes(inputDigits)) {
          setVerificationStatus('failed');
          setVerificationError("The Aadhar document you uploaded does not match the number you entered.");
          throw new Error("Aadhar Mismatch Detected");
        }

        setUploadText("Final Security Clearance...");
        const bidderQuery = query(
          collection(db, "properties", property.id, "registeredBidders"),
          where("aadharNumber", "==", inputDigits)
        );
        const querySnapshot = await getDocs(bidderQuery);
        const isDuplicate = querySnapshot.docs.some(doc => doc.id !== currentUser.uid);
        
        if (isDuplicate) {
           setVerificationStatus('failed');
           setVerificationError("Identity Conflict: This Aadhar is already registered by another account for this auction.");
           throw new Error("Duplicate Identity Detected");
        }

        setVerificationStatus('passed');
        setUploadText("Verified ✓");
        await new Promise(r => setTimeout(r, 500));
        setStep(3);
      } catch (err) {
        if (verificationStatus !== 'failed') setError(err.message);
      } finally {
        setLoading(false);
        if (verificationStatus !== 'failed') setUploadText("");
      }
    }
  }

  const inputStyle = {
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#fff",
    fontSize: 14,
    fontFamily: "var(--font-body)",
    outline: "none",
    marginTop: 6,
    backdropFilter: "blur(10px)",
    transition: "border-color 0.2s ease",
  };

  const handleSendOtp = () => {
    if (phoneNumber.length < 10) return setError("Enter a valid phone number");
    setOtpSent(true);
    setError("");
    // Simulate sending OTP
    setTimeout(() => alert("Simulation OTP: Your code is 1234"), 500);
  };

  const handleVerifyOtp = () => {
    if (otp === "1234") {
      setPhoneVerified(true);
      setError("");
    } else {
      setError("Invalid OTP. Try 1234.");
    }
  };

  return createPortal(
    <div className="modal-overlay" style={{ 
        position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", 
        background: "#050505", color: "#fff", zIndex: 100000, 
        display: "flex", overflow: "hidden", animation: "modalFadeIn 0.4s ease"
    }}>
      
      {/* Left Panel: Property Context (Full Details) */}
      <div style={{ 
          width: "34%", maxWidth: 420, height: "100%", background: "rgba(255,255,255,0.015)", 
          borderRight: "1px solid rgba(255,255,255,0.08)", position: "relative",
          display: "flex", flexDirection: "column"
      }}>
        <div style={{ flex: 1, padding: "2rem 2.25rem", display: "flex", flexDirection: "column" }}>
            <button onClick={onClose} style={{ 
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", 
                cursor: "pointer", fontSize: 12, fontWeight: 600, borderRadius: 8,
                display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", marginBottom: 24,
                alignSelf: "flex-start", transition: "all 0.2s ease"
            }}>
                ← Exit Registration
            </button>

            <div style={{ width: "100%", aspectRatio: "16/10", borderRadius: 14, overflow: "hidden", marginBottom: 20, border: "1px solid rgba(255,255,255,0.08)" }}>
                <img src={property.imageUrls?.[0]} alt={property.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>

            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, marginBottom: 6, lineHeight: 1.2 }}>{property.title}</h1>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
                📍 {property.location}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: "auto" }}>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>Current Bid</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>₹{property.currentBid.toLocaleString()}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>Verification</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "var(--red)" }}>Step {step} of 3</div>
                </div>
            </div>
        </div>
      </div>

      {/* Right Panel: The Verification Wizard */}
      <div style={{ flex: 1, height: "100%", overflowY: "auto", position: "relative", backgroundColor: "#080808", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 540, margin: "0 auto", padding: "2.5rem 2rem" }}>
              
              {/* Progress Header */}
              <div style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--red)", letterSpacing: 1.5 }}>KYC VERIFICATION • STEP {step} OF 3</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{Math.round((step/3)*100)}% COMPLETE</span>
                  </div>
                  <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                      <div style={{ width: `${(step/3)*100}%`, height: "100%", background: "var(--red)", borderRadius: 2, transition: "width 0.35s ease" }}></div>
                  </div>
              </div>

              {error && <div ref={errorRef} className="msg-error" style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 10, fontSize: 13 }}>{error}</div>}

              {/* Step Content Card */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "24px 26px" }}>
                  {step === 1 && (
                      <div className="fade-in">
                          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, marginBottom: 6 }}>Personal Verification</h2>
                          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 22, fontSize: 13, lineHeight: 1.5 }}>Provide your official details to register as a verified bidder for this property.</p>
                          
                          <div style={{ marginBottom: 16 }}>
                              <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>Legal Full Name</label>
                              <input 
                                  style={inputStyle} 
                                  placeholder="e.g., Jane Doe" 
                                  value={fullName} 
                                  onChange={e => setFullName(e.target.value)} 
                              />
                          </div>

                          <div style={{ marginBottom: 16 }}>
                              <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>Phone Number</label>
                              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <input 
                                    style={{ ...inputStyle, flex: 1 }} 
                                    placeholder="Enter 10-digit mobile number" 
                                    value={phoneNumber} 
                                    onChange={e => setPhoneNumber(e.target.value)}
                                    disabled={phoneVerified || otpSent}
                                />
                                {!phoneVerified && !otpSent && (
                                  <button type="button" onClick={handleSendOtp} style={{ background: "var(--primary)", border: "none", color: "#fff", padding: "11px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 6, whiteSpace: "nowrap" }}>Send OTP</button>
                                )}
                              </div>
                          </div>

                          {otpSent && !phoneVerified && (
                            <div style={{ marginBottom: 16, padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", textTransform: "uppercase", letterSpacing: 1 }}>Enter 4-Digit OTP</label>
                                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                  <input 
                                      style={{ ...inputStyle, flex: 1, letterSpacing: 4 }} 
                                      placeholder="1234" 
                                      value={otp} 
                                      onChange={e => setOtp(e.target.value)}
                                      maxLength={4}
                                  />
                                  <button type="button" onClick={handleVerifyOtp} style={{ background: "#4ade80", border: "none", color: "#111", padding: "11px 18px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 6 }}>Verify</button>
                                </div>
                            </div>
                          )}

                          {phoneVerified && (
                             <div style={{ marginBottom: 16, color: "#4ade80", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                                <span>✓</span> Phone Number Verified
                             </div>
                          )}

                          <div>
                              <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>Full Residential Address</label>
                              <textarea 
                                  style={{ ...inputStyle, height: 76, resize: "vertical", lineHeight: 1.5 }} 
                                  placeholder="House No, Street Name, City, State, ZIP..." 
                                  value={address} 
                                  onChange={e => setAddress(e.target.value)} 
                              />
                          </div>
                      </div>
                  )}

                  {step === 2 && (
                      <div className="fade-in">
                          {verificationStatus === 'failed' ? (
                              <div ref={errorRef} style={{ textAlign: "center", padding: "1rem 0.5rem" }}>
                                   <div style={{ fontSize: 42, marginBottom: 12 }}>{verificationError.includes("Conflict") ? "⚠️" : "🛑"}</div>
                                   <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--red)", marginBottom: 8 }}>
                                       {verificationError.includes("Conflict") ? "Identity Conflict" : "Verification Failed"}
                                   </h2>
                                   <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
                                      {verificationError}
                                   </p>
                                   
                                   {!verificationError.includes("Conflict") && (
                                      <div style={{ background: "rgba(255,255,255,0.03)", padding: 14, borderRadius: 12, textAlign: "left", marginBottom: 20 }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>YOUR INPUT</span>
                                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--red)" }}>{aadharNumber}</span>
                                          </div>
                                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>DETECTED ON CARD</span>
                                              <span style={{ fontSize: 12, fontWeight: 700 }}>{detectedNumbers.length > 0 ? detectedNumbers[0] : "None Detected"}</span>
                                          </div>
                                      </div>
                                   )}
                                   
                                   <button onClick={() => { setVerificationStatus(null); setStep(2); setIdFile(null); }} style={{ padding: "10px 20px", borderRadius: 9, background: "var(--red)", border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                      {verificationError.includes("Conflict") ? "Change Account or ID" : "Re-scan Document"}
                                   </button>
                              </div>
                          ) : (
                              <>
                                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, marginBottom: 6 }}>Identity Proof</h2>
                                  <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 22, fontSize: 13, lineHeight: 1.5 }}>Our AI scanner verifies your Aadhar details in real-time as a security cross-check.</p>
                                  
                                  <div style={{ marginBottom: 20 }}>
                                      <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>12-Digit Aadhar Identification</label>
                                      <input 
                                          type="text" 
                                          style={{ ...inputStyle, padding: "13px 16px", fontSize: 18, textAlign: "center", letterSpacing: 6, fontWeight: 600 }} 
                                          placeholder="0000 0000 0000" 
                                          value={aadharNumber} 
                                          onChange={e => setAadharNumber(e.target.value)} 
                                          maxLength={14} 
                                      />
                                  </div>

                                  <label style={{ 
                                      display: "block", background: "rgba(255,255,255,0.02)", border: "1.5px dashed rgba(255,255,255,0.15)", 
                                      borderRadius: 14, padding: "28px 20px", textAlign: "center", cursor: "pointer", 
                                      transition: "all 0.2s", borderColor: idFile ? "#4ade80" : "rgba(255,255,255,0.15)" 
                                  }}>
                                      <div style={{ fontSize: 32, marginBottom: 8 }}>{idFile ? "📄" : "📤"}</div>
                                      <div style={{ fontSize: 14, fontWeight: 600, color: idFile ? "#4ade80" : "#fff" }}>{idFile ? idFile.name : "Upload ID Document Image"}</div>
                                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>JPG, JPEG, or PNG formats only</div>
                                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                                          const f = e.target.files[0];
                                          if (f && f.type.startsWith("image/")) {
                                              setIdFile(f);
                                          }
                                      }} />
                                  </label>

                                  {verificationStatus === 'scanning' && (
                                      <div style={{ marginTop: 18, textAlign: "center", animation: "pulse 2s infinite" }}>
                                          <div style={{ fontSize: 12, color: "var(--red)", fontWeight: 600, letterSpacing: 1.5 }}>{uploadText.toUpperCase()}</div>
                                      </div>
                                  )}
                              </>
                          )}
                      </div>
                  )}

                  {step === 3 && (
                      <div className="fade-in">
                          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, marginBottom: 6 }}>Agreement</h2>
                          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 22, fontSize: 13, lineHeight: 1.5 }}>Review the final terms and authorize your participation in the live property auction.</p>
                          
                          <label style={{ display: "flex", alignItems: "flex-start", gap: 14, background: agreed ? "rgba(232,25,44,0.06)" : "rgba(255,255,255,0.02)", padding: "18px 20px", borderRadius: 12, border: `1px solid ${agreed ? "rgba(232,25,44,0.35)" : "rgba(255,255,255,0.08)"}`, cursor: "pointer", transition: "all 0.2s" }}>
                              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, cursor: "pointer", accentColor: "var(--red)" }} />
                              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
                                  I certify that the information provided is accurate and authentic. I understand that winning this auction creates a <strong>non-revocable, legally binding contract</strong> at the final bid price.
                              </div>
                          </label>

                          {uploadText && (
                              <div style={{ marginTop: 18, textAlign: "center", padding: "12px", background: "rgba(232,25,44,0.1)", borderRadius: 10, border: "1px solid rgba(232,25,44,0.2)" }}>
                                  <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, letterSpacing: 1 }}>{uploadText.toUpperCase()}</div>
                              </div>
                          )}
                      </div>
                  )}

                  {/* Compact Navigation Actions Inside Card Footer */}
                  {verificationStatus !== 'failed' && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 24, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <button 
                          type="button" 
                          onClick={step > 1 ? () => setStep(s => s - 1) : onClose} 
                          style={{
                            padding: "10px 18px",
                            borderRadius: 9,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(255,255,255,0.04)",
                            color: "rgba(255,255,255,0.75)",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 500,
                            fontFamily: "var(--font-body)",
                            transition: "all 0.2s ease",
                            whiteSpace: "nowrap"
                          }}
                      >
                          {step > 1 ? "← Previous" : "Cancel"}
                      </button>

                      <button 
                          type="button" 
                          className="btn-primary" 
                          style={{
                            padding: "10px 22px",
                            borderRadius: 9,
                            fontSize: 13,
                            fontWeight: 600,
                            letterSpacing: 0.3,
                            whiteSpace: "nowrap",
                            width: "auto",
                            minWidth: 160
                          }} 
                          onClick={step < 3 ? handleNext : handleSubmit} 
                          disabled={loading || (step === 3 && !agreed)}
                      >
                          {step < 3 ? (loading ? "Analyzing..." : `Continue to Step ${step + 1} →`) : (loading ? "Registering..." : "Confirm & Register ✓")}
                      </button>
                    </div>
                  )}
              </div>
          </div>
      </div>
    </div>,
    document.body
  );



}
