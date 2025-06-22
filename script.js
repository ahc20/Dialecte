// script.js
import { saveProgress } from "./firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

let cards = [], history = [], pointer = -1;

Papa.parse('data.csv', {
  download: true, header: true,
  complete: ({ data }) => {
    cards = data.map(r => ({ fr: r.Français, kab: r.Kabyle }));
    showNextCard();
  },
  error: err => console.error('Erreur CSV :', err)
});

function displayCardAt(idx) {
  const { fr, kab } = cards[idx];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
  renderChoices(kab);
}

function getRandomIndex() {
  if (cards.length < 2) return 0;
  let i;
  do { i = Math.floor(Math.random() * cards.length); }
  while (history[pointer] === i);
  return i;
}

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
    const b = document.createElement('button');
    b.textContent = opt;
    b.addEventListener('click', () => handleChoice(b, opt===correctKab, correctKab));
    c.appendChild(b);
  });
}

async function handleChoice(btn, isCorrect, correctKab) {
  btn.classList.add(isCorrect ? 'correct' : 'wrong');
  document.querySelectorAll('#choices button').forEach(b => b.disabled = true);
  if (!isCorrect) {
    document.querySelectorAll('#choices button')
      .forEach(b => b.textContent===correctKab && b.classList.add('correct'));
  } else {
    document.getElementById('back').classList.add('visible');
  }

  // Sauvegarde
  try {
    const usr = getAuth().currentUser;
    if (usr) {
      console.log("Will save:", usr.uid, isCorrect);
      await saveProgress(usr.uid, document.getElementById('front').textContent, isCorrect);
      console.log("Saved!");
    } else {
      console.log("Not logged in; skip saveProgress");
    }
  } catch(e) {
    console.error("saveProgress failed:", e);
  }

  setTimeout(showNextCard, 1500);
}

document.getElementById('reveal').onclick = () =>
  document.getElementById('back').classList.toggle('visible');
document.getElementById('speak').onclick = () => { /* unchanged WebSpeech code */ };

document.getElementById('prev').onclick = showPrevCard;
document.getElementById('next').onclick = showNextCard;