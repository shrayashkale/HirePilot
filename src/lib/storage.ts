// ─── localStorage-backed app state (no backend, no login) ─────────────
import type { ApiKeys, Resume, Job, Application } from '../types';

const K = {
  keys: 'hirepilot.keys.v1',
  resume: 'hirepilot.resume.v1',
  jobs: 'hirepilot.jobs.v1',
  applications: 'hirepilot.applications.v1',
  lastQuery: 'hirepilot.lastQuery.v1',
} as const;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — app keeps working in-memory */
  }
}

export const store = {
  getKeys(): ApiKeys | null {
    return read<ApiKeys>(K.keys);
  },
  setKeys(keys: ApiKeys) {
    write(K.keys, keys);
  },
  clearKeys() {
    localStorage.removeItem(K.keys);
  },

  getResume(): Resume | null {
    return read<Resume>(K.resume);
  },
  setResume(r: Resume) {
    write(K.resume, r);
  },

  getJobs(): Job[] {
    return read<Job[]>(K.jobs) ?? [];
  },
  setJobs(j: Job[]) {
    write(K.jobs, j);
  },

  getApplications(): Application[] {
    return read<Application[]>(K.applications) ?? [];
  },
  setApplications(a: Application[]) {
    write(K.applications, a);
  },

  getLastQuery(): { query: string; location: string } | null {
    return read(K.lastQuery);
  },
  setLastQuery(q: { query: string; location: string }) {
    write(K.lastQuery, q);
  },
};
