// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
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
    const controller = new AbortController();
    // 8 second timeout to prevent hanging on Safari
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('/api/config', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const config = await res.json();
    if (!config.apiKey) throw new Error('No API Key found');

    app = initializeApp(config);
    auth = getAuth(app);
    // Force persistence for Safari/Mobile inconsistencies
    await setPersistence(auth, browserLocalPersistence);

    db = getFirestore(app);
    console.log('[Firebase] Initialized securely with persistence');
  } catch (e) {
    console.error('[Firebase] Init failed:', e);
  }
};

// Capture promise to await it in exports
const initPromise = initFirebase();

// REMOVED Top-level await to avoid Safari compatibility issues
// The export 'login', 'signup' etc will await initPromise internally.

// Exports are now handled inside initFirebase (reassigned)

// 1) Écoute la session
export function initAuthListener(cb) {
  // onAuthStateChanged expects auth to be ready immediately or we need to wait
  initPromise.then(() => {
    if (auth) {
      onAuthStateChanged(auth, user => cb(user));
    } else {
      console.error("Auth not initialized in listener");
    }
  }).catch(e => console.error("Listener init failed", e));
}

// 2) Inscription (initialise les compteurs)
export async function signup(firstName, email, password) {
  await initPromise;
  if (!auth) throw new Error("Service d'authentification indisponible.");
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
  try {
    await initPromise;
  } catch (e) {
    throw new Error("Initialisation Firebase échouée. Vérifiez votre connexion.");
  }

  if (!auth) throw new Error("Service d'authentification indisponible.");
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

// 4) Déconnexion
export async function logout() {
  await initPromise;
  if (!auth) return;
  return signOut(auth);
}

// 5) Sauvegarde d'une réponse : incrémente total et, si correct, correctAnswers
export async function saveAnswer(uid, isCorrect) {
  try { await initPromise; } catch (e) { } // best effort
  if (!db) return; // Should not happen if init passed

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
  try { await initPromise; } catch (e) { }
  if (!db) return { totalAnswers: 0, correctAnswers: 0 };

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
  try { await initPromise; } catch (e) { }
  if (!db) return 1;
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return 1;
  const d = snap.data();
  return d.niveauMax || 1;
}

// Mettre à jour le niveau courant de l'utilisateur
export async function setUserLevel(uid, niveau) {
  try { await initPromise; } catch (e) { }
  if (!db) return;
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
  try { await initPromise; } catch (e) { }
  if (!db) return;

  if (!uid || !cards) return;

  // Filtrer pour ne garder que les cartes avec un historique
  const cardsHistory = cards
    .filter(card => card.history && card.history.length > 0)
    .map(card => ({
      fr: card.fr,
      kab: card.kab,
      history: card.history
    }));

  if (cardsHistory.length === 0) {
    console.log('[DEBUG] saveUserCardsHistory: Aucune carte avec historique à sauvegarder. Annulation.');
    return;
  }

  console.log(`[DEBUG] saveUserCardsHistory: Sauvegarde de ${cardsHistory.length} cartes avec historique pour ${uid}`);

  const userDoc = doc(db, "users", uid);
  try {
    await setDoc(userDoc, { cardsHistory }, { merge: true });
    console.log('[DEBUG] saveUserCardsHistory: Succès');
  } catch (e) {
    console.error('[ERROR] saveUserCardsHistory: Échec de la sauvegarde', e);
  }
}

/**
 * Charge l'historique des cartes pour un utilisateur depuis Firestore
 * @param {string} uid - ID utilisateur
 * @returns {Promise<Array>} - Tableau de {fr, kab, history}
 */
export async function loadUserCardsHistory(uid) {
  try { await initPromise; } catch (e) { }
  if (!db) return [];
  if (!uid) return [];
  const userDoc = doc(db, "users", uid);
  const snap = await getDoc(userDoc);
  if (snap.exists() && snap.data().cardsHistory) {
    return snap.data().cardsHistory;
  }
  return [];
}