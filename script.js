// script.js
let cards = [], history = [], pointer = -1;

// 1) Chargement du CSV
Papa.parse('data.csv', {
  download: true,
  header: true,
  complete: ({ data }) => {
    cards = data.filter(r => r.Français && r.Kabyle)
                .map(r => ({ fr: r.Français, kab: r.Kabyle }));
    showNextCard();
  },
  error: err => {
    console.error('Impossible de charger data.csv :', err);
    document.getElementById('front').textContent = 'Échec du chargement';
  }
});

// 2) Affiche la carte à l’index
function displayCardAt(idx) {
  const { fr, kab } = cards[idx];
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
  do { i = Math.floor(Math.random()*cards.length); }
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

// 6) Génère le QCM
function renderChoices(correctKab) {
  const c = document.getElementById('choices');
  c.innerHTML = '';
  const set = new Set();
  while (set.size < 3) {
    const rnd = cards[Math.floor(Math.random()*cards.length)].kab;
    if (rnd !== correctKab) set.add(rnd);
  }
  const opts = [correctKab, ...set].sort(() => Math.random()-0.5);
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.onclick = () => handleChoice(btn, opt === correctKab, correctKab);
    c.appendChild(btn);
  });
}

// 7) Gestion du choix
function handleChoice(btn, ok, correctKab) {
  btn.classList.add(ok ? 'correct' : 'wrong');
  document.querySelectorAll('#choices button').forEach(b => b.disabled = true);
  if (!ok) {
    const good = [...document.querySelectorAll('#choices button')]
                   .find(b => b.textContent === correctKab);
    if (good) good.classList.add('correct');
  } else {
    document.getElementById('back').classList.add('visible');
  }
  setTimeout(showNextCard, 1500);
}

// 8) Révéler la réponse
document.getElementById('reveal').onclick = () => {
  document.getElementById('back').classList.toggle('visible');
};

// 9) Prononciation
document.getElementById('speak').onclick = () => {
  const text = document.getElementById('back').textContent.trim();
  if (!text) return;
  const synth = window.speechSynthesis;
  let voices = synth.getVoices();
  const speakFn = vList => {
    const voice = vList.find(v => /fr(-|_)/.test(v.lang)) || vList[0];
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice; u.lang = voice.lang; u.rate = 0.9; u.pitch = 1.1;
    synth.speak(u);
  };
  if (!voices.length) {
    synth.onvoiceschanged = () => {
      voices = synth.getVoices();
      speakFn(voices);
    };
  } else speakFn(voices);
};

// 10) Listeners navigation
document.getElementById('prev').onclick = showPrevCard;
document.getElementById('next').onclick = showNextCard;