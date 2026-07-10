import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { propertyService } from "../services/propertyService";
import { notificationService } from "../services/notificationService";

export default function BidderManagementView({ property, onClose }) {
  const [bidders, setBidders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!property?.id) return;
    const q = collection(db, "properties", property.id, "registeredBidders");
    const unsub = onSnapshot(q, snap => {
      setBidders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [property?.id]);

  const approve = async (b) => {
    try {
        await propertyService.approveBidderParticipation(property.id, b.id);
        await notificationService.notifyBidderDecision(b.id, b.bidderEmail, b.bidderName, property.title, 'approved');
        alert(`Approved ${b.bidderName || b.id}`);
    } catch (e) {
        alert("Action failed: " + e.message);
    }
  };

  const reject = async (b) => {
    const reason = prompt("Reason for rejection:");
    if (reason === null) return;
    try {
        await propertyService.rejectBidderParticipation(property.id, b.id, reason);
        await notificationService.notifyBidderDecision(b.id, b.bidderEmail, b.bidderName, property.title, 'rejected', reason);
        alert(`Rejected ${b.bidderName || b.id}`);
    } catch (e) {
        alert("Action failed: " + e.message);
    }
  };

  return (
    <div className="card-architectural" style={{ background: "rgba(10, 10, 10, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, overflow: "hidden" }}>
      <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
         <div>
            <h3 style={{ margin: 0, fontSize: 18, color: "#fff" }}>Bidders: {property.title}</h3>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Review and manage participation requests for this auction.</p>
         </div>
         <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>← BACK</button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              {["Bidder", "Status", "Details", "Action"].map(h => (
                <th key={h} style={{ padding: "16px 24px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan="4" style={{ padding: "4rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Loading Bidders...</td></tr>
            ) : bidders.length === 0 ? (
               <tr><td colSpan="4" style={{ padding: "4rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>No bidders registered.</td></tr>
            ) : bidders.map(b => (
              <tr key={b.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                <td style={{ padding: "16px 24px" }}>
                   <div style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>{b.bidderName || b.id.substring(0,8)}</div>
                   <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{b.bidderEmail}</div>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <span style={{ 
                    fontSize: 10, padding: "3px 8px", borderRadius: 4, fontWeight: 800,
                    background: b.verificationStatus === 'approved' ? "rgba(74,222,128,0.1)" : b.verificationStatus === 'rejected' ? "rgba(232,25,44,0.1)" : "rgba(245,158,11,0.1)",
                    color: b.verificationStatus === 'approved' ? "#4ade80" : b.verificationStatus === 'rejected' ? "#ff6b7a" : "#f59e0b"
                  }}>{(b.verificationStatus || 'pending').toUpperCase()}</span>
                </td>
                <td style={{ padding: "16px 24px" }}>
                   <div style={{ fontSize: 13, color: "#fff" }}>ID: {b.aadharNumber?.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') || "N/A"}</div>
                   {b.idProofThumbnail && (
                     <img src={b.idProofThumbnail} alt="ID Proof"
                       style={{ marginTop: 6, width: 80, height: 50, objectFit: "cover", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}
                       onClick={() => { const w = window.open(); w.document.write(`<img src="${b.idProofThumbnail}" style="max-width:100%">`); }}
                     />
                   )}
                </td>
                <td style={{ padding: "16px 24px" }}>
                   <div style={{ display: "flex", gap: 8 }}>
                      {b.verificationStatus !== 'approved' && (
                        <button 
                          onClick={() => approve(b)}
                          style={{ background: "#4ade80", color: "#000", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                        >APPROVE</button>
                      )}
                      {b.verificationStatus !== 'rejected' && (
                        <button 
                          onClick={() => reject(b)}
                          style={{ background: "rgba(232,25,44,0.1)", color: "#ff6b7a", border: "1px solid rgba(232,25,44,0.2)", borderRadius: 6, padding: "6px 12px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}
                        >REJECT</button>
                      )}
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
