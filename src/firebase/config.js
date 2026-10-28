// src/firebase/config.js
// ⚠️  REPLACE ALL VALUES BELOW with your own Firebase project credentials
// Go to: https://console.firebase.google.com → Your Project → Project Settings → Web App

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  deleteUser,
  signOut,
} from "firebase/auth";
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

/**
 * Checks whether an email address is already registered in Firebase Auth
 * without requiring Firestore read permissions on `/users` and without
 * affecting the primary `auth` session.
 */
export async function checkEmailRegistered(email) {
  const trimmed = (email || "").trim();
  const verifierApp =
    getApps().find((a) => a.name === "emailVerifier") ||
    initializeApp(firebaseConfig, "emailVerifier");
  const verifierAuth = getAuth(verifierApp);

  try {
    const cred = await createUserWithEmailAndPassword(
      verifierAuth,
      trimmed,
      "__TempVerifyCheck_918273!Aa"
    );
    // If creation succeeded, the email was NOT registered — immediately delete the temp Auth user
    try {
      await deleteUser(cred.user);
    } catch (_) {
      await signOut(verifierAuth).catch(() => {});
    }
    return false;
  } catch (err) {
    if (err?.code === "auth/email-already-in-use") {
      return true;
    }
    if (err?.code === "auth/invalid-email") {
      throw err;
    }
    // For network/rate-limit errors, assume registered so we don't block valid users
    return true;
  }
}

export default app;
