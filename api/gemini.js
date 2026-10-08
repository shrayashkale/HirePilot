// Vercel serverless proxy for Gemini (browsers can't call it directly — no CORS headers).
// The user's key stays theirs: sent from their browser to this function, forwarded to Google, never stored.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { key, prompt, model, maxTokens } = req.body ?? {};
  if (!key || typeof key !== 'string' || key.length < 10) {
    return res.status(400).json({ error: 'Valid Gemini key required' });
  }
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt required' });
  }

  const modelName = model || 'gemini-3.5-flash-lite';
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}` +
    `:generateContent?key=${encodeURIComponent(key)}`;

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens ?? 1024, temperature: 0.7 },
      }),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'Gemini unreachable', detail: String(e).slice(0, 200) });
  }
}
