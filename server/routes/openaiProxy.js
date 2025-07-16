// routes/openaiProxy.js
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

router.post('/chat', async (req, res) => {
  const { messages } = req.body;

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages,
        temperature: 0.3
      })
    });

    const data = await openaiRes.json();
    res.json(data);
  } catch (err) {
    console.error("❌ GPT Proxy Error:", err);
    res.status(500).json({ error: "GPT call failed" });
  }
});

export default router;
