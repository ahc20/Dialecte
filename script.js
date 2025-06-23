// script.js
let cards = [], history = [], pointer = -1;

// 1) Charge et parse data.csv (séparateur ;)
Papa.parse('data.csv', {
  download: true,
  header: true,
  delimiter: ';',
  complete: ({ data }) => {
    cards = data
      .filter(r => r.Français && r.Kabyle)
      .map(r => ({ fr: r.Français, kab: r.Kabyle }));
    if (cards.length) showNextCard();
    else document.getElementById('front').textContent = 'Aucune carte.';
  },
  error: err => {
    console.error('Erreur CSV :', err);
    document.getElementById('front').textContent = 'Échec du chargement.';
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

// 3) Index aléatoire différent
function getRandomIndex() {
  if (cards.length < 2) return 0;
  let i;
  do {
    i = Math.floor(Math.random() * cards.length);
  } while (history[pointer] === i);
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

// 6) Génère les boutons de choix
function renderChoices(correctKab) {
  const container = document.getElementById('choices');
  container.innerHTML = '';
  const set = new Set();
  while (set.size < 3) {
    const r = cards[Math.floor(Math.random() * cards.length)].kab;
    if (r !== correctKab) set.add(r);
  }
  const opts = [correctKab, ...set].sort(() => Math.random() - 0.5);
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.onclick = () => handleChoice(btn, opt === correctKab, correctKab);
    container.appendChild(btn);
  });
}

// 7) Gère la sélection + feedback
function handleChoice(btn, isCorrect, correctKab) {
  btn.classList.add(isCorrect ? 'correct' : 'wrong');
  document.querySelectorAll('#choices button').forEach(b => b.disabled = true);
  if (!isCorrect) {
    document.querySelectorAll('#choices button')
      .forEach(b => b.textContent === correctKab && b.classList.add('correct'));
  } else {
    document.getElementById('back').classList.add('visible');
  }
  setTimeout(showNextCard, 1500);
}

// 8) Bouton Révéler
document.getElementById('reveal').addEventListener('click', () => {
  document.getElementById('back').classList.toggle('visible');
});

// 9) Bouton Prononcer
document.getElementById('speak').addEventListener('click', () => {
  const text = document.getElementById('back').textContent.trim();
  if (!text) return;
  const synth = window.speechSynthesis;
  let voices = synth.getVoices();
  const speakIt = vList => {
    const voice = vList.find(v => /fr(-|_)/.test(v.lang)) || vList[0];
    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = voice;
    utter.lang = voice.lang;
    utter.rate = 0.9;
    utter.pitch = 1.1;
    synth.speak(utter);
  };
  if (!voices.length) synth.onvoiceschanged = () => speakIt(synth.getVoices());
  else speakIt(voices);
});

// 10) Précédent / Suivant
document.getElementById('prev').addEventListener('click', showPrevCard);
document.getElementById('next').addEventListener('click', showNextCard);