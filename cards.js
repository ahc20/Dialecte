// Module de gestion des cartes avec algorithme SM-2
class CardManager {
    constructor() {
        this.cards = [];
        this.isInitialized = false;
    }

    // Initialiser les cartes depuis le CSV
    async loadCards() {
        try {
            const response = await fetch('data3.csv');
            const csvText = await response.text();
            
            // Parser le CSV
            const lines = csvText.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim());
            
            this.cards = [];
            
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                const card = {
                    id: this.generateUUID(),
                    fr: values[0] || '',
                    kab: values[1] || '',
                    frequency: parseInt(values[2]) || 1, // Fréquence par défaut
                    repetition: 0,
                    interval: 0,
                    easeFactor: 2.5,
                    dueDate: new Date(),
                    history: []
                };
                this.cards.push(card);
            }
            
            // Charger les données sauvegardées
            await this.loadSavedData();
            this.isInitialized = true;
            
            console.log(`Chargé ${this.cards.length} cartes`);
            return this.cards;
        } catch (error) {
            console.error('Erreur lors du chargement des cartes:', error);
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
        }
    }

    // Sauvegarder toutes les données
    async saveToStorage() {
        try {
            localStorage.setItem('dialecte_cards', JSON.stringify(this.cards));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
        }
    }

    // Charger les données sauvegardées
    async loadSavedData() {
        try {
            const saved = localStorage.getItem('dialecte_cards');
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
        
        // Ajouter à l'historique
        card.history.push({
            date: today.toISOString(),
            quality: quality
        });

        if (quality < 3) {
            // Réponse incorrecte - recommencer
            card.repetition = 1;
            card.interval = 1;
        } else {
            // Réponse correcte - calculer le nouvel intervalle
            card.easeFactor = Math.max(1.3, card.easeFactor + 0.1 - (5 - quality) * 0.08);
            
            if (card.repetition === 0) {
                card.interval = 1;
            } else if (card.repetition === 1) {
                card.interval = 6;
            } else {
                card.interval = Math.round(card.interval * card.easeFactor);
            }
            
            card.repetition++;
        }

        // Calculer la prochaine date de révision
        card.dueDate = this.addDays(today, card.interval);
        
        await this.saveCard(card);
        return card;
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