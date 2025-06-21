let cards = [];

// Charge le CSV et démarre
Papa.parse('data.csv', {
  download: true,
  header: true,
  complete: res => {
    cards = res.data.map(r => ({
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

// Révéler le mot kabyle
document.getElementById('reveal').addEventListener('click', () => {
  document.getElementById('back').classList.toggle('visible');
});

// Prononciation via HuggingFace Space ayymen/Amazigh-tts
async function speakKabyle() {
  const text = document.getElementById('back').textContent.trim();
  if (!text) return;

  try {
    // 1) Push dans la queue du Space
    const pushRes = await fetch(
      'https://hf.space/embed/ayymen/Amazigh-tts/api/queue/push/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [text], fn_index: 0 })
      }
    );
    if (!pushRes.ok) throw new Error(await pushRes.text());
    const { hash } = await pushRes.json();

    // 2) Poll jusqu’à obtenir l’URL audio
    let audioUrl = null;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const statusRes = await fetch(
        `https://hf.space/embed/ayymen/Amazigh-tts/api/queue/status/?hash=${hash}`
      );
      const statusJson = await statusRes.json();
      if (statusJson && statusJson.data && statusJson.data[0]) {
        audioUrl = statusJson.data[0];
        break;
      }
    }
    if (!audioUrl) throw new Error('TTS timeout');

    // 3) Lecture de l’audio
    new Audio(audioUrl).play();
  } catch (err) {
    console.error('Erreur TTS IA :', err);
    alert('Impossible de générer/prononcer : ' + err.message);
  }
}

// Listener du bouton prononcer
document.getElementById('speak').addEventListener('click', speakKabyle);

// Précédent / Suivant
document.getElementById('next').addEventListener('click', showRandomCard);
document.getElementById('prev').addEventListener('click', showRandomCard);