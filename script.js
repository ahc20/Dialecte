let cards = [];
let history = [];    // pile des indices affichés
let pointer = -1;    // position courante dans l’historique

// 1) Charge et parse le CSV
Papa.parse('data.csv', {
  download: true,
  header: true,
  complete: ({ data }) => {
    cards = data.map(r => ({
      fr: r.Français,
      kab: r.Kabyle
    }));
    showNextCard();  // affiche la première
  },
  error: err => console.error('Erreur CSV :', err)
});

// Affiche la carte à l’index donné, en manipulant history/pointer
function displayCardAt(index) {
  const { fr, kab } = cards[index];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
}

// Génère un nouvel indice aléatoire différent du précédent historique
function getRandomIndex() {
  if (!cards.length) return 0;
  let i;
  do {
    i = Math.floor(Math.random() * cards.length);
  } while (cards.length > 1 && history[pointer] === i);
  return i;
}

// Affiche la carte suivante (logique historique)
function showNextCard() {
  // Si on n’est pas en fin d’historique, on avance le pointer sans ajouter
  if (pointer < history.length - 1) {
    pointer++;
    displayCardAt(history[pointer]);
  } else {
    // On génère un nouvel index puis on pousse dans l’historique
    const idx = getRandomIndex();
    history.push(idx);
    pointer = history.length - 1;
    displayCardAt(idx);
  }
}

// Affiche la carte précédente
function showPrevCard() {
  if (pointer > 0) {
    pointer--;
    displayCardAt(history[pointer]);
  }
  // sinon on reste sur la première carte
}

// Bouton Révéler
document.getElementById('reveal').addEventListener('click', () => {
  document.getElementById('back').classList.toggle('visible');
});

// Bouton Prononcer (Web Speech API optimisé)
document.getElementById('speak').addEventListener('click', () => {
  const text = document.getElementById('back').textContent.trim();
  if (!text) return;
  const synth = window.speechSynthesis;
  let voices = synth.getVoices();
  if (!voices.length) {
    synth.onvoiceschanged = () => {
      voices = synth.getVoices();
      speak(text, voices);
    };
  } else {
    speak(text, voices);
  }
});
function speak(text, voices) {
  const voice = voices.find(v => /fr(-|_)/i.test(v.lang)) || voices[0];
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.9;
  u.pitch = 1.1;
  window.speechSynthesis.speak(u);
}

// Boutons Précédent / Suivant
document.getElementById('prev').addEventListener('click', showPrevCard);
document.getElementById('next').addEventListener('click', showNextCard);