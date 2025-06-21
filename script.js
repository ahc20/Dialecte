let cards = [];
let history = [];
let pointer = -1;

Papa.parse('data.csv', {
  download: true,
  header: true,
  complete: ({ data }) => {
    cards = data.map(r => ({ fr: r.Français, kab: r.Kabyle }));
    showNextCard();
  }
});

function displayCardAt(idx) {
  const { fr, kab } = cards[idx];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
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
    displayCardAt(history[pointer]);
  } else {
    const idx = getRandomIndex();
    history.push(idx);
    pointer = history.length - 1;
    displayCardAt(idx);
  }
}

function showPrevCard() {
  if (pointer > 0) {
    pointer--;
    displayCardAt(history[pointer]);
  }
}

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

document.getElementById('reveal').onclick = () =>
  document.getElementById('back').classList.toggle('visible');

document.getElementById('speak').onclick = () => {
  const t = document.getElementById('back').textContent.trim();
  if (!t) return;
  const synth = speechSynthesis;
  let v = synth.getVoices();
  const s = voices => {
    const vc = voices.find(x=>/fr(-|_)/i.test(x.lang))||voices[0];
    const u = new SpeechSynthesisUtterance(t);
    u.voice=vc; u.lang=vc.lang; u.rate=0.9; u.pitch=1.1;
    synth.speak(u);
  };
  if (!v.length) synth.onvoiceschanged = () => { v=synth.getVoices(); s(v); };
  else s(v);
};

document.getElementById('prev').onclick = showPrevCard;
document.getElementById('next').onclick = showNextCard;