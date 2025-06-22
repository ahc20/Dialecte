// script.js
import { saveProgress } from "./firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Données et état
let cards = [], history = [], pointer = -1;

// 1) Charge et parse le CSV, puis déclenche l’affichage immédiat de la première carte
Papa.parse('data.csv', {
  download: true,
  header: true,
  complete: ({ data }) => {
    cards = data.filter(r => r.Français && r.Kabyle)
                .map(r => ({ fr: r.Français, kab: r.Kabyle }));
    if (cards.length > 0) showNextCard();
    else document.getElementById('front').textContent = 'Aucune carte disponible.';
  },
  error: err => {
    console.error('Erreur CSV :', err);
    document.getElementById('front').textContent = 'Impossible de charger les cartes.';
  }
});

// 2) Affiche la carte à l’index donné
function displayCardAt(i) {
  const { fr, kab } = cards[i];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
  renderChoices(kab);
}

// 3) Retourne un index aléatoire différent du précédent
function getRandomIndex() {
  if (cards.length < 2) return 0;
  let i;
  do { i = Math.floor(Math.random() * cards.length); }
  while (i === history[pointer]);
  return i;
}

// 4) Passer à la carte suivante (ou historique)
function showNextCard() {
  if (pointer < history.length - 1) {
    pointer++;
  } else {
    const idx = getRandomIndex();
    history.push(idx);
    pointer = history.length - 1;
  }
  displayCardAt(history[pointer]);
}

// 5) Carte précédente
function showPrevCard() {
  if (pointer > 0) {
    pointer--;
    displayCardAt(history[pointer]);
  }
}

// 6) Génère les 4 boutons de choix
function renderChoices(correctKab) {
  const container = document.getElementById('choices');
  container.innerHTML = '';
  const distractors = new Set();
  while (distractors.size < 3) {
    const r = cards[Math.floor(Math.random() * cards.length)].kab;
    if (r !== correctKab) distractors.add(r);
  }
  const options = [correctKab, ...distractors].sort(() => Math.random() - 0.5);
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.onclick = () => handleChoice(btn, opt === correctKab, correctKab);
    container.appendChild(btn);
  });
}

// 7) Gestion du clic sur un choix + sauvegarde Firestore
async function handleChoice(btn, isCorrect, correctKab) {
  btn.classList.add(isCorrect ? 'correct' : 'wrong');
  document.querySelectorAll('#choices button').forEach(b => b.disabled = true);
  if (!isCorrect) {
    document.querySelectorAll('#choices button')
      .forEach(b => b.textContent === correctKab && b.classList.add('correct'));
  } else {
    document.getElementById('back').classList.add('visible');
  }

  // Enregistre la réponse si connecté
  try {
    const user = getAuth().currentUser;
    if (user) {
      await saveProgress(
        user.uid,
        document.getElementById('front').textContent,
        isCorrect
      );
    }
  } catch (e) {
    console.error('saveProgress failed', e);
  }

  setTimeout(showNextCard, 1500);
}

// 8) Bouton Révéler
document.getElementById('reveal').onclick = () =>
  document.getElementById('back').classList.toggle('visible');

// 9) Bouton Prononcer
document.getElementById('speak').onclick = () => {
  const text = document.getElementById('back').textContent.trim();
  if (!text) return;
  const synth = window.speechSynthesis;
  let voices = synth.getVoices();
  const speakIt = vList => {
    const v = vList.find(v => /fr(-|_)/.test(v.lang)) || vList[0];
    const u = new SpeechSynthesisUtterance(text);
    u.voice = v; u.lang = v.lang; u.rate = 0.9; u.pitch = 1.1;
    synth.speak(u);
  };
  if (!voices.length) synth.onvoiceschanged = () => speakIt(synth.getVoices());
  else speakIt(voices);
};

// 10) Navigation Précédent / Suivant
document.getElementById('prev').onclick = showPrevCard;
document.getElementById('next').onclick = showNextCard;