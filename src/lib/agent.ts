// ─── HirePilot built-in agent ──────────────────────────────────────────
// Orchestrates the "Agent Apply" loop:
//   select jobs → agent prepares everything → user fires each submit.
// Also exposes the payload builders that power the open Agent API.

import type {
  Job, Resume, AgentRun, AgentStep,
  AgentJobPayload, ResumeProfilePayload,
} from '../types';
import { v4 as uuid } from './uuid';
import { generateCoverLetter } from './gemini';
import { store } from './storage';

export type StepCallback = (run: AgentRun) => void;

function step(label: string, detail?: string): AgentStep {
  return { id: uuid(), label, detail, status: 'pending' };
}

/** Standard application questions, pre-filled from the resume. */
export function buildPrefillAnswers(resume: Resume): Record<string, string> {
  return {
    fullName: resume.name ?? '',
    email: resume.email ?? '',
    phone: resume.phone ?? '',
    location: resume.location ?? '',
    currentTitle: resume.title ?? resume.experience[0]?.title ?? '',
    yearsExperience: resume.yearsTotal != null ? String(resume.yearsTotal) : '',
    skills: resume.skills.join(', '),
    linkedin: '',
    portfolio: '',
    workAuthorization: '',
    noticePeriod: '',
  };
}

export function buildResumePayload(resume: Resume): ResumeProfilePayload {
  return {
    name: resume.name,
    email: resume.email,
    phone: resume.phone,
    location: resume.location,
    title: resume.title,
    summary: resume.summary,
    skills: resume.skills,
    yearsTotal: resume.yearsTotal,
    resumeText: resume.rawText,
  };
}

export async function buildAgentPayload(
  geminiKey: string,
  job: Job,
  resume: Resume,
): Promise<AgentJobPayload> {
  let coverLetter = job.coverLetter ?? '';
  if (!coverLetter) {
    coverLetter = await generateCoverLetter(
      geminiKey,
      resume.rawText,
      job.title,
      job.company,
      job.description,
      resume.name,
    );
  }
  return {
    job,
    resume: buildResumePayload(resume),
    coverLetter,
    prefillAnswers: buildPrefillAnswers(resume),
  };
}

function setStep(run: AgentRun, id: string, status: AgentStep['status'], detail?: string) {
  const s = run.steps.find((x) => x.id === id);
  if (s) {
    s.status = status;
    if (detail !== undefined) s.detail = detail;
    if (status === 'running' || status === 'done' || status === 'error') s.at = Date.now();
  }
}

/**
 * Run the agent over selected jobs. For each job the agent:
 *  1. generates a tailored cover letter (Gemini)
 *  2. builds prefill answers from the resume
 *  3. marks the application "ready" — the user fires the submit.
 * Emits step updates via onStep for the live UI.
 */
export async function runAgentApply(
  geminiKey: string,
  jobs: Job[],
  resume: Resume,
  onStep: StepCallback,
): Promise<AgentRun> {
  const run: AgentRun = {
    id: uuid(),
    startedAt: Date.now(),
    jobIds: jobs.map((j) => j.id),
    status: 'running',
    steps: [],
  };

  const emit = () => onStep({ ...run, steps: run.steps.map((s) => ({ ...s })) });

  const intro = step(`Agent engaged — ${jobs.length} job${jobs.length === 1 ? '' : 's'} selected`);
  run.steps.push(intro);
  setStep(run, intro.id, 'running');
  emit();

  const apps = store.getApplications();
  const appByJob = new Map(apps.map((a) => [a.jobId, a]));

  for (const job of jobs) {
    const s1 = step(`Cover letter — ${job.title} @ ${job.company}`);
    const s2 = step(`Apply package — ${job.title}`);
    run.steps.push(s1, s2);

    let app = appByJob.get(job.id);
    if (!app) {
      app = { jobId: job.id, status: 'queued', updatedAt: Date.now() };
      apps.push(app);
      appByJob.set(job.id, app);
    }
    app.status = 'preparing';
    app.updatedAt = Date.now();
    store.setApplications(apps);

    try {
      setStep(run, s1.id, 'running');
      emit();
      const payload = await buildAgentPayload(geminiKey, job, resume);
      job.coverLetter = payload.coverLetter;
      setStep(run, s1.id, 'done', `${payload.coverLetter.split(/\s+/).length} words, tailored to the listing`);

      setStep(run, s2.id, 'running', 'Assembling resume + answers + apply link');
      emit();
      // small beat so the UI reads as a sequence
      await new Promise((r) => setTimeout(r, 350));
      app.coverLetter = payload.coverLetter;
      app.prefillAnswers = payload.prefillAnswers;
      app.status = 'ready';
      app.note = 'Agent prepared — review and submit';
      app.updatedAt = Date.now();
      store.setApplications(apps);
      setStep(run, s2.id, 'done', 'Ready — awaiting your submit');
      emit();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setStep(run, s1.id === s1.id && s1.status !== 'done' ? s1.id : s2.id, 'error', msg);
      app.status = 'failed';
      app.note = msg;
      app.updatedAt = Date.now();
      store.setApplications(apps);
      emit();
    }
  }

  // persist cover letters onto cached jobs
  const cached = store.getJobs();
  const byId = new Map(jobs.map((j) => [j.id, j]));
  store.setJobs(cached.map((j) => (byId.has(j.id) ? { ...j, coverLetter: byId.get(j.id)!.coverLetter } : j)));

  setStep(run, intro.id, 'done', `${jobs.length} packages ready`);
  run.status = 'done';
  run.finishedAt = Date.now();
  emit();
  return run;
}
