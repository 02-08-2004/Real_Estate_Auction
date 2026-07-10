// src/hooks/useCountdown.js
import { useState, useEffect } from "react";

export function useCountdown(endDate) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function calc() {
      const end = new Date(endDate).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft(null);
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ d, h, m, s });
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  return { timeLeft, expired };
}
