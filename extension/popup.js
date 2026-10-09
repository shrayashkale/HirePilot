/* HirePilot Autofill — popup logic */
const $ = (id) => document.getElementById(id);

async function refresh() {
  const { geminiKey, profile } = await chrome.storage.local.get(['geminiKey', 'profile']);
  const st = $('status');
  if (!geminiKey) {
    st.innerHTML = '<span class="warn">⚠️ No Gemini key yet — open Setup.</span>';
  } else if (!profile?.email && !profile?.name) {
    st.innerHTML = '<span class="warn">⚠️ Profile empty — open Setup.</span>';
  } else {
    st.innerHTML = `<span class="ok">✓ Ready${profile.name ? ' — ' + escapeHtml(profile.name) : ''}</span>`;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

$('setup').addEventListener('click', () => chrome.runtime.openOptionsPage());

$('fill').addEventListener('click', async () => {
  const btn = $('fill');
  const st = $('status');
  btn.disabled = true;
  st.textContent = '🤖 Working… watch the page.';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('no active tab');
    const res = await chrome.tabs.sendMessage(tab.id, { action: 'autofill' });
    if (res?.ok) {
      st.innerHTML = `<span class="ok">✓ Filled ${res.filled}/${res.total}. Review the form — you submit.</span>`;
    } else if (res?.error === 'no-key' || res?.error === 'no-profile') {
      st.innerHTML = '<span class="warn">⚠️ Open Setup first.</span>';
    } else if (res?.error === 'no-form') {
      st.innerHTML = '<span class="warn">⚠️ No application form on this page.</span>';
    } else {
      st.innerHTML = `<span class="warn">⚠️ ${escapeHtml(String(res?.error || 'failed')).slice(0, 100)}</span>`;
    }
  } catch (e) {
    st.innerHTML = `<span class="warn">⚠️ ${escapeHtml(String(e?.message || e)).slice(0, 100)}</span>`;
  }
  btn.disabled = false;
});

refresh();
