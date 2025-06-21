let cards = [];

// 1) Charge et parse le CSV
Papa.parse('data.csv', {
  download: true,
  header: true,
  complete: ({ data }) => {
    cards = data.map(r => ({
      fr: r.Français,
      kab: r.Kabyle
    }));
    showRandomCard();
  },
  error: err => console.error('Erreur CSV :', err)
});

// 2) Affiche une carte aléatoire et génère le QCM
function showRandomCard() {
  const i = Math.floor(Math.random() * cards.length);
  const { fr, kab } = cards[i];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
  renderChoices(kab);
}

// 3) Génère 4 boutons QCM
function renderChoices(correctKab) {
  const cont = document.getElementById('choices');
  cont.innerHTML = '';
  // Distracteurs
  const choices = new Set([correctKab]);
  while (choices.size < 4) {
    const rand = cards[Math.floor(Math.random() * cards.length)].kab;
    choices.add(rand);
  }
  // Mélange et ajoute
  Array.from(choices)
    .sort(() => Math.random() - 0.5)
    .forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = opt;
      btn.onclick = () => handleChoice(btn, opt === correctKab);
      cont.appendChild(btn);
    });
}

// 4) Gestion du clic QCM
function handleChoice(btn, isCorrect) {
  btn.classList.add(isCorrect ? 'correct' : 'wrong');
  document.querySelectorAll('#choices button').forEach(b => b.disabled = true);
  if (isCorrect) document.getElementById('back').classList.add('visible');
  setTimeout(showRandomCard, 1500);
}

// 5) Bouton Révéler
document.getElementById('reveal').onclick = () =>
  document.getElementById('back').classList.toggle('visible');

// 6) Prononcer (Web Speech optimisé)
document.getElementById('speak').onclick = () => {
  const text = document.getElementById('back').textContent.trim();
  if (!text) return;
  const synth = window.speechSynthesis;
  let voices = synth.getVoices();
  if (!voices.length) {
    synth.onvoiceschanged = () => {
      voices = synth.getVoices();
      speak(text, voices);
    };
  } else {
    speak(text, voices);
  }
};
function speak(text, voices) {
  const voice = voices.find(v => /fr(-|_)/i.test(v.lang)) || voices[0];
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.9;
  u.pitch = 1.1;
  synth = window.speechSynthesis;
  synth.speak(u);
}

// 7) Précédent / Suivant
document.getElementById('prev').onclick = showRandomCard;
document.getElementById('next').onclick = showRandomCard;