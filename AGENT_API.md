# HirePilot Agent API — Bring Your Own Agent

HirePilot is **agent-native**: besides its built-in agent, any personal AI agent
(Moltbot, OpenClaw, Hermes, or your own) can drive the full apply loop through
this open protocol. The platform never impersonates the user — the *user's own
agent*, running on *their* machine with *their* credentials, applies to jobs
*they* selected.

## Concepts

| Entity | Description |
|---|---|
| `Job` | A live listing from SerpApi Google Jobs, scored against the resume |
| `ResumeProfile` | The parsed resume as structured JSON |
| `ApplyPackage` | Everything an agent needs to submit one application |
| `Application` | Status tracking per job (`queued → preparing → ready → applied`) |

## ApplyPackage schema

`GET /agent/packages` (reference path — see "Local reference" below) returns:

```json
{
  "packages": [
    {
      "job": {
        "id": "abc123",
        "title": "Frontend Developer",
        "company": "Acme Corp",
        "location": "Bengaluru, India",
        "description": "…full listing text…",
        "via": "LinkedIn",
        "postedAt": "2 days ago",
        "scheduleType": "Full-time",
        "salary": "₹12L–₹18L a year",
        "isRemote": false,
        "applyUrl": "https://…",
        "matchScore": 87,
        "matchedSkills": ["React", "TypeScript"],
        "missingSkills": ["GraphQL"]
      },
      "resume": {
        "name": "Ava Kumar",
        "email": "ava@example.com",
        "phone": "+91…",
        "location": "Nashik, India",
        "title": "Frontend Developer",
        "skills": ["React", "TypeScript", "…"],
        "yearsTotal": 2,
        "resumeText": "…full parsed text…"
      },
      "coverLetter": "…tailored letter, ready to paste…",
      "prefillAnswers": {
        "fullName": "Ava Kumar",
        "email": "ava@example.com",
        "phone": "+91…",
        "location": "Nashik, India",
        "currentTitle": "Frontend Developer",
        "yearsExperience": "2",
        "skills": "React, TypeScript, …"
      }
    }
  ]
}
```

## Agent loop (reference)

1. **Select** — user picks jobs in the HirePilot UI (or via `POST /agent/select`).
2. **Prepare** — HirePilot's agent generates cover letters + prefill answers per job.
3. **Fetch** — external agent pulls `ApplyPackage`s.
4. **Act** — the external agent opens each `applyUrl` on the user's machine,
   fills forms with `prefillAnswers`, pastes the `coverLetter`, and submits —
   or holds for human review per the user's policy.
5. **Report** — agent posts back per-job status:
   `POST /agent/applications { jobId, status: "applied" | "needs_human" | "failed", note? }`

## Local reference implementation

The built-in agent (`src/lib/agent.ts`) implements this exact protocol:

- `buildAgentPayload(geminiKey, job, resume)` → `AgentJobPayload`
- `buildPrefillAnswers(resume)` → standard application answers
- `runAgentApply(geminiKey, jobs, resume, onStep)` → full loop with live steps

External agents can import these builders or reimplement against the schema above —
the JSON contract is the API.

## Trust boundaries

- HirePilot never submits applications itself and never stores credentials.
- API keys (SerpApi, Gemini) live only in the user's browser localStorage.
- The user's agent acts with the user's explicit per-job selection.
