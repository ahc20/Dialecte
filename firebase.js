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
  increment
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

// 1) Écoute la session
export function initAuthListener(cb) {
  onAuthStateChanged(auth, user => cb(user));
}

// 2) Inscription (initialise les compteurs)
export async function signup(firstName, email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: firstName });
  await setDoc(doc(db, "users", user.uid), {
    firstName,
    email,
    totalAnswers: 0,
    correctAnswers: 0
  });
  return user;
}

// 3) Connexion
export async function login(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

// 4) Déconnexion
export function logout() {
  return signOut(auth);
}

// 5) Sauvegarde d’une réponse : incrémente total et, si correct, correctAnswers
export async function saveAnswer(uid, isCorrect) {
  const userRef = doc(db, "users", uid);
  const updates = { totalAnswers: increment(1) };
  if (isCorrect) updates.correctAnswers = increment(1);
  await updateDoc(userRef, updates);
}

// 6) Récupération des compteurs
export async function getScore(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return { totalAnswers: 0, correctAnswers: 0 };
  const d = snap.data();
  return {
    totalAnswers: d.totalAnswers || 0,
    correctAnswers: d.correctAnswers || 0
  };
}