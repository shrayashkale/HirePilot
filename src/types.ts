// ─── HirePilot core types ──────────────────────────────────────────────

export interface ApiKeys {
  serpapi: string;
  gemini: string;
}

export interface Resume {
  id: string;
  filename: string;
  uploadedAt: number;
  rawText: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  title?: string;          // current/target title
  summary?: string;
  skills: string[];
  experience: ExperienceItem[];
  education: string[];
  yearsTotal?: number;
}

export interface ExperienceItem {
  title: string;
  company: string;
  duration: string;
  bullets: string[];
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  via: string;             // source platform e.g. "LinkedIn"
  postedAt: string;
  scheduleType: string;
  salary?: string;
  isRemote: boolean;
  applyUrl: string;
  thumbnail?: string;
  highlights: { title: string; items: string[] }[];
  // enriched
  matchScore?: number;     // 0-100
  matchedSkills?: string[];
  missingSkills?: string[];
  intel?: CompanyIntel;
  coverLetter?: string;
}

export interface CompanyIntel {
  company: string;
  summary: string;         // Gemini-synthesized from news+search
  news: { title: string; url: string; date?: string; source?: string }[];
  fetchedAt: number;
}

export type ApplicationStatus =
  | 'queued'      // selected, waiting for agent
  | 'preparing'   // agent working: cover letter etc.
  | 'ready'       // package ready, awaiting user submit click
  | 'applied'     // user confirmed submit
  | 'skipped'
  | 'failed';

export interface Application {
  jobId: string;
  status: ApplicationStatus;
  coverLetter?: string;
  prefillAnswers?: Record<string, string>;
  updatedAt: number;
  note?: string;
}

export interface AgentStep {
  id: string;
  label: string;
  detail?: string;
  status: 'pending' | 'running' | 'done' | 'error';
  at?: number;
}

export interface AgentRun {
  id: string;
  startedAt: number;
  finishedAt?: number;
  jobIds: string[];
  steps: AgentStep[];
  status: 'running' | 'done' | 'error';
}

// ─── Agent API (BYOA protocol) payloads ────────────────────────────────

export interface AgentJobPayload {
  job: Job;
  resume: ResumeProfilePayload;
  coverLetter: string;
  prefillAnswers: Record<string, string>;
}

export interface ResumeProfilePayload {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  title?: string;
  summary?: string;
  skills: string[];
  yearsTotal?: number;
  resumeText: string;
}
