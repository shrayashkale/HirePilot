import type { Job } from '../types';

function scoreColor(s: number) {
  if (s >= 80) return 'text-lime-300 border-lime-400/30 bg-lime-400/10';
  if (s >= 60) return 'text-cyan-300 border-cyan-400/30 bg-cyan-400/10';
  if (s >= 40) return 'text-amber-300 border-amber-400/30 bg-amber-400/10';
  return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
}

export default function JobCard({
  job,
  selected,
  onToggle,
  onOpen,
}: {
  job: Job;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      className={`glass rounded-2xl p-5 transition-all hover:border-cyan-500/30 cursor-pointer ${
        selected ? 'ring-2 ring-cyan-500/60 border-cyan-500/40' : ''
      }`}
      onClick={onOpen}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition ${
            selected ? 'bg-cyan-500 border-cyan-500 text-ink-950' : 'border-slate-600 hover:border-cyan-400'
          }`}
          aria-label="Select job"
        >
          {selected && <span className="text-xs font-black">✓</span>}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold leading-snug">{job.title}</h3>
            {job.matchScore != null && (
              <span className={`text-xs font-bold px-2 py-1 rounded-lg border whitespace-nowrap ${scoreColor(job.matchScore)}`}>
                {job.matchScore}% match
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            {job.company} · {job.location}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-ink-700 text-slate-300">via {job.via}</span>
            <span className="px-2 py-0.5 rounded-full bg-ink-700 text-slate-300">{job.postedAt}</span>
            {job.isRemote && <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">Remote</span>}
            {job.salary && <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">💰 {job.salary}</span>}
          </div>
          {job.matchedSkills && job.matchedSkills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {job.matchedSkills.slice(0, 5).map((s) => (
                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300">✓ {s}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
