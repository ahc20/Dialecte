import { saveAnswer, auth } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  const front  = document.getElementById('front');
  const back   = document.getElementById('back');
  const choicesContainer = document.getElementById('choices');
  const prevBtn = document.getElementById('prev');
  const revealBtn = document.getElementById('reveal');
  const nextBtn = document.getElementById('next');

  let cards   = [],
      history = [],
      pointer = -1,
      recentWords = [],
      RECENT_LIMIT = 100;

  // 1) Charge et parse data3.csv (séparateur ;)
  Papa.parse('/data/data3.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    delimiter: ';',
    complete: ({ data: raw }) => {
      // filtre lignes valides
      const filtered = raw.filter(r => r.Français && r.Kabyle && r.Fréquence_Pourcentage);
      // Création d'un tableau pondéré selon la fréquence
      let ponderee = [];
      filtered.forEach(r => {
        const freq = parseFloat(r.Fréquence_Pourcentage.replace(',', '.'));
        // On multiplie la fréquence par 100 pour avoir un nombre d'occurrences (ajuster si besoin)
        const occur = Math.max(1, Math.round(freq * 100));
        // Séparer les traductions multiples
        const traductions = r.Kabyle.split('/').map(t => t.trim()).filter(t => t);
        for (let i = 0; i < occur; i++) {
          ponderee.push({
            fr: r.Français.trim(),
            kab: r.Kabyle.trim(),
            traductions: traductions,
            freq: freq
          });
        }
      });
      cards = ponderee;
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
    const { fr, kab, traductions } = cards[i];
    front.textContent = fr;
    // Afficher toutes les traductions disponibles
    if (traductions && traductions.length > 1) {
      back.textContent = traductions.join(' / ');
    } else {
      back.textContent = kab;
    }
    back.classList.remove('visible');
    renderChoices(kab, traductions);
  }

  // 3) Choisit un index aléatoire différent du précédent et pas dans recentWords
  function getRandomIndex() {
    if (cards.length < 2) return 0;
    let i, tries = 0;
    do {
      i = Math.floor(Math.random() * cards.length);
      tries++;
      // Si on ne trouve pas après 50 essais, on accepte quand même
      if (tries > 50) break;
    } while (history[pointer] === i || recentWords.includes(cards[i].fr + '|' + cards[i].kab));
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
      // Ajoute le mot à la file d'attente des récents
      const key = cards[idx].fr + '|' + cards[idx].kab;
      recentWords.push(key);
      if (recentWords.length > RECENT_LIMIT) recentWords.shift();
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
  function renderChoices(correctKab, traductions) {
    choicesContainer.innerHTML = '';
    // Trouver la carte courante
    const current = cards.find(card => card.kab === correctKab);
    let theme = null;
    if (current && current.fr) {
      // On prend le premier mot du français comme thème (ex: "eau", "air", "feu", ...)
      theme = current.fr.split(/ |,|;/)[0].toLowerCase();
    }
    // 1. Cherche des distracteurs du même thème
    let distracteurs = cards.filter(card => card.kab !== correctKab && card.fr && card.fr.toLowerCase().includes(theme));
    // 2. Si pas assez, complète avec fréquence proche (±20%)
    if (distracteurs.length < 3 && current && current.freq) {
      const freq = current.freq;
      const minF = freq * 0.8, maxF = freq * 1.2;
      const freqDistr = cards.filter(card => card.kab !== correctKab && card.freq && card.freq >= minF && card.freq <= maxF);
      distracteurs = distracteurs.concat(freqDistr.filter(d => !distracteurs.includes(d)));
    }
    // 3. Si toujours pas assez, complète aléatoirement
    if (distracteurs.length < 3) {
      const randomDistr = cards.filter(card => card.kab !== correctKab && !distracteurs.includes(card));
      distracteurs = distracteurs.concat(randomDistr);
    }
    // On mélange et on prend 3 uniques
    const shuffled = distracteurs.sort(() => Math.random() - 0.5);
    const uniqueWrongs = Array.from(new Set(shuffled.map(d => d.kab))).slice(0, 3);
    // On mélange la bonne réponse avec les mauvaises
    const opts = [correctKab, ...uniqueWrongs].sort(() => Math.random() - 0.5);
    opts.forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = opt;
      btn.onclick = () => handleChoice(btn, opt === correctKab, correctKab, traductions);
      choicesContainer.appendChild(btn);
    });
  }

  // 7) Gère la réponse
  async function handleChoice(btn, isCorrect, correctKab, traductions) {
    btn.classList.add(isCorrect ? 'correct' : 'wrong');
    choicesContainer.querySelectorAll('button').forEach(b => b.disabled = true);
    
    // Afficher la réponse correcte avec toutes les traductions
    if (traductions && traductions.length > 1) {
      back.textContent = traductions.join(' / ');
    } else {
      back.textContent = correctKab;
    }
    back.classList.add('visible');
    
    // Sauvegarder la réponse si connecté
    const user = auth.currentUser;
    if (user) {
      try {
        await saveAnswer(user.uid, isCorrect);
      } catch (err) {
        console.error('Erreur sauvegarde:', err);
      }
    }
    
    // Ajouter à l'historique
    history.push({ fr: front.textContent, kab: correctKab, isCorrect });
    pointer = history.length - 1;
    
    // Ajouter aux mots récents
    const currentWord = front.textContent;
    recentWords = recentWords.filter(w => w !== currentWord);
    recentWords.unshift(currentWord);
    if (recentWords.length > RECENT_LIMIT) {
      recentWords.pop();
    }
  }

  // 8) Bouton "Révéler"
  revealBtn.addEventListener('click', () => back.classList.toggle('visible'));

  // 9) Précédent / Suivant
  prevBtn.addEventListener('click', showPrevCard);
  nextBtn.addEventListener('click', showNextCard);
});