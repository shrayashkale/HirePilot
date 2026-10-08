import { useEffect, useMemo, useState } from 'react';
import type { ApiKeys, Job, Resume, Application } from './types';
import { store } from './lib/storage';
import { searchJobs } from './lib/serpapi';
import { scoreJob } from './lib/matcher';
import KeyGate from './components/KeyGate';
import ResumeUpload from './components/ResumeUpload';
import JobCard from './components/JobCard';
import JobDetail from './components/JobDetail';
import AgentRunner from './components/AgentRunner';
import Insights from './components/Insights';

type View = 'home' | 'app';

export default function App() {
  const [keys, setKeys] = useState<ApiKeys | null>(() => store.getKeys());
  const [view, setView] = useState<View>('home');
  const [resume, setResume] = useState<Resume | null>(() => store.getResume());
  const [jobs, setJobs] = useState<Job[]>(() => store.getJobs());
  const [applications, setApplications] = useState<Application[]>(() => store.getApplications());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openJob, setOpenJob] = useState<Job | null>(null);
  const [query, setQuery] = useState(store.getLastQuery()?.query ?? '');
  const [location, setLocation] = useState(store.getLastQuery()?.location ?? 'India');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    document.title = 'HirePilot — your agent-native job copilot';
  }, []);

  const appliedCount = useMemo(
    () => applications.filter((a) => a.status === 'applied').length,
    [applications],
  );

  if (!keys) {
    return <KeyGate onDone={() => setKeys(store.getKeys())} />;
  }

  const doSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    setSearchError('');
    try {
      const found = await searchJobs(keys.serpapi, { query: query.trim(), location: location.trim() || 'India' });
      const scored = resume
        ? found.map((j) => {
            const { score, matched, missing } = scoreJob(j, resume);
            return { ...j, matchScore: score, matchedSkills: matched, missingSkills: missing };
          }).sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
        : found;
      setJobs(scored);
      store.setJobs(scored);
      store.setLastQuery({ query: query.trim(), location: location.trim() });
      setSelected(new Set());
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const resetKeys = () => {
    if (confirm('Remove your API keys from this browser?')) {
      store.clearKeys();
      setKeys(null);
    }
  };

  // ── Landing ──────────────────────────────────────────────────────────
  if (view === 'home') {
    return (
      <div className="min-h-full bg-ink-950">
        <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-lg font-black text-ink-950">H</div>
            <span className="font-bold text-lg tracking-tight">HirePilot</span>
          </div>
          <button
            onClick={() => setView('app')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-ink-950 font-bold text-sm hover:brightness-110 transition"
          >
            Launch app →
          </button>
        </header>

        <main className="max-w-6xl mx-auto px-6">
          <div className="bg-grid rounded-3xl mt-6 px-6 py-20 md:py-28 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950 pointer-events-none" />
            <div className="relative animate-float-up">
              <p className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 rounded-full px-4 py-1.5 mb-6">
                Bring-your-own-agent job platform
              </p>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">
                Your agent finds the jobs.<br />
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">You just fire.</span>
              </h1>
              <p className="text-slate-400 max-w-2xl mx-auto mt-6 text-base md:text-lg">
                Upload your resume. HirePilot hunts live listings across the internet via SerpApi,
                matches them to your skills, briefs you on every company — then its built-in agent
                writes tailored cover letters and queues every application. Any personal AI agent
                can plug into the open Agent API.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-8">
                <button
                  onClick={() => setView('app')}
                  className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-ink-950 font-bold hover:brightness-110 transition shadow-lg shadow-cyan-500/25"
                >
                  Start applying — free →
                </button>
                <a
                  href="https://serpapi.com"
                  target="_blank"
                  rel="noreferrer"
                  className="px-7 py-3.5 rounded-xl glass font-semibold text-slate-200 hover:border-cyan-500/40 transition"
                >
                  Powered by SerpApi
                </a>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-10 mb-16">
            {[
              { t: '🌐 Live job hunt', d: 'Real-time listings from thousands of sources via SerpApi Google Jobs — matched and scored against your resume.' },
              { t: '🤖 Built-in agent', d: 'Select jobs, hit Agent Apply. Tailored cover letters, pre-filled answers, company intel — ready in seconds.' },
              { t: '🔌 Open Agent API', d: 'Moltbot, OpenClaw, Hermes or any agent can plug in: pull jobs, resume and letters as structured JSON.' },
            ].map((f) => (
              <div key={f.t} className="glass rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-2">{f.t}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </main>

        <footer className="border-t border-ink-800 py-6 text-center text-xs text-slate-600">
          HirePilot — built for the SerpApi India Hackathon 2026 · AI-assisted build (Muse)
        </footer>
      </div>
    );
  }

  // ── App ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-ink-950">
      <header className="sticky top-0 z-40 glass border-b border-ink-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3.5">
          <button onClick={() => setView('home')} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-ink-950">H</div>
            <span className="font-bold tracking-tight">HirePilot</span>
          </button>
          <div className="flex items-center gap-4 text-sm">
            {appliedCount > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-semibold">
                {appliedCount} applied
              </span>
            )}
            <button onClick={resetKeys} className="text-xs text-slate-500 hover:text-slate-300">Reset keys</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6 pb-20">
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ResumeUpload resume={resume} geminiKey={keys.gemini} onResume={setResume} />
          </div>
          <AgentRunner
            jobs={jobs}
            selectedIds={selected}
            resume={resume ?? { id: '', filename: '', uploadedAt: 0, rawText: '', skills: [], experience: [], education: [] }}
            geminiKey={keys.gemini}
            applications={applications}
            onApplications={setApplications}
            onDone={() => {}}
          />
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              placeholder='Try "frontend developer", "data analyst", "devops engineer"…'
              className="flex-1 bg-ink-800 border border-ink-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 placeholder:text-slate-600"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              placeholder="Location"
              className="md:w-48 bg-ink-800 border border-ink-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 placeholder:text-slate-600"
            />
            <button
              onClick={doSearch}
              disabled={searching || !query.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-ink-950 font-bold text-sm hover:brightness-110 disabled:opacity-40 transition whitespace-nowrap"
            >
              {searching ? 'Hunting…' : '🔍 Hunt jobs'}
            </button>
          </div>
          {!resume && (
            <p className="text-xs text-amber-300/80 mt-2">☝ Upload your resume first for match scores — or search anyway to browse.</p>
          )}
          {searchError && <p className="text-sm text-red-400 mt-2">{searchError}</p>}
          {searching && <p className="text-xs text-cyan-400 mt-2 animate-agent-thinking">Querying live listings via SerpApi…</p>}
        </div>

        {resume && jobs.length > 0 && <Insights jobs={jobs} resume={resume} />}

        {jobs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">
                {jobs.length} live listing{jobs.length === 1 ? '' : 's'}
                {selected.size > 0 && <span className="text-cyan-400"> · {selected.size} selected</span>}
              </h2>
              {selected.size > 0 && (
                <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 hover:text-slate-300">
                  Clear selection
                </button>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {jobs.map((j) => (
                <JobCard key={j.id} job={j} selected={selected.has(j.id)} onToggle={() => toggleSelect(j.id)} onOpen={() => setOpenJob(j)} />
              ))}
            </div>
          </div>
        )}

        {jobs.length === 0 && !searching && (
          <div className="text-center py-16 text-slate-600">
            <div className="text-5xl mb-4">🎯</div>
            <p className="font-semibold text-slate-400">No hunts yet</p>
            <p className="text-sm mt-1">Upload your resume, type a role, and hit Hunt jobs.</p>
          </div>
        )}
      </main>

      {openJob && (
        <JobDetail
          job={openJob}
          serpapiKey={keys.serpapi}
          geminiKey={keys.gemini}
          onClose={() => {
            setOpenJob(null);
            setJobs(store.getJobs());
          }}
          onToggleSelect={() => toggleSelect(openJob.id)}
          selected={selected.has(openJob.id)}
        />
      )}
    </div>
  );
}
