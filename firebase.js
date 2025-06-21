// firebase.js
// Import des modules Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// 1) Initialisation — remplace storageBucket par “.appspot.com”
const firebaseConfig = {
  apiKey: "AIzaSyCI5yQhUVJKKktWCG2svsxx4RaiCTHBahc",
  authDomain: "dialecte-e23ae.firebaseapp.com",
  projectId: "dialecte-e23ae",
  storageBucket: "dialecte-e23ae.appspot.com",
  messagingSenderId: "455539698432",
  appId: "G-2RCV5ZR5WN"
};
const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// 2) Observer l'état de connexion
export function initAuthListener(onUserChange) {
  onAuthStateChanged(auth, user => onUserChange(user));
}

// 3) Inscription
export async function signup(firstName, email, password) {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCred.user, { displayName: firstName });
  await setDoc(doc(db, "users", userCred.user.uid), {
    firstName,
    email,
    progress: []
  });
  return userCred.user;
}

// 4) Connexion
export async function login(email, password) {
  const userCred = await signInWithEmailAndPassword(auth, email, password);
  return userCred.user;
}

// 5) Sauvegarder une réponse dans le parcours
export async function saveProgress(uid, frWord, wasCorrect) {
  await updateDoc(doc(db, "users", uid), {
    progress: arrayUnion({ word: frWord, correct: wasCorrect, timestamp: Date.now() })
  });
}

// 6) Déconnexion
export function logout() {
  return signOut(auth);
}