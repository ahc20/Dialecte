// script.js
import { saveAnswer } from "./firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

let cards = [], history = [], pointer = -1;

// 1) Charge le CSV
Papa.parse('data.csv', {
  download: true, header: true,
  complete: ({ data }) => {
    cards = data.filter(r => r.Français && r.Kabyle)
                .map(r => ({ fr: r.Français, kab: r.Kabyle }));
    if (cards.length) showNextCard();
    else document.getElementById('front').textContent = 'Aucune carte';
  },
  error: err => {
    console.error('Erreur CSV:', err);
    document.getElementById('front').textContent = 'Erreur de chargement';
  }
});

function displayCardAt(i) {
  const { fr, kab } = cards[i];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
  renderChoices(kab);
}

function getRandomIndex() {
  if (cards.length < 2) return 0;
  let i;
  do { i = Math.floor(Math.random()*cards.length); }
  while (history[pointer] === i);
  return i;
}

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

function showPrevCard() {
  if (pointer > 0) {
    pointer--;
    displayCardAt(history[pointer]);
  }
}

function renderChoices(correctKab) {
  const c = document.getElementById('choices');
  c.innerHTML = '';
  const set = new Set();
  while (set.size < 3) {
    const r = cards[Math.floor(Math.random()*cards.length)].kab;
    if (r !== correctKab) set.add(r);
  }
  const opts = [correctKab, ...set].sort(() => Math.random()-0.5);
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.onclick = () => handleChoice(btn, opt === correctKab);
    c.appendChild(btn);
  });
}

async function handleChoice(btn, isCorrect) {
  btn.classList.add(isCorrect ? 'correct' : 'wrong');
  document.querySelectorAll('#choices button').forEach(b=>b.disabled=true);
  if (!isCorrect) {
    document.querySelectorAll('#choices button')
      .forEach(b=>b.textContent===btn.textContent && b.classList.add('correct'));
  } else {
    document.getElementById('back').classList.add('visible');
  }

  //  Save to Firestore
  try {
    const user = getAuth().currentUser;
    if (user) {
      await saveAnswer(user.uid, isCorrect);
    }
  } catch(e) {
    console.error('saveAnswer failed', e);
  }

  setTimeout(showNextCard, 1500);
}

document.getElementById('reveal').onclick = () =>
  document.getElementById('back').classList.toggle('visible');
document.getElementById('speak').onclick = () => {
  const txt = document.getElementById('back').textContent.trim();
  if (!txt) return;
  const synth = speechSynthesis;
  let voices = synth.getVoices();
  const speakIt = vs => {
    const v = vs.find(x=>/fr(-|_)/.test(x.lang))||vs[0];
    const u = new SpeechSynthesisUtterance(txt);
    u.voice=v;u.lang=v.lang;u.rate=0.9;u.pitch=1.1;
    synth.speak(u);
  };
  if (!voices.length) synth.onvoiceschanged = ()=>speakIt(synth.getVoices());
  else speakIt(voices);
};

document.getElementById('prev').onclick = showPrevCard;
document.getElementById('next').onclick = showNextCard;