// HirePilot full-stack server: serves the static frontend + proxies SerpApi/Gemini.
// Why a server? Browsers can't call SerpApi/Gemini directly (no CORS headers),
// so /api/* requests are forwarded server-side. Keys stay the user's: sent per
// request from their browser, forwarded, never stored.
//
// Run: npm run serve   (builds, then serves on http://localhost:5173)
// In GitHub Codespaces: forward port 5173 as public to test on your phone.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 5173;

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain',
};

async function proxySerpApi(req, res) {
  const u = new URL(req.url, 'http://x');
  const apiKey = u.searchParams.get('api_key');
  if (!apiKey || apiKey.length < 10) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Valid SerpApi api_key required' }));
  }
  const target = new URL('https://serpapi.com/search.json');
  for (const [k, v] of u.searchParams) target.searchParams.set(k, v);
  try {
    const r = await fetch(target.toString());
    const data = await r.json();
    res.writeHead(r.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data));
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'SerpApi unreachable' }));
  }
}

async function proxyGemini(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;
  let parsed = {};
  try { parsed = JSON.parse(body); } catch {}
  const { key, prompt, model, maxTokens } = parsed;
  if (!key || key.length < 10 || !prompt) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'key and prompt required' }));
  }
  const modelName = model || 'gemini-3.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(key)}`;
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
    res.writeHead(r.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data));
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Gemini unreachable' }));
  }
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/api/serpapi') return proxySerpApi(req, res);
  if (u.pathname === '/api/gemini') {
    if (req.method === 'OPTIONS') {
      res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
      return res.end();
    }
    return proxyGemini(req, res);
  }
  // static
  let filePath = path.join(DIST, u.pathname === '/' ? 'index.html' : u.pathname.slice(1));
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403); return res.end();
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback
      fs.readFile(path.join(DIST, 'index.html'), (err2, data2) => {
        if (err2) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`HirePilot live at http://localhost:${PORT}`);
});
