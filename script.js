let cards = [];

// Poids pondérés selon Catégorie Fréquence
const weights = {
  "Très courant": 5,
  "Courant":      3,
  "Moyennement courant": 2,
  "Peu courant":  1,
  "Très rare":    1
};

// Tirage aléatoire pondéré
function weightedRandomIndex() {
  const total = cards.reduce((sum, c) => sum + (weights[c.frequency] || 1), 0);
  let r = Math.random() * total;
  for (let i = 0; i < cards.length; i++) {
    r -= (weights[cards[i].frequency] || 1);
    if (r <= 0) return i;
  }
  return 0;
}

// Affiche la carte
function showRandomCard() {
  const i = weightedRandomIndex();
  const { fr, kab } = cards[i];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
}

// Prononciation par Web Speech API
function speakKabyle() {
  const text = document.getElementById('back').textContent.trim();
  if (!text) return;
  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  // Essayer de choisir une voix berbère ou francophone
  utter.voice = voices.find(v => /berb|fr/i.test(v.lang)) || voices[0];
  utter.lang = utter.voice.lang;
  speechSynthesis.speak(utter);
}

// Chargement et parsing du CSV
Papa.parse('data.csv', {
  download: true,
  header: true,
  complete: res => {
    cards = res.data.map(r => ({
      fr: r.Français,
      kab: r.Kabyle,
      frequency: r["Catégorie Fréquence"]
    }));
    showRandomCard();
  },
  error: err => console.error('Erreur CSV :', err)
});

// Listeners des boutons
document.getElementById('reveal').addEventListener('click', () => {
  document.getElementById('back').classList.toggle('visible');
});
document.getElementById('speak').addEventListener('click', speakKabyle);
document.getElementById('next').addEventListener('click', showRandomCard);
document.getElementById('prev').addEventListener('click', showRandomCard);