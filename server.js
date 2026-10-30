const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Render-এর Environment-এ বসাতে হবে ----------
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';           // Google AI Studio-র ফ্রি key
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || '';         // ঐচ্ছিক: বটের স্বভাব/স্টাইল

// ---------- সহজ রেট লিমিট (কেউ যেন ফ্রি key শেষ করে না ফেলে) ----------
const hits = new Map();
const LIMIT = 60;               // প্রতি IP থেকে মিনিটে সর্বোচ্চ ৬০টা
setInterval(() => hits.clear(), 60 * 1000);

async function askGemini(prompt) {
  const body = { contents: [{ parts: [{ text: prompt }] }] };
  if (SYSTEM_PROMPT) body.system_instruction = { parts: [{ text: SYSTEM_PROMPT }] };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
        body: JSON.stringify(body),
        signal: ctrl.signal
      }
    );
    const data = await r.json();
    const parts = data && data.candidates && data.candidates[0] &&
                  data.candidates[0].content && data.candidates[0].content.parts;
    if (!parts) {
      console.error('Gemini error:', JSON.stringify(data).slice(0, 300));
      return null;
    }
    return parts.map(p => p.text || '').join('').trim() || null;
  } finally {
    clearTimeout(timer);
  }
}

// ব্যবহার: /gemini?prompt=তোমার প্রশ্ন   (অথবা /ai?q=...)
app.get(['/gemini', '/ai'], async (req, res) => {
  const prompt = String(req.query.prompt || req.query.q || '').trim().slice(0, 3000);
  if (!prompt) return res.json({ error: true, answer: 'কিছু জিজ্ঞেস করো বেবি ❤️' });
  if (!GEMINI_KEY) return res.json({ error: true, answer: 'GEMINI_API_KEY সেট করা নেই' });

  const ip = req.headers['x-forwarded-for'] || req.ip;
  const n = (hits.get(ip) || 0) + 1;
  hits.set(ip, n);
  if (n > LIMIT) return res.json({ error: true, answer: 'অনেক বেশি অনুরোধ, একটু পরে চেষ্টা করো 🥺' });

  try {
    const answer = await askGemini(prompt);
    if (!answer) return res.json({ error: true, answer: 'AI এখন উত্তর দিতে পারছে না 🥺 একটু পরে চেষ্টা করো' });
    res.json({ answer, credits: 'Juwel' });
  } catch (e) {
    console.error('route error:', e.message);
    res.json({ error: true, answer: 'সার্ভারে সমস্যা হয়েছে 🥺' });
  }
});

app.get('/', (_req, res) => res.send('Juwel AI API ✅'));
app.listen(PORT, () => console.log('API চলছে port ' + PORT));
