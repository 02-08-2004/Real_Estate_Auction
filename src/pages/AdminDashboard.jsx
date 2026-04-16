// src/pages/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, serverTimestamp, addDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import PropertyCard from "../components/PropertyCard";
import AddPropertyModal from "../components/AddPropertyModal";
import { 
  UsersIcon, 
  QueueListIcon, 
  TagIcon, 
  ArchiveBoxIcon, 
  ChartBarIcon, 
  ClipboardDocumentListIcon,
  CalendarIcon,
  NoSymbolIcon,
  ClockIcon
} from "@heroicons/react/24/outline";
import { propertyService } from "../services/propertyService";
import { notificationService } from "../services/notificationService";
import ScheduleAuctionModal from "../components/ScheduleAuctionModal";
import BidderManagementView from "../components/BidderManagementView";

// Sub-components for better organization
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

export default function AdminDashboard() {
  const { currentUser, userRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "analytics";
  
  const [properties, setProperties] = useState([]);
  const [bidsMap, setBidsMap] = useState({});
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [schedulingProperty, setSchedulingProperty] = useState(null);
  const [viewingBiddersFor, setViewingBiddersFor] = useState(null);
  const [biddersMap, setBiddersMap] = useState({});

  // Firestore Sync
  useEffect(() => {
    // 1. Properties
    // 1. Properties - Removed orderBy to avoid indexing requirements
    const qProps = query(collection(db, "properties"));
    const unsubProps = onSnapshot(qProps, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort in memory instead
      setProperties(docs.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB - dateA;
      }));
    });

    // 2. Bids
    const qBids = query(collection(db, "bids"), orderBy("createdAt", "desc"));
    const unsubBids = onSnapshot(qBids, snap => {
      const map = {};
      snap.docs.forEach(d => {
        const b = { id: d.id, ...d.data() };
        if (!map[b.propertyId]) map[b.propertyId] = [];
        map[b.propertyId].push(b);
      });
      setBidsMap(map);
    });

    // 3. Users (Only for users tab or analytics)
    const qUsers = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubUsers = onSnapshot(qUsers, snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 4. Logs
    const qLogs = query(collection(db, "auditLogs"), orderBy("createdAt", "desc"));
    const unsubLogs = onSnapshot(qLogs, snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => { unsubProps(); unsubBids(); unsubUsers(); unsubLogs(); };
  }, []);

  // Actions
  const logAction = async (action, details) => {
    try {
      await addDoc(collection(db, "auditLogs"), {
        adminId: currentUser.uid,
        adminName: currentUser.displayName || currentUser.email,
        action,
        details,
        createdAt: serverTimestamp()
      });
    } catch (e) { console.error("Log error:", e); }
  };

  const deleteProperty = async (id, title) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await deleteDoc(doc(db, "properties", id));
    await logAction("DELETE_PROPERTY", `Deleted property: ${title}`);
  };

  const approveProperty = async (id, title) => {
    const prop = properties.find(p => p.id === id);
    if (!prop) return;
    await updateDoc(doc(db, "properties", id), { 
      status: "approved", 
      approved: true,
      approvedAt: serverTimestamp() 
    });
    await notificationService.notifySellerDecision(prop, "approved");
    await logAction("APPROVE_PROPERTY_FOR_SELLER_SCHEDULING", `Approved property: ${title}. Seller notified to schedule.`);
  };

  const rejectProperty = async (id, title) => {
    const reason = prompt(`Reason for rejecting "${title}":`);
    if (reason === null) return;
    const prop = properties.find(p => p.id === id);
    await propertyService.rejectListing(id, reason);
    await notificationService.notifySellerDecision(prop, "rejected", reason);
    await logAction("REJECT_PROPERTY", `Rejected property: ${title}. Reason: ${reason}`);
  };


  const handleResetSystem = async () => {
    const confirmation1 = confirm("⚠️ CRITICAL ACTION: Are you sure you want to erase ALL auction data?\n\nThis will delete all properties, bids, and notifications. This cannot be undone.");
    if (!confirmation1) return;
    
    const confirmation2 = prompt("To confirm, please type 'ERASE ALL' in the box below:");
    if (confirmation2 !== 'ERASE ALL') {
        alert("Reset cancelled. Text did not match.");
        return;
    }

    setLoading(true);
    try {
        const collections = ["properties", "bids", "notifications", "auditLogs"];
        let totalDeleted = 0;

        for (const collName of collections) {
            const q = query(collection(db, collName));
            // In a real production environment, this should be a recursive batch deletion.
            // For this app, we'll fetch and delete each document.
            const snap = await getDocs(q); 
            for (const d of snap.docs) {
                await deleteDoc(doc(db, collName, d.id));
                totalDeleted++;
            }
        }

        await logAction("SYSTEM_RESET", `Total reset performed. ${totalDeleted} documents removed.`);
        alert(`System reset successful. ${totalDeleted} records were removed from the database.`);
        setSearchParams({ tab: 'analytics' });
    } catch (e) {
        console.error("Reset error:", e);
        alert("An error occurred during reset. Check console for details.");
    } finally {
        setLoading(false);
    }
  };

  // Derived Filtered Data
  const now = new Date();
  const pending = properties.filter(p => !p.status || p.status === "pending" || p.status === "pending_review");
  const active = properties.filter(p => p.status === "live" && new Date(p.endDate) > now);
  const ended = properties.filter(p => p.status === "ended" || p.status === "cancelled" || (p.status === "live" && new Date(p.endDate) <= now));

  // Switch Views
  const renderContent = () => {
    if (loading) return <div style={{ textAlign:"center", padding:"10rem", color:"var(--text-muted)" }}>Initializing Management Engine...</div>;
    if (viewingBiddersFor) return <BidderManagementView property={viewingBiddersFor} onClose={() => setViewingBiddersFor(null)} />;

    switch (currentTab) {
      case "analytics":
        return <AnalyticsView properties={properties} bidsMap={bidsMap} users={users} />;
      case "pending":
        return <PendingReviewView properties={pending} onApprove={approveProperty} onReject={rejectProperty} />;
      case "active":
        return <PropertyGridView properties={active} bidsMap={bidsMap} onDelete={deleteProperty} onViewBidders={(p) => setViewingBiddersFor(p)} title="Active Auctions" />;
      case "ended":
        return <PropertyGridView properties={ended} bidsMap={bidsMap} onDelete={deleteProperty} onViewBidders={(p) => setViewingBiddersFor(p)} title="Past Auctions" />;
      case "users":
        return <UserManagementView users={users} />;
      case "logs":
        return <AuditLogView logs={logs} />;
      case "maintenance":
        return <MaintenanceView onReset={handleResetSystem} />;
      default:
        return <AnalyticsView properties={properties} bidsMap={bidsMap} users={users} />;
    }
  };

  return (
    <div className="admin-container" style={{ padding: "1.5rem 2.5rem 6rem" }}>
      {showModal && <AddPropertyModal onClose={() => setShowModal(false)} />}
      {schedulingProperty && <ScheduleAuctionModal property={schedulingProperty} onClose={() => setSchedulingProperty(null)} />}
      
      {/* Dynamic Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
           <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 400, margin: 0, textTransform: "capitalize" }}>
             {currentTab.replace("-", " ")}
           </h1>
           <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>System Control & Oversight</p>
        </div>
        {(currentTab === "active" || currentTab === "pending") && (
          <button className="btn-primary" style={{ width: "auto", padding: "12px 24px" }} onClick={() => setShowModal(true)}>
            + NEW PROPERTY
          </button>
        )}
      </div>

      {renderContent()}
    </div>
  );
}

// Sub-View Components
function AnalyticsView({ properties, bidsMap, users }) {
  const totalBids = Object.values(bidsMap).flat();
  const totalVolume = totalBids.reduce((s, b) => s + (b.amount || 0), 0);
  
  // Calculate 7-day trend
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayName = d.toLocaleDateString([], { weekday: 'short' });
    const count = totalBids.filter(b => {
      const bidDate = b.createdAt?.toDate?.() || (b.createdAt && new Date(b.createdAt));
      return bidDate && bidDate.toDateString() === d.toDateString();
    }).length;
    return { name: dayName, bids: count };
  });

  const stats = [
    { label: "Gross Bid Volume", val: `₹${(totalVolume/100000).toFixed(1)}L`, icon: ChartBarIcon, color: "var(--primary)" },
    { label: "Registered Users", val: users.length, icon: UsersIcon, color: "#60a5fa" },
    { label: "Active Properties", val: properties.filter(p => p.status === 'live').length, icon: TagIcon, color: "#4ade80" },
    { label: "Total Bids", val: totalBids.length, icon: ArchiveBoxIcon, color: "#f59e0b" },
  ];

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: 40 }}>
        {stats.map(s => (
          <div key={s.label} className="card-architectural" style={{ padding: 24 }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                   <div className="text-label" style={{ marginBottom: 8 }}>{s.label}</div>
                   <div style={{ fontSize: 28, fontWeight: 400 }}>{s.val}</div>
                </div>
                <div style={{ padding: 10, background: "rgba(255,255,255,0.03)", borderRadius: 12 }}>
                   <s.icon style={{ width: 20, height: 20, color: s.color }} />
                </div>
             </div>
          </div>
        ))}
      </div>

      <div className="card-architectural" style={{ padding: "32px 32px 48px", height: 420 }}>
         <h3 className="text-label" style={{ marginBottom: 32 }}>Bidding Activity (Last 7 Days)</h3>
         <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBids" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                stroke="rgba(255,255,255,0.2)" 
                fontSize={11} 
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.2)" 
                fontSize={11} 
                tickLine={false}
                axisLine={false}
                dx={-10}
              />
              <Tooltip 
                contentStyle={{ background: "rgba(10,10,10,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, backdropFilter: "blur(10px)" }}
                itemStyle={{ color: "#fff", fontWeight: 700 }}
              />
              <Area 
                type="monotone" 
                dataKey="bids" 
                stroke="var(--primary)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorBids)" 
                animationDuration={1500}
              />
            </AreaChart>
         </ResponsiveContainer>
      </div>
    </div>
  );
}

function PendingReviewView({ properties, onApprove, onReject }) {
  const pending = properties.filter(p => !p.status || p.status === "pending" || p.status === "pending_review");

  const RenderDetailedRow = (p) => (
    <div key={p.id} className="card-architectural" style={{ marginBottom: 20, padding: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: 180 }}>
        {/* Left: Basic Media/ID */}
        <div style={{ position: "relative", overflow: "hidden" }}>
           {p.imageUrls?.[0] ? <img src={p.imageUrls[0]} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#111" }}>No Image</div>}
           <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}></div>
           <div style={{ position: "absolute", bottom: 12, left: 12 }}>
              <div className="text-label" style={{ color: "#fff", marginBottom: 4 }}>Seller Contact</div>
              <div style={{ fontSize: 13 }}>{p.sellerName}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{p.sellerPhone}</div>
           </div>
        </div>

        {/* Right: Technical Details */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                   <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, margin: 0 }}>{p.title}</h2>
                   <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>📍 {p.location}</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                   <button onClick={() => onApprove(p.id, p.title)} style={{ background: "var(--primary)", border: "none", color: "#fff", padding: "10px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>APPROVE</button>
                   <button onClick={() => onReject(p.id, p.title)} style={{ background: "rgba(232, 25, 44, 0.1)", border: "1px solid rgba(232, 25, 44, 0.2)", color: "var(--red)", padding: "10px 16px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>REJECT</button>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20, padding: "16px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <div className="text-label" style={{ marginBottom: 6 }}>Full Address</div>
                  <div style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(255,255,255,0.8)" }}>{p.fullAddress || p.location}</div>
                </div>
                <div>
                  <div className="text-label" style={{ marginBottom: 6 }}>Legal Specs</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>Plot: {p.plotNumber || "N/A"}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>Survey: {p.surveyDetails || "N/A"}</div>
                </div>
                <div>
                  <div className="text-label" style={{ marginBottom: 6 }}>Pricing</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>₹{p.startingPrice?.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Increment: ₹{p.bidIncrement?.toLocaleString()}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                   {p.landDocumentUrl ? (
                     <a href={p.landDocumentUrl} download={`Docs_${p.title}.pdf`} target="_blank" rel="noreferrer" style={{ textDecoration: "none", background: "rgba(255,255,255,0.08)", color: "#fff", padding: "12px", borderRadius: 8, textAlign: "center", fontSize: 11, fontWeight: 700, border: "1px solid rgba(255,255,255,0.1)" }}>
                       📋 VIEW DOCS
                     </a>
                   ) : (
                     <div style={{ fontSize: 11, color: "rgba(232,25,44,0.5)", textAlign: "center" }}>NO LEGAL DOCS</div>
                   )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 24 }}>New Submissions</h3>
      <div>
        {pending.length === 0 ? (
          <div style={{ textAlign: "center", padding: "6rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1px dashed rgba(255,255,255,0.1)" }}>
            No new properties awaiting review.
          </div>
        ) : (
          pending.map(p => RenderDetailedRow(p))
        )}
      </div>
    </div>
  );
}

function PropertyGridView({ properties, bidsMap, onDelete, onFinalize, onViewBidders, title }) {
  const { currentUser, userRole } = useAuth();
  return (
    <div className="properties-grid">
      {properties.length === 0 ? (
        <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "10rem", color: "var(--text-muted)" }}>No {title.toLowerCase()} found.</div>
      ) : (
        properties.map(p => (
          <div key={p.id} style={{ position: "relative" }}>
            <PropertyCard property={p} bids={bidsMap[p.id] || []} />
            {/* Management Buttons - Restricted to Stakeholders (Seller/Winner/Admin for active, Seller/Winner for ended) */}
            {((p.status === 'live' || p.status === 'scheduled') ? (currentUser?.uid === p.sellerId || userRole === "admin") : (currentUser?.uid === p.sellerId || p.winnerId === currentUser?.uid)) && (
              <div style={{ position:"absolute", top:12, right:12, display: "flex", gap: 6, zIndex: 10 }}>
                {(p.status === 'live' || p.status === 'scheduled') && (
                  <button 
                    onClick={() => onViewBidders(p)}
                    style={{ background: "rgba(96, 165, 250, 0.9)", border: "none", borderRadius: 6, color: "#fff", padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)" }}
                  >BIDDERS</button>
                )}
                <button 
                  onClick={() => onDelete(p.id, p.title)}
                  style={{ background:"rgba(232, 25, 44, 0.8)", border:"none", borderRadius:6, color:"#fff", padding:"4px 8px", fontSize:10, cursor:"pointer", backdropFilter: "blur(4px)" }}
                >DELETE</button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function UserManagementView({ users }) {
  return (
    <div className="card-architectural">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {["User", "Email", "Role", "Joined"].map(h => (
              <th key={h} style={{ padding: "16px 24px" }} className="text-label">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
              <td style={{ padding: "16px 24px", fontSize: 14 }}>{u.name || "N/A"}</td>
              <td style={{ padding: "16px 24px", fontSize: 14, color: "var(--text-muted)" }}>{u.email}</td>
              <td style={{ padding: "16px 24px" }}>
                <span style={{ fontSize: 10, padding: "3px 8px", background: u.role === 'admin' ? "rgba(232,25,44,0.1)" : "rgba(255,255,255,0.05)", color: u.role === 'admin' ? "var(--red)" : "#fff", borderRadius: 4, fontWeight: 700 }}>{u.role?.toUpperCase()}</span>
              </td>
              <td style={{ padding: "16px 24px", fontSize: 13, color: "var(--text-muted)" }}>{u.createdAt?.toDate?.()?.toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditLogView({ logs }) {
  return (
    <div className="card-architectural" style={{ padding: 0 }}>
       {logs.length === 0 ? (
         <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>No system activity recorded yet.</div>
       ) : (
         logs.map((log, i) => (
           <div key={log.id} style={{ padding: "16px 24px", borderBottom: i === logs.length - 1 ? "none" : "1px solid rgba(255,255,255,0.03)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                 <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ClipboardDocumentListIcon style={{ width: 16, height: 16, color: "var(--primary)" }} />
                 </div>
                 <div>
                    <div style={{ fontSize: 13, color: "#fff" }}>{log.details}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>by {log.adminName}</div>
                 </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                 {log.createdAt?.toDate?.()?.toLocaleString()}
              </div>
           </div>
         ))
       )}
    </div>
  );
}

function MaintenanceView({ onReset }) {
  return (
    <div className="card-architectural" style={{ padding: 48, textAlign: "center", border: "1px dashed rgba(232, 25, 44, 0.3)" }}>
       <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(232, 25, 44, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <NoSymbolIcon style={{ width: 32, height: 32, color: "var(--red)" }} />
       </div>
       <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, marginBottom: 12 }}>System Reset & Maintenance</h2>
       <p style={{ color: "var(--text-muted)", maxWidth: 450, margin: "0 auto 32px", fontSize: 14, lineHeight: 1.6 }}>
          This utility will permanently erase all auction-related documents including properties, bids, and system logs. 
          Use this only for testing purposes or when performing a seasonal system refresh.
       </p>
       
       <button 
          onClick={onReset}
          className="btn-primary" 
          style={{ background: "var(--red)", width: "auto", padding: "14px 32px", borderRadius: 12 }}
       >
          ERASE ALL SYSTEM DATA
       </button>
       
       <div style={{ marginTop: 24, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
           * User accounts and platform configuration will remain intact.
       </div>
    </div>
  );
}

