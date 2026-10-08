import { useRef, useState } from 'react';
import type { Resume } from '../types';
import { extractTextFromFile, parseResumeText } from '../lib/resume';
import { extractSkillsLLM } from '../lib/gemini';
import { store } from '../lib/storage';

export default function ResumeUpload({
  resume,
  geminiKey,
  onResume,
}: {
  resume: Resume | null;
  geminiKey: string;
  onResume: (r: Resume) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);

  const handleFile = async (file: File) => {
    setError('');
    setBusy(true);
    try {
      const text = await extractTextFromFile(file);
      if (text.trim().length < 50) throw new Error('Could not read any text from that file.');
      let parsed = parseResumeText(text, file.name);
      // LLM skill boost (best-effort)
      try {
        const llmSkills = await extractSkillsLLM(geminiKey, text);
        const merged = new Set([...parsed.skills, ...llmSkills]);
        parsed = { ...parsed, skills: [...merged] };
      } catch {
        /* regex skills stand alone */
      }
      store.setResume(parsed);
      onResume(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse resume.');
    } finally {
      setBusy(false);
    }
  };

  if (resume) {
    return (
      <div className="glass rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold">Resume loaded</p>
            <h3 className="text-lg font-bold mt-1">{resume.name || resume.filename}</h3>
            <p className="text-sm text-slate-400">
              {[resume.email, resume.yearsTotal != null ? `${resume.yearsTotal}+ yrs` : null].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            className="text-xs px-3 py-1.5 rounded-lg bg-ink-700 hover:bg-ink-800 text-slate-300 transition"
          >
            Replace
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {resume.skills.slice(0, 14).map((s) => (
            <span key={s} className="text-[11px] px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              {s}
            </span>
          ))}
          {resume.skills.length > 14 && (
            <span className="text-[11px] px-2 py-1 rounded-full bg-ink-700 text-slate-400">+{resume.skills.length - 14} more</span>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {busy && <p className="text-xs text-slate-500 mt-2 animate-agent-thinking">Parsing resume…</p>}
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]); }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          drag ? 'border-cyan-400 bg-cyan-500/5' : 'border-ink-700 hover:border-cyan-500/50 bg-ink-900/50'
        }`}
      >
        <div className="text-4xl mb-3">📄</div>
        <p className="font-semibold">{busy ? 'Parsing your resume…' : 'Drop your resume here'}</p>
        <p className="text-sm text-slate-500 mt-1">PDF, DOCX or TXT — parsed instantly in your browser</p>
        {busy && <p className="text-xs text-cyan-400 mt-2 animate-agent-thinking">Reading document…</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        onChange={(e) => { e.target.files?.[0] && handleFile(e.target.files[0]); e.target.value = ''; }}
      />
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
