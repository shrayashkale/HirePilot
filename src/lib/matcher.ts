// ─── Skill matching engine ────────────────────────────────────────────
import type { Job, Resume } from '../types';

const STOP = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'our', 'are', 'will', 'have', 'has',
  'from', 'that', 'this', 'with', 'job', 'role', 'work', 'team', 'ability', 'experience',
  'years', 'year', 'strong', 'good', 'great', 'plus', 'including', 'such', 'etc',
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** Extract candidate skill phrases from a job description. */
export function extractJobSkills(description: string, resumeSkills: string[]): string[] {
  const found = new Set<string>();
  const lower = description.toLowerCase();
  // resume skills mentioned in the listing
  for (const s of resumeSkills) {
    if (lower.includes(s.toLowerCase())) found.add(s);
  }
  // common demanded skills even if not on resume
  const DEMAND = [
    'React', 'TypeScript', 'Python', 'Java', 'Node.js', 'AWS', 'Docker', 'Kubernetes',
    'SQL', 'PostgreSQL', 'MongoDB', 'Machine Learning', 'LLM', 'GraphQL', 'REST API',
    'CI/CD', 'Terraform', 'Go', 'Rust', 'Next.js', 'Angular', 'Vue', 'Flutter',
    'Android', 'iOS', 'Figma', 'System Design', 'Microservices', 'Redis', 'GCP', 'Azure',
  ];
  for (const s of DEMAND) {
    if (lower.includes(s.toLowerCase())) found.add(s);
  }
  return [...found];
}

/** Score a job against the resume. Returns 0-100 plus skill breakdown. */
export function scoreJob(job: Job, resume: Resume): {
  score: number;
  matched: string[];
  missing: string[];
} {
  const jobSkills = extractJobSkills(job.description + ' ' + job.title, resume.skills);
  const resumeSet = new Set(resume.skills.map((s) => s.toLowerCase()));
  const matched = jobSkills.filter((s) => resumeSet.has(s.toLowerCase()));
  const missing = jobSkills.filter((s) => !resumeSet.has(s.toLowerCase()));

  // title relevance: overlap between resume title/keywords and job title
  const titleTokens = new Set(tokens((resume.title ?? '') + ' ' + resume.skills.join(' ')));
  const jobTitleTokens = tokens(job.title);
  const titleOverlap = jobTitleTokens.filter((t) => titleTokens.has(t)).length;
  const titleBoost = Math.min(20, titleOverlap * 7);

  const skillScore = jobSkills.length === 0 ? 30 : (matched.length / jobSkills.length) * 70;
  const score = Math.round(Math.min(98, skillScore + titleBoost + (job.salary ? 3 : 0)));

  return { score, matched, missing };
}

/** Aggregate salary strings like "₹8L–₹12L a year" / "$120k–$150k" into buckets. */
export function salaryInsights(jobs: Job[]): { label: string; count: number }[] {
  const buckets = new Map<string, number>();
  for (const j of jobs) {
    if (!j.salary) continue;
    const s = j.salary.replace(/,/g, '');
    buckets.set(s.length > 42 ? s.slice(0, 42) + '…' : s, (buckets.get(s) ?? 0) + 0);
  }
  return [...buckets.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

/** Most demanded skills across a result set (for the Skill Gap panel). */
export function demandRanking(jobs: Job[], resumeSkills: string[]): { skill: string; demand: number; have: boolean }[] {
  const resumeSet = new Set(resumeSkills.map((s) => s.toLowerCase()));
  const counts = new Map<string, number>();
  for (const j of jobs) {
    for (const s of extractJobSkills(j.description + ' ' + j.title, resumeSkills)) {
      const key = s;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([skill, demand]) => ({ skill, demand, have: resumeSet.has(skill.toLowerCase()) }))
    .sort((a, b) => b.demand - a.demand)
    .slice(0, 12);
}
