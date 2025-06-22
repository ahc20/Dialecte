// script.js
let cards = [];
let history = [];
let pointer = -1;

// 1) Charger et parser le CSV
Papa.parse('data.csv', {
  download: true,
  header: true,
  complete: ({ data }) => {
    cards = data.map(r => ({ fr: r.Français, kab: r.Kabyle }));
    showNextCard();  // <-- Assure-toi que ça s'appelle bien
  },
  error: err => console.error('Erreur CSV :', err)
});

// 2) Afficher la carte
function displayCardAt(idx) {
  const { fr, kab } = cards[idx];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
  renderChoices(kab);
}

// 3) Tirage aléatoire
function getRandomIndex() {
  if (cards.length < 2) return 0;
  let i;
  do { i = Math.floor(Math.random() * cards.length); }
  while (history[pointer] === i);
  return i;
}

// 4) Suivant / historique
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

// 6) Générer le QCM
function renderChoices(correctKab) {
  const container = document.getElementById('choices');
  container.innerHTML = '';
  // 3 distracteurs
  const dist = new Set();
  while (dist.size < 3) {
    const r = cards[Math.floor(Math.random() * cards.length)].kab;
    if (r !== correctKab) dist.add(r);
  }
  const opts = [correctKab, ...dist].sort(() => Math.random() - 0.5);
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.addEventListener('click', () => handleChoice(btn, opt === correctKab, correctKab));
    container.appendChild(btn);
  });
}

// 7) Gestion du clic QCM
function handleChoice(btn, isCorrect, correctKab) {
  btn.classList.add(isCorrect ? 'correct' : 'wrong');
  document.querySelectorAll('#choices button').forEach(b => b.disabled = true);
  if (!isCorrect) {
    const good = Array.from(document.querySelectorAll('#choices button'))
      .find(b => b.textContent === correctKab);
    if (good) good.classList.add('correct');
  } else {
    document.getElementById('back').classList.add('visible');
  }
  setTimeout(showNextCard, 1500);
}

// 8) Révéler la face arrière
document.getElementById('reveal').addEventListener('click', () => {
  document.getElementById('back').classList.toggle('visible');
});

// 9) Prononcer avec Web Speech
document.getElementById('speak').addEventListener('click', () => {
  const text = document.getElementById('back').textContent.trim();
  if (!text) return;
  const synth = window.speechSynthesis;
  let voices = synth.getVoices();
  const speakIt = vList => {
    const v = vList.find(v => /fr(-|_)/i.test(v.lang)) || vList[0];
    const ut = new SpeechSynthesisUtterance(text);
    ut.voice = v;
    ut.lang = v.lang;
    ut.rate = 0.9;
    ut.pitch = 1.1;
    synth.speak(ut);
  };
  if (!voices.length) {
    synth.onvoiceschanged = () => {
      voices = synth.getVoices();
      speakIt(voices);
    };
  } else {
    speakIt(voices);
  }
});

// 10) Listeners Précédent / Suivant
document.getElementById('prev').addEventListener('click', showPrevCard);
document.getElementById('next').addEventListener('click', showNextCard);