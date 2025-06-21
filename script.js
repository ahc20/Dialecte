let cards = [];

// Poids pondérés (ajuste tes fréquences si besoin)
const weights = {
  "Très courant": 5,
  "Courant": 3,
  "Moyennement courant": 2,
  "Peu courant": 1,
  "Très rare": 1
};

// Tirage pondéré
function weightedRandomIndex() {
  const total = cards.reduce((sum, c) => sum + (weights[c.frequency] || 1), 0);
  let r = Math.random() * total;
  for (let i = 0; i < cards.length; i++) {
    r -= (weights[cards[i].frequency] || 1);
    if (r <= 0) return i;
  }
  return 0;
}

// Affiche une nouvelle carte
function showRandomCard() {
  const i = weightedRandomIndex();
  const { fr, kab } = cards[i];
  document.getElementById("front").textContent = fr;
  const back = document.getElementById("back");
  back.textContent = kab;
  back.classList.remove("visible");
}

// Initialise le chargement du CSV
Papa.parse("data.csv", {
  download: true,
  header: true,
  complete: (res) => {
    cards = res.data.map((r) => ({
      fr: r.Français,
      kab: r.Kabyle,
      frequency: r["Catégorie Fréquence"],
    }));
    showRandomCard();
  },
  error: (err) => console.error("Erreur CSV :", err),
});

// Bouton Révéler
document.getElementById("reveal").addEventListener("click", () => {
  document.getElementById("back").classList.toggle("visible");
});

// Prononciation via Web Speech API
function speakKabyle() {
  const text = document.getElementById("back").textContent.trim();
  if (!text) return;

  // Attendre que les voix soient chargées
  const synth = window.speechSynthesis;
  let voices = synth.getVoices();
  if (!voices.length) {
    synth.onvoiceschanged = () => {
      voices = synth.getVoices();
      _speak(text, voices);
    };
  } else {
    _speak(text, voices);
  }
}

// Fonction interne de prononciation avec réglages
function _speak(text, voices) {
  // Choisir de préférence une voix francophone
  const voice =
    voices.find((v) => /fr(-|_)/i.test(v.lang)) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    voices[0];

  const utter = new SpeechSynthesisUtterance(text);
  utter.voice = voice;
  utter.lang = voice.lang;
  utter.rate = 0.9;   // 0.8–1.1 pour ajuster la vitesse
  utter.pitch = 1.0;  // 0.8–1.2 pour ajuster la tonalité
  window.speechSynthesis.speak(utter);
}

// Listener Prononcer
document.getElementById("speak").addEventListener("click", speakKabyle);

// Précédent / Suivant
document.getElementById("next").addEventListener("click", showRandomCard);
document.getElementById("prev").addEventListener("click", showRandomCard);