let cards = [];

// Poids pondérés selon Catégorie Fréquence
const weights = {
  "Très courant": 5,
  "Courant": 3,
  "Moyennement courant": 2,
  "Peu courant": 1,
  "Très rare": 1
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

// Affiche la carte suivante
function showRandomCard() {
  const i = weightedRandomIndex();
  const { fr, kab } = cards[i];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
}

// Prononciation AI via endpoint serverless Vercel
async function speakAI() {
  const text = document.getElementById('back').textContent.trim();
  if (!text) return;
  try {
    const res = await fetch(`/api/tts?text=${encodeURIComponent(text)}`);
    if (!res.ok) {
      const err = await res.text();
      console.error('TTS AI error body:', err);
      alert('Erreur TTS : ' + err);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    new Audio(url).play();
  } catch (err) {
    console.error('Erreur fetch TTS :', err);
    alert('Erreur réseau TTS : ' + err.message);
  }
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
document.getElementById('speakAI').addEventListener('click', speakAI);
document.getElementById('next').addEventListener('click', showRandomCard);
document.getElementById('prev').addEventListener('click', showRandomCard);