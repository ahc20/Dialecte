// ==== FLASHCARDS ====
let cards = [];

// Charge et parse data.csv
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

// Affiche une carte aléatoire
function showRandomCard() {
  const i = Math.floor(Math.random() * cards.length);
  const { fr, kab } = cards[i];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
}

document.getElementById('reveal').addEventListener('click', () => {
  document.getElementById('back').classList.toggle('visible');
});
document.getElementById('prev').addEventListener('click', showRandomCard);
document.getElementById('next').addEventListener('click', showRandomCard);

// Prononciation via Web Speech API
function speakKabyle() {
  const text = document.getElementById('back').textContent.trim();
  if (!text) return;
  const synth = window.speechSynthesis;
  let voices = synth.getVoices();
  if (!voices.length) {
    synth.onvoiceschanged = () => {
      voices = synth.getVoices();
      _speak(text, voices);
    };
  } else {
    _speak(text, voices);
  }
}
function _speak(text, voices) {
  const voice = voices.find(v => /fr(-|_)/i.test(v.lang)) || voices[0];
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.9;
  u.pitch = 1.1;
  window.speechSynthesis.speak(u);
}
document.getElementById('speak').addEventListener('click', speakKabyle);

// ==== CHATBOT IA ====
const chatLog     = document.getElementById("chatLog");
const chatInput   = document.getElementById("chatMessage");
const sendChatBtn = document.getElementById("sendChat");
// historique pour OpenAI
let chatMessages = [
  { role: "system", content: "Tu es un assistant kabyle." }
];

sendChatBtn.addEventListener("click", async () => {
  const text = chatInput.value.trim();
  if (!text) return;
  // affiche message utilisateur
  chatLog.innerHTML += `<div class="user">Moi: ${text}</div>`;
  chatMessages.push({ role: "user", content: text });
  chatInput.value = "";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatMessages })
    });
    const payload = await res.json();
    if (res.ok && payload.reply) {
      // affiche réponse bot
      chatLog.innerHTML += `<div class="bot">Bot: ${payload.reply}</div>`;
      chatMessages.push({ role: "assistant", content: payload.reply });
    } else {
      throw new Error(payload.error || "Erreur IA");
    }
    chatLog.scrollTop = chatLog.scrollHeight;
  } catch (err) {
    console.error("Chat error:", err);
    chatLog.innerHTML += `<div class="bot">Erreur: ${err.message}</div>`;
  }
});