# HirePilot demo video — shot list (under 3 minutes)

Official guidance: show the project **running locally**, a simple screen recording is enough, narration is optional, video quality does not affect judging. **Prereqs:** `npm run serve` running (serves the app **and** the `/api/*` SerpApi/Gemini proxies on http://localhost:5173 — plain `npm run dev` does NOT serve the proxies, so every live feature would fail; see README). Real SerpApi + Gemini keys pasted at the gate (free tiers work), a resume file ready. Use a narrow job query (e.g. "frontend developer India") to conserve SerpApi credits — each hunt costs searches.

Record at 1080p, keep the browser window focused, hide bookmarks/key fields when pasting keys (or cut that shot in edit). Narration optional — on-screen text or a voiceover track both fine. Target: **under 3:00 total** (hard limit). If running long, trim Shot 4 (intel) to the bone — Shots 3, 5 and 6 are the ones that win.

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

## Shot 5 — Agent Apply (1:35–2:05)
**On screen:** Select 2–3 jobs → Agent Apply → cover letters generating → apply queue.
**Say/show:** "Select jobs and hit Agent Apply. The built-in agent writes a tailored cover letter per role, pre-fills the application answers, and queues everything — about ten seconds a job."
**Action:** Select jobs, run Agent Apply, show generated letters + the ready queue.

## Shot 6 — THE MOMENT: extension autofills a real form (2:05–2:45) ⭐
**On screen:** a real job application page in Chrome. (Prereq: extension loaded via `chrome://extensions` → Developer mode → Load unpacked → `extension/` folder; one-time Setup with Gemini key + profile done.)
**Say/show:** "Now the part no job tool does. HirePilot's browser extension reads any application form — even ones it's never seen — figures out where every resume detail goes, and fills it live."
**Action:**
1. Open a real application page (a Greenhouse/Lever-style form is ideal).
2. Click the HirePilot icon → **⚡ Autofill this form**.
3. **Watch the form fill itself on camera** — name, email, phone, dropdowns, the "why you" box. Linger here; this is the shot that wins.
4. Show the toast checklist: "It leaves legal and salary questions for me — and it never clicks submit. That's my call. It does the typing, I do the deciding."

## Shot 7 — Open Agent API (2:45–2:55)
**On screen:** AGENT_API.md open on GitHub (or in the editor).
**Say/show:** "And the open Agent API means any personal AI agent can pull apply-packages as structured JSON. That's HirePilot."
**Action:** Show the file, end card.

---

## After filming
1. Upload as **unlisted** (YouTube or equivalent) — public is fine too.
2. **Test the link in an incognito/private window** (the official FAQ explicitly requires this).
3. Paste the link into the submission dashboard.
