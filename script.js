let cards = [];
const weights = {
  "Très courant": 5,
  "Courant":      3,
  "Moyennement courant":2,
  "Peu courant":  1
};

// Choisit un index au hasard en pondérant par weights[row["Catégorie Fréquence"]]
function weightedRandomIndex() {
  const total = cards.reduce((sum, c) => sum + (weights[c.frequency]||1), 0);
  let r = Math.random() * total;
  for (let i = 0; i < cards.length; i++) {
    r -= (weights[cards[i].frequency]||1);
    if (r <= 0) return i;
  }
  return 0;
}

// Affiche une carte tirée au hasard
function showRandomCard() {
  const i = weightedRandomIndex();
  const { fr, kab } = cards[i];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.add('hidden');
}

// Charge et parse le CSV
Papa.parse('data.csv', {
  download: true,
  header: true,
  complete: (results) => {
    cards = results.data.map(row => ({
      fr: row.Français,
      kab: row.Kabyle,
      // on lit la colonne "Catégorie Fréquence"
      frequency: row["Catégorie Fréquence"]
    }));
    showRandomCard();
  }
});

// Boutons
document.getElementById('reveal').addEventListener('click', () => {
  document.getElementById('back').classList.toggle('hidden');
});
document.getElementById('next').addEventListener('click', showRandomCard);
document.getElementById('prev').addEventListener('click', showRandomCard);