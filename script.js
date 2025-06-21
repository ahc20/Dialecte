let cards = [];

// 1) Charge le CSV
Papa.parse('data.csv', {
  download: true, header: true,
  complete: ({ data }) => {
    cards = data.map(r => ({ fr: r.Français, kab: r.Kabyle }));
    showRandomCard();
  }
});

// 2) Affiche une carte
function showRandomCard() {
  const i = Math.floor(Math.random() * cards.length);
  const { fr, kab } = cards[i];
  document.getElementById('front').textContent = fr;
  const back = document.getElementById('back');
  back.textContent = kab;
  back.classList.remove('visible');
}

// 3) Révéler
document.getElementById('reveal').onclick = () => {
  document.getElementById('back').classList.toggle('visible');
};

// 4) Prononcer via Hugging Face Space
async function speakKabyle() {
  const text = document.getElementById('back').textContent.trim();
  if (!text) return;
  try {
    // Envoi
    const push = await fetch(
      'https://hf.space/embed/ayymen/Amazigh-tts/api/queue/push/',
      { method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ data:[text], fn_index:0 })
      }
    );
    const { hash } = await push.json();
    // Polling
    let url;
    for (let i=0; i<15; i++) {
      await new Promise(r=>setTimeout(r,1000));
      const status = await fetch(
        `https://hf.space/embed/ayymen/Amazigh-tts/api/queue/status/?hash=${hash}`
      );
      const j = await status.json();
      if (j.data?.[0]) { url = j.data[0]; break; }
    }
    if (!url) throw new Error('Timeout TTS');
    new Audio(url).play();
  } catch(e) {
    console.error(e);
    alert('TTS IA failed: '+ e.message);
  }
}
document.getElementById('speak').onclick = speakKabyle;

// 5) Précédent / Suivant
document.getElementById('next').onclick = showRandomCard;
document.getElementById('prev').onclick = showRandomCard;