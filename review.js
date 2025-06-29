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
        // Générer la file pondérée par la fréquence (références aux objets originaux)
        const due = cardManager.getDueCards();
        let weighted = [];
        due.forEach(card => {
            for (let i = 0; i < Math.max(1, card.frequency); i++) {
                // Toujours pousser la référence à l'objet original
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
            <div class="review-card">
                <div class="card-front" id="card-front">
                    <h2 class="card-text">${card.fr}</h2>
                    <p class="card-hint">Cliquez pour voir la traduction</p>
                </div>
                <div class="card-back" id="card-back" style="display: none;">
                    <h2 class="card-text">${card.kab}</h2>
                    <p class="card-original">${card.fr}</p>
                </div>
                <div class="quality-buttons" id="quality-buttons" style="display: none;">
                    <button class="quality-btn" data-quality="0">Difficile</button>
                    <button class="quality-btn" data-quality="3">Correct</button>
                    <button class="quality-btn" data-quality="4">Facile</button>
                    <button class="quality-btn" data-quality="5">Très facile</button>
                </div>
            </div>
        `;

        // Ajouter les événements
        const cardFront = document.getElementById('card-front');
        const cardBack = document.getElementById('card-back');
        const qualityButtons = document.getElementById('quality-buttons');

        cardFront.addEventListener('click', () => this.flipCard());
        
        qualityButtons.querySelectorAll('.quality-btn').forEach(button => {
            button.addEventListener('click', (e) => this.handleQuality(e));
        });
    }

    // Retourner la carte
    flipCard() {
        const cardFront = document.getElementById('card-front');
        const cardBack = document.getElementById('card-back');
        const qualityButtons = document.getElementById('quality-buttons');

        cardFront.style.display = 'none';
        cardBack.style.display = 'block';
        qualityButtons.style.display = 'flex';
    }

    // Gérer l'évaluation de qualité
    async handleQuality(event) {
        const quality = parseInt(event.target.dataset.quality);
        const card = this.dueCards[this.currentCardIndex];
        const updatedCard = await cardManager.processReview(card, quality);
        this.showFeedback(quality, updatedCard);
        localStorage.setItem('review_current_index', (this.currentCardIndex + 1).toString());
        setTimeout(() => {
            this.currentCardIndex++;
            this.updateProgress();
            this.displayCard();
        }, 1500);
    }

    // Afficher le feedback selon la qualité
    showFeedback(quality, card) {
        const reviewContainer = document.getElementById('review-container');
        const feedbackMessages = {
            0: "Pas de problème, on va revoir ça bientôt !",
            3: "Correct !",
            4: "Facile !",
            5: "Excellent !"
        };
        reviewContainer.innerHTML = `
            <div class="feedback-card">
                <h3>${feedbackMessages[quality]}</h3>
                <div class="next-interval">
                    ${this.getNextIntervalText(card)}
                </div>
            </div>
        `;
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
        }
    }

    // Terminer la session de révision
    finishReview() {
        localStorage.removeItem('review_current_index');
        const reviewContainer = document.getElementById('review-container');
        
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