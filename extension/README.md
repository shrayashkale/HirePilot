# HirePilot Autofill — Chrome extension 🤖

The hirepilot.co-style experience: you're on **any** job application page, you
click the HirePilot icon, hit **⚡ Autofill this form** — the agent reads the
form (even ones it's never seen before), maps your resume onto every field with
Gemini, and types it all in live while you watch. **It never clicks submit.**
You review, you fire.

No JSON files. No terminal. No separate folders.

## Install (1 minute)

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. **Load unpacked** → select this `extension/` folder
4. Click the HirePilot icon → **⚙️ Setup** — paste your Gemini key (free at
   [Google AI Studio](https://aistudio.google.com/app/apikey)) and fill your
   profile once. It's stored in your browser only.

## Use

1. Open any job application page (Greenhouse, Lever, Workday, company sites…)
2. Click the HirePilot icon → **⚡ Autofill this form**
3. Watch it fill. A checklist tells you what it left for you (legal questions,
   EEO/demographic fields, salary expectations, consent checkboxes, resume
   upload — those are always yours).
4. Review the form. **You** click submit.

## How the brain works

- `content.js` extracts every fillable field plus its human-visible label, then
  fills with React-aware value setting (native setters + input/change events),
  so modern ATS forms actually register the values.
- `background.js` asks Gemini (`gemini-3.5-flash-lite`) which resume detail goes
  in which field. Strict rules: never invent experience, always OMIT legal /
  EEO / salary / consent fields — a blank field you review beats a wrong guess.
- The extension declares host permission on `generativelanguage.googleapis.com`,
  so it calls Gemini directly — no proxy server needed.

## Files

- `manifest.json` — MV3, storage permission, Gemini host permission
- `content.js` — field extraction + form filling (the hands)
- `background.js` — Gemini field mapping (the brain)
- `popup.html` / `popup.js` — the ⚡ button
- `options.html` / `options.js` — one-time key + profile setup
