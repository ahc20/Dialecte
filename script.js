// script.js
import { saveProgress } from "./firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

let cards = [], history = [], pointer = -1;

// 1) Charger le CSV et afficher la première carte
Papa.parse('data.csv', {
  download: true,
  header: true,
  complete: ({ data }) => {
    // filtrer les lignes vides
    cards = data.filter(r => r.Français && r.Kabyle)
                .map(r => ({ fr: r.Français, kab: r.Kabyle }));
    if (!cards.length) {
      document.getElementById('front').textContent = 'Aucune carte trouvée.';
      return;
    }
    showNextCard();
  },
  error: err => {
    console.error('Échec chargement data.csv :', err);
    document.getElementById('front').textContent = 'Erreur de chargement.';
  }
});

// 2) Afficher carte
function displayCardAt(idx) {
  const { fr, kab } = cards[idx];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
  renderChoices(kab);
}

// 3) Tirage aléatoire sans répétition immédiate
function getRandomIndex() {
  if (cards.length < 2) return 0;
  let i;
  do { i = Math.floor(Math.random() * cards.length); }
  while (history[pointer] === i);
  return i;
}

// 4) Suivant
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

// 5) Précédent
function showPrevCard() {
  if (pointer > 0) {
    pointer--;
    displayCardAt(history[pointer]);
  }
}

// 6) Construire le QCM
function renderChoices(correctKab) {
  const container = document.getElementById('choices');
  container.innerHTML = '';
  const distractors = new Set();
  while (distractors.size < 3) {
    const r = cards[Math.floor(Math.random() * cards.length)].kab;
    if (r !== correctKab) distractors.add(r);
  }
  const options = [correctKab, ...distractors].sort(() => Math.random() - 0.5);
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.addEventListener('click', () => handleChoice(btn, opt === correctKab, correctKab));
    container.appendChild(btn);
  });
}

// 7) Clic réponse + sauvegarde
async function handleChoice(btn, isCorrect, correctKab) {
  btn.classList.add(isCorrect ? 'correct' : 'wrong');
  document.querySelectorAll('#choices button').forEach(b => b.disabled = true);
  if (!isCorrect) {
    document.querySelectorAll('#choices button')
      .forEach(b => b.textContent === correctKab && b.classList.add('correct'));
  } else {
    document.getElementById('back').classList.add('visible');
  }

  // Sauvegarde si utilisateur connecté
  try {
    const user = getAuth().currentUser;
    if (user) {
      await saveProgress(user.uid,
        document.getElementById('front').textContent,
        isCorrect
      );
    }
  } catch (e) {
    console.error('Erreur saveProgress:', e);
  }

  setTimeout(showNextCard, 1500);
}

// 8) Révéler la face arrière
document.getElementById('reveal').addEventListener('click', () =>
  document.getElementById('back').classList.toggle('visible')
);

// 9) Prononciation
document.getElementById('speak').addEventListener('click', () => {
  const txt = document.getElementById('back').textContent.trim();
  if (!txt) return;
  const synth = window.speechSynthesis;
  let voices = synth.getVoices();
  const speakNow = vList => {
    const v = vList.find(v => /fr(-|_)/.test(v.lang)) || vList[0];
    const u = new SpeechSynthesisUtterance(txt);
    u.voice = v; u.lang = v.lang; u.rate = 0.9; u.pitch = 1.1;
    synth.speak(u);
  };
  if (!voices.length) {
    synth.onvoiceschanged = () => speakNow(synth.getVoices());
  } else speakNow(voices);
});

// 10) Liens Précédent / Suivant
document.getElementById('prev').addEventListener('click', showPrevCard);
document.getElementById('next').addEventListener('click', showNextCard);