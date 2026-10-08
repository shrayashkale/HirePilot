// Vercel serverless proxy for SerpApi (browsers can't call SerpApi directly — no CORS headers).
// The user's key stays theirs: sent from their browser to this function, forwarded to SerpApi, never stored.
export default async function handler(req, res) {
  // CORS: allow the HirePilot frontend (same origin on Vercel, plus local dev)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { api_key, ...params } = req.query;
  if (!api_key || typeof api_key !== 'string' || api_key.length < 10) {
    return res.status(400).json({ error: 'Valid SerpApi api_key required' });
  }

  const url = new URL('https://serpapi.com/search.json');
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v.length > 0) url.searchParams.set(k, v);
  }
  url.searchParams.set('api_key', api_key);

  try {
    const r = await fetch(url.toString());
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'SerpApi unreachable', detail: String(e).slice(0, 200) });
  }
}
