// script.js
let cards = [], history = [], pointer = -1;

// 1) Charge et parse data.csv
Papa.parse('data.csv', {
  download: true,
  header: true,
  complete: ({ data }) => {
    console.log('CSV chargé:', data.length, 'lignes');
    cards = data.filter(r => r.Français && r.Kabyle)
                .map(r => ({ fr: r.Français, kab: r.Kabyle }));
    if (cards.length) showNextCard();
    else document.getElementById('front').textContent = 'Aucune carte.';
  },
  error: err => {
    console.error('Erreur CSV:', err);
    document.getElementById('front').textContent = 'Échec chargement.';
  }
});

// 2) Affiche la carte
function displayCardAt(i) {
  const { fr, kab } = cards[i];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
  renderChoices(kab);
}

// 3) Index aléatoire non-répétitif
function getRandomIndex() {
  if (cards.length < 2) return 0;
  let i;
  do { i = Math.floor(Math.random()*cards.length); }
  while (history[pointer] === i);
  return i;
}

// 4) Suivant
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

// 5) Précédent
function showPrevCard() {
  if (pointer > 0) {
    pointer--;
    displayCardAt(history[pointer]);
  }
}

// 6) Génère le QCM
function renderChoices(correctKab) {
  const c = document.getElementById('choices');
  c.innerHTML = '';
  const set = new Set();
  while (set.size < 3) {
    const r = cards[Math.floor(Math.random()*cards.length)].kab;
    if (r !== correctKab) set.add(r);
  }
  const opts = [correctKab, ...set].sort(() => Math.random()-0.5);
  opts.forEach(opt => {
    const b = document.createElement('button');
    b.textContent = opt;
    b.onclick = () => handleChoice(b, opt===correctKab, correctKab);
    c.appendChild(b);
  });
}

// 7) Gestion du choix
function handleChoice(btn, ok, correctKab) {
  btn.classList.add(ok?'correct':'wrong');
  document.querySelectorAll('#choices button')
          .forEach(b=>b.disabled=true);
  if (!ok) {
    document.querySelectorAll('#choices button')
      .forEach(b=> b.textContent===correctKab && b.classList.add('correct'));
  } else {
    document.getElementById('back').classList.add('visible');
  }
  setTimeout(showNextCard,1500);
}

// 8) Révéler
document.getElementById('reveal')
  .onclick = () => document.getElementById('back')
                      .classList.toggle('visible');

// 9) Prononcer
document.getElementById('speak')
  .onclick = () => {
    const txt = document.getElementById('back').textContent.trim();
    if (!txt) return;
    const synth = speechSynthesis;
    let v = synth.getVoices();
    const speak = vs => {
      const vc = vs.find(x=>/fr(-|_)/.test(x.lang))||vs[0];
      const u = new SpeechSynthesisUtterance(txt);
      u.voice=vc; u.lang=vc.lang; u.rate=0.9; u.pitch=1.1;
      synth.speak(u);
    };
    if (!v.length) synth.onvoiceschanged = ()=>speak(synth.getVoices());
    else speak(v);
  };

// 10) Prev/Next
document.getElementById('prev').onclick = showPrevCard;
document.getElementById('next').onclick = showNextCard;