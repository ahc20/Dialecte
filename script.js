let cards = [];
const weights = {
  "Très courant": 5,
  "Courant":      3,
  "Moyennement courant": 2,
  "Peu courant":  1
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

// Affiche une nouvelle carte (seul le français)
function showRandomCard() {
  const i = weightedRandomIndex();
  const card = cards[i];
  const frontEl = document.getElementById('front');
  frontEl.textContent = card.fr;
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

// Au clic sur Révéler : injecte le Kabyle sous le Français
document.getElementById('reveal').addEventListener('click', () => {
  const frontEl = document.getElementById('front');
  const textFr = frontEl.textContent;
  // Retire toute injection <span class="kab"> précédente
  frontEl.innerHTML = textFr;
  // Récupère la carte correspondante
  const card = cards.find(c => c.fr === textFr);
  if (card) {
    frontEl.insertAdjacentHTML('beforeend', `<span class="kab">${card.kab}</span>`);
  }
});

// Boutons Suivant / Précédent
document.getElementById('next').addEventListener('click', showRandomCard);
document.getElementById('prev').addEventListener('click', showRandomCard);