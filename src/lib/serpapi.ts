// ─── SerpApi client (browser-direct; key lives in localStorage) ──────
// Engines used: google_jobs (listings), google_news (company intel),
// google (organic search — company background).

import type { Job, CompanyIntel } from '../types';

const BASE = 'https://serpapi.com/search.json';

async function callSerpApi(key: string, params: Record<string, string>) {
  const url = new URL(BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('api_key', key);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`SerpApi ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(`SerpApi: ${data.error}`);
  return data;
}

export interface JobSearchParams {
  query: string;
  location: string;
  remoteOnly?: boolean;
}

export async function searchJobs(key: string, p: JobSearchParams): Promise<Job[]> {
  const data = await callSerpApi(key, {
    engine: 'google_jobs',
    q: p.query,
    location: p.location || 'India',
  });
  const results = (data.jobs_results ?? []) as any[];
  return results.map((j, i) => {
    const applyUrl =
      j.apply_options?.[0]?.link ||
      j.related_links?.[0]?.link ||
      `https://www.google.com/search?q=${encodeURIComponent(j.title + ' ' + j.company_name)}&ibp=htl;jobs`;
    return {
      id: j.job_id || `serp-${Date.now()}-${i}`,
      title: j.title ?? 'Untitled role',
      company: j.company_name ?? 'Unknown company',
      location: j.location ?? p.location,
      description: j.description ?? '',
      via: (j.via ?? 'Google Jobs').replace(/^via\s+/i, ''),
      postedAt: j.detected_extensions?.posted_at ?? 'Recently',
      scheduleType: j.detected_extensions?.schedule_type ?? 'Full-time',
      salary: j.detected_extensions?.salary,
      isRemote: Boolean(j.detected_extensions?.work_from_home),
      applyUrl,
      thumbnail: j.thumbnail,
      highlights: (j.job_highlights ?? []).map((h: any) => ({
        title: h.title ?? '',
        items: h.items ?? [],
      })),
    } as Job;
  });
}

export async function fetchCompanyIntel(key: string, company: string): Promise<CompanyIntel> {
  const [newsData, webData] = await Promise.all([
    callSerpApi(key, { engine: 'google_news', q: `${company} company`, gl: 'in', hl: 'en' }).catch(() => null),
    callSerpApi(key, { engine: 'google', q: `${company} company about funding employees`, num: '5', gl: 'in', hl: 'en' }).catch(() => null),
  ]);

  const news = ((newsData?.news_results ?? []) as any[]).slice(0, 5).map((n) => ({
    title: n.title ?? '',
    url: n.link ?? '',
    date: n.date,
    source: n.source?.name,
  }));

  const webSnippets = ((webData?.organic_results ?? []) as any[])
    .slice(0, 5)
    .map((r) => `- ${r.title}: ${r.snippet}`)
    .join('\n');

  return {
    company,
    summary: '',
    news,
    fetchedAt: Date.now(),
    // summary is synthesized by Gemini in the agent layer; raw context:
    _webContext: webSnippets,
  } as CompanyIntel & { _webContext: string };
}
