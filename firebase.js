// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCI5yQhUVJKKktWCG2svsxx4RaiCTHBahc",
  authDomain: "dialecte-e23ae.firebaseapp.com",
  projectId: "dialecte-e23ae",
  storageBucket: "dialecte-e23ae.appspot.com",
  messagingSenderId: "455539698432",
  appId: "G-2RCV5ZR5WN"
};

initializeApp(firebaseConfig);
export const auth = getAuth();
export const db   = getFirestore();

// Inscription
export async function signup(firstName, email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: firstName });
  await setDoc(doc(db, "users", user.uid), {
    firstName, email, progress: []
  });
  return user;
}

// Connexion
export async function login(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

// Écoute session
export function initAuthListener(cb) {
  onAuthStateChanged(auth, user => cb(user));
}

// Sauvegarde progrès
export async function saveProgress(uid, word, correct) {
  console.log("Saving progress for", uid, word, correct);
  await updateDoc(doc(db, "users", uid), {
    progress: arrayUnion({ word, correct, timestamp: Date.now() })
  });
}

// Récupérer progrès
export async function getProgress(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data().progress : [];
}

// Déconnexion
export function logout() {
  return signOut(auth);
}