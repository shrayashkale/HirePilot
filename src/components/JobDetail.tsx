import { useEffect, useState } from 'react';
import type { Job, CompanyIntel } from '../types';
import { fetchCompanyIntel } from '../lib/serpapi';
import { summarizeCompanyIntel } from '../lib/gemini';

export default function JobDetail({
  job,
  serpapiKey,
  geminiKey,
  onClose,
  onToggleSelect,
  selected,
}: {
  job: Job;
  serpapiKey: string;
  geminiKey: string;
  onClose: () => void;
  onToggleSelect: () => void;
  selected: boolean;
}) {
  const [intel, setIntel] = useState<CompanyIntel | null>(job.intel ?? null);
  const [intelBusy, setIntelBusy] = useState(false);
  const [intelError, setIntelError] = useState('');

  useEffect(() => {
    setIntel(job.intel ?? null);
    setIntelError('');
  }, [job.id]);

  const loadIntel = async () => {
    setIntelBusy(true);
    setIntelError('');
    try {
      const raw = await fetchCompanyIntel(serpapiKey, job.company);
      let summary = '';
      try {
        summary = await summarizeCompanyIntel(
          geminiKey,
          job.company,
          raw.news.map((n) => n.title),
          (raw as any)._webContext ?? '',
        );
      } catch {
        summary = raw.news.length
          ? 'Recent headlines for ' + job.company + ' loaded below.'
          : 'No recent headlines found.';
      }
      const full = { ...raw, summary };
      setIntel(full);
      job.intel = full;
    } catch (e) {
      setIntelError(e instanceof Error ? e.message : 'Intel lookup failed.');
    } finally {
      setIntelBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-ink-900 border-l border-ink-700 h-full overflow-y-auto animate-float-up">
        <div className="sticky top-0 bg-ink-900/95 backdrop-blur border-b border-ink-700 p-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold leading-tight">{job.title}</h2>
            <p className="text-sm text-slate-400 mt-1">{job.company} · {job.location}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-6">
          {job.matchScore != null && (
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-400">Match score</span>
                <span className="font-bold text-cyan-300">{job.matchScore}%</span>
              </div>
              <div className="h-2 rounded-full bg-ink-700 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all" style={{ width: `${job.matchScore}%` }} />
              </div>
              {job.missingSkills && job.missingSkills.length > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  Missing: {job.missingSkills.slice(0, 6).join(', ')}
                </p>
              )}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-2">Description</h3>
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {job.description || 'No description available.'}
            </p>
          </div>

          {job.highlights.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-2">Highlights</h3>
              {job.highlights.map((h, i) => (
                <div key={i} className="mb-2">
                  <p className="text-xs font-semibold text-cyan-300">{h.title}</p>
                  <ul className="text-sm text-slate-300 list-disc ml-5 mt-0.5">
                    {h.items.map((it, j) => <li key={j}>{it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">🛰 Company intel</h3>
              {!intel && (
                <button
                  onClick={loadIntel}
                  disabled={intelBusy}
                  className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 disabled:opacity-50"
                >
                  {intelBusy ? 'Scanning…' : 'Scan company'}
                </button>
              )}
            </div>
            {intelBusy && <p className="text-xs text-slate-500 animate-agent-thinking">Pulling live news + web intel via SerpApi…</p>}
            {intelError && <p className="text-xs text-red-400">{intelError}</p>}
            {intel && (
              <div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{intel.summary}</p>
                {intel.news.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {intel.news.map((n, i) => (
                      <li key={i}>
                        <a href={n.url} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline">
                          {n.title}
                        </a>
                        {n.source && <span className="text-[10px] text-slate-600 ml-1">· {n.source}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 sticky bottom-0 bg-ink-900/95 backdrop-blur py-4 border-t border-ink-700">
            <button
              onClick={onToggleSelect}
              className={`flex-1 rounded-xl py-3 font-bold transition ${
                selected
                  ? 'bg-ink-700 text-slate-300 hover:bg-ink-800'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-ink-950 hover:from-cyan-400'
              }`}
            >
              {selected ? '✓ Selected for agent' : 'Select for agent apply'}
            </button>
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="px-5 rounded-xl py-3 bg-ink-700 hover:bg-ink-800 text-sm font-semibold flex items-center"
            >
              Apply ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
