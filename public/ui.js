// Module de gestion des cartes avec algorithme SM-2
import { saveUserCardsHistory, loadUserCardsHistory } from './firebase.js';
import { auth } from './firebase.js';
window.auth = auth;

class CardManager {
    constructor() {
        this.cards = [];
        this.isInitialized = false;
    }

    // Initialiser les cartes depuis le CSV
    async loadCards() {
        try {
            const response = await fetch('/data/data3_niveaux.csv');
            if (!response.ok) {
                alert("Erreur lors du chargement du CSV : " + response.status + ' ' + response.statusText);
                throw new Error('CSV fetch failed');
            }
            const csvText = await response.text();
            console.log('[DEBUG] Contenu brut CSV:', csvText.slice(0, 500));
            if (!csvText || csvText.length < 10) {
                alert("Le fichier CSV est vide ou introuvable !");
                throw new Error('CSV vide');
            }

            // Essayer d'abord avec la virgule
            let lines = csvText.split('\n').filter(line => line.trim());
            let headers = lines[0].split(',').map(h => h.trim());
            let delimiter = ',';
            if (headers.length < 2 || !headers.includes('Français')) {
                // Réessayer avec ';'
                headers = lines[0].split(';').map(h => h.trim());
                delimiter = ';';
            }

            this.cards = [];
            for (let i = 1; i < lines.length; i++) {
                let values = lines[i].split(delimiter).map(v => v.trim());
                if (values.length < 2 || !values[0] || !values[1]) continue;
                const card = {
                    id: this.generateUUID(),
                    fr: values[0] || '',
                    kab: values[1] || '',
                    frequency: parseInt(values[2]) || 1, // Fréquence par défaut
                    repetition: 0,
                    interval: 0,
                    easeFactor: 2.5,
                    dueDate: new Date(),
                    history: [],
                    niveau: parseInt(values[values.length - 1]) || 10 // Ajout du niveau
                };
                if (card.fr && card.kab) this.cards.push(card);
            }
            console.log('[DEBUG] Après parsing CSV, cartes:', this.cards.length, this.cards.slice(0, 3));
            if (!this.cards || this.cards.length === 0) {
                alert("Aucune carte n'a été chargée depuis le CSV. Vérifiez le fichier data3_niveaux.csv !");
            }
            // Chargement cloud prioritaire si connecté
            if (window.auth && window.auth.currentUser) {
                const uid = window.auth.currentUser.uid;
                const cloudHistory = await loadUserCardsHistory(uid);
                console.log('[DEBUG] Historique cloud chargé:', cloudHistory);
                // Si cloud vide mais local non vide, on pousse le local sur Firebase
                if ((!cloudHistory || cloudHistory.length === 0) && this.cards.some(c => c.history && c.history.length > 0)) {
                    await saveUserCardsHistory(uid, this.cards);
                    console.log('[DEBUG] Cloud vide, local non vide : historique local sauvegardé sur Firebase');
                } else if (cloudHistory && cloudHistory.length > 0) {
                    // Fusion : on garde le plus complet pour chaque carte
                    for (const cloudCard of cloudHistory) {
                        const localCard = this.cards.find(c => c.fr === cloudCard.fr && c.kab === cloudCard.kab);
                        if (localCard) {
                            // Fusion intelligente des historiques (union des dates)
                            const localHist = localCard.history || [];
                            const cloudHist = cloudCard.history || [];
                            // On fusionne les historiques sans doublons (par date)
                            const allHist = [...localHist];
                            cloudHist.forEach(hc => {
                                if (!allHist.some(hl => hl.date === hc.date && hl.quality === hc.quality)) {
                                    allHist.push(hc);
                                }
                            });
                            // Tri par date croissante
                            allHist.sort((a, b) => new Date(a.date) - new Date(b.date));
                            localCard.history = allHist;
                            localCard.repetition = allHist.length;
                            if (allHist.length > 0) {
                                const last = allHist[allHist.length - 1];
                                localCard.interval = last.interval || 0;
                                localCard.easeFactor = last.easeFactor || 2.5;
                                localCard.dueDate = last.dueDate ? new Date(last.dueDate) : new Date();
                            }
                            console.log('[DEBUG] Fusion historique local/cloud pour', localCard.fr, allHist);
                        }
                    }
                    // Après fusion, on sauvegarde la version la plus complète sur Firebase
                    await saveUserCardsHistory(uid, this.cards);
                    console.log('[DEBUG] Fusion cloud > local OK et sauvegarde fusionnée sur Firebase');
                } else {
                    console.log('[DEBUG] Pas d\'historique cloud, on garde le local.');
                }
            }
            console.log('[DEBUG] Après fusion cloud, cartes:', this.cards.length, this.cards.slice(0, 3));
            this.isInitialized = true;
            
            console.log(`Chargé ${this.cards.length} cartes`);
            return this.cards;
        } catch (error) {
            alert('Erreur lors du chargement des cartes : ' + error);
            console.error('[DEBUG] Erreur loadCards:', error);
            return [];
        }
    }

    // Générer un UUID
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Sauvegarder une carte
    async saveCard(card) {
        const index = this.cards.findIndex(c => c.id === card.id);
        if (index !== -1) {
            this.cards[index] = { ...card };
            await this.saveToStorage();
            // Sauvegarde cloud systématique
            if (window.auth && window.auth.currentUser) {
                const uid = window.auth.currentUser.uid;
                // Charger l'historique cloud avant sauvegarde
                const cloudHistory = await loadUserCardsHistory(uid);
                if (cloudHistory && cloudHistory.length > 0) {
                    for (const cloudCard of cloudHistory) {
                        const localCard = this.cards.find(c => c.fr === cloudCard.fr && c.kab === cloudCard.kab);
                        if (localCard) {
                            // Fusion intelligente des historiques (union des dates)
                            const localHist = localCard.history || [];
                            const cloudHist = cloudCard.history || [];
                            const allHist = [...localHist];
                            cloudHist.forEach(hc => {
                                if (!allHist.some(hl => hl.date === hc.date && hl.quality === hc.quality)) {
                                    allHist.push(hc);
                                }
                            });
                            allHist.sort((a, b) => new Date(a.date) - new Date(b.date));
                            localCard.history = allHist;
                            localCard.repetition = allHist.length;
                            if (allHist.length > 0) {
                                const last = allHist[allHist.length - 1];
                                localCard.interval = last.interval || 0;
                                localCard.easeFactor = last.easeFactor || 2.5;
                                localCard.dueDate = last.dueDate ? new Date(last.dueDate) : new Date();
                            }
                            console.log('[DEBUG] Fusion avant sauvegarde cloud pour', localCard.fr, allHist);
                        }
                    }
                }
                console.log('[DEBUG] saveCard: sauvegarde cloud avec', this.cards.length, 'cartes');
                await saveUserCardsHistory(uid, this.cards);
                console.log('[DEBUG] Historique sauvegardé sur Firebase (saveCard)', this.cards[index]);
            }
        } else {
            console.error('[DEBUG] saveCard: carte non trouvée dans this.cards', card);
        }
    }

    // Sauvegarder toutes les données
    async saveToStorage() {
        try {
            localStorage.setItem('dialect_cards', JSON.stringify(this.cards));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
        }
    }

    // Charger les données sauvegardées
    async loadSavedData() {
        try {
            const saved = localStorage.getItem('dialect_cards');
            if (saved) {
                const savedCards = JSON.parse(saved);
                // Fusionner avec les cartes du CSV
                for (let savedCard of savedCards) {
                    const index = this.cards.findIndex(c => c.fr === savedCard.fr && c.kab === savedCard.kab);
                    if (index !== -1) {
                        this.cards[index] = { ...this.cards[index], ...savedCard };
                    }
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données sauvegardées:', error);
        }
    }

    // Obtenir les cartes dues pour la révision
    getDueCards() {
        const today = new Date();
        return this.cards.filter(card => new Date(card.dueDate) <= today);
    }

    // Sélectionner des cartes pour le mode découverte (pondérées par fréquence)
    getDiscoveryCards(count = 10) {
        const sampler = this.cards.flatMap(card => Array(card.frequency).fill(card.id));
        const shuffled = this.shuffle([...sampler]);
        const selectedIds = shuffled.slice(0, count);
        
        return selectedIds.map(id => this.cards.find(card => card.id === id)).filter(Boolean);
    }

    // Algorithme SM-2 pour la révision
    async processReview(card, quality) {
        const today = new Date();
        // Trouver la vraie carte dans this.cards (pour garantir la référence)
        const realCard = this.cards.find(c => c.id === card.id);
        if (!realCard) {
            console.error('[DEBUG] Carte non trouvée dans cardManager.cards pour la révision !', card);
            return;
        }
        // Ajouter à l'historique
        realCard.history.push({
            date: today.toISOString(),
            quality: quality
        });
        // Log pour vérifier l'historique après ajout
        console.log('[DEBUG] processReview: historique après ajout pour', realCard.fr, realCard.history);

        // SM-2 strict (comme Anki)
        if (quality < 3) {
            realCard.repetition = 0;
            realCard.interval = 1;
        } else {
            if (realCard.repetition === 0) {
                realCard.interval = 1;
            } else if (realCard.repetition === 1) {
                realCard.interval = 6;
            } else {
                realCard.interval = Math.round(realCard.interval * realCard.easeFactor);
            }
            realCard.repetition++;
        }
        // Mise à jour du easeFactor
        realCard.easeFactor = realCard.easeFactor || 2.5;
        realCard.easeFactor = realCard.easeFactor + (0.1 - (5 - quality) * (0.08 + (quality === 3 ? 0.02 : 0)));
        if (realCard.easeFactor < 1.3) realCard.easeFactor = 1.3;

        realCard.dueDate = this.addDays(today, realCard.interval);
        await this.saveCard(realCard);
        return realCard;
    }

    // Initialiser une carte pour le mode découverte
    async initializeCard(card, quality) {
        const today = new Date();
        
        card.repetition = 1;
        card.easeFactor = 2.5;
        card.interval = 1;
        card.dueDate = this.addDays(today, 1);
        card.history.push({
            date: today.toISOString(),
            quality: quality
        });
        
        await this.saveCard(card);
        return card;
    }

    // Fonctions utilitaires
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    // Obtenir des distracteurs pour le quiz
    getDistractors(correctCard, count = 3) {
        const otherCards = this.cards.filter(card => card.id !== correctCard.id);
        const shuffled = this.shuffle(otherCards);
        return shuffled.slice(0, count);
    }

    // Obtenir les statistiques
    getStats() {
        const totalCards = this.cards.length;
        const dueCards = this.getDueCards().length;
        const learnedCards = this.cards.filter(card => card.repetition > 0).length;
        console.log('[DEBUG] getStats: repetition de toutes les cartes', this.cards.map(c => ({fr: c.fr, repetition: c.repetition, history: c.history})));
        return {
            total: totalCards,
            due: dueCards,
            learned: learnedCards,
            progress: totalCards > 0 ? Math.round((learnedCards / totalCards) * 100) : 0
        };
    }
}

// Instance globale
const cardManager = new CardManager();

// Exporter pour utilisation dans d'autres modules
window.cardManager = cardManager;

// Affichage dynamique des boutons d'authentification dans la nav
export function renderNavAuthButtons(user) {
  const navActions = document.querySelector('.nav-actions');
  if (navActions) {
    navActions.innerHTML = '';
    if (user) {
      // Si connecté : bouton Se déconnecter (gris)
      const logoutBtn = document.createElement('button');
      logoutBtn.textContent = 'Se déconnecter';
      logoutBtn.className = 'btn btn-logout';
      logoutBtn.onclick = async () => {
        await import('./firebase.js').then(mod => mod.logout());
        location.reload();
      };
      navActions.appendChild(logoutBtn);
    } else {
      // Si déconnecté : bouton Se connecter (violet) + S'inscrire (outline jaune)
      const login = document.createElement('a');
      login.href = 'login.html';
      login.textContent = 'Se connecter';
      login.className = 'btn btn-purple';
      navActions.appendChild(login);
      const signup = document.createElement('a');
      signup.href = 'signup.html';
      signup.textContent = "S'inscrire";
      signup.className = 'btn btn-yellow';
      navActions.appendChild(signup);
    }
  }
  // Mise à jour dynamique de l'onglet Connexion/Déconnexion dans la nav principale
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) {
    const links = navLinks.querySelectorAll('a');
    let loginLink = null;
    links.forEach(link => {
      if (link.textContent.trim() === 'Connexion' || link.textContent.trim() === 'Déconnexion') {
        loginLink = link;
      }
    });
    if (user) {
      // Remplacer Connexion par Déconnexion
      if (loginLink) {
        loginLink.textContent = 'Déconnexion';
        loginLink.className = 'btn btn-logout';
        loginLink.href = '#';
        loginLink.onclick = async (e) => {
          e.preventDefault();
          await import('./firebase.js').then(mod => mod.logout());
          location.reload();
        };
      }
    } else {
      // Remettre Connexion
      if (loginLink) {
        loginLink.textContent = 'Connexion';
        loginLink.className = '';
        loginLink.href = 'login.html';
        loginLink.onclick = null;
      }
    }
  }
} 