import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, where, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Hook for managing all data for the buyer's portal.
 * @param {object} currentUser - The current authenticated user.
 * @param {object} userData - Any additional user data.
 */
export function useBuyerStatus(currentUser, userData) {
  const [properties, setProperties] = useState([]);
  const [bidsMap, setBidsMap] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [registeredIds, setRegisteredIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeTick, setTimeTick] = useState(0);

  // TICKER FOR EXPIRING AUCTIONS
  useEffect(() => {
    const timer = setInterval(() => setTimeTick(t => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  // 5-MINUTE REMINDER ENGINE
  useEffect(() => {
    if (!currentUser || properties.length === 0) return;

    const checkReminders = async () => {
      const now = new Date();
      const fiveMinsFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      // Find registered auctions starting in ~5 minutes
      const upcoming = properties.filter(p => 
        p.status === "scheduled" && 
        registeredIds.includes(p.id) &&
        p.startDate && 
        new Date(p.startDate) > now && 
        new Date(p.startDate) <= fiveMinsFromNow
      );

      for (const p of upcoming) {
        // Prevent duplicate reminders in the same session
        const sessionKey = `notified_start_${p.id}`;
        if (window.sessionStorage.getItem(sessionKey)) continue;

        // Verify if a reminder notification already exists in Firestore (for persistence)
        const alreadyNotified = notifications.some(n => n.type === "auction_reminder_start" && n.propertyId === p.id);
        if (alreadyNotified) {
            window.sessionStorage.setItem(sessionKey, "true");
            continue;
        }

        // Trigger Notification
        try {
          const { notificationService } = await import("../services/notificationService");
          await notificationService.sendBell(currentUser.uid, `🚀 Get ready! The auction for "${p.title}" starts in 5 minutes.`, {
            type: "auction_reminder_start",
            propertyId: p.id
          });
          await notificationService.sendEmail(
            currentUser.email,
            userData?.name || currentUser.displayName || "User",
            `Auction Starting Soon: ${p.title}`,
            `<p>Your registered auction for <strong>${p.title}</strong> starts in 5 minutes!</p><p>Property Link: <a href="${window.location.origin}/auction/${p.id}">View Auction</a></p>`
          );
          window.sessionStorage.setItem(sessionKey, "true");
        } catch (e) { console.error("Reminder failed", e); }
      }
    };

    checkReminders();
  }, [timeTick, properties, registeredIds, currentUser, notifications]);

  // FETCH PROPERTIES
  useEffect(() => {
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, async (snap) => {
      const props = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProperties(props);
      setLoading(false);
      
      // Secondary fetch for registrations specific to this user across fetched properties
      if (currentUser) {
        const rIds = [];
        for (const p of props) {
          try {
            const regRef = doc(db, "properties", p.id, "registeredBidders", currentUser.uid);
            const regDoc = await getDoc(regRef);
            if (regDoc.exists()) {
              rIds.push(p.id);
            }
          } catch(e) {}
        }
        setRegisteredIds(rIds);
      }
    });
    return unsub;
  }, [currentUser]);

  // FETCH BIDS
  useEffect(() => {
    const q = query(collection(db, "bids"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach(d => {
        const bid = { id: d.id, ...d.data() };
        if (!map[bid.propertyId]) map[bid.propertyId] = [];
        map[bid.propertyId].push(bid);
      });
      setBidsMap(map);
    });
    return unsub;
  }, []);

  // FETCH NOTIFICATIONS
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "notifications"), 
      where("userId", "==", currentUser.uid), 
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [currentUser]);

  // DERIVED DATA
  const now = new Date();
  const isAuctionLiveNow = (property) => {
    if (property?.status !== "live") return false;
    if (!property?.startDate || !property?.endDate) return false;
    const start = new Date(property.startDate);
    const end = new Date(property.endDate);
    return start <= now && end > now;
  };

  // User's Participations (Registrations) that are currently live
  const activeBiddedProperties = properties.filter(
    p => registeredIds.includes(p.id) && isAuctionLiveNow(p)
  );

  const savedProperties = properties.filter(p => userData?.watchlist?.includes(p.id));
  
  const marketplaceAuctions = properties
    .filter(p => {
      const isLive = p.status === "live";
      const isUpcoming = p.status === "scheduled";
      const isApproved = p.status === "approved"; // Approved but pending schedule
      const isSeller = p.sellerId === currentUser?.uid;
      const isRegistered = registeredIds.includes(p.id);
      
      // Strict Time Check: Must not be expired date-wise
      const isExpired = p.endDate && new Date(p.endDate) <= now;
      
      // Marketplace: Show live/scheduled/approved auctions of OTHER users only, not expired
      return (isLive || isUpcoming || isApproved) && !isSeller && !isExpired;
    })
    .sort((a, b) => {
      // Primary sort: Live > Scheduled > Approved, then by Start Date
      const order = { live: 0, scheduled: 1, approved: 2 };
      const orderA = order[a.status] ?? 3;
      const orderB = order[b.status] ?? 3;
      if (orderA !== orderB) return orderA - orderB;
      const dateA = new Date(a.startDate || a.createdAt);
      const dateB = new Date(b.startDate || b.createdAt);
      return dateA - dateB;
    });
  // Active vs Past
  const activeAuctions = properties.filter(p => isAuctionLiveNow(p));
  
  // Properties where user placed a bid
  const userBidPropertyIds = Object.keys(bidsMap).filter(pId => bidsMap[pId].some(b => b.bidderId === currentUser?.uid));
  
  // My Bids (Participated bids which are done)
  const pastAuctions = properties.filter(p => userBidPropertyIds.includes(p.id) && (p.status === "ended" || p.winnerId || p.status === "contract_pending" || p.status === "sold" || (p.endDate && new Date(p.endDate) <= now)));
  
  const wonProperties = properties.filter(p => p.winnerId === currentUser?.uid);
  const wonCount = wonProperties.length;
  const totalSpent = wonProperties.reduce((sum, p) => sum + (p.currentBid || 0), 0);
  
  const myProperties = properties.filter(p => p.sellerId === currentUser?.uid);
  const scheduledReady = myProperties.filter(p => p.status === "approved_pending_schedule");

  // Advanced: Bid Graph Data (Last 7 days of user activity)
  const userBids = Object.values(bidsMap).flat().filter(b => b.bidderId === currentUser?.uid);
  const graphData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString([], { weekday: 'short' });
    const count = userBids.filter(b => {
      const bidDate = b.createdAt?.toDate();
      return bidDate && bidDate.toDateString() === d.toDateString();
    }).length;
    return { name: dateStr, bids: count };
  });

  return {
    properties,
    bidsMap,
    notifications,
    loading,
    activeBiddedProperties,
    savedProperties,
    marketplaceAuctions,
    activeAuctions,
    pastAuctions,
    wonCount,
    totalSpent,
    graphData,
    myProperties,
    scheduledReady,
    userBidPropertyIds
  };
}
