// Module pour le mode découverte (quiz QCM)
class DiscoveryMode {
    constructor() {
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.totalQuestions = 0;
    }

    // Initialiser le quiz de découverte
    async startQuiz(questionCount = 10) {
        if (!cardManager.isInitialized) {
            await cardManager.loadCards();
        }

        const quizCards = cardManager.getDiscoveryCards(questionCount);
        this.currentQuiz = this.generateQuiz(quizCards);
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.totalQuestions = this.currentQuiz.length;

        this.displayQuestion();
        this.updateProgress();
    }

    // Générer le quiz avec questions et distracteurs
    generateQuiz(cards) {
        return cards.map(card => {
            const distractors = cardManager.getDistractors(card, 3);
            const options = [
                { text: card.kab, correct: true, card: card },
                ...distractors.map(d => ({ text: d.kab, correct: false, card: d }))
            ];
            
            // Mélanger les options
            const shuffledOptions = cardManager.shuffle(options);
            
            return {
                question: card.fr,
                options: shuffledOptions,
                correctCard: card
            };
        });
    }

    // Afficher la question actuelle
    displayQuestion() {
        if (!this.currentQuiz || this.currentQuestionIndex >= this.currentQuiz.length) {
            this.finishQuiz();
            return;
        }

        const question = this.currentQuiz[this.currentQuestionIndex];
        const quizContainer = document.getElementById('quiz-container');
        
        quizContainer.innerHTML = `
            <div class="question-card">
                <h2 class="question-text">${question.question}</h2>
                <div class="options-container">
                    ${question.options.map((option, index) => `
                        <button class="option-btn" data-index="${index}" data-correct="${option.correct}">
                            ${option.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        // Ajouter les événements aux boutons
        const optionButtons = quizContainer.querySelectorAll('.option-btn');
        optionButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleAnswer(e));
        });
    }

    // Gérer la réponse de l'utilisateur
    async handleAnswer(event) {
        const button = event.target;
        const isCorrect = button.dataset.correct === 'true';
        const question = this.currentQuiz[this.currentQuestionIndex];

        // Désactiver tous les boutons
        const allButtons = document.querySelectorAll('.option-btn');
        allButtons.forEach(btn => btn.disabled = true);

        // Afficher le résultat
        if (isCorrect) {
            button.classList.add('correct');
            this.score++;
        } else {
            button.classList.add('incorrect');
            // Montrer la bonne réponse
            allButtons.forEach(btn => {
                if (btn.dataset.correct === 'true') {
                    btn.classList.add('correct');
                }
            });
        }

        // Initialiser la carte avec l'algorithme SM-2
        const quality = isCorrect ? 5 : 0;
        await cardManager.initializeCard(question.correctCard, quality);

        // Attendre un peu puis passer à la question suivante
        setTimeout(() => {
            this.currentQuestionIndex++;
            this.updateProgress();
            this.displayQuestion();
        }, 2000);
    }

    // Mettre à jour la barre de progression
    updateProgress() {
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        
        if (progressBar && progressText) {
            const progress = this.totalQuestions > 0 ? (this.currentQuestionIndex / this.totalQuestions) * 100 : 0;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${this.currentQuestionIndex}/${this.totalQuestions}`;
        }
    }

    // Terminer le quiz
    finishQuiz() {
        const quizContainer = document.getElementById('quiz-container');
        const percentage = this.totalQuestions > 0 ? Math.round((this.score / this.totalQuestions) * 100) : 0;
        
        quizContainer.innerHTML = `
            <div class="quiz-results">
                <h2>Quiz terminé !</h2>
                <div class="score-display">
                    <p>Score : ${this.score}/${this.totalQuestions}</p>
                    <p>Pourcentage : ${percentage}%</p>
                </div>
                <div class="result-message">
                    ${this.getResultMessage(percentage)}
                </div>
                <div class="action-buttons">
                    <button id="restart-quiz" class="btn btn-primary">Recommencer</button>
                    <button id="back-to-home" class="btn btn-secondary">Retour à l'accueil</button>
                </div>
            </div>
        `;

        // Ajouter les événements
        document.getElementById('restart-quiz').addEventListener('click', () => {
            this.startQuiz(this.totalQuestions);
        });

        document.getElementById('back-to-home').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    // Message de résultat selon le score
    getResultMessage(percentage) {
        if (percentage >= 90) return "Excellent ! Vous maîtrisez bien ces mots.";
        if (percentage >= 70) return "Très bien ! Continuez comme ça.";
        if (percentage >= 50) return "Pas mal ! Avec de la pratique, vous y arriverez.";
        return "Ne vous découragez pas ! La pratique fait le maître.";
    }
}

// Instance globale
const discoveryMode = new DiscoveryMode();
window.discoveryMode = discoveryMode; 