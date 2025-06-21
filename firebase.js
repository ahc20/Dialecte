// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Ta config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCI5yQhUVJKKktWCG2svsxx4RaiCTHBahc",
  authDomain: "dialecte-e23ae.firebaseapp.com",
  projectId: "dialecte-e23ae",
  storageBucket: "dialecte-e23ae.appspot.com",
  messagingSenderId: "455539698432",
  appId: "G-2RCV5ZR5WN"
};

// Initialisation
const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

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
export function initAuthListener(onChange) {
  onAuthStateChanged(auth, user => onChange(user));
}

// Sauvegarde progrès
export async function saveProgress(uid, word, correct) {
  await updateDoc(doc(db, "users", uid), {
    progress: arrayUnion({ word, correct, timestamp: Date.now() })
  });
}

// Récupère progrès
export async function getProgress(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data().progress : [];
}

// Déconnexion
export function logout() {
  return auth.signOut();
}