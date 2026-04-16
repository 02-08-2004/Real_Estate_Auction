import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

export function useSellerStatus(currentUser) {
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "properties"),
      where("sellerId", "==", currentUser.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const listings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyListings(listings);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  return { myListings, loading };
}
