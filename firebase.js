// firebase.js
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

// → Vérifié : storageBucket doit être .appspot.com
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

export function initAuthListener(onChange) {
  onAuthStateChanged(auth, user => onChange(user));
}

export async function signup(firstName, email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: firstName });
  await setDoc(doc(db, "users", user.uid), {
    firstName, email, progress: []
  });
  return user;
}

export async function login(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function saveProgress(uid, word, correct) {
  await updateDoc(doc(db, "users", uid), {
    progress: arrayUnion({ word, correct, timestamp: Date.now() })
  });
}

export function logout() {
  return signOut(auth);
}