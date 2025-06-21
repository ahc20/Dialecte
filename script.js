let cards = [];
const weights = {
  "Très courant": 5,
  "Courant":      3,
  "Moyennement courant": 2,
  "Peu courant":  1
};

// Fonction de tirage aléatoire pondéré
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
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
}

// Chargement et parsing du CSV
Papa.parse('data.csv', {
  download: true,
  header: true,
  complete: (results) => {
    cards = results.data.map(row => ({
      fr: row.Français,
      kab: row.Kabyle,
      frequency: row["Catégorie Fréquence"]
    }));
    showRandomCard();
  },
  error: (err) => {
    console.error('Erreur de chargement CSV:', err);
  }
});

// Gestion des boutons
document.getElementById('reveal').addEventListener('click', () => {
  document.getElementById('back').classList.toggle('visible');
});
document.getElementById('next').addEventListener('click', showRandomCard);
document.getElementById('prev').addEventListener('click', showRandomCard);