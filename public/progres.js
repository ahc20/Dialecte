import { auth, logout, initAuthListener, getScore, getUserLevel, loadUserCardsHistory } from "./firebase.js";

console.log('SCRIPT progres.js CHARGE');

// Affichage des boutons d'authentification premium
const headerAuth = document.getElementById('header-auth');
function renderAuthButtons(user) {
  headerAuth.innerHTML = '';
  if (user) {
    const btn = document.createElement('button');
    btn.textContent = 'Se déconnecter';
    btn.className = 'btn auth premium';
    btn.onclick = async () => {
      await logout();
      location.reload();
    };
    headerAuth.appendChild(btn);
  } else {
    const login = document.createElement('a');
    login.href = 'login.html';
    login.textContent = 'Se connecter';
    login.className = 'btn auth premium';
    const signup = document.createElement('a');
    signup.href = 'signup.html';
    signup.textContent = "S'inscrire";
    signup.className = 'btn auth premium';
    headerAuth.append(login, signup);
  }
}

// Affichage du niveau premium
function displayNiveau(niveauCourant) {
  let statsSection = document.querySelector('.stats-section');
  if (statsSection && !document.getElementById('niveau-courant')) {
    const niveauDiv = document.createElement('div');
    niveauDiv.id = 'niveau-courant';
    niveauDiv.className = 'niveau-badge premium';
    niveauDiv.innerHTML = `Niveau actuel : <span>${niveauCourant}</span>`;
    statsSection.insertBefore(niveauDiv, statsSection.firstChild);
  } else if (statsSection) {
    document.getElementById('niveau-courant').innerHTML = `Niveau actuel : <span>${niveauCourant}</span>`;
  }
}

function afficherBadgeNiveau(niveau) {
  const welcome = document.getElementById('welcome');
  let badge = document.getElementById('niveau-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'niveau-badge';
    badge.className = 'niveau-badge-premium';
    welcome.insertAdjacentElement('afterend', badge);
  }
  badge.innerHTML = `Niveau actuel : <span class="badge-niveau">${niveau}</span>`;
}

function afficherStats(user, stats) {
  document.getElementById('prenom').textContent = user?.displayName || '';
  document.getElementById('niveau-badge').textContent = stats.niveau || '-';
  document.getElementById('cartes-apprises').textContent = stats.learned;
  document.getElementById('cartes-total').textContent = `sur ${stats.total} disponibles`;
  document.getElementById('cartes-reviser').textContent = stats.due;
  document.getElementById('progression').textContent = stats.progress + ' %';
  // Barre de progression quiz classique
  const percent = stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0;
  document.getElementById('progress-bar').style.width = percent + '%';
  document.getElementById('progress-percent').textContent = percent + ' %';
}

function afficherHistorique(cardsHistory) {
  const tbody = document.getElementById('historique-sm2');
  tbody.innerHTML = '';
  let allHistory = [];
  cardsHistory.forEach(card => {
    if (card.history && card.history.length > 0) {
      card.history.forEach(h => {
        allHistory.push({
          fr: card.fr,
          kab: card.kab,
          date: h.date,
          quality: h.quality
        });
      });
    }
  });
  if (allHistory.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-[#B7B7A4]">Aucune révision enregistrée.</td></tr>';
    return;
  }
  allHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
  for (const h of allHistory) {
    tbody.innerHTML += `
      <tr class="border-b border-[#E0E6ED] hover:bg-[#F6F7F2] transition">
        <td class="px-4 py-2">${h.fr}</td>
        <td class="px-4 py-2">${h.kab}</td>
        <td class="px-4 py-2">${new Date(h.date).toLocaleDateString('fr-FR')}</td>
        <td class="px-4 py-2">
          <span class="inline-block px-3 py-1 rounded-full font-semibold ${getQualityColor(h.quality)}">
            ${getQualityLabel(h.quality)}
          </span>
        </td>
      </tr>
    `;
  }
}

function getQualityLabel(q) {
  switch (q) {
    case 0: return 'Difficile';
    case 3: return 'Correct';
    case 4: return 'Facile';
    case 5: return 'Excellent';
    default: return q;
  }
}

function getQualityColor(q) {
  switch (q) {
    case 0: return 'bg-e53935';
    case 3: return 'bg-ffd700';
    case 4: return 'bg-8a9a7b';
    case 5: return 'bg-4caf50';
    default: return 'bg-b7b7a4';
  }
}

// Initialisation
initAuthListener(async user => {
  renderAuthButtons(user);
  const w = document.getElementById('welcome');
  const u = document.getElementById('username');
  let niveauCourant = 1;
  if (user && user.displayName) {
    w.textContent = 'Bienvenue !';
    u.textContent = user.displayName;
    // Stats quiz classique
    const { totalAnswers, correctAnswers } = await getScore(user.uid);
    // Niveau courant
    niveauCourant = await getUserLevel(user.uid);
    displayNiveau(niveauCourant);
    afficherBadgeNiveau(niveauCourant);
    // Historique et stats SM-2
    const cardsHistory = await loadUserCardsHistory(user.uid);
    console.log('DEBUG - cardsHistory récupéré depuis Firebase :', cardsHistory);
    let total = 0, due = 0, learned = 0;
    cardsHistory.forEach(card => {
      total++;
      if (card.repetition > 0) learned++;
      if (card.dueDate && new Date(card.dueDate) <= new Date()) due++;
    });
    const stats = {
      niveau: niveauCourant,
      total,
      due,
      learned,
      progress: total > 0 ? Math.round((learned / total) * 100) : 0
    };
    afficherStats(user, stats);
    afficherHistorique(cardsHistory);
  } else {
    w.textContent = 'Bienvenue invité !';
    u.textContent = '';
    displayNiveau(1);
    afficherBadgeNiveau('-');
    document.getElementById('learned-cards').textContent = '0';
    document.getElementById('total-cards').textContent = '0';
    document.getElementById('due-cards').textContent = '0';
    document.getElementById('progress-percent').textContent = '0%';
    document.getElementById('historique-sm2').innerHTML = '<tr><td colspan="4" class="text-center py-4 text-[#B7B7A4]">Connecte-toi pour voir ton historique !</td></tr>';
  }
}); 