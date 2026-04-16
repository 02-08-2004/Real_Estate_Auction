// src/components/AddPropertyModal.jsx
import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export default function AddPropertyModal({ onClose }) {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    title: "", description: "", location: "",
    startingPrice: "", endDate: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const price = parseFloat(form.startingPrice);
    if (!price || price <= 0) return setError("Enter a valid starting price.");
    if (!form.endDate) return setError("End date is required.");
    if (new Date(form.endDate) <= new Date()) return setError("End date must be in the future.");
    setLoading(true);
    try {
      await addDoc(collection(db, "properties"), {
        title: form.title,
        description: form.description,
        location: form.location,
        startingPrice: price,
        currentBid: price,
        endDate: form.endDate,
        sellerId: currentUser.uid,
        imageUrls: [],
        status: "live",
        approved: true,
        createdAt: serverTimestamp(),
      });
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  const inputStyle = {
    width:"100%",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",
    borderRadius:12,padding:"14px 16px",color:"#fff",fontSize:14,
    fontFamily:"var(--font-body)",outline:"none",marginTop:8, backdropFilter: "blur(10px)"
  };
  const labelStyle = { fontSize:12,color:"rgba(255,255,255,0.7)", fontWeight:700, textTransform: "uppercase", letterSpacing: "1px" };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 }}>
          <h2 style={{ fontFamily:"var(--font-display)",fontSize:28,fontWeight:500 }}>Add Property</h2>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:20,lineHeight:1 }}>✕</button>
        </div>

        {error && <div className="msg-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {[
            ["title","Property Title","e.g. Luxury Villa in Vizag","text"],
            ["location","Location","City / Area","text"],
            ["startingPrice","Starting Price (₹)","e.g. 5000000","number"],
            ["endDate","Auction End Date","","date"],
          ].map(([key,label,ph,type]) => (
            <div key={key} style={{ marginBottom:14 }}>
              <label style={labelStyle}>{label}</label>
              <input
                type={type}
                placeholder={ph}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                required
                min={type==="number" ? 1 : undefined}
                style={{ ...inputStyle, colorScheme:"dark" }}
              />
            </div>
          ))}

          <div style={{ marginBottom:20 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              placeholder="Describe the property..."
              value={form.description}
              onChange={e => set("description", e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize:"vertical" }}
            />
          </div>

          <div style={{ display:"flex",gap:10 }}>
            <button type="button" onClick={onClose} style={{
              flex:1,padding:"11px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",
              background:"transparent",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:14,fontFamily:"var(--font-body)"
            }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ flex:2 }} disabled={loading}>
              {loading ? "Adding..." : "Add Property →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
