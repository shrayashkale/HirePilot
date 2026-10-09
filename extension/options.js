/* HirePilot Autofill — options page: one-time key + profile setup.
   Everything is stored in chrome.storage.local — this browser only. */
const FIELDS = ['geminiKey', 'name', 'email', 'phone', 'location', 'title', 'yearsTotal', 'linkedin', 'skills', 'summary', 'experience', 'education'];
const $ = (id) => document.getElementById(id);

async function load() {
  const saved = await chrome.storage.local.get(['geminiKey', 'profile']);
  if (saved.geminiKey) $('geminiKey').value = saved.geminiKey;
  const p = saved.profile || {};
  for (const f of FIELDS) {
    if (f === 'geminiKey') continue;
    if (p[f] !== undefined) $(f).value = p[f];
  }
}

$('save').addEventListener('click', async () => {
  const profile = {};
  for (const f of FIELDS) {
    if (f === 'geminiKey') continue;
    profile[f] = $(f).value.trim();
  }
  // normalize a couple of fields for the brain
  if (profile.yearsTotal !== '') profile.yearsTotal = Number(profile.yearsTotal);
  profile.skills = profile.skills ? profile.skills.split(',').map((s) => s.trim()).filter(Boolean) : [];
  await chrome.storage.local.set({ geminiKey: $('geminiKey').value.trim(), profile });
  $('saved').textContent = '✓ Saved. Open any application page and hit ⚡ Autofill.';
  setTimeout(() => { $('saved').textContent = ''; }, 4000);
});

load();
