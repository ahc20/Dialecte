// api/tts.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { text } = req.query;
  if (!text) return res.status(400).send('Missing text parameter');

  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) return res.status(500).send('HF_TOKEN not set');

  // Remplace par l’URL du modèle Kabyle-TTS de Hugging Face que tu utilises
  const MODEL_URL = 'https://api-inference.huggingface.co/models/tusen-ai/kabyle-tts';

  const response = await fetch(MODEL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inputs: text })
  });

  if (!response.ok) {
    const err = await response.text();
    return res.status(response.status).send(err);
  }

  const arrayBuffer = await response.arrayBuffer();
  res.setHeader('Content-Type', 'audio/wav');
  res.send(Buffer.from(arrayBuffer));
}