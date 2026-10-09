# HirePilot demo video — shot list (under 3 minutes)

Official guidance: show the project **running locally**, a simple screen recording is enough, narration is optional, video quality does not affect judging. **Prereqs:** `npm run serve` running (serves the app **and** the `/api/*` SerpApi/Gemini proxies on http://localhost:5173 — plain `npm run dev` does NOT serve the proxies, so every live feature would fail; see README). Real SerpApi + Gemini keys pasted at the gate (free tiers work), a resume file ready. Use a narrow job query (e.g. "frontend developer India") to conserve SerpApi credits — each hunt costs searches.

Record at 1080p, keep the browser window focused, hide bookmarks/key fields when pasting keys (or cut that shot in edit). Narration optional — on-screen text or a voiceover track both fine. Target: **2:30–2:50 total.**

---

## Shot 1 — The problem + the gate (0:00–0:20)
**On screen:** Key gate landing page.
**Say/show:** "HirePilot is an agent-native job copilot. No accounts, no servers — paste your own SerpApi and Gemini keys once and everything runs in your browser."
**Action:** Paste both keys, land in the app.

## Shot 2 — Resume upload (0:20–0:45)
**On screen:** Resume upload screen → parsed skills appearing.
**Say/show:** "Upload a resume — PDF, DOCX, or text. It's parsed locally in the browser: skills, experience, contact info."
**Action:** Upload the resume file, let skills render.

## Shot 3 — Live job hunt (0:45–1:15)
**On screen:** "Hunt jobs" → live SerpApi Google Jobs results with match scores.
**Say/show:** "HirePilot hunts live job listings through SerpApi's Google Jobs API and scores every listing against your resume."
**Action:** Hit hunt, wait for results, hover a match score.

## Shot 4 — Company intel (1:15–1:40)
**On screen:** Job detail → company intel panel (news brief).
**Say/show:** "Open any job and it briefs you on the company — live news and search data from SerpApi: funding, launches, layoffs."
**Action:** Click one listing, scroll the intel panel.

## Shot 5 — Agent Apply (1:40–2:20)
**On screen:** Select 2–3 jobs → Agent Apply → cover letters generating → apply queue.
**Say/show:** "Select jobs and hit Agent Apply. The built-in agent writes a tailored cover letter per role, pre-fills the application answers, and queues everything — about ten seconds a job."
**Action:** Select jobs, run Agent Apply, show generated letters + the ready queue.

## Shot 6 — Open Agent API (2:20–2:45)
**On screen:** AGENT_API.md open on GitHub (or in the editor).
**Say/show:** "And the open Agent API spec means any personal AI agent — Moltbot, OpenClaw, Hermes — can pull apply-packages as structured JSON and submit on your behalf. That's HirePilot."
**Action:** Show the file, end on the app.

---

## After filming
1. Upload as **unlisted** (YouTube or equivalent) — public is fine too.
2. **Test the link in an incognito/private window** (the official FAQ explicitly requires this).
3. Paste the link into the submission dashboard.
