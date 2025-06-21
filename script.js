let cards = [];
let history = [];
let pointer = -1;

// Charger et parser le CSV
Papa.parse('data.csv', {
  download: true,
  header: true,
  complete: ({ data }) => {
    cards = data.map(r => ({ fr: r.Français, kab: r.Kabyle }));
    showNextCard();
  }
});

// Afficher carte
function displayCardAt(idx) {
  const { fr, kab } = cards[idx];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
  renderChoices(kab);
}

// Tirage aléatoire
function getRandomIndex() {
  if (cards.length < 2) return 0;
  let i;
  do { i = Math.floor(Math.random() * cards.length); }
  while (history[pointer] === i);
  return i;
}

// Suivant
function showNextCard() {
  if (pointer < history.length - 1) {
    pointer++;
    displayCardAt(history[pointer]);
  } else {
    const idx = getRandomIndex();
    history.push(idx);
    pointer = history.length - 1;
    displayCardAt(idx);
  }
}

// Précédent
function showPrevCard() {
  if (pointer > 0) {
    pointer--;
    displayCardAt(history[pointer]);
  }
}

// QCM
function renderChoices(correctKab) {
  const c = document.getElementById('choices');
  c.innerHTML = '';
  const dist = new Set();
  while (dist.size < 3) {
    const r = cards[Math.floor(Math.random()*cards.length)].kab;
    if (r !== correctKab) dist.add(r);
  }
  const opts = [correctKab, ...dist].sort(() => Math.random()-0.5);
  opts.forEach(opt => {
    const b = document.createElement('button');
    b.textContent = opt;
    b.onclick = () => handleChoice(b, opt===correctKab, correctKab);
    c.appendChild(b);
  });
}

// Clic QCM
function handleChoice(btn, ok, correct) {
  btn.classList.add(ok?'correct':'wrong');
  document.querySelectorAll('#choices button').forEach(b=>b.disabled=true);
  if (!ok) {
    const cb = Array.from(document.querySelectorAll('#choices button'))
      .find(x=>x.textContent===correct);
    if (cb) cb.classList.add('correct');
  } else {
    document.getElementById('back').classList.add('visible');
  }
  setTimeout(showNextCard,1500);
}

// Révéler
document.getElementById('reveal').onclick = () =>
  document.getElementById('back').classList.toggle('visible');

// Prononcer
document.getElementById('speak').onclick = () => {
  const text = document.getElementById('back').textContent.trim();
  if (!text) return;
  const synth = speechSynthesis;
  let voices = synth.getVoices();
  const speakIt = vList => {
    const v = vList.find(v=>/fr(-|_)/i.test(v.lang))||vList[0];
    const u = new SpeechSynthesisUtterance(text);
    u.voice=v; u.lang=v.lang; u.rate=0.9; u.pitch=1.1;
    synth.speak(u);
  };
  if (!voices.length) synth.onvoiceschanged = () => {
    voices = synth.getVoices(); speakIt(voices);
  };
  else speakIt(voices);
};

// Prev/Next
document.getElementById('prev').onclick = showPrevCard;
document.getElementById('next').onclick = showNextCard;