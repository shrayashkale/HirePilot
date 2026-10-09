# HirePilot — SerpApi India Hackathon 2026 submission pack

Deadline: **Oct 10, 2026, 23:59 IST** (~54 hours from build completion, Oct 8 18:07 IST).
Submit via the official dashboard: serpapi.github.io/serpapi-india-hackathon-2026 (sign in with GitHub; draft can be saved, editable until deadline).

## Status of each submission item

| Item | Status |
|---|---|
| Public GitHub repo (`shrayashkale/HirePilot`) | ✅ Live — code pushed, plus DEMO_SCRIPT.md + SUBMISSION.md |
| Setup instructions | ✅ In README (`npm install && npm run serve`) |
| Demo video < 3 min | **Needs filming** — shot list in DEMO_SCRIPT.md; needs SerpApi + Gemini keys to record live |
| Project description + track | Draft below; **needs your track confirmation** |
| Participant details | You fill: name, email, phone, occupation, years of experience (solo entry — no teammates) |
| Disclosures | Draft below (rebuilt-from-prior-project + AI tools) |
| Rules & T&Cs | Read + accept on the dashboard before submitting |

## Project description (paste-ready draft)

> **HirePilot** is an agent-native job copilot for active jobseekers. Paste your own SerpApi and Gemini keys once — everything runs in the browser, no accounts, no servers. Upload a resume (PDF/DOCX/TXT, parsed locally), then let HirePilot hunt **live job listings via SerpApi's Google Jobs API**, score each listing against your skills, and brief you on every employer with **live company intel from SerpApi News + Search** — funding news, layoffs, product launches. A skill-demand radar shows what listings ask for versus what you have, and salary signals are aggregated from live listings.
>
> The centerpiece is the built-in **Agent Apply** loop: pick jobs, and a Gemini-powered agent writes a tailored cover letter per role, pre-fills application answers, and queues everything into a guided submit flow (~10 seconds per job). Then the **Autofill Chrome extension** (`extension/`) takes it into the real world: on any application page, one click and the agent reads forms it has never seen before, uses Gemini to map every field onto your resume, and fills them live while you watch. It never clicks submit; you verify and fire. (A Python+Selenium desktop agent in `desktop-agent/` offers the same as a batch alternative.) An open `AGENT_API.md` spec lets any personal AI agent (Moltbot, OpenClaw, Hermes…) pull apply-packages as structured JSON.
>
> Who it helps: anyone job-hunting who is drowning in tabs — it replaces manual job-board scrolling, company research, and cover-letter drafting with one agent-driven loop.
>
> How it uses SerpApi: Google Jobs is the core data source (live listings, salaries); News + Search power the company-intel briefings and skill-demand radar. Without live search data, the product has nothing to match — SerpApi does real work in every session.

~175 words — trim to fit the form's character limit if needed (cut the second paragraph first).

## Track

The submission form lists six tracks — pick **Jobs / automation** (the category SerpApi's own site uses for job-hunter projects; the community example is "Autonomous AI Job Hunter"). HirePilot fits that lane exactly.

## Disclosures (paste-ready)

- **Prior existence:** Yes — an earlier version ("Tech-Hire") was a diploma project. The submitted version is a **complete architectural rebuild** (agent-native: key gate, Agent Apply loop, open Agent API, zero backend).
- **AI tools used:** Muse (Meta) — design, code, documentation.

## Participant details (for you to have ready)

Name, email, phone, occupation, years of experience. Solo entry — no teammates to add.

## Push fallback (if the VM push stays blocked)

From any machine with the code + your GitHub access:

```bash
cd ~/workspace/hirepilot   # or wherever you copy the folder
git remote add origin https://github.com/shrayashkale/HirePilot.git  # if missing
git push -u origin master
```

Checklist-safe: repo is public; `dist/` and `node_modules/` are gitignored; no API keys committed (keys live in the user's browser localStorage only, never in the repo).

## What still needs BOSS

1. **SerpApi key + Gemini key** — free tiers: serpapi.com (250 searches/month), aistudio.google.com/app/apikey. Needed for the live test AND to film the demo.
2. **Brother's real resume** — optional for judging, but the demo films better with it. Mock resume works for the demo too.
3. **Track confirmation** — "Jobs / automation" recommended.
4. **Demo video** — film per DEMO_SCRIPT.md, upload as unlisted/public (YouTube), test the link in an incognito window (official FAQ explicitly says to).
5. **Submission form** — participant details + paste description + disclosures; accept Rules & T&Cs; hit "Submit project" by Oct 10, 23:59 IST.
