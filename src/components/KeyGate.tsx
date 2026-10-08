import { useState } from 'react';
import { store } from '../lib/storage';

export default function KeyGate({ onDone }: { onDone: () => void }) {
  const [serpapi, setSerpapi] = useState('');
  const [gemini, setGemini] = useState('');
  const [show, setShow] = useState({ serpapi: false, gemini: false });
  const [error, setError] = useState('');

  const submit = () => {
    if (serpapi.trim().length < 10 || gemini.trim().length < 10) {
      setError('Both keys are required — paste the full keys to continue.');
      return;
    }
    store.setKeys({ serpapi: serpapi.trim(), gemini: gemini.trim() });
    onDone();
  };

  const field = (
    label: string,
    hint: string,
    value: string,
    setValue: (v: string) => void,
    visible: boolean,
    toggle: () => void,
    link: string,
    linkLabel: string,
  ) => (
    <div className="text-left">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <p className="text-xs text-slate-500 mt-0.5 mb-2">
        {hint}{' '}
        <a href={link} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
          {linkLabel}
        </a>
      </p>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste key here"
          className="w-full bg-ink-800 border border-ink-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 pr-16"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-grid flex items-center justify-center p-6">
      <div className="glass rounded-3xl p-8 md:p-10 max-w-lg w-full animate-float-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xl font-black text-ink-950">H</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">HirePilot</h1>
            <p className="text-xs text-slate-500">Your agent-native job copilot</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold mt-6 mb-1">Connect your keys to launch</h2>
        <p className="text-sm text-slate-400 mb-6">
          HirePilot runs entirely in your browser — no accounts, no servers. Your keys never leave
          this device except to call SerpApi and Gemini directly.
        </p>

        <div className="space-y-5">
          {field(
            'SerpApi API key',
            'Free at serpapi.com — 250 searches/month. Powers live job listings + company intel.',
            serpapi, setSerpapi, show.serpapi,
            () => setShow((s) => ({ ...s, serpapi: !s.serpapi })),
            'https://serpapi.com/manage-api-key', 'Get a free key →',
          )}
          {field(
            'Gemini API key',
            'Free at Google AI Studio. Powers the agent: cover letters, matching, intel summaries.',
            gemini, setGemini, show.gemini,
            () => setShow((s) => ({ ...s, gemini: !s.gemini })),
            'https://aistudio.google.com/app/apikey', 'Get a free key →',
          )}
        </div>

        {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

        <button
          onClick={submit}
          className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-ink-950 font-bold rounded-xl py-3.5 transition-all shadow-lg shadow-cyan-500/20"
        >
          Launch HirePilot →
        </button>
        <p className="text-[11px] text-slate-600 text-center mt-3">
          Keys are stored only in your browser's local storage.
        </p>
      </div>
    </div>
  );
}
