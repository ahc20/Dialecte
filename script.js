document.addEventListener('DOMContentLoaded', () => {
  const front  = document.getElementById('front');
  const back   = document.getElementById('back');
  const choicesContainer = document.getElementById('choices');
  const prevBtn = document.getElementById('prev');
  const revealBtn = document.getElementById('reveal');
  const nextBtn = document.getElementById('next');

  let cards   = [],
      history = [],
      pointer = -1;

  // 1) Charge et parse data.csv (séparateur ;)
  Papa.parse('/data.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    delimiter: ';',
    complete: ({ data: raw }) => {
      // filtre lignes valides
      const filtered = raw.filter(r => r.Français && r.Kabyle);
      cards = filtered.map(r => ({
        fr:  r.Français.trim(),
        kab: r.Kabyle.trim()
      }));
      if (cards.length) showNextCard();
      else front.textContent = 'Aucune carte.';
    },
    error: err => {
      console.error('Erreur de chargement CSV :', err);
      front.textContent = 'Erreur de chargement.';
    }
  });

  // 2) Affiche la carte i
  function displayCardAt(i) {
    const { fr, kab } = cards[i];
    front.textContent = fr;
    back.textContent  = kab;
    back.classList.remove('visible');
    renderChoices(kab);
  }

  // 3) Choisit un index aléatoire différent du précédent
  function getRandomIndex() {
    if (cards.length < 2) return 0;
    let i;
    do { i = Math.floor(Math.random() * cards.length); }
    while (history[pointer] === i);
    return i;
  }

  // 4) Passe à la carte suivante
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

  // 6) Génère les boutons du QCM
  function renderChoices(correctKab) {
    choicesContainer.innerHTML = '';
    const set = new Set();
    while (set.size < 3) {
      const rnd = cards[Math.floor(Math.random() * cards.length)].kab;
      if (rnd !== correctKab) set.add(rnd);
    }
    const opts = [correctKab, ...set].sort(() => Math.random() - 0.5);
    opts.forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = opt;
      btn.onclick = () => handleChoice(btn, opt === correctKab, correctKab);
      choicesContainer.appendChild(btn);
    });
  }

  // 7) Gère la réponse
  function handleChoice(btn, isCorrect, correctKab) {
    btn.classList.add(isCorrect ? 'correct' : 'wrong');
    choicesContainer.querySelectorAll('button').forEach(b => b.disabled = true);
    if (!isCorrect) {
      // met en évidence la bonne réponse
      choicesContainer.querySelectorAll('button')
        .forEach(b => {
          if (b.textContent === correctKab) b.classList.add('correct');
        });
    } else {
      back.classList.add('visible');
    }
    setTimeout(showNextCard, 1500);
  }

  // 8) Bouton “Révéler”
  revealBtn.addEventListener('click', () => back.classList.toggle('visible'));

  // 9) Précédent / Suivant
  prevBtn.addEventListener('click', showPrevCard);
  nextBtn.addEventListener('click', showNextCard);
});