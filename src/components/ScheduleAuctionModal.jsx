// src/components/ScheduleAuctionModal.jsx
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { propertyService } from "../services/propertyService";
import { notificationService } from "../services/notificationService";

export default function ScheduleAuctionModal({ property, onClose }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!startDate || !endDate) {
      return setError("Please select start and end date/time.");
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start <= new Date()) {
      return setError("Auction start time must be in the future.");
    }
    if (end <= start) {
      return setError("Auction end time must be after start time.");
    }

    setLoading(true);
    try {
      await propertyService.scheduleAuction(property.id, start, end);
      await notificationService.notifySellerDecision(property, "approved");
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  const inputStyle = {
    width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",
    borderRadius:10,padding:"12px 14px",color:"#fff",fontSize:14,
    fontFamily:"var(--font-body)",outline:"none",marginTop:8, colorScheme:"dark"
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 450 }}>
        
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 }}>
          <h2 style={{ fontFamily:"var(--font-display)",fontSize:24,fontWeight:500 }}>Schedule Auction</h2>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:20,lineHeight:1 }}>✕</button>
        </div>

        <div style={{ background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.3)", padding:16, borderRadius:12, marginBottom:24 }}>
           <div style={{ color:"#4ade80", fontSize:14, fontWeight:600, display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>✓ Approved for Auction</div>
           <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.4 }}>
             "{property.title}" has passed administration review. Please configure your preferred timeline to officially launch the auction.
           </div>
        </div>

        {error && <div className="msg-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:13,color:"rgba(255,255,255,0.6)", fontWeight:500 }}>Auction Start Date & Time</label>
            <input
              type="datetime-local"
              style={inputStyle}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:13,color:"rgba(255,255,255,0.6)", fontWeight:500 }}>Auction End Date & Time</label>
            <input 
              type="datetime-local" 
              style={inputStyle} 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
            />
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:8 }}>
              Auction goes live at start time and closes automatically at end time.
            </div>
          </div>

          <div style={{ display:"flex",gap:12, marginTop:32 }}>
            <button type="button" onClick={onClose} style={{
              flex:1,padding:"14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",
              background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)", fontWeight:500
            }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ flex:2, borderRadius:10, padding:"14px" }} disabled={loading}>
              {loading ? "Proceeding..." : "Proceed Auction"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
