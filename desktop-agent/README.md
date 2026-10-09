# HirePilot Desktop Agent — the hands 🤖

The web app finds the jobs. **This agent fills the application forms.**

It opens each selected job's application page in **your own Chrome** (so you're
already logged into LinkedIn, Naukri, company portals…), reads each form — even
ones it has never seen before — uses Gemini to figure out which resume detail
goes in which field, types everything in, screenshots the result, and **leaves
the tab open**. You walk the tabs, verify, and click submit yourself.

The agent **never clicks submit**. That's the deal: it does the typing, you do
the deciding.

## Setup (on your laptop — 5 minutes)

1. Install Python 3.10+ and Chrome (the one you already use).
2. Install the one dependency:
   ```
   pip install -r requirements.txt
   ```
3. Close Chrome completely (the agent needs your real profile, and Chrome
   locks it while running).

## Run

1. In HirePilot: select jobs → **Agent Apply** → **🤖 Export apply pack**.
   You get `hirepilot-apply-pack.json`.
2. Run the agent:
   ```
   python apply_agent.py --pack hirepilot-apply-pack.json --resume-pdf ~/resume.pdf
   ```
   Your Gemini key is asked interactively (never written to disk). Or set
   `HIREPILOT_GEMINI_KEY` in your environment.
3. Watch it work. For each job it:
   - opens the application page in a new tab,
   - pauses if there's a login wall (log in, press Enter — it continues),
   - warns about CAPTCHAs (you solve them during review),
   - fills every field it can map from your resume,
   - leaves legal/demographic/salary questions **blank for you**,
   - screenshots the filled form into `hirepilot-proof/`.
4. Open `REVIEW_CHECKLIST.md`, walk each tab, verify, hit submit. Done.

## How the brain works

`field_mapper.py` extracts every fillable field plus its human-visible label,
then asks Gemini (`gemini-3.5-flash-lite`) to map fields → resume facts. Rules
it follows: never invent experience, cover-letter boxes get your tailored
letter, work-authorization / EEO / salary fields are always left for the human.

## Limits (honest)

- Standard application forms (Greenhouse / Lever / Workday-style): strong.
- Wildly custom portals, multi-step wizards behind logins: it tries, flags what
  it can't do, and leaves the tab open for you.
- CAPTCHAs and OTPs are yours — by design.

## Files

- `apply_agent.py` — Selenium orchestrator (open → fill → screenshot → next)
- `field_mapper.py` — form extraction + Gemini field mapping
- `requirements.txt` — just `selenium`
