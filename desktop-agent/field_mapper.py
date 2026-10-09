"""
HirePilot desktop agent — field_mapper.

The "AI" of the agent. Given a live application form the agent has never seen
before, this module:
  1. extracts every fillable field from the page (inputs, textareas, selects)
     together with the human-readable labels a person would see, and
  2. asks Gemini to map each field onto the candidate's resume profile —
     deciding what goes where, and what must be left for the human.

Nothing here ever clicks a submit button. Filling only.
"""

from __future__ import annotations

import json
import re
import urllib.request

MODEL = "gemini-3.5-flash-lite"

# ---------------------------------------------------------------------------
# 1. Field extraction (runs inside the browser via Selenium)
# ---------------------------------------------------------------------------

EXTRACT_JS = r"""
(() => {
  const fields = [];
  const els = document.querySelectorAll('input, textarea, select');
  els.forEach((el, i) => {
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute('type') || (tag === 'select' ? 'select' : 'text')).toLowerCase();
    if (['hidden', 'submit', 'button', 'image'].includes(type)) return;
    if (el.disabled || el.readOnly) return;

    // stable key the agent can resolve back to this exact element
    const key = 'hp' + i;
    el.setAttribute('data-hp-key', key);

    let label = '';
    const id = el.id;
    if (id) {
      const lab = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (lab) label = lab.innerText.trim();
    }
    if (!label) {
      const wrap = el.closest('label');
      if (wrap) label = wrap.innerText.trim().slice(0, 120);
    }
    const aria = el.getAttribute('aria-label') || '';
    const placeholder = el.getAttribute('placeholder') || '';
    const name = el.getAttribute('name') || '';

    // nearby visible text as a last resort (question headings above the field)
    let context = '';
    if (!label && !aria && !placeholder) {
      let node = el.previousElementSibling, hops = 0;
      while (node && hops < 3) {
        const t = (node.innerText || '').trim();
        if (t && t.length < 200) { context = t.slice(0, 200); break; }
        node = node.previousElementSibling; hops++;
      }
    }

    let options = [];
    if (tag === 'select') {
      options = [...el.options].map(o => o.text.trim()).filter(Boolean).slice(0, 60);
    } else if (type === 'radio' || type === 'checkbox') {
      // group mates share a name — report the group once
      if (fields.some(f => f.group === name && (f.type === type))) return;
      const group = [...document.querySelectorAll(`input[type="${type}"][name="${CSS.escape(name)}"]`)];
      options = group.map(g => {
        const gid = g.id;
        const lab = gid ? document.querySelector(`label[for="${CSS.escape(gid)}"]`) : g.closest('label');
        return (lab ? lab.innerText.trim() : g.value || '').slice(0, 120);
      }).filter(Boolean);
    }

    fields.push({
      key, tag, type, name, label, aria, placeholder, context,
      options,
      required: !!(el.required || el.getAttribute('aria-required') === 'true'),
    });
  });
  return fields;
})()
"""


def extract_fields(driver) -> list[dict]:
    """Run the extractor in the page and return the field inventory."""
    fields = driver.execute_script(EXTRACT_JS)
    return fields or []


# ---------------------------------------------------------------------------
# 2. Gemini mapping: fields × resume  →  { field_key: value }
# ---------------------------------------------------------------------------

MAPPING_SYSTEM = """You are the form-filling brain of a job-application assistant.
You will receive:
  1. FIELDS — a JSON list of form fields from a job application page. Each has a
     "key" (opaque id), tag/type, and human cues: label, aria, placeholder,
     context, options (for selects / radio / checkbox groups), required.
  2. PROFILE — the candidate's resume as JSON: name, email, phone, location,
     title, summary, skills, years of experience, work history, education.
  3. COVER — a tailored cover letter, if one was prepared for this job.

Return ONLY a JSON object mapping field "key" → the value to type into it.
Rules:
- Map every field you can answer confidently from PROFILE or COVER.
- Standard contact fields (name, email, phone, location/city, LinkedIn) map directly.
- "Years of experience" fields: use PROFILE.yearsTotal, or infer from work history.
- Free-text "why are you a good fit / tell us about yourself" fields: write a SHORT
  2-4 sentence answer grounded ONLY in PROFILE facts. Never invent experience.
- Cover-letter textareas: use COVER verbatim when provided.
- Selects / radios: reply with the EXACT option text from "options" that best matches.
- Checkboxes that are pure consent ("I agree to the privacy policy", "I confirm the
  information is accurate"): OMIT them — the human reviews and ticks those.
- Work-authorization / visa / sponsorship questions: OMIT unless the answer is
  unambiguous from PROFILE. The human answers legal questions.
- EEO / demographic / disability / veteran / gender / ethnicity questions: ALWAYS OMIT.
- Salary-expectation fields: OMIT (the human decides).
- Anything you are unsure about: OMIT. An empty field the human reviews beats a
  wrong guess every time.
- For file-upload fields: OMIT (the agent attaches the resume file itself).
- Never output anything except the JSON object. No markdown fences, no commentary.
- Values must be plain strings (or the exact option text for selects).
"""


def build_mapping_prompt(fields: list[dict], profile: dict, cover_letter: str) -> str:
    slim = [
        {
            "key": f["key"],
            "kind": f["tag"] + "/" + f["type"],
            "label": f.get("label") or f.get("aria") or f.get("placeholder") or f.get("context") or f.get("name"),
            "options": f.get("options") or [],
            "required": f.get("required", False),
        }
        for f in fields
    ]
    return (
        "FIELDS:\n" + json.dumps(slim, ensure_ascii=False)
        + "\n\nPROFILE:\n" + json.dumps(profile, ensure_ascii=False)
        + "\n\nCOVER:\n" + (cover_letter or "(none)")
        + "\n\nReturn the JSON mapping now."
    )


def _call_gemini(api_key: str, system: str, user: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={api_key}"
    body = json.dumps({
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"parts": [{"text": user}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2048},
    }).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = json.loads(resp.read().decode())
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Gemini returned no text: {json.dumps(data)[:300]}")


def _parse_mapping(raw: str) -> dict[str, str]:
    text = raw.strip()
    # tolerate markdown fences if the model adds them anyway
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        return {}
    try:
        obj = json.loads(m.group(0))
    except json.JSONDecodeError:
        return {}
    return {str(k): str(v) for k, v in obj.items() if isinstance(v, (str, int, float))}


def map_fields(api_key: str, fields: list[dict], profile: dict, cover_letter: str = "") -> dict[str, str]:
    """
    Ask Gemini which resume value goes into each form field.
    Returns { field_key: value }. Fields Gemini won't answer are simply absent.
    """
    if not fields:
        return {}
    prompt = build_mapping_prompt(fields, profile, cover_letter)
    raw = _call_gemini(api_key, MAPPING_SYSTEM, prompt)
    mapping = _parse_mapping(raw)
    valid_keys = {f["key"] for f in fields}
    return {k: v for k, v in mapping.items() if k in valid_keys and v.strip()}
