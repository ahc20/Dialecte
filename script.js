// script.js
import { saveAnswer }     from "./firebase.js";  
import { getAuth }        from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

let cards = [], history = [], pointer = -1;

// 1) Charge data.csv depuis /data.csv (public/data.csv)
Papa.parse('/data.csv', {
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
    console.error('❌ Échec chargement data.csv :', err);
    document.getElementById('front').textContent = 'Erreur de chargement.';
  }
});

// 2) Affiche la carte à l’index i
function displayCardAt(i) {
  const { fr, kab } = cards[i];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
  renderChoices(kab);
}

// 3) Index aléatoire différent
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

// 6) Génère le QCM
function renderChoices(correct) {
  const container = document.getElementById('choices');
  container.innerHTML = '';
  const set = new Set();
  while (set.size < 3) {
    const r = cards[Math.floor(Math.random()*cards.length)].kab;
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

// 7) Clic réponse + sauvegarde
async function handleChoice(btn, ok, correct) {
  btn.classList.add(ok ? 'correct' : 'wrong');
  document.querySelectorAll('#choices button').forEach(b=>b.disabled=true);
  if (!ok) {
    document.querySelectorAll('#choices button')
      .forEach(b => b.textContent === correct && b.classList.add('correct'));
  } else {
    document.getElementById('back').classList.add('visible');
  }
  // Sauvegarde Firestore si connecté
  try {
    const u = getAuth().currentUser;
    if (u) await saveAnswer(u.uid, ok);
  } catch(e) {
    console.error('saveAnswer:', e);
  }
  setTimeout(showNextCard, 1500);
}

// 8) Révéler
document.getElementById('reveal').onclick = () =>
  document.getElementById('back').classList.toggle('visible');

// 9) Prononcer
document.getElementById('speak').onclick = () => {
  const txt = document.getElementById('back').textContent.trim();
  if (!txt) return;
  const synth = speechSynthesis;
  let voices = synth.getVoices();
  const speakIt = vs => {
    const v = vs.find(x => /fr(-|_)/.test(x.lang))||vs[0];
    const u = new SpeechSynthesisUtterance(txt);
    u.voice=v;u.lang=v.lang;u.rate=0.9;u.pitch=1.1;
    synth.speak(u);
  };
  if (!voices.length) synth.onvoiceschanged = ()=>speakIt(synth.getVoices());
  else speakIt(voices);
};

// 10) Prev / Next
document.getElementById('prev').onclick = showPrevCard;
document.getElementById('next').onclick = showNextCard;