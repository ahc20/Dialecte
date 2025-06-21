// script.js
import { saveProgress } from "./firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

let cards = [];
let history = [];
let pointer = -1;

// 1) Charger CSV
Papa.parse('data.csv', {
  download: true,
  header: true,
  complete: ({ data }) => {
    cards = data.map(r => ({ fr: r.Français, kab: r.Kabyle }));
    showNextCard();
  },
  error: err => console.error('Erreur CSV :', err)
});

// 2) Afficher
function displayCardAt(idx) {
  const { fr, kab } = cards[idx];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
  renderChoices(kab);
}

// 3) Tirage
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

// 6) QCM
function renderChoices(correctKab) {
  const container = document.getElementById('choices');
  container.innerHTML = '';
  const dist = new Set();
  while (dist.size < 3) {
    const r = cards[Math.floor(Math.random()*cards.length)].kab;
    if (r !== correctKab) dist.add(r);
  }
  const opts = [correctKab, ...dist].sort(() => Math.random()-0.5);
  opts.forEach(opt => {
    const b = document.createElement('button');
    b.textContent = opt;
    b.addEventListener('click', () => handleChoice(b, opt===correctKab, correctKab));
    container.appendChild(b);
  });
}

// 7) Clic QCM
async function handleChoice(btn, ok, correct) {
  btn.classList.add(ok?'correct':'wrong');
  document.querySelectorAll('#choices button').forEach(b=>b.disabled=true);
  if (!ok) {
    const cb = Array.from(document.querySelectorAll('#choices button'))
      .find(x=>x.textContent===correct);
    if (cb) cb.classList.add('correct');
  } else {
    document.getElementById('back').classList.add('visible');
  }
  try {
    const uid = getAuth().currentUser.uid;
    const frWord = document.getElementById('front').textContent;
    await saveProgress(uid, frWord, ok);
  } catch(e){console.error(e);}
  setTimeout(showNextCard,1500);
}

// 8) Révéler
document.getElementById('reveal').addEventListener('click', ()=>
  document.getElementById('back').classList.toggle('visible')
);

// 9) Prononcer
document.getElementById('speak').addEventListener('click',()=>{
  const t = document.getElementById('back').textContent.trim();
  if (!t) return;
  const synth = window.speechSynthesis;
  let v = synth.getVoices();
  const speakIt = voices=>{
    const vc = voices.find(vi=>/fr(-|_)/i.test(vi.lang))||voices[0];
    const u = new SpeechSynthesisUtterance(t);
    u.voice=vc; u.lang=vc.lang; u.rate=0.9; u.pitch=1.1;
    synth.speak(u);
  };
  if (!v.length) synth.onvoiceschanged=()=>{v=synth.getVoices();speakIt(v)};
  else speakIt(v);
});

// 10) Prev/Next
document.getElementById('prev').addEventListener('click', showPrevCard);
document.getElementById('next').addEventListener('click', showNextCard);