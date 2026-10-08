import { useState } from 'react';
import type { Job, Resume, AgentRun, Application } from '../types';
import { runAgentApply } from '../lib/agent';
import { store } from '../lib/storage';

export default function AgentRunner({
  jobs,
  selectedIds,
  resume,
  geminiKey,
  applications,
  onApplications,
  onDone,
}: {
  jobs: Job[];
  selectedIds: Set<string>;
  resume: Resume;
  geminiKey: string;
  applications: Application[];
  onApplications: (a: Application[]) => void;
  onDone: () => void;
}) {
  const [run, setRun] = useState<AgentRun | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedJobs = jobs.filter((j) => selectedIds.has(j.id));

  const start = async () => {
    if (selectedJobs.length === 0 || busy) return;
    setBusy(true);
    setRun(null);
    try {
      await runAgentApply(geminiKey, selectedJobs, resume, (r) => {
        setRun(r);
        onApplications(store.getApplications());
      });
    } finally {
      setBusy(false);
      onDone();
    }
  };

  const readyApps = applications.filter((a) => a.status === 'ready' && selectedIds.has(a.jobId));

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${busy ? 'bg-cyan-400 animate-agent-thinking' : 'bg-slate-600'}`} />
          Built-in agent
        </h3>
        <span className="text-xs text-slate-500">{selectedJobs.length} selected</span>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        The agent writes a tailored cover letter per job and builds your apply package.
        You review and fire each submit — ~10 seconds per job.
      </p>

      {!run && !busy && (
        <button
          onClick={start}
          disabled={selectedJobs.length === 0}
          className="w-full rounded-xl py-3 font-bold bg-gradient-to-r from-lime-400 to-emerald-500 text-ink-950 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-lime-500/20 animate-pulse-ring"
        >
          ⚡ Agent Apply — {selectedJobs.length} job{selectedJobs.length === 1 ? '' : 's'}
        </button>
      )}

      {(busy || run) && (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {(run?.steps ?? []).map((s) => (
            <div key={s.id} className="flex items-start gap-2.5 text-sm animate-float-up">
              <span className="mt-0.5">
                {s.status === 'done' && <span className="text-emerald-400">✓</span>}
                {s.status === 'running' && <span className="text-cyan-400 animate-agent-thinking">◌</span>}
                {s.status === 'error' && <span className="text-red-400">✕</span>}
                {s.status === 'pending' && <span className="text-slate-600">○</span>}
              </span>
              <div className="min-w-0">
                <p className={s.status === 'error' ? 'text-red-300' : 'text-slate-200'}>{s.label}</p>
                {s.detail && <p className="text-xs text-slate-500">{s.detail}</p>}
              </div>
            </div>
          ))}
          {busy && !run && <p className="text-sm text-slate-500 animate-agent-thinking">Agent waking up…</p>}
        </div>
      )}

      {!busy && readyApps.length > 0 && (
        <div className="mt-4 pt-4 border-t border-ink-700">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
            Ready to fire ({readyApps.length})
          </p>
          <div className="space-y-2">
            {readyApps.map((a) => {
              const job = jobs.find((j) => j.id === a.jobId);
              if (!job) return null;
              return (
                <div key={a.jobId} className="flex items-center justify-between gap-2 bg-ink-800 rounded-xl px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{job.title}</p>
                    <p className="text-xs text-slate-500 truncate">{job.company}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {a.coverLetter && (
                      <button
                        onClick={() => {
                          const w = window.open('', '_blank', 'width=560,height=640');
                          w?.document.write(`<pre style="font-family:sans-serif;white-space:pre-wrap;padding:24px">${a.coverLetter!.replace(/</g, '&lt;')}</pre>`);
                        }}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-ink-700 hover:bg-ink-800 text-slate-300"
                      >
                        Letter
                      </button>
                    )}
                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        const apps = store.getApplications().map((x) =>
                          x.jobId === a.jobId ? { ...x, status: 'applied' as const, updatedAt: Date.now(), note: 'Submitted by user' } : x,
                        );
                        store.setApplications(apps);
                        onApplications(apps);
                      }}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-cyan-500 text-ink-950 font-bold hover:bg-cyan-400"
                    >
                      Apply ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
