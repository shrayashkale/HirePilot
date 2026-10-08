import type { Job, Resume } from '../types';
import { salaryInsights, demandRanking } from '../lib/matcher';

export default function Insights({ jobs, resume }: { jobs: Job[]; resume: Resume }) {
  const salaries = salaryInsights(jobs);
  const demand = demandRanking(jobs, resume.skills);
  const missing = demand.filter((d) => !d.have).slice(0, 6);

  if (jobs.length === 0) return null;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="glass rounded-2xl p-5">
        <h3 className="font-bold mb-1">📊 Skill demand radar</h3>
        <p className="text-xs text-slate-500 mb-3">What live listings ask for vs. what you have</p>
        <div className="space-y-2">
          {demand.map((d) => (
            <div key={d.skill} className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.have ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="flex-1 truncate text-slate-300">{d.skill}</span>
              <div className="w-24 h-1.5 rounded-full bg-ink-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${d.have ? 'bg-emerald-400' : 'bg-amber-400'}`}
                  style={{ width: `${Math.min(100, (d.demand / Math.max(1, demand[0].demand)) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 w-8 text-right">{d.demand}×</span>
            </div>
          ))}
        </div>
        {missing.length > 0 && (
          <p className="text-xs text-amber-300/90 mt-3">
            ⚡ Gap to close: {missing.map((m) => m.skill).join(', ')}
          </p>
        )}
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-bold mb-1">💰 Salary signals</h3>
        <p className="text-xs text-slate-500 mb-3">Pay ranges scraped from these listings</p>
        {salaries.length === 0 ? (
          <p className="text-sm text-slate-500">No salary data in these listings — try a broader query.</p>
        ) : (
          <div className="space-y-2">
            {salaries.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-slate-300 truncate">{s.label}</span>
                <span className="text-xs text-slate-500">{s.count} listing{s.count === 1 ? '' : 's'}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 pt-3 border-t border-ink-700">
          <p className="text-xs text-slate-500">
            ✉️ Email-apply agent <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-bold ml-1">COMING SOON</span>
          </p>
        </div>
      </div>
    </div>
  );
}
