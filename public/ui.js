// Module de gestion des cartes avec algorithme SM-2
// Firebase imports are loaded dynamically to avoid blocking card loading
// if the Firebase CDN is unreachable (slow network, adblocker, etc.)
let saveUserCardsHistory = async () => { };
let loadUserCardsHistory = async () => [];
let auth = null;

try {
    const fb = await import('./firebase.js');
    saveUserCardsHistory = fb.saveUserCardsHistory;
    loadUserCardsHistory = fb.loadUserCardsHistory;
    auth = fb.auth;
    window.auth = auth;
    console.log('[DEBUG] Firebase loaded successfully');
} catch (e) {
    console.warn('[WARN] Firebase unavailable, running in offline mode:', e.message);
    window.auth = null;
}

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

            // Normaliser les en-têtes
            headers = headers.map(h => h.trim().toLowerCase());
            const frCol = headers.indexOf('français');
            const kabCol = headers.indexOf('kabyle');
            const commentCol = headers.indexOf('commentaire');
            const exampleCol = headers.indexOf('exemple');
            const niveauCol = headers.indexOf('niveau');

            this.cards = [];
            for (let i = 1; i < lines.length; i++) {
                let values = lines[i].split(delimiter).map(v => v.trim());
                if (values.length < 2 || !values[frCol] || !values[kabCol]) continue;
                const card = {
                    id: this.generateUUID(),
                    fr: values[frCol] || '',
                    kab: values[kabCol] || '',
                    frequency: 1, // Fréquence par défaut
                    repetition: 0,
                    interval: 0,
                    easeFactor: 2.5,
                    dueDate: new Date(),
                    history: [],
                    niveau: parseInt(values[niveauCol]) || 1,
                    commentaire: values[commentCol] || '',
                    exemple: values[exampleCol] || ''
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
                                localCard.repetition = allHist.length;

                                // Si l'historique contient les métadonnées (fix récent), on les utilise
                                if (last.interval !== undefined && last.dueDate !== undefined) {
                                    localCard.interval = last.interval;
                                    localCard.easeFactor = last.easeFactor || 2.5;
                                    localCard.dueDate = new Date(last.dueDate);
                                } else {
                                    // MODE RETROCOMPATIBLE : Reconstruction pour les vieux historiques
                                    // On estime l'intervalle basé sur le nombre de répétitions (SM-2 approx)
                                    let estInterval = 1;
                                    if (localCard.repetition > 1) estInterval = 6;
                                    if (localCard.repetition > 2) estInterval = 15;
                                    if (localCard.repetition > 3) estInterval = Math.round(15 * Math.pow(2.5, localCard.repetition - 3));

                                    localCard.interval = estInterval;
                                    localCard.easeFactor = 2.5;

                                    // La date due est calculée à partir de la dernière révision
                                    const lastDate = last.date ? new Date(last.date) : new Date();
                                    const due = new Date(lastDate);
                                    due.setDate(due.getDate() + estInterval);
                                    localCard.dueDate = due;
                                }
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
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
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
                                localCard.repetition = allHist.length;

                                if (last.interval !== undefined && last.dueDate !== undefined) {
                                    localCard.interval = last.interval;
                                    localCard.easeFactor = last.easeFactor || 2.5;
                                    localCard.dueDate = new Date(last.dueDate);
                                } else {
                                    // Reconstruction rétrocompatible (même logique que loadCards)
                                    let estInterval = 1;
                                    if (localCard.repetition > 1) estInterval = 6;
                                    if (localCard.repetition > 2) estInterval = 15;
                                    if (localCard.repetition > 3) estInterval = Math.round(15 * Math.pow(2.5, localCard.repetition - 3));

                                    localCard.interval = estInterval;
                                    localCard.easeFactor = 2.5;

                                    const lastDate = last.date ? new Date(last.date) : new Date();
                                    const due = new Date(lastDate);
                                    due.setDate(due.getDate() + estInterval);
                                    localCard.dueDate = due;
                                }
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
        const due = this.cards.filter(card => {
            if (!card.dueDate) return true; // Si pas de date, c'est dû (ou bug)
            return new Date(card.dueDate) <= today;
        });

        console.log(`[DEBUG] getDueCards: ${due.length} cartes dues sur ${this.cards.length} total.`);
        if (due.length < 5) {
            console.log('[DEBUG] Détail des 3 premières cartes dues:', due.slice(0, 3).map(c => ({ fr: c.fr, dueDate: c.dueDate })));
        }

        return due;
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
        // SM-2 strict (comme Anki) adapté pour 3 choix : 1 (Difficile), 3 (Moyen), 5 (Facile)
        if (quality < 3) {
            // Difficult (1) : Reset
            realCard.repetition = 0;
            realCard.interval = 1;
        } else {
            // Medium (3) or Easy (5)
            if (realCard.repetition === 0) {
                realCard.interval = 1;
            } else if (realCard.repetition === 1) {
                // Deuxième répétition : 3 jours si Moyen, 6 jours si Facile
                realCard.interval = (quality === 3) ? 3 : 6;
            } else {
                // Croissance exponentielle
                let factor = realCard.easeFactor;
                // Si "Moyen", on réduit légèrement le facteur pour ralentir la progression
                if (quality === 3) {
                    factor = Math.max(1.3, factor - 0.15);
                }
                realCard.interval = Math.round(realCard.interval * factor);
            }
            realCard.repetition++;
        }

        // Mise à jour du easeFactor (standard SM-2)
        if (quality >= 3) {
            realCard.easeFactor = realCard.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        } else {
            realCard.easeFactor = Math.max(1.3, realCard.easeFactor - 0.2);
        }

        if (realCard.easeFactor < 1.3) realCard.easeFactor = 1.3;

        realCard.dueDate = this.addDays(today, realCard.interval);

        // Ajouter à l'historique AVEC l'état calculé (pour la reconstruction au chargement)
        realCard.history.push({
            date: today.toISOString(),
            quality: quality,
            interval: realCard.interval,
            easeFactor: realCard.easeFactor,
            dueDate: realCard.dueDate.toISOString(),
            repetition: realCard.repetition
        });

        // Log pour vérifier l'historique après ajout
        console.log('[DEBUG] processReview: historique après ajout pour', realCard.fr, realCard.history);

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
            quality: quality,
            interval: card.interval,
            easeFactor: card.easeFactor,
            dueDate: card.dueDate.toISOString(),
            repetition: card.repetition
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

        // Calcul du streak (série actuelle)
        const streak = this.getStreak();

        return {
            total: totalCards,
            due: dueCards,
            learned: learnedCards,
            progress: totalCards > 0 ? Math.round((learnedCards / totalCards) * 100) : 0,
            streak: streak
        };
    }

    // Calculer la série de jours consécutifs (streak)
    getStreak() {
        // Récupérer toutes les dates d'activité (historique de toutes les cartes)
        const allDates = new Set();
        this.cards.forEach(card => {
            if (card.history && card.history.length > 0) {
                card.history.forEach(h => {
                    if (h.date) {
                        allDates.add(new Date(h.date).toDateString());
                    }
                });
            }
        });

        if (allDates.size === 0) return 0;

        // Convertir en tableau trié (plus récent au plus ancien)
        const sortedDates = Array.from(allDates).map(d => new Date(d)).sort((a, b) => b - a);

        // Vérifier si jouer aujourd'hui ou hier pour continuer la série
        const today = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        let currentStreak = 0;
        let lastDate = sortedDates[0];

        // Si la dernière activité n'est ni aujourd'hui ni hier, la série est brisée (sauf si c'est 0)
        if (lastDate.toDateString() !== today && lastDate.toDateString() !== yesterdayStr) {
            return 0;
        }

        // Compter les jours consécutifs
        // On commence par le premier jour valide (aujourd'hui ou hier)
        let checkDate = lastDate;

        // On itère pour trouver la continuité
        for (let i = 0; i < sortedDates.length; i++) {
            const d = sortedDates[i];
            // Si c'est la même date (doublon potentiel malgré le Set sur string), on ignore
            if (d.toDateString() === checkDate.toDateString()) {
                currentStreak++;
                // Préparer la date attendue suivante (jour d'avant)
                checkDate = new Date(checkDate);
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                // Trou dans la suite -> fin de série
                break;
            }
        }

        return currentStreak;
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