// src/pages/AuctionAgreement.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit, serverTimestamp, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { notificationService } from "../services/notificationService";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function AuctionAgreement() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser, userRole } = useAuth();
    
    const [property, setProperty] = useState(null);
    const [winningBid, setWinningBid] = useState(null);
    const [loading, setLoading] = useState(true);
    const [signed, setSigned] = useState(false);
    const [signature, setSignature] = useState("");
    const [shouldDownload, setShouldDownload] = useState(false);
    
    // Logic flags for rendering
    const isWinner = currentUser && winningBid && currentUser.uid === winningBid.bidderId;
    const isSeller = currentUser && property && currentUser.uid === property.sellerId;

    const downloadPDF = async () => {
        const docElement = document.querySelector(".contract-body");
        if (!docElement) return false;
        
        try {
            const canvas = await html2canvas(docElement, { scale: 2 });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
            pdf.save(`Agreement_${property.id || "Auction"}.pdf`);
            return true;
        } catch (e) {
            console.error("PDF Generation Failed", e);
            return false;
        }
    };

    // Auto-trigger print after signing
    useEffect(() => {
        if (shouldDownload && property?.agreementBuyerSigned && property?.agreementSellerSigned) {
            // Tiny delay to ensure UI reflow with both signatures
            const timer = setTimeout(async () => {
                await downloadPDF();
                setShouldDownload(false);
                setTimeout(() => {
                    if (userRole === "admin") navigate("/admin-dashboard");
                    else navigate("/user-dashboard");
                }, 1000);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [shouldDownload, property, navigate, userRole]);

    useEffect(() => {
        if (!id) return;

        // Reactive listener for property data
        const unsubProp = onSnapshot(doc(db, "properties", id), async (pSnap) => {
            if (pSnap.exists()) {
                const pData = { id: pSnap.id, ...pSnap.data() };
                setProperty(pData);

                // Fetch winning bid once if not yet fetched
                if (!winningBid) {
                    const bQ = query(
                        collection(db, "bids"),
                        where("propertyId", "==", id)
                    );
                    const bSnap = await getDocs(bQ);
                    if (!bSnap.empty) {
                        const allBids = bSnap.docs.map(doc => doc.data());
                        const highest = allBids.sort((a, b) => b.amount - a.amount)[0];
                        setWinningBid(highest);

                        // NEW: Fetch registration details for the winner (Buyer Aadhar)
                        try {
                            const regRef = doc(db, "properties", id, "registeredBidders", highest.bidderId);
                            const regSnap = await getDoc(regRef);
                            if (regSnap.exists()) {
                                setWinningBid(prev => ({ ...prev, ...regSnap.data() }));
                            }
                        } catch (e) { console.warn("Error fetching winner registration:", e); }
                    }
                }
                
                if (isWinner && pData.agreementBuyerSigned) setSigned(true);
                if (isSeller && pData.agreementSellerSigned) setSigned(true);
                setLoading(false);
            } else {
                setLoading(false);
            }
        }, (err) => {
            console.error("Property listener error:", err);
            setLoading(false);
        });

        return () => unsubProp();
    }, [id, winningBid]);

    const handleSign = async () => {
        if (!signature.trim()) {
            alert("Please type your full name to sign the agreement.");
            return;
        }

        if (!winningBid || !property) return;

        try {
            const updates = {};
            if (isWinner) {
                updates.agreementBuyerSigned = true;
                updates.agreementBuyerSignature = signature;
                updates.agreementBuyerSignedAt = serverTimestamp();
            } else if (isSeller) {
                updates.agreementSellerSigned = true;
                updates.agreementSellerSignature = signature;
                updates.agreementSellerSignedAt = serverTimestamp();
            }

            // Check if this signature completes the agreement
            const willBeBuyerSigned = isWinner || property.agreementBuyerSigned;
            const willBeSellerSigned = isSeller || property.agreementSellerSigned;

            if (willBeBuyerSigned && willBeSellerSigned) {
                updates.status = "sold";
                updates.agreementCompletedAt = serverTimestamp();
            } else {
                updates.status = "contract_pending";
            }

            await updateDoc(doc(db, "properties", id), updates);
            setShouldDownload(true);

            // NEW: Automatically clear associated notifications for CURRENT USER
            try {
                const notificationsRef = collection(db, "notifications");
                const q = query(
                    notificationsRef, 
                    where("userId", "==", currentUser.uid),
                    where("propertyId", "==", id),
                    where("read", "==", false)
                );
                const querySnapshot = await getDocs(q);
                const { writeBatch } = await import("firebase/firestore");
                const batch = writeBatch(db);
                querySnapshot.forEach((doc) => {
                    batch.update(doc.ref, { read: true });
                });
                await batch.commit();
            } catch (e) {
                console.warn("Cleanup notifications error:", e);
            }

            setSigned(true);
            
            setSigned(true);
            
            // Notification logic
            if (willBeBuyerSigned && willBeSellerSigned) {
                // Agreement fully executed
                await notificationService.notifySignature(
                    winningBid.bidderId, 
                    winningBid.bidderEmail, 
                    winningBid.bidderName, 
                    property, 
                    "seller"
                );
                await notificationService.notifyAgreementCompleted(property, winningBid);
            } else if (isWinner) {
                // Winner signed, notify Seller
                await notificationService.notifySignature(
                    property.sellerId,
                    property.sellerEmail,
                    property.sellerName,
                    property,
                    "bidder"
                );
            }

            alert("Signature recorded successfully. The agreement is now " + (willBeBuyerSigned && willBeSellerSigned ? "COMPLETED and SOLD." : "Contract Pending (waiting for other party)."));
        } catch (e) {
            console.error(e);
            alert("Failed to sign agreement.");
        }
    };

    if (loading) return <div style={{ color: "#fff", padding: "4rem", textAlign: "center" }}>Preparing Legal Documents...</div>;
    if (!property || !winningBid) return <div style={{ color: "#fff", padding: "4rem", textAlign: "center" }}>Agreement record not found.</div>;

    return (
        <div className="agreement-container" style={{ minHeight: "100vh", background: "#fdfdfd", color: "#111", padding: "40px 20px" }}>
            <style>
                {`
                @media print {
                    * {
                        overflow: visible !important;
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                    }
                    @page {
                        size: portrait;
                        margin: 1.5cm;
                    }
                    html, body, #root {
                        height: auto !important;
                        overflow: visible !important;
                        position: static !important;
                        background: white !important;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print { display: none !important; }
                    .agreement-container { 
                        display: block !important;
                        padding: 0 !important; 
                        margin: 0 !important;
                        width: 100% !important;
                        background: white !important; 
                        box-shadow: none !important;
                        position: static !important;
                    }
                    .agreement-container > div {
                        border: none !important;
                        box-shadow: none !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        display: block !important;
                    }
                    section, .signature-section, h3, .contract-body > div, p, .contract-body {
                        page-break-inside: auto !important;
                    }
                }
                .contract-body p { line-height: 1.8; margin-bottom: 20px; text-align: justify; }
                .signature-box { border-bottom: 2px solid #000; display: inline-block; min-width: 200px; padding: 5px 0; font-family: 'Dancing Script', cursive; font-size: 24px; }
                `}
            </style>

            <div className="no-print" style={{ maxWidth: 800, margin: "0 auto 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => navigate("/user-dashboard")} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14 }}>← Return to Dashboard</button>
                <div style={{ display: "flex", gap: 12 }}>
                    {property.agreementBuyerSigned && property.agreementSellerSigned && (
                        <button onClick={downloadPDF} style={{ background: "#eee", color: "#111", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>🖨️ Download Final Agreement (PDF)</button>
                    )}
                    {(isWinner && !property.agreementBuyerSigned) && (
                        <button onClick={handleSign} style={{ background: "#0b6623", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>🖋️ Sign & Accept Agreement</button>
                    )}
                    {(isSeller && property.agreementBuyerSigned && !property.agreementSellerSigned) && (
                        <button onClick={handleSign} style={{ background: "#003FB1", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>🖋️ Finalize & Close Sale</button>
                    )}
                </div>
            </div>

            {/* Progress indicator */}
            <div className="no-print" style={{ maxWidth: 800, margin: "0 auto 40px", display: "flex", gap: 12 }}>
                <div style={{ flex: 1, padding: 16, borderRadius: 12, background: property.agreementBuyerSigned ? "rgba(74, 222, 128, 0.1)" : "rgba(0,0,0,0.03)", border: "1px solid", borderColor: property.agreementBuyerSigned ? "#4ade80" : "rgba(0,0,0,0.1)", textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: property.agreementBuyerSigned ? "#4ade80" : "#666", textTransform: "uppercase", letterSpacing: 1 }}>Step 1: Buyer</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{property.agreementBuyerSigned ? "✓ SIGNED" : isWinner ? "PENDING YOUR SIGNATURE" : "AWAITING SIGNATURE"}</div>
                </div>
                <div style={{ flex: 1, padding: 16, borderRadius: 12, background: property.agreementSellerSigned ? "rgba(74, 222, 128, 0.1)" : "rgba(0,0,0,0.03)", border: "1px solid", borderColor: property.agreementSellerSigned ? "#4ade80" : "rgba(0,0,0,0.1)", textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: property.agreementSellerSigned ? "#4ade80" : "#666", textTransform: "uppercase", letterSpacing: 1 }}>Step 2: Auctioneer</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{property.agreementSellerSigned ? "✓ SIGNED" : (isSeller && property.agreementBuyerSigned) ? "READY FOR FINAL SIGN" : "AWAITING BUYER FIRST"}</div>
                </div>
            </div>

            {isSeller && !property.agreementBuyerSigned && !property.agreementSellerSigned && (
                <div className="no-print" style={{ maxWidth: 800, margin: "0 auto 40px", padding: 24, borderRadius: 16, background: "rgba(0, 63, 177, 0.05)", border: "1px solid rgba(0, 63, 177, 0.1)", textAlign: "center" }}>
                    <h3 style={{ margin: "0 0 8px 0", fontSize: 17, color: "#003FB1" }}>Waiting for the winning bidder...</h3>
                    <p style={{ margin: 0, fontSize: 14, color: "#444", lineHeight: 1.5 }}>
                        Once <strong>{winningBid.bidderName}</strong> signs this agreement, you will be able to perform the final signature to close the sale. We will notify you when it's ready.
                    </p>
                </div>
            )}

            {/* Status Banner removed as per user request */}

            <div style={{ maxWidth: 800, margin: "0 auto", background: "#fff", padding: "60px 80px", border: "1px solid #ddd", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 60 }}>
                    <h1 style={{ fontFamily: "serif", fontSize: 32, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Property Purchase Agreement</h1>
                    <div style={{ color: "#888", fontSize: 12 }}>Reference ID: {property.id?.substring(0,8).toUpperCase()}</div>
                </div>

                <div className="contract-body" style={{ fontSize: 15, fontFamily: "serif" }}>
                    <p>
                        This **Property Purchase Agreement** (hereinafter "Agreement") is entered into as of <strong>{new Date().toLocaleDateString()}</strong> by and between:
                    </p>

                    <div style={{ margin: "30px 0" }}>
                        <div style={{ marginBottom: 12 }}><strong>THE SELLER:</strong> {property.sellerName} | {property.sellerAadhar || property.sellerPhone} <span style={{ color: "#666" }}>({property.sellerEmail})</span></div>
                        <div style={{ marginBottom: 12 }}><strong>THE BUYER:</strong> {winningBid.bidderName} | {winningBid.aadharNumber} <span style={{ color: "#666" }}>({winningBid.bidderEmail})</span></div>
                    </div>

                    {/* Property Technical Details */}
                    <div style={{ background: "#f9f9f9", padding: "20px", borderRadius: 8, marginBottom: 30, border: "1px solid #eee", fontSize: 13 }}>
                        <h4 style={{ margin: "0 0 10px 0", color: "#666", textTransform: "uppercase", fontSize: 11 }}>Property Specifications & Legal Identity</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
                            <div><strong>Property ID:</strong> {property.id?.substring(0,8).toUpperCase()}</div>
                            <div><strong>Category:</strong> {property.category || "Real Estate"}</div>
                            <div><strong>Plot / Door #:</strong> {property.plotNumber || "N/A"}</div>
                            <div><strong>Survey Details:</strong> {property.surveyDetails || "N/A"}</div>
                            <div><strong>Plot Area:</strong> {property.plotArea || property.sqft || "N/A"} Sq.ft.</div>
                            <div><strong>Built-up Area:</strong> {property.builtUpArea || "N/A"} Sq.ft.</div>
                            <div><strong>Final Valuation:</strong> ₹{winningBid.amount?.toLocaleString()}</div>
                            <div><strong>Lot / Property ID:</strong> {property.lotNumber || "N/A"}</div>
                            <div style={{ gridColumn: "span 2", marginTop: 10, borderTop: "1px solid #eee", paddingTop: 10 }}>
                                <strong>Legal Address:</strong> {property.fullAddress || property.location}
                            </div>
                        </div>
                        {property.description && (
                            <div style={{ marginTop: 15, borderTop: "1px solid #ddd", paddingTop: 10 }}>
                                <strong>Subject Description:</strong> {property.description}
                            </div>
                        )}
                    </div>

                    <h3 style={{ borderBottom: "1px solid #111", paddingBottom: 8, marginBottom: 20 }}>1. SCOPE OF AGREEMENT</h3>
                    
                    {/* Buyer's Section */}
                    <div style={{ marginBottom: 30 }}>
                        <h4 style={{ color: "#0b6623", marginBottom: 10 }}>A. BUYER'S AGREEMENT TO PURCHASE</h4>
                        <p>
                            I, <strong>{winningBid.bidderName}</strong> (the "Buyer"), having been declared the successful high bidder, hereby confirm my irrevocable intent to purchase the subject property for the sum of <strong>₹{winningBid.amount?.toLocaleString()}</strong>. I acknowledge that this digital signature constitutes a binding legal commitment to proceed with the offline transaction as per the terms of the EstateAuction platform.
                        </p>
                    </div>

                    {/* Seller's Section */}
                    <div style={{ marginBottom: 30 }}>
                        <h4 style={{ color: "#003FB1", marginBottom: 10 }}>B. SELLER'S AGREEMENT TO SELL</h4>
                        <p>
                            I, <strong>{property.sellerName} | {property.sellerAadhar || property.sellerPhone}</strong> (the "Seller"), legal owner of the property, hereby acknowledge the winning bid of <strong>₹{winningBid.amount?.toLocaleString()}</strong> and formally agree to sell and transfer the legal title of the property to <strong>{winningBid.bidderName}</strong>. I confirm that all details provided about the land are accurate to the best of my knowledge and I authorize the commencement of the offline transfer process.
                        </p>
                    </div>

                    <h3 style={{ borderBottom: "1px solid #111", paddingBottom: 8, marginBottom: 20 }}>2. SAFE OFFLINE TRANSACTION</h3>
                    <p style={{ fontWeight: 600, color: "#d32f2f" }}>
                        SAFE TRANSACTION NOTICE: Both parties hereby acknowledge that no financial exchange for this property is authorized on this website. Total payments must be handled through verified offline banking channels. The platform serves only as a witness and legal record of the auction's outcome.
                    </p>

                    <h3 style={{ borderBottom: "1px solid #111", paddingBottom: 8, marginBottom: 20 }}>3. CONTRACTUAL BINDING</h3>
                    <p>
                        By clicking "Sign & Accept", the Buyer acknowledges that their bid is a binding legal promise to purchase. Failure to proceed with the transaction may result in account suspension and possible legal action as per local real estate laws.
                    </p>

                    {/* SIGNATURE SECTION */}
                    <div style={{ marginTop: 80, display: "grid", gridTemplateColumns: (property.agreementSellerSigned || isSeller) ? "1fr 1fr" : "1fr", gap: 60 }}>
                        {/* Seller Signature Column - Hidden from Buyer until Seller signs */}
                        {(property.agreementSellerSigned || isSeller || userRole === "admin") && (
                            <div>
                                <div style={{ marginBottom: 40 }}>
                                    <div style={{ borderBottom: "1px solid #111", height: 50, marginBottom: 8, display: "flex", alignItems: "flex-end" }}>
                                    {property.agreementSellerSigned ? (
                                        <span style={{ fontFamily: "cursive", fontSize: 28, color: "#003FB1" }}>{property.agreementSellerSignature}</span>
                                    ) : (
                                        userRole === "admin" ? (
                                            <span style={{ fontSize: 13, color: "#999", letterSpacing: 1 }}>________________ (PENDING)</span>
                                        ) : isSeller ? (
                                            <div style={{ width: "100%" }}>
                                                <input 
                                                    type="text" 
                                                    placeholder="Type Full Name to Sign" 
                                                    value={signature} 
                                                    onChange={(e) => setSignature(e.target.value)} 
                                                    style={{ border: "none", width: "100%", fontSize: 20, fontFamily: "cursive", color: "#003FB1", outline: "none", background: "transparent" }}
                                                />
                                                {signature.trim().length >= 2 && (
                                                    <button 
                                                        className="no-print"
                                                        onClick={handleSign}
                                                        style={{ 
                                                            marginTop: 15, background: "#003FB1", color: "#fff", border: "none", 
                                                            padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, width: "100%" 
                                                        }}
                                                    >
                                                        🖋️ Finalize & Download Record
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <i style={{ color: "#999", fontSize: 13 }}>Waiting for Seller signature...</i>
                                        )
                                    )}
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 700 }}>SELLER SIGNATURE</div>
                                    <div style={{ fontSize: 11, color: "#666" }}>{property.sellerName} | {property.sellerAadhar || property.sellerPhone}</div>
                                    {property.agreementSellerSigned && <div style={{ fontSize: 9, color: "#4ade80", fontWeight: 700, marginTop: 4 }}>✓ VERIFIED E-SIGNATURE</div>}
                                </div>
                            </div>
                        )}
                        <div>
                            <div style={{ marginBottom: 40 }}>
                                <div style={{ borderBottom: "1px solid #111", height: 50, marginBottom: 8, display: "flex", alignItems: "flex-end" }}>
                                   {property.agreementBuyerSigned ? (
                                       <span style={{ fontFamily: "cursive", fontSize: 28, color: "#0b6623" }}>{property.agreementBuyerSignature}</span>
                                   ) : (
                                       userRole === "admin" ? (
                                           <span style={{ fontSize: 13, color: "#999", letterSpacing: 1 }}>PENDING SIGNATURE</span>
                                       ) : isWinner ? (
                                           <div style={{ width: "100%" }}>
                                             <input 
                                               type="text" 
                                               placeholder="Type Full Name to Sign" 
                                               value={signature} 
                                               onChange={(e) => setSignature(e.target.value)} 
                                               style={{ border: "none", width: "100%", fontSize: 20, fontFamily: "cursive", color: "#0b6623", outline: "none", background: "transparent" }}
                                             />
                                             {signature.trim().length >= 2 && (
                                                 <button 
                                                    className="no-print"
                                                    onClick={handleSign}
                                                    style={{ 
                                                        marginTop: 15, background: "#0b6623", color: "#fff", border: "none", 
                                                        padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, width: "100%" 
                                                    }}
                                                 >
                                                    🖋️ Sign & Download Official Record
                                                 </button>
                                             )}
                                           </div>
                                       ) : (
                                           <i style={{ color: "#999", fontSize: 13 }}>Waiting for Buyer signature...</i>
                                       )
                                   )}
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 700 }}>BUYER SIGNATURE</div>
                                <div style={{ fontSize: 11, color: "#666" }}>{winningBid.bidderName} | {winningBid.aadharNumber}</div>
                                {property.agreementBuyerSigned && <div style={{ fontSize: 9, color: "#4ade80", fontWeight: 700, marginTop: 4 }}>✓ VERIFIED E-SIGNATURE</div>}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 60, textAlign: "center", fontSize: 11, color: "#aaa" }}>
                        This document was automatically generated by EstateAuction Real Estate Platform.<br/>
                        Generated on: {new Date().toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    );
}
