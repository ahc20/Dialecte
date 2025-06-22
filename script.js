// script.js
import { saveProgress } from "./firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

let cards = [], history = [], pointer = -1;

// 1) Charger CSV
Papa.parse('data.csv', {
  download: true, header: true,
  complete: ({ data }) => {
    cards = data.filter(r => r.Français && r.Kabyle)
                .map(r => ({ fr: r.Français, kab: r.Kabyle }));
    showNextCard();
  },
  error: err => {
    console.error('Erreur CSV :', err);
    document.getElementById('front').textContent = 'Échec du chargement';
  }
});

// 2) Afficher carte
function displayCardAt(idx) {
  const { fr, kab } = cards[idx];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
  renderChoices(kab);
}

// 3) Indice aléatoire
function getRandomIndex() {
  if (cards.length < 2) return 0;
  let i;
  do { i = Math.floor(Math.random() * cards.length); }
  while (history[pointer] === i);
  return i;
}

// 4) Suivant
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

// 5) Précédent
function showPrevCard() {
  if (pointer > 0) {
    pointer--;
    displayCardAt(history[pointer]);
  }
}

// 6) Générer QCM
function renderChoices(correctKab) {
  const c = document.getElementById('choices');
  c.innerHTML = '';
  const dist = new Set();
  while (dist.size < 3) {
    const r = cards[Math.floor(Math.random() * cards.length)].kab;
    if (r !== correctKab) dist.add(r);
  }
  const opts = [correctKab, ...dist].sort(() => Math.random() - 0.5);
  opts.forEach(opt => {
    const b = document.createElement('button');
    b.textContent = opt;
    b.onclick = () => handleChoice(b, opt === correctKab, correctKab);
    c.appendChild(b);
  });
}

// 7) Gestion du choix + sauvegarde
async function handleChoice(btn, isCorrect, correctKab) {
  btn.classList.add(isCorrect ? 'correct' : 'wrong');
  document.querySelectorAll('#choices button').forEach(b => b.disabled = true);
  if (!isCorrect) {
    document.querySelectorAll('#choices button')
      .forEach(b => b.textContent === correctKab && b.classList.add('correct'));
  } else {
    document.getElementById('back').classList.add('visible');
  }

  // Sauvegarde si connecté
  try {
    const user = getAuth().currentUser;
    if (user) {
      await saveProgress(user.uid, document.getElementById('front').textContent, isCorrect);
    }
  } catch (e) {
    console.error('saveProgress failed', e);
  }

  setTimeout(showNextCard, 1500);
}

// 8) Révéler
document.getElementById('reveal').onclick = () =>
  document.getElementById('back').classList.toggle('visible');

// 9) Prononcer
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

// 10) Prev/Next
document.getElementById('prev').onclick = showPrevCard;
document.getElementById('next').onclick = showNextCard;