// ─── Gemini client (browser-direct via REST; key in localStorage) ─────
// Used by the built-in agent for: cover letters, skill extraction,
// company-intel summaries, prefill answers.

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function geminiGenerate(
  apiKey: string,
  prompt: string,
  opts: { model?: string; maxTokens?: number } = {},
): Promise<string> {
  // gemini-2.5-flash burns most of its output budget on chain-of-thought
  // tokens (finishReason MAX_TOKENS with truncated text); 3.5-flash-lite
  // returns complete generations. Verified 2026-10-08.
  const model = opts.model ?? 'gemini-3.5-flash-lite';
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? 1024,
        temperature: 0.7,
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: any) => p.text ?? '').join('').trim();
}

export async function generateCoverLetter(
  apiKey: string,
  resumeText: string,
  jobTitle: string,
  company: string,
  jobDescription: string,
  candidateName?: string,
): Promise<string> {
  const prompt = `Write a concise, professional cover letter (max 220 words) for a job application.

Candidate resume:
${resumeText.slice(0, 4000)}

Job: ${jobTitle} at ${company}
Job description (excerpt):
${jobDescription.slice(0, 2500)}

Rules:
- Address it to the hiring team at ${company}.
- Reference 2-3 specific skills/experiences from the resume that match the job.
- Confident tone, no flattery, no placeholders like [Your Name].
- Sign off with ${candidateName || 'the candidate'}.
- Plain text only, no markdown headings.`;
  return geminiGenerate(apiKey, prompt, { maxTokens: 700 });
}

export async function summarizeCompanyIntel(
  apiKey: string,
  company: string,
  newsTitles: string[],
  webContext: string,
): Promise<string> {
  const prompt = `Summarize what a job applicant should know about the company "${company}" in 4-6 crisp bullet lines.
Recent headlines:
${newsTitles.slice(0, 8).map((t) => '- ' + t).join('\n')}
Web context:
${webContext.slice(0, 1500)}
Cover: what they do, recent momentum (funding/launches/news), and culture signals if visible. Plain text, bullet lines starting with "- ". No markdown bold.`;
  return geminiGenerate(apiKey, prompt, { maxTokens: 500 });
}

export async function extractSkillsLLM(apiKey: string, resumeText: string): Promise<string[]> {
  const prompt = `Extract the technical and professional skills from this resume. Return ONLY a JSON array of skill strings, e.g. ["React", "Python"]. No other text.\n\nResume:\n${resumeText.slice(0, 5000)}`;
  const out = await geminiGenerate(apiKey, prompt, { maxTokens: 400 });
  try {
    const arr = JSON.parse(out.replace(/```json|```/g, '').trim());
    return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}
