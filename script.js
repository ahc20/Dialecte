// script.js
import { saveProgress } from "./firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

let cards = [];
let history = [];    // pile des indices affichés
let pointer = -1;    // position dans l’historique

// 1) Charger et parser le CSV
Papa.parse('data.csv', {
  download: true,
  header: true,
  complete: ({ data }) => {
    cards = data.map(r => ({
      fr: r.Français,
      kab: r.Kabyle
    }));
    showNextCard();  // affiche la première carte
  },
  error: err => console.error('Erreur CSV :', err)
});

// 2) Afficher la carte à l’index donné
function displayCardAt(idx) {
  const { fr, kab } = cards[idx];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
  renderChoices(kab);
}

// 3) Tirage aléatoire différent du précédent
function getRandomIndex() {
  if (cards.length < 2) return 0;
  let i;
  do {
    i = Math.floor(Math.random() * cards.length);
  } while (history[pointer] === i);
  return i;
}

// 4) Suivant avec historique
function showNextCard() {
  if (pointer < history.length - 1) {
    pointer++;
    displayCardAt(history[pointer]);
  } else {
    const idx = getRandomIndex();
    history.push(idx);
    pointer = history.length - 1;
    displayCardAt(idx);
  }
}

// 5) Précédent avec historique
function showPrevCard() {
  if (pointer > 0) {
    pointer--;
    displayCardAt(history[pointer]);
  }
}

// 6) Générer le QCM pour la carte courante
function renderChoices(correctKab) {
  const container = document.getElementById('choices');
  container.innerHTML = '';

  // Récupérer 3 distracteurs uniques
  const distractors = new Set();
  while (distractors.size < 3) {
    const rand = cards[Math.floor(Math.random() * cards.length)].kab;
    if (rand !== correctKab) distractors.add(rand);
  }

  const options = [correctKab, ...distractors];
  options.sort(() => Math.random() - 0.5);

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.addEventListener('click', () => handleChoice(btn, opt === correctKab, correctKab));
    container.appendChild(btn);
  });
}

// 7) Gestion du clic QCM
async function handleChoice(btn, isCorrect, correctKab) {
  // colorer le bouton cliqué
  btn.classList.add(isCorrect ? 'correct' : 'wrong');
  // désactiver tous les boutons
  document.querySelectorAll('#choices button').forEach(b => b.disabled = true);

  // si incorrect, montrer aussi la bonne réponse
  if (!isCorrect) {
    const correctBtn = Array.from(document.querySelectorAll('#choices button'))
      .find(b => b.textContent === correctKab);
    if (correctBtn) correctBtn.classList.add('correct');
  } else {
    document.getElementById('back').classList.add('visible');
  }

  // sauvegarder le résultat
  try {
    const uid = getAuth().currentUser.uid;
    const frWord = document.getElementById('front').textContent;
    await saveProgress(uid, frWord, isCorrect);
  } catch (e) {
    console.error('Erreur saveProgress:', e);
  }

  // passer à la question suivante après 1,5s
  setTimeout(showNextCard, 1500);
}

// 8) Révéler le mot kabyle
document.getElementById('reveal').addEventListener('click', () => {
  document.getElementById('back').classList.toggle('visible');
});

// 9) Prononcer via Web Speech API
document.getElementById('speak').addEventListener('click', () => {
  const text = document.getElementById('back').textContent.trim();
  if (!text) return;

  const synth = window.speechSynthesis;
  let voices = synth.getVoices();
  const speakText = (voicesList) => {
    const voice = voicesList.find(v => /fr(-|_)/i.test(v.lang)) || voicesList[0];
    const ut = new SpeechSynthesisUtterance(text);
    ut.voice = voice;
    ut.lang = voice.lang;
    ut.rate = 0.9;
    ut.pitch = 1.1;
    synth.speak(ut);
  };

  if (!voices.length) {
    synth.onvoiceschanged = () => {
      voices = synth.getVoices();
      speakText(voices);
    };
  } else {
    speakText(voices);
  }
});

// 10) Listeners Précédent / Suivant
document.getElementById('prev').addEventListener('click', showPrevCard);
document.getElementById('next').addEventListener('click', showNextCard);