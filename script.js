let cards = [];

// 1) Charge et parse le CSV
Papa.parse('data.csv', {
  download: true,
  header: true,
  complete: ({ data }) => {
    cards = data.map(r => ({
      fr: r.Français,
      kab: r.Kabyle,
      frequency: r["Catégorie Fréquence"]
    }));
    showRandomCard();
  },
  error: err => console.error('Erreur CSV :', err)
});

// 2) Affiche une carte aléatoire
function showRandomCard() {
  const i = Math.floor(Math.random() * cards.length);
  const { fr, kab } = cards[i];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
}

// 3) Révéler le mot
document.getElementById('reveal').addEventListener('click', () => {
  document.getElementById('back').classList.toggle('visible');
});

// 4) Prononcer via Web Speech API
function speakKabyle() {
  const text = document.getElementById('back').textContent.trim();
  if (!text) return;

  const synth = window.speechSynthesis;
  let voices = synth.getVoices();
  if (!voices.length) {
    synth.onvoiceschanged = () => {
      voices = synth.getVoices();
      doSpeak(text, voices);
    };
  } else {
    doSpeak(text, voices);
  }
}

function doSpeak(text, voices) {
  const voice = voices.find(v => /fr(-|_)/i.test(v.lang)) || voices[0];
  const utter = new SpeechSynthesisUtterance(text);
  utter.voice = voice;
  utter.lang = voice.lang;
  utter.rate = 0.9;    // vitesse plus naturelle
  utter.pitch = 1.1;   // hauteur légèrement rehaussée
  window.speechSynthesis.speak(utter);
}

// 5) Listener Prononcer
document.getElementById('speak').addEventListener('click', speakKabyle);

// 6) Précédent & Suivant
document.getElementById('prev').addEventListener('click', showRandomCard);
document.getElementById('next').addEventListener('click', showRandomCard);