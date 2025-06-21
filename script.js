let cards = [];
let currentIndex = null;

// Charge et parse le CSV
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

// Affiche une carte et le QCM associé
function showRandomCard() {
  // Sélection aléatoire
  currentIndex = Math.floor(Math.random() * cards.length);
  const { fr, kab } = cards[currentIndex];

  // Texte avant / après
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');

  // Génère QCM
  renderChoices(kab);
}

// Génère et affiche 4 choix (1 correct + 3 erreurs)
function renderChoices(correctKab) {
  const container = document.getElementById('choices');
  container.innerHTML = '';

  // Récupère 3 distracteurs aléatoires différents
  const distractors = [];
  while (distractors.length < 3) {
    const randKab = cards[Math.floor(Math.random() * cards.length)].kab;
    if (randKab !== correctKab && !distractors.includes(randKab)) {
      distractors.push(randKab);
    }
  }

  // Mélange les 4 options
  const options = [correctKab, ...distractors].sort(() => Math.random() - 0.5);

  // Crée les boutons
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.addEventListener('click', () => handleChoice(btn, opt === correctKab));
    container.appendChild(btn);
  });
}

// Gestion du clic sur un choix
function handleChoice(button, isCorrect) {
  // Applique style
  button.classList.add(isCorrect ? 'correct' : 'wrong');

  // Désactive tous les boutons
  document.querySelectorAll('#choices button').forEach(b => b.disabled = true);

  // Si correct, on révèle le mot ; sinon, on peut aussi le révéler
  if (isCorrect) {
    document.getElementById('back').classList.add('visible');
  }

  // Passe à la question suivante après 2s
  setTimeout(showRandomCard, 2000);
}

// Bouton Révéler
document.getElementById('reveal').addEventListener('click', () => {
  document.getElementById('back').classList.toggle('visible');
});

// Bouton Prononcer (Web Speech API)
document.getElementById('speak').addEventListener('click', () => {
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
});
function speak(text, voices) {
  const voice = voices.find(v => /fr(-|_)/i.test(v.lang)) || voices[0];
  const utter = new SpeechSynthesisUtterance(text);
  utter.voice = voice;
  utter.lang = voice.lang;
  utter.rate = 0.9;
  utter.pitch = 1.1;
  speechSynthesis.speak(utter);
}

// Précédent / Suivant (pour naviguer manuellement)
document.getElementById('prev').addEventListener('click', showRandomCard);
document.getElementById('next').addEventListener('click', showRandomCard);