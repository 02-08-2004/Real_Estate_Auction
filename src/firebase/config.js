// src/firebase/config.js
// ⚠️  REPLACE ALL VALUES BELOW with your own Firebase project credentials
// Go to: https://console.firebase.google.com → Your Project → Project Settings → Web App

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBVo8vZAsew6PuKpkqMvSvWPA4CCPJZMUw",
  authDomain: "house-bidding-platform.firebaseapp.com",
  projectId: "house-bidding-platform",
  storageBucket: "house-bidding-platform.firebasestorage.app",
  messagingSenderId: "746190463194",
  appId: "1:746190463194:web:9c9a9251938939bfef45e3",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
export const storage = getStorage(app, "gs://house-bidding-platform.firebasestorage.app");
export default app;
