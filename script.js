document.addEventListener('DOMContentLoaded', () => {
  const front = document.getElementById('front');
  const back = document.getElementById('back');
  const choicesContainer = document.getElementById('choices');
  const prevBtn = document.getElementById('prev');
  const revealBtn = document.getElementById('reveal');
  const nextBtn = document.getElementById('next');

  let cards = [], history = [], pointer = -1;

  // Charge data.csv depuis la racine
  Papa.parse('/data.csv', {
    download: true,
    header: true,
    complete: ({ data: raw }) => {
      cards = raw
        .filter(r => r.Français && r.Kabyle)
        .map(r => ({ fr: r.Français, kab: r.Kabyle }));
      if (cards.length) showNextCard();
      else front.textContent = 'Aucune carte.';
    },
    error: err => {
      console.error('Erreur CSV:', err);
      front.textContent = 'Erreur de chargement.';
    }
  });

  function displayCardAt(i) {
    const { fr, kab } = cards[i];
    front.textContent = fr;
    back.textContent = kab;
    back.classList.remove('visible');
    renderChoices(kab);
  }

  function getRandomIndex() {
    if (cards.length < 2) return 0;
    let i;
    do { i = Math.floor(Math.random() * cards.length); }
    while (history[pointer] === i);
    return i;
  }

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

  function showPrevCard() {
    if (pointer > 0) {
      pointer--;
      displayCardAt(history[pointer]);
    }
  }

  function renderChoices(correctKab) {
    choicesContainer.innerHTML = '';
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
      choicesContainer.appendChild(btn);
    });
  }

  function handleChoice(btn, isCorrect, correctKab) {
    btn.classList.add(isCorrect ? 'correct' : 'wrong');
    choicesContainer.querySelectorAll('button').forEach(b => b.disabled = true);
    if (!isCorrect) {
      choicesContainer.querySelectorAll('button')
        .forEach(b => {
          if (b.textContent === correctKab) b.classList.add('correct');
        });
    } else {
      back.classList.add('visible');
    }
    setTimeout(showNextCard, 1500);
  }

  revealBtn.addEventListener('click', () => back.classList.toggle('visible'));
  prevBtn.addEventListener('click', showPrevCard);
  nextBtn.addEventListener('click', showNextCard);
});