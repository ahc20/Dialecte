// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// → Vérifie que ça correspond exactement à ta console Firebase
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

// Inscription
export async function signup(firstName, email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  // Ajoute le prénom dans le profil
  await updateProfile(user, { displayName: firstName });
  // Crée un doc user en base
  await setDoc(doc(db, "users", user.uid), {
    firstName,
    email,
    progress: []
  });
  return user;
}

// Connexion
export async function login(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

// 5) Sauvegarder une réponse dans le parcours
export async function saveProgress(uid, frWord, wasCorrect) {
    await updateDoc(doc(db, "users", uid), {
      progress: arrayUnion({ word: frWord, correct: wasCorrect, timestamp: Date.now() })
    });
  }
  
  // 6) Récupérer le tableau des progrès de l’utilisateur
  import { getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
  export async function getProgress(uid) {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      return snap.data().progress;  // renvoie un array de { word, correct, timestamp }
    }
    return [];
  }
  
  // 7) Déconnexion
  export function logout() {
    return signOut(auth);
  }