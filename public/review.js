import { getUserLevel } from './firebase.js';

// Module pour le mode révision (algorithme SM-2)
class ReviewMode {
    constructor() {
        this.dueCards = [];
        this.currentCardIndex = 0;
        this.isFlipped = false;
    }

    // Initialiser la session de révision
    async startReview() {
        if (!cardManager.isInitialized) {
            await cardManager.loadCards();
        }
        // Récupérer le niveau courant de l'utilisateur connecté
        let niveauMax = 1;
        if (window.auth && window.auth.currentUser) {
            niveauMax = await getUserLevel(window.auth.currentUser.uid);
        }
        this.niveauMax = niveauMax;
        // Filtrer les cartes à réviser :
        // - Toutes les cartes du niveau <= niveauMax
        // - + cartes des niveaux précédents non maîtrisées (interval < 15 jours ou répétition < 3)
        const due = cardManager.getDueCards().filter(card => {
            if (card.niveau <= niveauMax) return true;
            // Si carte d'un niveau précédent mais pas maîtrisée, on la garde
            if (card.niveau < niveauMax && (card.repetition < 3 || card.interval < 15)) return true;
            return false;
        });
        let weighted = [];
        due.forEach(card => {
            for (let i = 0; i < Math.max(1, card.frequency); i++) {
                weighted.push(card);
            }
        });
        this.dueCards = cardManager.shuffle(weighted);
        // Charger l'index de progression sauvegardé
        const savedIndex = parseInt(localStorage.getItem('review_current_index') || '0', 10);
        this.currentCardIndex = (!isNaN(savedIndex) && savedIndex < this.dueCards.length) ? savedIndex : 0;
        if (this.dueCards.length === 0) {
            this.showNoCardsMessage();
            return;
        }
        this.displayCard();
        this.updateProgress();
    }

    // Afficher la carte actuelle
    displayCard() {
        if (this.currentCardIndex >= this.dueCards.length) {
            this.finishReview();
            return;
        }

        const card = this.dueCards[this.currentCardIndex];
        const reviewContainer = document.getElementById('review-container');
        
        reviewContainer.innerHTML = `
            <div class="flashcard-container">
                <div class="flashcard" id="flashcard">
                    <div class="card-face front">
                        <div class="card-text">${card.fr}</div>
                        <div class="card-hint">Cliquez pour voir la traduction</div>
                        <div class="flip-indicator">🔄</div>
                    </div>
                    <div class="card-face back">
                        <div class="card-text">${card.kab}</div>
                        ${card.commentaire ? `<div class="card-comment">${card.commentaire}</div>` : ''}
                        ${card.exemple ? `<div class="card-example">${card.exemple}</div>` : ''}
                        <div class="flip-indicator">🔄</div>
                    </div>
                </div>
            </div>
            <div class="quality-buttons" id="quality-buttons" style="display: none;">
                <button class="quality-btn" data-quality="0">Difficile</button>
                <button class="quality-btn" data-quality="3">Correct</button>
                <button class="quality-btn" data-quality="4">Facile</button>
                <button class="quality-btn" data-quality="5">Très facile</button>
            </div>
        `;

        // Ajouter les événements
        const flashcard = document.getElementById('flashcard');
        const qualityButtons = document.getElementById('quality-buttons');

        flashcard.addEventListener('click', () => this.flipCard());
        
        qualityButtons.querySelectorAll('.quality-btn').forEach(button => {
            button.addEventListener('click', (e) => this.handleQuality(e));
        });

        // Après avoir affiché la réponse (flip), scroll la carte et les boutons dans la fenêtre sur mobile
        setTimeout(() => {
            const card = document.querySelector('.review-card');
            if (card && window.innerWidth < 700) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            const qualityBtns = document.querySelector('.quality-buttons');
            if (qualityBtns && window.innerWidth < 700) {
                qualityBtns.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);
    }

    // Retourner la carte
    flipCard() {
        const flashcard = document.getElementById('flashcard');
        const qualityButtons = document.getElementById('quality-buttons');

        flashcard.classList.add('flipped');
        
        // Afficher les boutons de qualité après un délai pour laisser l'animation se terminer
        setTimeout(() => {
            qualityButtons.style.display = 'flex';
            // Scroll automatique sur mobile pour afficher le dernier bouton au-dessus du menu
            if (window.innerWidth < 700) {
                setTimeout(() => {
                    const btns = qualityButtons.querySelectorAll('.quality-btn');
                    if (btns.length > 0) {
                        btns[btns.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end' });
                        // Décale la fenêtre de +260px pour que le menu soit bien en dessous de 'Très facile'
                        window.scrollBy({ top: 260, behavior: 'smooth' });
                    }
                }, 200);
            }
        }, 300);
    }

    // Gérer l'évaluation de qualité
    async handleQuality(event) {
        const quality = parseInt(event.target.dataset.quality);
        const card = this.dueCards[this.currentCardIndex];
        await cardManager.processReview(card, quality);
        localStorage.setItem('review_current_index', (this.currentCardIndex + 1).toString());
        // Passer directement à la carte suivante sans écran de feedback
        this.currentCardIndex++;
        this.updateProgress();
        this.displayCard();
    }



    // Texte pour le prochain intervalle
    getNextIntervalText(card) {
        if (!card) return '';
        const interval = card.interval || 1;
        if (interval <= 1) {
            return 'La carte revient demain';
        } else {
            return `La carte revient dans ${interval} jours`;
        }
    }

    // Mettre à jour la barre de progression
    updateProgress() {
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        
        if (progressBar && progressText) {
            const progress = this.dueCards.length > 0 ? (this.currentCardIndex / this.dueCards.length) * 100 : 0;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${this.currentCardIndex}/${this.dueCards.length}`;
            console.log('[DEBUG] Progression:', progress, 'largeur appliquée:', progressBar.style.width);
        }
    }

    // Terminer la session de révision
    async finishReview() {
        localStorage.removeItem('review_current_index');
        const reviewContainer = document.getElementById('review-container');
        // Vérifier si le niveau courant est maîtrisé (80% de cartes du niveau courant avec répétition >= 3 ou interval >= 15)
        let badgeUnlocked = false;
        let nextLevel = this.niveauMax;
        if (window.auth && window.auth.currentUser) {
            const niveau = this.niveauMax;
            // Récupérer toutes les cartes du niveau courant
            const cardsNiveau = cardManager.cards.filter(c => c.niveau === niveau);
            const total = cardsNiveau.length;
            const mastered = cardsNiveau.filter(c => c.repetition >= 3 || c.interval >= 15).length;
            const percent = total > 0 ? mastered / total : 0;
            if (percent >= 0.8 && niveau < 20) {
                // Débloquer le niveau suivant
                nextLevel = niveau + 1;
                await setUserLevel(window.auth.currentUser.uid, nextLevel);
                badgeUnlocked = true;
            }
        }
        // Affichage classique
        reviewContainer.innerHTML = `
            <div class="review-results">
                <h2>Révision terminée !</h2>
                <div class="stats-display">
                    <p>Cartes révisées : ${this.dueCards.length}</p>
                    <p>Prochaine révision : ${this.getNextReviewTime()}</p>
                </div>
                <div class="action-buttons">
                    <button id="check-more" class="btn btn-primary">Vérifier s'il y en a d'autres</button>
                    <button id="back-to-home" class="btn btn-secondary">Retour à l'accueil</button>
                </div>
            </div>
            ${badgeUnlocked ? `
            <div class="badge-unlocked">
                <div class="badge-anim">
                    <span class="badge-icon">🏅</span>
                    <span class="badge-text">Niveau ${nextLevel} débloqué !</span>
                </div>
                <div class="badge-felicitations">Félicitations, tu as débloqué un nouveau niveau !</div>
            </div>
            <style>
            .badge-unlocked { text-align:center; margin-top:2em; animation: popin 0.7s; }
            .badge-anim { display:inline-flex; align-items:center; background:#fffbe6; border-radius:2em; padding:1em 2em; box-shadow:0 4px 16px #ffe06688; font-size:1.5em; animation: badgepop 1s; }
            .badge-icon { font-size:2.5em; margin-right:0.5em; animation: spinbadge 1.2s; }
            .badge-text { font-weight:700; color:#bfa100; }
            .badge-felicitations { margin-top:1em; font-size:1.1em; color:#4F8A8B; font-weight:600; }
            @keyframes badgepop { 0%{transform:scale(0.5);} 80%{transform:scale(1.1);} 100%{transform:scale(1);} }
            @keyframes spinbadge { 0%{transform:rotate(-360deg);} 100%{transform:rotate(0);} }
            @keyframes popin { 0%{opacity:0;transform:scale(0.7);} 100%{opacity:1;transform:scale(1);} }
            </style>
            ` : ''}
        `;
        // Ajouter les événements
        document.getElementById('check-more').addEventListener('click', () => {
            this.startReview();
        });
        document.getElementById('back-to-home').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    // Afficher le message quand il n'y a pas de cartes à réviser
    showNoCardsMessage() {
        const reviewContainer = document.getElementById('review-container');
        
        reviewContainer.innerHTML = `
            <div class="no-cards-message">
                <h2>🎉 Aucune carte à réviser !</h2>
                <p>Vous êtes à jour avec vos révisions.</p>
                <p>Revenez plus tard ou découvrez de nouveaux mots.</p>
                <div class="action-buttons">
                    <button id="start-discovery" class="btn btn-primary">Découvrir de nouveaux mots</button>
                    <button id="back-to-home" class="btn btn-secondary">Retour à l'accueil</button>
                </div>
            </div>
        `;

        // Ajouter les événements
        document.getElementById('start-discovery').addEventListener('click', () => {
            window.location.href = 'discovery.html';
        });

        document.getElementById('back-to-home').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    // Obtenir le temps jusqu'à la prochaine révision
    getNextReviewTime() {
        const stats = cardManager.getStats();
        if (stats.due > 0) {
            return "Aujourd'hui";
        } else {
            // Trouver la prochaine carte due
            const nextDue = cardManager.cards
                .filter(card => card.repetition > 0)
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
            
            if (nextDue) {
                const daysUntil = Math.ceil((new Date(nextDue.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
                if (daysUntil <= 0) return "Aujourd'hui";
                if (daysUntil === 1) return "Demain";
                return `Dans ${daysUntil} jours`;
            }
            return "Plus tard";
        }
    }
}

// Instance globale
const reviewMode = new ReviewMode();
window.reviewMode = reviewMode; 