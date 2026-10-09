/* HirePilot Autofill — background service worker.
   The brain: takes a form's field inventory + the user's profile,
   asks Gemini which resume detail goes in which field.
   Host permission on generativelanguage.googleapis.com exempts this
   call from CORS — no proxy server needed. */

const MODEL = 'gemini-3.5-flash-lite';

const MAPPING_SYSTEM = `You are the form-filling brain of a job-application assistant.
You will receive:
  1. FIELDS — a JSON list of form fields from a job application page. Each has a
     "key" (opaque id), kind, and human cues: label, options (for selects / radio /
     checkbox groups), required.
  2. PROFILE — the candidate's resume as JSON: name, email, phone, location,
     title, summary, skills, years of experience, work history, education.

Return ONLY a JSON object mapping field "key" → the value to type into it.
Rules:
- Map every field you can answer confidently from PROFILE.
- Standard contact fields (name, email, phone, location/city, LinkedIn) map directly.
- "Years of experience" fields: use PROFILE.yearsTotal, or infer from work history.
- Free-text "why are you a good fit / tell us about yourself" fields: write a SHORT
  2-4 sentence answer grounded ONLY in PROFILE facts. Never invent experience.
- Selects / radios: reply with the EXACT option text from "options" that best matches.
- Checkboxes that are pure consent ("I agree to the privacy policy", "I confirm the
  information is accurate"): OMIT them — the human reviews and ticks those.
- Work-authorization / visa / sponsorship questions: OMIT unless the answer is
  unambiguous from PROFILE. The human answers legal questions.
- EEO / demographic / disability / veteran / gender / ethnicity questions: ALWAYS OMIT.
- Salary-expectation fields: OMIT (the human decides).
- Anything you are unsure about: OMIT. An empty field the human reviews beats a
  wrong guess every time.
- Never output anything except the JSON object. No markdown fences, no commentary.
- Values must be plain strings (or the exact option text for selects).`;

function buildPrompt(fields, profile) {
  const slim = fields.map((f) => ({
    key: f.key,
    kind: f.tag + '/' + f.type,
    label: f.label || f.aria || f.placeholder || f.context || f.name,
    options: f.options || [],
    required: !!f.required,
  }));
  return (
    'FIELDS:\n' + JSON.stringify(slim) +
    '\n\nPROFILE:\n' + JSON.stringify(profile) +
    '\n\nReturn the JSON mapping now.'
  );
}

function parseMapping(raw) {
  const m = String(raw || '').match(/\{[\s\S]*\}/);
  if (!m) return {};
  try {
    const obj = JSON.parse(m[0]);
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' || typeof v === 'number') out[String(k)] = String(v);
    }
    return out;
  } catch {
    return {};
  }
}

async function mapFields(apiKey, fields, profile) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: MAPPING_SYSTEM }] },
      contents: [{ parts: [{ text: buildPrompt(fields, profile) }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 160)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const mapping = parseMapping(text);
  const valid = new Set(fields.map((f) => f.key));
  return Object.fromEntries(
    Object.entries(mapping).filter(([k, v]) => valid.has(k) && v.trim())
  );
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.action === 'mapFields') {
    mapFields(msg.apiKey, msg.fields, msg.profile)
      .then((mapping) => sendResponse({ ok: true, mapping }))
      .catch((e) => sendResponse({ ok: false, error: String(e?.message || e) }));
    return true; // async response
  }
  if (msg?.action === 'getConfig') {
    chrome.storage.local.get(['geminiKey', 'profile']).then((c) => sendResponse({ ok: true, config: c }));
    return true;
  }
});
