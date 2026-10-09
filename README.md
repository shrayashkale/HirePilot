# HirePilot — your agent-native job copilot

Built for the **SerpApi India Hackathon 2026**.

Upload your resume. HirePilot hunts **live job listings across the internet**
via SerpApi, matches them to your skills, briefs you on every company — then its
**built-in agent** writes tailored cover letters and queues every application.
Any personal AI agent (Moltbot, OpenClaw, Hermes…) can plug into the open
[Agent API](./AGENT_API.md).

> This project existed before the hackathon as "Tech-Hire" (a diploma project).
> For the hackathon it was **completely rebuilt** with an agent-native
> architecture. AI tools used: Muse (design, code, docs).

## Features

- 🔑 **Key gate** — paste your own SerpApi + Gemini keys once; everything runs in your browser, no accounts, no servers
- 📄 **Resume upload** — PDF/DOCX/TXT parsed locally (skills, experience, contact)
- 🌐 **Live job hunt** — SerpApi Google Jobs, scored against your resume
- 🛰 **Company intel** — SerpApi News + Search, summarized per company
- 📊 **Skill demand radar** — what listings ask for vs. what you have; gaps highlighted
- 💰 **Salary signals** — pay ranges aggregated from live listings
- 🤖 **Built-in agent** — "Agent Apply": tailored cover letter per job, pre-filled answers, guided submit loop (~10s/job)
- 🖥️ **Desktop agent** — Python + Selenium companion that opens each selected job's real application portal in your own Chrome, reads never-before-seen forms, maps every field onto your resume via Gemini, and fills them live while you watch. It never clicks submit — you review and fire. See `desktop-agent/README.md`
- 🔌 **Open Agent API** — any external agent can pull apply packages as structured JSON

## Run it

```bash
npm install
npm run serve
```

Open http://localhost:5173, paste your keys, upload a resume, hunt.

> Why a server? Browsers can't call SerpApi/Gemini directly (neither sends CORS
> headers), so `server.mjs` serves the frontend **and** proxies `/api/*` to both
> APIs. Your keys stay yours: stored in your browser, forwarded per request,
> never stored server-side. The `api/` directory holds the same proxies as
> Vercel serverless functions for one-click Vercel deploys.

**Test on your phone (same WiFi):** run `npm run serve` on your computer, then
open `http://<your-computer-ip>:5173` on your phone. Or use GitHub Codespaces
with port 5173 forwarded as public.

Keys:
- SerpApi — free at [serpapi.com](https://serpapi.com) (250 searches/month)
- Gemini — free at [Google AI Studio](https://aistudio.google.com/app/apikey)

## Demo video script (under 3 min)

1. (0:00) Paste keys → land in the app
2. (0:20) Upload resume → skills appear
3. (0:45) "Hunt jobs" → live SerpApi listings with match scores
4. (1:15) Open a job → scan company intel (live news)
5. (1:40) Select 3 jobs → hit **Agent Apply** → watch cover letters generate
6. (2:20) "Ready to fire" queue → open apply link with letter ready
7. (2:45) Show AGENT_API.md — any personal agent plugs in

## Tech

Vite + React + TypeScript + Tailwind v4. Thin same-origin server (`server.mjs`):
serves the static app and proxies `/api/*` to SerpApi/Gemini (browsers can't
call them directly — neither sends CORS headers). Keys and state live in the
browser's localStorage; nothing is stored server-side.

## License

MIT
