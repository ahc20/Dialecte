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

// Fetch config from secure endpoint (Triggering Vercel rebuild with new env vars)
let app;
export let auth; // Export mutable let
export let db;   // Export mutable let

const initFirebase = async () => {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    if (!config.apiKey) throw new Error('No API Key found');

    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('[Firebase] Initialized securely');
  } catch (e) {
    console.error('[Firebase] Init failed:', e);
  }
};

// Start init immediately but export promises/functions needs care
// Since this is an ES module, top-level await is supported in modern browsers
await initFirebase();

// Exports are now handled inside initFirebase (reassigned)

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
    correctAnswers: 0,
    niveauMax: 1
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

// 5) Sauvegarde d'une réponse : incrémente total et, si correct, correctAnswers
export async function saveAnswer(uid, isCorrect) {
  const userRef = doc(db, "users", uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      // Création du document si inexistant
      await setDoc(userRef, {
        totalAnswers: 1,
        correctAnswers: isCorrect ? 1 : 0
      });
      console.log('Document utilisateur créé pour', uid);
    } else {
      const updates = { totalAnswers: increment(1) };
      if (isCorrect) updates.correctAnswers = increment(1);
      await updateDoc(userRef, updates);
      console.log('Réponse enregistrée pour', uid, 'isCorrect:', isCorrect);
    }
  } catch (e) {
    console.error('Erreur Firestore saveAnswer:', e);
  }
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

// Récupérer le niveau courant de l'utilisateur
export async function getUserLevel(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return 1;
  const d = snap.data();
  return d.niveauMax || 1;
}

// Mettre à jour le niveau courant de l'utilisateur
export async function setUserLevel(uid, niveau) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { niveauMax: niveau });
}

// === Synchronisation de l'historique SM-2 dans Firestore ===

/**
 * Sauvegarde l'historique des cartes pour un utilisateur dans Firestore
 * @param {string} uid - ID utilisateur
 * @param {Array} cards - Tableau de cartes (avec historique)
 */
export async function saveUserCardsHistory(uid, cards) {
  if (!uid || !cards) return;
  console.log('[DEBUG] saveUserCardsHistory: appelée avec uid', uid, 'cartes:', cards.length);
  const userDoc = doc(db, "users", uid);
  // On ne stocke que l'historique, pas tout le contenu des cartes
  const cardsHistory = cards.map(card => ({
    fr: card.fr,
    kab: card.kab,
    history: card.history || []
  }));
  const nonEmpty = cardsHistory.filter(c => c.history && c.history.length > 0);
  console.log('[DEBUG] saveUserCardsHistory: cartes avec historique non vide =', nonEmpty.length, nonEmpty.slice(0, 1));
  await setDoc(userDoc, { cardsHistory }, { merge: true });
}

/**
 * Charge l'historique des cartes pour un utilisateur depuis Firestore
 * @param {string} uid - ID utilisateur
 * @returns {Promise<Array>} - Tableau de {fr, kab, history}
 */
export async function loadUserCardsHistory(uid) {
  if (!uid) return [];
  const userDoc = doc(db, "users", uid);
  const snap = await getDoc(userDoc);
  if (snap.exists() && snap.data().cardsHistory) {
    return snap.data().cardsHistory;
  }
  return [];
}