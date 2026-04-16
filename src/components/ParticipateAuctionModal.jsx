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
    width:"100%",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",
    borderRadius:12,padding:"14px 16px",color:"#fff",fontSize:15,
    fontFamily:"var(--font-body)",outline:"none",marginTop:8, backdropFilter: "blur(10px)"
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
          width: "35%", height: "100%", background: "rgba(255,255,255,0.01)", 
          borderRight: "1px solid rgba(255,255,255,0.1)", position: "relative",
          display: "flex", flexDirection: "column"
      }}>
        <div style={{ flex: 1, padding: "3rem", display: "flex", flexDirection: "column" }}>
            <button onClick={onClose} style={{ 
                background: "none", border: "none", color: "var(--red)", 
                cursor: "pointer", fontSize: 13, fontWeight: 700, 
                display: "flex", alignItems: "center", gap: 8, padding: 0, marginBottom: 40 
            }}>
                ← CANCEL & EXIT
            </button>

            <div style={{ width: "100%", aspectRatio: "4/3", borderRadius: 24, overflow: "hidden", marginBottom: 32, border: "1px solid rgba(255,255,255,0.05)" }}>
                <img src={property.imageUrls?.[0]} alt={property.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>

            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, marginBottom: 8, lineHeight: 1.1 }}>{property.title}</h1>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 8, marginBottom: 40 }}>
                📍 {property.location}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: "auto" }}>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: 24, borderRadius: 20, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>Current Bid</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>₹{property.currentBid.toLocaleString()}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: 24, borderRadius: 20, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>Verification</div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: "var(--red)" }}>{step}/3</div>
                </div>
            </div>
        </div>
      </div>

      {/* Right Panel: The Verification Wizard */}
      <div style={{ flex: 1, height: "100%", overflowY: "auto", position: "relative", backgroundColor: "#080808" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "8rem 3rem" }}>
              
              {/* Progress Header */}
              <div style={{ marginBottom: 60 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", letterSpacing: 2 }}>KYC STATUS: STEP {step}</span>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>{Math.round((step/3)*100)}% COMPLETE</span>
                  </div>
                  <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3 }}>
                      <div style={{ width: `${(step/3)*100}%`, height: "100%", background: "var(--red)", borderRadius: 3, transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}></div>
                  </div>
              </div>

              {error && <div ref={errorRef} className="msg-error" style={{ marginBottom: 40, padding: 20, borderRadius: 16 }}>{error}</div>}

              {/* Step Content Area */}
              <div style={{ minHeight: 440 }}>
                  {step === 1 && (
                      <div className="fade-in">
                          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 40, marginBottom: 16 }}>Personal Verification</h2>
                          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 40, fontSize: 17, lineHeight: 1.6, maxWidth: 500 }}>Provide your official details to register as a verified bidder for this property.</p>
                          
                          <div style={{ marginBottom: 24 }}>
                              <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing: 1.5 }}>Legal Full Name</label>
                              <input 
                                  style={{ ...inputStyle, padding: 16, fontSize: 15 }} 
                                  placeholder="E.g., Jane Doe" 
                                  value={fullName} 
                                  onChange={e => setFullName(e.target.value)} 
                              />
                          </div>

                          <div style={{ marginBottom: 24 }}>
                              <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing: 1.5 }}>Phone Number</label>
                              <div style={{ display: "flex", gap: 12 }}>
                                <input 
                                    style={{ ...inputStyle, padding: 16, fontSize: 15, flex: 1 }} 
                                    placeholder="Enter mobile number" 
                                    value={phoneNumber} 
                                    onChange={e => setPhoneNumber(e.target.value)}
                                    disabled={phoneVerified || otpSent}
                                />
                                {!phoneVerified && !otpSent && (
                                  <button type="button" onClick={handleSendOtp} style={{ background: "var(--primary)", border: "none", color: "#fff", padding: "0 24px", borderRadius: 10, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>SEND OTP</button>
                                )}
                              </div>
                          </div>

                          {otpSent && !phoneVerified && (
                            <div style={{ marginBottom: 24, padding: 20, background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)" }}>
                                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", textTransform:"uppercase", letterSpacing: 1.5 }}>Enter 4-Digit OTP</label>
                                <div style={{ display: "flex", gap: 12 }}>
                                  <input 
                                      style={{ ...inputStyle, padding: 16, fontSize: 15, flex: 1, letterSpacing: 4 }} 
                                      placeholder="0000" 
                                      value={otp} 
                                      onChange={e => setOtp(e.target.value)}
                                      maxLength={4}
                                  />
                                  <button type="button" onClick={handleVerifyOtp} style={{ background: "#4ade80", border: "none", color: "#000", padding: "0 24px", borderRadius: 10, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>VERIFY</button>
                                </div>
                            </div>
                          )}

                          {phoneVerified && (
                             <div style={{ marginBottom: 24, color: "#4ade80", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 18 }}>✓</span> Phone Number Verified
                             </div>
                          )}

                          <div style={{ marginBottom: 32 }}>
                              <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing: 1.5 }}>Full Residential Address</label>
                              <textarea 
                                  style={{ ...inputStyle, height: 100, padding: 24, fontSize: 16, lineHeight: 1.7, marginTop: 16, borderRadius: 20 }} 
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
                              <div ref={errorRef} style={{ textAlign: "center", padding: "2rem" }}>
                                   <div style={{ fontSize: 64, marginBottom: 24 }}>{verificationError.includes("Conflict") ? "⚠️" : "🛑"}</div>
                                   <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--red)", marginBottom: 12 }}>
                                       {verificationError.includes("Conflict") ? "Identity Conflict" : "Verification Failed"}
                                   </h2>
                                   <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
                                      {verificationError}
                                   </p>
                                   
                                   {/* Show comparison only for mismatch, not for conflict (where numbers are same) */}
                                   {!verificationError.includes("Conflict") && (
                                      <div style={{ background: "rgba(255,255,255,0.03)", padding: 24, borderRadius: 20, textAlign: "left", marginBottom: 32 }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>YOUR INPUT</span>
                                              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--red)" }}>{aadharNumber}</span>
                                          </div>
                                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>DETECTED ON CARD</span>
                                              <span style={{ fontSize: 13, fontWeight: 700 }}>{detectedNumbers.length > 0 ? detectedNumbers[0] : "None Detected"}</span>
                                          </div>
                                      </div>
                                   )}
                                   
                                   <button onClick={() => { setVerificationStatus(null); setStep(2); setIdFile(null); }} style={{ padding: "14px 32px", borderRadius: 12, background: "var(--red)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                                      {verificationError.includes("Conflict") ? "CHANGE ACCOUNT OR ID" : "RE-SCAN DOCUMENT"}
                                   </button>
                              </div>
                          ) : (
                              <>
                                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 40, marginBottom: 16 }}>Identity Proof</h2>
                                  <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 56, fontSize: 17, lineHeight: 1.6, maxWidth: 500 }}>Our AI scanner will verify the Aadhar details in real-time as a security cross-check.</p>
                                  
                                  <div style={{ marginBottom: 40 }}>
                                      <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing: 1.5 }}>12-Digit Aadhar Identification</label>
                                      <input 
                                          type="text" 
                                          style={{ ...inputStyle, marginTop: 16, padding: 24, fontSize: 28, textAlign: "center", letterSpacing: 12, fontWeight: 600, borderRadius: 20 }} 
                                          placeholder="0000 0000 0000" 
                                          value={aadharNumber} 
                                          onChange={e => setAadharNumber(e.target.value)} 
                                          maxLength={14} 
                                      />
                                  </div>

                                  <label style={{ 
                                      display: "block", background: "rgba(255,255,255,0.01)", border: "2px dashed rgba(255,255,255,0.1)", 
                                      borderRadius: 24, padding: "80px 40px", textAlign: "center", cursor: "pointer", 
                                      transition: "all 0.3s", borderColor: idFile ? "#4ade80" : "rgba(255,255,255,0.1)" 
                                  }}>
                                      <div style={{ fontSize: 56, marginBottom: 24 }}>{idFile ? "📄" : "📤"}</div>
                                      <div style={{ fontSize: 18, fontWeight: 600, color: idFile ? "#4ade80" : "#fff" }}>{idFile ? idFile.name : "Select ID Document Image"}</div>
                                      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginTop: 16 }}>JPG, JPEG, or PNG formats only</div>
                                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                                          const f = e.target.files[0];
                                          if (f && f.type.startsWith("image/")) {
                                              setIdFile(f);
                                          }
                                      }} />
                                  </label>

                                  {verificationStatus === 'scanning' && (
                                      <div style={{ marginTop: 40, textAlign: "center", animation: "pulse 2s infinite" }}>
                                          <div style={{ fontSize: 13, color: "var(--red)", fontWeight: 700, letterSpacing: 2 }}>{uploadText.toUpperCase()}</div>
                                      </div>
                                  )}
                              </>
                          )}
                      </div>
                  )}

                  {step === 3 && (
                      <div className="fade-in">
                          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 40, marginBottom: 16 }}>Agreement</h2>
                          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 56, fontSize: 17, lineHeight: 1.6, maxWidth: 500 }}>Review the final terms and authorize your participation in the live property auction.</p>
                          
                          <div style={{ background: "rgba(232,25,44,0.03)", padding: 40, borderRadius: 28, border: "1px solid rgba(232,25,44,0.1)" }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
                                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ width: 28, height: 28, marginTop: 4, cursor: "pointer", accentColor: "var(--red)" }} />
                                  <div style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", lineHeight: 1.8 }}>
                                      I certify that the information provided is accurate and authentic. I understand that winning this auction creates a **non-revocable, legally binding contract** at the final bid price.
                                  </div>
                              </div>
                          </div>

                          {uploadText && (
                              <div style={{ marginTop: 48, textAlign: "center", padding: "1.5rem", background: "rgba(232,25,44,0.1)", borderRadius: 20, border: "1px solid rgba(232,25,44,0.2)" }}>
                                  <div style={{ fontSize: 14, color: "#fff", fontWeight: 700, letterSpacing: 2 }}>{uploadText.toUpperCase()}</div>
                              </div>
                          )}
                      </div>
                  )}
              </div>

              {/* Navigation Actions */}
              <div style={{ display: "flex", gap: 24, marginTop: 96 }}>
                  {verificationStatus !== 'failed' && (
                    <button 
                        type="button" 
                        onClick={step > 1 ? () => setStep(s => s - 1) : onClose} 
                        style={{ flex: 1, padding: "24px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 14, fontWeight: 700, letterSpacing: 1 }}
                    >
                        {step > 1 ? "PREVIOUS STEP" : "CANCEL REGISTRATION"}
                    </button>
                  )}

                  {verificationStatus !== 'failed' && (
                    <button 
                        type="button" 
                        className="btn-primary" 
                        style={{ flex: 2, padding: "24px", borderRadius: 20, fontSize: 15, letterSpacing: 1 }} 
                        onClick={step < 3 ? handleNext : handleSubmit} 
                        disabled={loading || (step === 3 && !agreed)}
                    >
                        {step < 3 ? (loading ? "ANALYZING..." : `CONTINUE TO STEP ${step + 1} →`) : (loading ? "PROCESSING BIDDER PROFILE..." : "CONFIRM & REGISTER ✓")}
                    </button>
                  )}
              </div>
          </div>
      </div>
    </div>,
    document.body
  );



}
