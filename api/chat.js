// api/chat.js
import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send({ error: "Method not allowed" });
  }

  const { messages } = req.body; 
  if (!messages) {
    return res.status(400).send({ error: "Missing messages" });
  }

  try {
    // Init OpenAI avec ta clé depuis les variables d'env Vercel
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",      // ou un autre modèle de ton choix
      messages: messages
    });
    // Renvoie la réponse du chatbot
    return res.status(200).json({ reply: chat.choices[0].message.content });
  } catch (err) {
    console.error("OpenAI error:", err);
    return res.status(500).json({ error: err.message });
  }
}