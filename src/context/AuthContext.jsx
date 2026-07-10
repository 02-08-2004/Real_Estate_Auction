// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Only set currentUser if email is verified
        if (user.emailVerified) {
          try {
            const snap = await getDoc(doc(db, "users", user.uid));
            if (snap.exists()) {
              setUserRole(snap.data().role);
            }
          } catch (e) {
            console.error("Firestore error:", e);
          }
          setCurrentUser(user);
        } else {
          // If not verified, ensure currentUser is null to prevent dashboard access
          setCurrentUser(null);
          setUserRole(null);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function register(name, email, password, role = "user") {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      email,
      role,
      createdAt: serverTimestamp(),
    });
    // Sign out immediately to prevent auto-login before verification
    await signOut(auth);
    return cred;
  }

  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (!cred.user.emailVerified) {
      await signOut(auth);
      throw new Error("Please verify your email before logging in.");
    }
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    if (!snap.exists()) throw new Error("User record not found.");
    return { user: cred.user, role: snap.data().role };
  }

  async function googleLogin() {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    if (!snap.exists()) {
      await setDoc(doc(db, "users", cred.user.uid), {
        name: cred.user.displayName,
        email: cred.user.email,
        role: "user",
        createdAt: serverTimestamp(),
      });
      return { user: cred.user, role: "user" };
    }
    return { user: cred.user, role: snap.data().role };
  }

  async function logout() {
    await signOut(auth);
  }

  const value = { currentUser, userRole, loading, register, login, googleLogin, logout };
  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
