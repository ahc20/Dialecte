let cards = [];
let idx = 0;

async function loadCards() {
  const res = await fetch('data.json');
  cards = await res.json();
  showCard();
}

function showCard() {
  const front = document.getElementById('front');
  const back  = document.getElementById('back');
  const card  = cards[idx];
  front.textContent = card.fr;
  back.textContent  = card.kab;
  back.classList.add('hidden');
}

document.getElementById('reveal').addEventListener('click', () => {
  document.getElementById('back').classList.toggle('hidden');
});

document.getElementById('next').addEventListener('click', () => {
  idx = (idx + 1) % cards.length;
  showCard();
});

document.getElementById('prev').addEventListener('click', () => {
  idx = (idx - 1 + cards.length) % cards.length;
  showCard();
});

loadCards();