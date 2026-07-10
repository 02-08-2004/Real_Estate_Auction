// src/pages/SellProperty.jsx
import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import emailjs from 'emailjs-com';
import { RecaptchaVerifier, linkWithPhoneNumber } from "firebase/auth";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function SellProperty() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: currentUser?.displayName || "",
    phone: "",
    aadharNumber: "",
    title: "", description: "", location: "", category: "Residential",
    fullAddress: "",
    plotNumber: "",
    surveyDetails: "",
    lotNumber: "",
    plotArea: "",
    builtUpArea: "",
    numRooms: "",
    numFloors: "",
    propertyAge: "",
    propertyCondition: "Good",
    startingPrice: "", 
    bidIncrement: "1000",
    reservePrice: "",
  });
  
  const [docBase64, setDocBase64] = useState(null);
  
  // Real Phone Verification 
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const allTermsAccepted = termsAccepted;

  useEffect(() => {
    if (currentUser?.phoneNumber) {
      setForm(f => ({ ...f, phone: currentUser.phoneNumber }));
      setPhoneVerified(true);
    }
  }, [currentUser]);

  useEffect(() => {
    if (editId) {
      const fetchProperty = async () => {
        setLoading(true);
        try {
          const docSnap = await getDoc(doc(db, "properties", editId));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setForm({
              name: data.sellerName || "",
              phone: data.sellerPhone || "",
              title: data.title || "",
              description: data.description || "",
              location: data.location || "",
              category: data.category || "Residential",
              fullAddress: data.fullAddress || "",
              plotNumber: data.plotNumber || "",
              surveyDetails: data.surveyDetails || "",
              lotNumber: data.lotNumber || "",
              plotArea: data.plotArea || "",
              builtUpArea: data.builtUpArea || "",
              numRooms: data.numRooms || "",
              numFloors: data.numFloors || "",
              propertyAge: data.propertyAge || "",
              propertyCondition: data.propertyCondition || "Good",
              startingPrice: data.startingPrice?.toString() || "", 
              bidIncrement: data.bidIncrement?.toString() || "1000",
              reservePrice: data.reservePrice?.toString() || "",
              amenities: data.amenities || [],
            });
            // Skip verification if editing
            setPhoneVerified(true);
            // Pre-fill terms if it was already approved once? Or just let them re-sign.
            // Better to let them re-sign the checklist.
          }
        } catch (err) {
          setError("Failed to load property: " + err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchProperty();
    }
  }, [editId]);

  // reCAPTCHA is injected into document.body to avoid React re-renders destroying it

  const handleSendOtp = async () => {
    // 1. Clean the phone number (remove everything except digits and '+')
    const cleanPhone = form.phone.replace(/[^0-9+]/g, '');
    
    // 2. Extract only the digits
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    
    // 3. Validation for Indian Context (+91 + 10 digits = 12 digits, or 10 digits)
    const isIndianFormat = cleanPhone.startsWith('+91');
    const subscriberDigits = isIndianFormat ? cleanPhone.slice(3).replace(/\D/g, '') : digitsOnly;
    
    if (subscriberDigits.length !== 10) {
      return setError("Please enter a complete 10-digit phone number.");
    }

    setError(""); 
    setUploadProgress("Preparing Security...");
    
    try {
      // 1. Teardown any previous reCAPTCHA instance
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch(e) {}
        window.recaptchaVerifier = null;
      }

      // 2. Inject a fresh container directly into document.body (outside React's DOM)
      //    so React re-renders can't destroy it mid-initialization.
      const existingContainer = document.getElementById('__recaptcha_root');
      if (existingContainer) existingContainer.remove();
      const rcDiv = document.createElement('div');
      rcDiv.id = '__recaptcha_root';
      rcDiv.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;';
      document.body.appendChild(rcDiv);

      window.recaptchaVerifier = new RecaptchaVerifier(auth, '__recaptcha_root', {
        'size': 'normal',
        'callback': () => {},
        'expired-callback': () => {
          window.recaptchaVerifier = null;
        }
      });

      const appVerifier = window.recaptchaVerifier;
      const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone.slice(-10)}`;

      const confirmation = await linkWithPhoneNumber(currentUser, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setError("");

      // Clean up the body-appended container after success
      const c = document.getElementById('__recaptcha_root');
      if (c) c.remove();

    } catch (err) {
      console.error("Firebase send OTP error:", err);

      // Cleanup body container on error
      const c = document.getElementById('__recaptcha_root');
      if (c) c.remove();
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch(e) {}
        window.recaptchaVerifier = null;
      }

      if (err.code === 'auth/credential-already-in-use') {
        setError("This phone number is already linked to another account.");
      } else if (err.code === 'auth/provider-already-linked') {
        setPhoneVerified(true); setOtpSent(false);
      } else {
        // Covers: billing-not-enabled, internal-error, too-many-requests,
        // reCAPTCHA element removed, network errors, free Spark plan limits.
        console.warn("Falling back to Mock OTP:", err.message);
        setConfirmationResult("MOCK");
        setOtpSent(true);
        setError("Dev Mode: reCAPTCHA unavailable (free plan or localhost). Enter '123456' to verify.");
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return setError("Enter the OTP sent to your phone.");
    if (!confirmationResult) return setError("Session expired. Please send OTP again.");
    setError("");
    try {
      if (confirmationResult === "MOCK") {
        if (otp === "123456") {
          setPhoneVerified(true);
          setError("");
        } else {
          setError("Invalid Mock OTP. Please enter '123456'.");
        }
        return;
      }
      
      await confirmationResult.confirm(otp);
      setPhoneVerified(true);
      setError("");
    } catch (err) {
      setError("Invalid OTP. " + err.message);
    }
  };

  const [files, setFiles] = useState([]);
  const [docFile, setDocFile] = useState(null);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleNext() {
    setError("");
    
    // Helper to focus and scroll to field
    const focusField = (id) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => el.focus(), 500); // Wait for scroll to complete
      }
    };

    if (step === 1) {
      if (!form.name) { focusField('field-name'); return setError("Please enter your Full Name."); }
      if (!form.phone) { focusField('field-phone'); return setError("Please enter your Phone Number."); }
      if (!phoneVerified) { focusField('field-phone'); return setError("Please verify your phone number first."); }
      if (!form.title) { focusField('field-title'); return setError("Please enter a Property Title."); }
      if (!form.location) { focusField('field-location'); return setError("Please enter the Location."); }
      if (!form.fullAddress) { focusField('field-fullAddress'); return setError("Full Legal Address is required for documentation."); }
    }
    if (step === 2) {
      if (files.length === 0) return setError("Please select at least one photo.");
      if (files.length > 10) return setError("You can only upload up to 10 photos.");
      if (!docFile) return setError("Please upload your Land Documents for verification.");
    }
    if (step === 3) {
      if (!form.startingPrice || form.startingPrice <= 0) return setError("Enter a valid starting price.");
      if (!form.bidIncrement || form.bidIncrement < 1) return setError("Enter a valid bid increment (min ₹1).");
      if (form.reservePrice && parseFloat(form.reservePrice) < parseFloat(form.startingPrice)) {
          return setError("Reserve price cannot be lower than the starting price.");
      }
    }
    setStep(s => s + 1);
  }

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("File read error"));
      reader.onload = (event) => {
        const img = new Image();
        img.onerror = () => reject(new Error("Image load error"));
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 800; // compress to save firestore space
            let scaleSize = 1;
            if (img.width > MAX_WIDTH) { scaleSize = MAX_WIDTH / img.width; }
            canvas.width = img.width * scaleSize;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.6)); 
          } catch(e) { reject(e); }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  async function uploadImages() {
    if (files.length === 0) return [];
    setUploadProgress(`Compressing ${files.length} photos...`);
    const urls = await Promise.all(files.map(async (f) => {
        try { return await compressImage(f); } 
        catch (e) { console.error("Compression err", e); return null; }
    }));
    return urls.filter(u => u !== null);
  }

  async function uploadDocument(file) {
    if (!file) return docBase64;
    
    // If we already have the base64 from the selection step, use it
    if (docBase64) return docBase64;

    setUploadProgress(`Encoding Document...`);
    if (file.size > 800 * 1024) {
        throw new Error("Free Plan Limit: Please select a document smaller than 800KB.");
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = (e) => {
          console.error("FileReader error:", e);
          reject(new Error("System failed to read the document file. Try re-selecting it."));
      };
      reader.onload = (e) => resolve(e.target.result); 
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit() {
    setError(""); setLoading(true); setUploadProgress("Initializing Submission...");
    try {
      // For edits, we might not have new files
      const uploadedUrls = files.length > 0 ? await uploadImages() : null;
      const documentUrl = docFile ? await uploadDocument(docFile) : null;

      const propertyData = {
        sellerName: form.name,
        sellerPhone: form.phone,
        title: form.title,
        description: form.description,
        location: form.location,
        category: form.category,
        startingPrice: parseFloat(form.startingPrice),
        bidIncrement: parseFloat(form.bidIncrement) || 1000,
        reservePrice: parseFloat(form.reservePrice) || 0,
        
        // Detailed Specifications
        fullAddress: form.fullAddress,
        plotNumber: form.plotNumber,
        surveyDetails: form.surveyDetails,
        lotNumber: form.lotNumber,
        plotArea: form.plotArea,
        builtUpArea: form.builtUpArea,
        numRooms: form.numRooms,
        numFloors: form.numFloors,
        propertyAge: form.propertyAge,
        propertyCondition: form.propertyCondition,
        amenities: form.amenities || [],
        
        status: "pending", // Corrected to match AdminDashboard filter
        updatedAt: serverTimestamp(),
      };

      if (uploadedUrls) propertyData.imageUrls = uploadedUrls;
      if (documentUrl) propertyData.landDocumentUrl = documentUrl;

      let propertyId = editId;
      if (editId) {
        await updateDoc(doc(db, "properties", editId), propertyData);
      } else {
        const propRef = await addDoc(collection(db, "properties"), {
            ...propertyData,
            currentBid: parseFloat(form.startingPrice),
            sellerId: currentUser.uid,
            sellerEmail: currentUser.email,
            approved: false, 
            winnerId: null, 
            paymentId: null, 
            endDate: null,
            createdAt: serverTimestamp(),
        });
        propertyId = propRef.id;
      }

      setUploadProgress("Notifying Review Team...");
      
      await addDoc(collection(db, "notifications"), {
        userId: "admin_role_broadcast",
        type: "review_request",
        message: `${editId ? 'Edited' : 'New'} property "${form.title}" submitted by ${form.name}. Waiting for administrative review.`,
        propertyId: propertyId,
        read: false,
        createdAt: serverTimestamp()
      });

      navigate("/listings", { state: { alert: `Property ${editId ? 'updated' : 'submitted'} successfully!` } });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const inputStyle = {
    width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",
    borderRadius:12,padding:"14px 16px",color:"#fff",fontSize:14,
    fontFamily:"var(--font-body)",outline:"none",marginTop:8, transition: "all 0.2s",
    backdropFilter: "blur(4px)"
  };
  const labelStyle = { fontSize:12,color:"rgba(255,255,255,0.6)", fontWeight:700, textTransform: "uppercase", letterSpacing: "1px" };

  return (
    <div className="dashboard-content-wrapper" style={{ padding: "0 2rem 4rem" }}>
      <div style={{ maxWidth: 640, margin: "40px auto 32px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, margin: 0, fontWeight: 500 }}>Sell Property</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>List your exclusive property on the global market with our secure auction process.</p>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
            <div>
              <div className="text-label" style={{ color: "var(--primary)", marginBottom: 4 }}>Submission Wizard</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, margin: 0 }}>
                {step === 1 ? "Property Details" : step === 2 ? "Photos & Documents" : step === 3 ? "Configure Auction" : "Review & Publish"}
              </h2>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="text-label">STEP {step} OF 4</span>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: 8, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
            {[1, 2, 3, 4].map(s => (
              <div key={s} style={{ 
                flex: 1, 
                height: "100%", 
                background: step >= s ? "var(--primary)" : "transparent",
                borderRadius: 2,
                transition: "all 0.3s ease"
              }} />
            ))}
          </div>
        </div>

        {error && <div className="msg-error fade-in-up" style={{ padding:10, fontSize:12 }}>{error}</div>}

        <div className="fade-in-up" key={step}>
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="form-row-responsive">
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Full Name <span style={{ color: "var(--red)" }}>*</span></label>
                  <input id="field-name" style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Phone Number <span style={{ color: "var(--red)" }}>*</span></label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input id="field-phone" style={{ ...inputStyle, flex: 1, opacity: phoneVerified ? 0.6 : 1 }} value={form.phone} onChange={e => set("phone", e.target.value)} disabled={phoneVerified} />
                    {!phoneVerified && !otpSent && (
                      <button type="button" onClick={handleSendOtp} style={{ marginTop: 8, padding: "0 12px", borderRadius: 10, background: "var(--primary)", color: "#fff", border: "none", fontSize: 12, cursor: "pointer" }}>Send OTP</button>
                    )}
                  </div>
                  {otpSent && !phoneVerified && (
                    <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", background: "rgba(255,255,255,0.03)", padding: 8, borderRadius: 8 }}>
                      <input placeholder="Enter 6-digit code" style={{ ...inputStyle, marginTop: 0, border: "none", background: "rgba(0,0,0,0.5)" }} value={otp} onChange={e => setOtp(e.target.value)} />
                      <button type="button" onClick={handleVerifyOtp} style={{ padding: "8px 12px", borderRadius: 6, background: "#4ade80", color: "#111", border: "none", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Verify</button>
                    </div>
                  )}
                  {phoneVerified && <div style={{ fontSize: 11, color: "#4ade80", marginTop: 4 }}>✓ Phone Verified</div>}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Property Title <span style={{ color: "var(--red)" }}>*</span></label>
                <input id="field-title" style={inputStyle} placeholder="e.g. Modern Glass Villa" value={form.title} onChange={e => set("title", e.target.value)} />
              </div>

              <div className="form-row-responsive">
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Location <span style={{ color: "var(--red)" }}>*</span></label>
                  <input id="field-location" style={inputStyle} placeholder="City, Area or Zip" value={form.location} onChange={e => set("location", e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Category <span style={{ color: "var(--red)" }}>*</span></label>
                  <select style={{ ...inputStyle, appearance: "none" }} value={form.category} onChange={e => set("category", e.target.value)}>
                    <option style={{ background: "#222", color: "#fff" }} value="Residential">Residential</option>
                    <option style={{ background: "#222", color: "#fff" }} value="Commercial">Commercial</option>
                    <option style={{ background: "#222", color: "#fff" }} value="Land">Land</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Property Description <span style={{ color: "var(--red)" }}>*</span></label>
                <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} placeholder="Describe the unique features..." value={form.description} onChange={e => set("description", e.target.value)} />
              </div>

              <div>
                <label style={{ ...labelStyle, marginBottom: 12 }}>Amenities</label>
                <div className="grid-3col-responsive">
                    {['Pool', 'Gym', 'Parking', 'Garden', 'Security', 'Wi-Fi'].map(ami => (
                        <label key={ami} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                            <input 
                                type="checkbox" 
                                checked={(form.amenities || []).includes(ami)}
                                onChange={e => {
                                    const current = form.amenities || [];
                                    const next = e.target.checked ? [...current, ami] : current.filter(x => x !== ami);
                                    set("amenities", next);
                                }}
                            />
                            {ami}
                        </label>
                    ))}
                </div>
              </div>



              <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, textShadow:"0 1px 2px rgba(0,0,0,0.8)" }}>🗺️ Location & Legal Details</div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Full Legal Address <span style={{ color: "var(--red)" }}>*</span></label>
                  <textarea id="field-fullAddress" style={{ ...inputStyle, resize: "vertical" }} rows={2} placeholder="Complete address as per legal records..." value={form.fullAddress} onChange={e => set("fullAddress", e.target.value)} />
                </div>
                <div className="grid-2col-responsive">
                  <div>
                    <label style={labelStyle}>Plot / Door Number</label>
                    <input style={inputStyle} placeholder="e.g. Plot No 42" value={form.plotNumber} onChange={e => set("plotNumber", e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Survey / Khata Details</label>
                    <input style={inputStyle} placeholder="e.g. Survey 102/1A" value={form.surveyDetails} onChange={e => set("surveyDetails", e.target.value)} />
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={labelStyle}>Lot Number / Property ID</label>
                    <input style={inputStyle} placeholder="Official Government ID" value={form.lotNumber} onChange={e => set("lotNumber", e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, textShadow:"0 1px 2px rgba(0,0,0,0.8)" }}>🏗️ Technical Specifications</div>
                <div className="grid-2col-responsive">
                  <div>
                    <label style={labelStyle}>Plot Area (sq.ft)</label>
                    <input style={inputStyle} type="number" placeholder="Total land area" value={form.plotArea} onChange={e => set("plotArea", e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Built-up Area (sq.ft)</label>
                    <input style={inputStyle} type="number" placeholder="Construction area" value={form.builtUpArea} onChange={e => set("builtUpArea", e.target.value)} />
                  </div>
                  {form.category !== "Land" && (
                    <>
                      <div>
                        <label style={labelStyle}>Total Rooms</label>
                        <input style={inputStyle} type="number" placeholder="2 BHK / 3 BHK..." value={form.numRooms} onChange={e => set("numRooms", e.target.value)} />
                      </div>
                      <div>
                        <label style={labelStyle}>Total Floors</label>
                        <input style={inputStyle} type="number" placeholder="G+1, G+2..." value={form.numFloors} onChange={e => set("numFloors", e.target.value)} />
                      </div>
                      <div>
                        <label style={labelStyle}>Age of Property (Years)</label>
                        <input style={inputStyle} type="number" placeholder="Years since built" value={form.propertyAge} onChange={e => set("propertyAge", e.target.value)} />
                      </div>
                      <div>
                        <label style={labelStyle}>Condition</label>
                        <select style={{ ...inputStyle, appearance: "none" }} value={form.propertyCondition} onChange={e => set("propertyCondition", e.target.value)}>
                          <option style={{ background: "#1a1a1a", color: "#fff" }} value="Excellent">Excellent / New</option>
                          <option style={{ background: "#1a1a1a", color: "#fff" }} value="Good">Good / Hand-me-down</option>
                          <option style={{ background: "#1a1a1a", color: "#fff" }} value="Renovated">Recently Renovated</option>
                          <option style={{ background: "#1a1a1a", color: "#fff" }} value="Needs Repair">Needs Repair</option>
                          <option style={{ background: "#1a1a1a", color: "#fff" }} value="Dilapidated">Dilapidated</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <section>
                <h3 className="text-label" style={{ marginBottom: 12 }}>Property Photos (Max 10) <span style={{ color: "var(--red)" }}>*</span></h3>
                <input type="file" multiple accept="image/*" onChange={e => {
                  const newFiles = Array.from(e.target.files);
                  setFiles(newFiles.slice(0, 10));
                }} style={inputStyle} />
                {files.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div className="text-label" style={{ marginBottom: 8 }}>SELECTED ({files.length}/10)</div>
                    <div className="grid-5col-responsive">
                      {files.map((f, i) => (
                        <div key={i} style={{ aspectRatio: 1, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, padding: 4, textAlign: "center", overflow: "hidden", border: "1px solid var(--glass-border)" }}>
                          {f.name.substring(0, 6)}...
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-label" style={{ marginBottom: 12 }}>Legal Identity & Land Documents <span style={{ color: "var(--red)" }}>*</span></h3>
                <input type="file" accept=".pdf,image/*" onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                      setDocFile(file);
                      // Pre-read to catch errors early
                      const reader = new FileReader();
                      reader.onload = (ev) => setDocBase64(ev.target.result);
                      reader.onerror = () => setError("Unable to read this specific file. Try another format.");
                      reader.readAsDataURL(file);
                  }
                }} style={inputStyle} />
                {docFile && <div style={{ fontSize: 13, color: "#4ade80", marginTop: 8 }}>✓ Selected: {docFile.name}</div>}
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 12, lineHeight: 1.5 }}>
                  These documents are used for internal verification and <strong>will not be shown to bidders</strong> until a contract is generated. (Max 800KB)
                </p>
              </section>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <section className="card-architectural" style={{ padding: 24 }}>
                <h3 className="text-label" style={{ marginBottom: 20 }}>Financials</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <label className="text-label" style={{ fontSize: 9 }}>PROPOSED STARTING BID (RS) <span style={{ color: "var(--red)" }}>*</span></label>
                    <div style={{ position: "relative", marginTop: 8 }}>
                      <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)" }}>₹</span>
                      <input type="number" style={{ ...inputStyle, paddingLeft: 36, marginTop: 0 }} placeholder="0.00" value={form.startingPrice} onChange={e => set("startingPrice", e.target.value)} min={1} />
                    </div>
                  </div>

                  <div className="grid-2col-responsive">
                    <div>
                      <label className="text-label" style={{ fontSize: 9 }}>BID INCREMENT <span style={{ color: "var(--red)" }}>*</span></label>
                      <div style={{ position: "relative", marginTop: 8 }}>
                        <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)" }}>₹</span>
                        <input type="number" style={{ ...inputStyle, paddingLeft: 36, marginTop: 0 }} placeholder="1,000" value={form.bidIncrement} onChange={e => set("bidIncrement", e.target.value)} min={1} />
                      </div>
                    </div>
                    <div>
                      <label className="text-label" style={{ fontSize: 9 }}>RESERVE PRICE (OPTIONAL)</label>
                      <div style={{ position: "relative", marginTop: 8 }}>
                        <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)" }}>₹</span>
                        <input type="number" style={{ ...inputStyle, paddingLeft: 36, marginTop: 0 }} placeholder="No Reserve" value={form.reservePrice} onChange={e => set("reservePrice", e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div style={{ background: "rgba(0,63,177,0.05)", border: "1px solid rgba(0,63,177,0.1)", padding: 16, borderRadius: 12, display: "flex", gap: 12 }}>
                <span style={{ fontSize: 20 }}>⏳</span>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.5 }}>
                  The <strong>Auction Timeline</strong> (Start/End dates) will be configured immediately after administrative verification.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className="card-architectural" style={{ padding: 24 }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, margin: "0 0 8px 0" }}>{form.title || "Untitled Property"}</h2>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 24 }}>{form.description ? `"${form.description}"` : "No description provided."}</div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
                  {/* Seller & Basic Details Card */}
                  <div style={{ flex: "1 1 300px", background: "rgba(255,255,255,0.04)", padding: 24, borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}>
                    <div className="text-label" style={{ fontSize: 10, color: "var(--primary)", marginBottom: 16 }}>SELLER INFORMATION</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px", fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                      <div><strong style={{ color: "rgba(255,255,255,0.5)", display: "block", fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Full Name</strong> {form.name || "N/A"}</div>
                      <div><strong style={{ color: "rgba(255,255,255,0.5)", display: "block", fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Phone</strong> {form.phone || "N/A"}</div>
                      <div style={{ gridColumn: "1 / -1" }}><strong style={{ color: "rgba(255,255,255,0.5)", display: "block", fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Photos & Docs attached</strong> {files.length} Photos, {docFile ? "1 Document" : "None"}</div>
                    </div>
                  </div>

                  {/* Pricing Information Card */}
                  <div style={{ flex: "1 1 200px", background: "rgba(255,255,255,0.04)", padding: 24, borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}>
                    <div className="text-label" style={{ fontSize: 10, color: "var(--primary)", marginBottom: 16 }}>PRICING INFORMATION</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 4 }}>Starting At</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.6)" }}>₹{parseFloat(form.startingPrice || 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 4 }}>Reserve Price</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{form.reservePrice ? `₹${parseFloat(form.reservePrice).toLocaleString()}` : 'NONE'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Property Details Card */}
                  <div style={{ flex: "1 1 100%", background: "rgba(255,255,255,0.04)", padding: 24, borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}>
                    <div className="text-label" style={{ fontSize: 10, color: "var(--primary)", marginBottom: 16 }}>PROPERTY AT A GLANCE</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                      <div><strong style={{ color: "rgba(255,255,255,0.5)", display: "block", fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Category</strong> {form.category}</div>
                      <div><strong style={{ color: "rgba(255,255,255,0.5)", display: "block", fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Area / Zip</strong> {form.location}</div>
                      <div><strong style={{ color: "rgba(255,255,255,0.5)", display: "block", fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Plot Area</strong> {form.plotArea ? `${form.plotArea} sq.ft` : 'N/A'}</div>
                      <div><strong style={{ color: "rgba(255,255,255,0.5)", display: "block", fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Rooms</strong> {form.numRooms || 'N/A'}</div>
                      <div><strong style={{ color: "rgba(255,255,255,0.5)", display: "block", fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Condition</strong> {form.propertyCondition || 'N/A'}</div>
                      <div style={{ gridColumn: "1 / -1" }}><strong style={{ color: "rgba(255,255,255,0.5)", display: "block", fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Full Legal Address</strong> {form.fullAddress || form.location}</div>
                    </div>
                  </div>
                </div>

                <h3 className="text-label" style={{ marginBottom: 16, color: "var(--primary)" }}>Review Confirmation</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px", background: termsAccepted ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.03)", borderRadius: 16, border: `1px solid ${termsAccepted ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.1)"}`, cursor: "pointer", transition: "all 0.2s", backdropFilter: "blur(10px)" }}>
                      <input
                        type="checkbox"
                        style={{ width: 18, height: 18, accentColor: "#4ade80" }}
                        checked={termsAccepted}
                        onChange={e => setTermsAccepted(e.target.checked)}
                      />
                      <span style={{ fontSize: 13, color: termsAccepted ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)", fontWeight: 600 }}>I confirm that all details are true and correct.</span>
                    </label>
                </div>
              </div>

              {uploadProgress && (
                <div style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center", fontSize: 13, border: "1px solid var(--glass-border)" }}>
                  <div className="loading-spinner" style={{ width: 16, height: 16, borderSize: 2, marginRight: 8, display: "inline-block" }}></div>
                  {uploadProgress}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div style={{ display:"flex",gap:12, marginTop:24, paddingBottom: "12px" }}>
          {step > 1 ? (
            <button type="button" onClick={() => setStep(s => s - 1)} style={{
              flex:1,padding:"14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.2)",
              background:"rgba(255,255,255,0.15)",color:"#fff",cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)", fontWeight:600
            }}>← Back</button>
          ) : (
            <button type="button" onClick={() => navigate(-1)} style={{
              flex:1,padding:"14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.2)",
              background:"rgba(255,255,255,0.15)",color:"#fff",cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)", fontWeight:600
            }}>Cancel</button>
          )}

          {step < 4 ? (
            <button type="button" className="btn-primary" style={{ flex:2, borderRadius:10, padding:"12px" }} onClick={handleNext}>
              Continue →
            </button>
          ) : (
            <button type="button" className="btn-primary" style={{ flex:2, borderRadius:10, padding:"12px", opacity: !allTermsAccepted ? 0.5 : 1 }} disabled={loading || !allTermsAccepted} onClick={handleSubmit}>
              {loading ? "Submitting..." : "Publish Listing"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
