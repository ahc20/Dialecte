// script.js
import { saveAnswer } from "./firebase.js"; // si tu veux sauvegarder
import { getAuth }   from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

let cards = [], history = [], pointer = -1;

// 1) Charge et parse data.csv (chemin relatif)
Papa.parse('data.csv', {
  download: true,
  header: true,
  complete: ({ data }) => {
    console.log('✅ CSV chargé:', data.length, 'lignes');
    cards = data
      .filter(r => r.Français && r.Kabyle)
      .map(r => ({ fr: r.Français, kab: r.Kabyle }));
    if (cards.length) showNextCard();
    else document.getElementById('front').textContent = 'Aucune carte trouvée.';
  },
  error: err => {
    console.error('❌ Échec chargement CSV :', err);
    document.getElementById('front').textContent = 'Erreur de chargement.';
  }
});

// 2) Affiche la carte i
function displayCardAt(i) {
  const { fr, kab } = cards[i];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
  renderChoices(kab);
}

// 3) Indice aléatoire différent
function getRandomIndex() {
  if (cards.length < 2) return 0;
  let i;
  do { i = Math.floor(Math.random() * cards.length); }
  while (history[pointer] === i);
  return i;
}

// 4) Carte suivante
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

// 6) Génère les 4 choix
function renderChoices(correct) {
  const container = document.getElementById('choices');
  container.innerHTML = '';
  const set = new Set();
  while (set.size < 3) {
    const r = cards[Math.floor(Math.random() * cards.length)].kab;
    if (r !== correct) set.add(r);
  }
  const opts = [correct, ...set].sort(() => Math.random() - 0.5);
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.onclick = () => handleChoice(btn, opt === correct, correct);
    container.appendChild(btn);
  });
}

// 7) Réaction au choix + sauvegarde
async function handleChoice(btn, ok, correct) {
  btn.classList.add(ok ? 'correct' : 'wrong');
  document.querySelectorAll('#choices button').forEach(b => b.disabled = true);

  if (!ok) {
    document.querySelectorAll('#choices button')
      .forEach(b => b.textContent === correct && b.classList.add('correct'));
  } else {
    document.getElementById('back').classList.add('visible');
  }

  // Sauvegarde si connecté
  try {
    const user = getAuth().currentUser;
    if (user) await saveAnswer(user.uid, ok);
  } catch (e) {
    console.error('saveAnswer failed', e);
  }

  setTimeout(showNextCard, 1500);
}

// 8) Bouton Révéler
document.getElementById('reveal').onclick = () =>
  document.getElementById('back').classList.toggle('visible');

// 9) Bouton Prononcer
document.getElementById('speak').onclick = () => {
  const txt = document.getElementById('back').textContent.trim();
  if (!txt) return;
  const synth = window.speechSynthesis;
  let voices = synth.getVoices();
  const speakIt = vs => {
    const v = vs.find(v => /fr(-|_)/.test(v.lang))||vs[0];
    const u = new SpeechSynthesisUtterance(txt);
    u.voice = v; u.lang = v.lang; u.rate = 0.9; u.pitch = 1.1;
    synth.speak(u);
  };
  if (!voices.length) synth.onvoiceschanged = () => speakIt(synth.getVoices());
  else speakIt(voices);
};

// 10) Précédent / Suivant
document.getElementById('prev').onclick = showPrevCard;
document.getElementById('next').onclick = showNextCard;