/* HirePilot Autofill — content script.
   Lives in every page. On command it:
     1. extracts every fillable field + its human-visible label,
     2. asks the background worker (Gemini) which resume detail goes where,
     3. fills the form — with React-aware value setting — and reports back.
   It NEVER clicks submit. */

'use strict';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function extractFields() {
  const fields = [];
  document.querySelectorAll('input, textarea, select').forEach((el, i) => {
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute('type') || (tag === 'select' ? 'select' : 'text')).toLowerCase();
    if (['hidden', 'submit', 'button', 'image'].includes(type)) return;
    if (el.disabled || el.readOnly) return;
    if (el.offsetParent === null && type !== 'file') return; // invisible

    const key = 'hp' + i;
    el.setAttribute('data-hp-key', key);

    let label = '';
    const id = el.id;
    if (id) {
      const lab = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (lab) label = lab.innerText.trim();
    }
    if (!label) {
      const wrap = el.closest('label');
      if (wrap) label = wrap.innerText.trim().slice(0, 120);
    }
    const aria = el.getAttribute('aria-label') || '';
    const placeholder = el.getAttribute('placeholder') || '';
    const name = el.getAttribute('name') || '';

    let context = '';
    if (!label && !aria && !placeholder) {
      let node = el.previousElementSibling, hops = 0;
      while (node && hops < 3) {
        const t = (node.innerText || '').trim();
        if (t && t.length < 200) { context = t.slice(0, 200); break; }
        node = node.previousElementSibling; hops++;
      }
    }

    let options = [];
    if (tag === 'select') {
      options = [...el.options].map((o) => o.text.trim()).filter(Boolean).slice(0, 60);
    } else if ((type === 'radio' || type === 'checkbox') && name) {
      if (fields.some((f) => f.name === name && f.type === type)) return; // group once
      const group = [...document.querySelectorAll(`input[type="${type}"][name="${CSS.escape(name)}"]`)];
      options = group.map((g) => {
        const gid = g.id;
        const lab = gid ? document.querySelector(`label[for="${CSS.escape(gid)}"]`) : g.closest('label');
        return ((lab ? lab.innerText.trim() : g.value) || '').slice(0, 120);
      }).filter(Boolean);
    }

    fields.push({
      key, tag, type, name, label, aria, placeholder, context, options,
      required: !!(el.required || el.getAttribute('aria-required') === 'true'),
    });
  });
  return fields;
}

function setNativeValue(el, value) {
  // React-controlled forms need the native setter + events, not el.value =
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function pickOption(selectEl, value) {
  const want = value.trim().toLowerCase();
  const opts = [...selectEl.options];
  let hit = opts.find((o) => o.text.trim().toLowerCase() === want)
    || opts.find((o) => { const t = o.text.trim().toLowerCase(); return t && (want.includes(t) || t.includes(want)); });
  if (!hit) return false;
  selectEl.value = hit.value;
  selectEl.dispatchEvent(new Event('input', { bubbles: true }));
  selectEl.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function pickRadio(field, value) {
  const want = value.trim().toLowerCase();
  if (!field.name) return false;
  const group = [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(field.name)}"]`)];
  for (const g of group) {
    const gid = g.id;
    const labEl = gid ? document.querySelector(`label[for="${CSS.escape(gid)}"]`) : g.closest('label');
    const cand = ((labEl ? labEl.innerText.trim() : g.value) || '').toLowerCase();
    if (cand && (cand === want || want.includes(cand) || cand.includes(want))) {
      g.scrollIntoView({ block: 'center' });
      if (!g.checked) g.click();
      return true;
    }
  }
  return false;
}

function fieldLabel(f) {
  return f.label || f.aria || f.placeholder || f.context || f.name || f.key;
}

async function fillField(field, value) {
  const el = document.querySelector(`[data-hp-key="${field.key}"]`);
  if (!el) return 'gone';
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  await sleep(120);

  const { tag, type } = field;

  if (type === 'file') return 'manual'; // browser won't let scripts set local files

  if (tag === 'select') return pickOption(el, value) ? 'filled' : 'manual';
  if (type === 'radio') return pickRadio(field, value) ? 'filled' : 'manual';

  if (type === 'checkbox') {
    if (['yes', 'true', '1', 'agree', 'checked'].includes(value.trim().toLowerCase())) {
      if (!el.checked) el.click();
      return 'filled';
    }
    return 'skipped';
  }

  try {
    el.focus();
    setNativeValue(el, '');
    // type in small bursts — human cadence, wakes up framework bindings
    for (let i = 0; i < value.length; i += 14) {
      setNativeValue(el, value.slice(0, i + 14));
      await sleep(25);
    }
    setNativeValue(el, value);
    el.blur();
    return 'filled';
  } catch {
    return 'manual';
  }
}

function toast(html, ms = 6000) {
  const old = document.getElementById('hp-toast');
  if (old) old.remove();
  const d = document.createElement('div');
  d.id = 'hp-toast';
  d.innerHTML = html;
  Object.assign(d.style, {
    position: 'fixed', bottom: '24px', right: '24px', zIndex: 2147483647,
    background: '#0f172a', color: '#e2e8f0', border: '1px solid #22d3ee55',
    borderRadius: '14px', padding: '14px 18px', fontSize: '13px',
    fontFamily: 'system-ui, sans-serif', maxWidth: '340px',
    boxShadow: '0 8px 32px rgba(0,0,0,.5)',
  });
  document.body.appendChild(d);
  setTimeout(() => d.remove(), ms);
}

async function autofill() {
  try {
    const { config } = await chrome.runtime.sendMessage({ action: 'getConfig' });
    if (!config?.geminiKey) {
      toast('⚙️ Add your Gemini key first — click the HirePilot icon → Setup.');
      return { ok: false, error: 'no-key' };
    }
    if (!config?.profile?.name && !config?.profile?.email) {
      toast('⚙️ Fill your profile first — click the HirePilot icon → Setup.');
      return { ok: false, error: 'no-profile' };
    }

    toast('🤖 HirePilot is reading this form…');
    const fields = extractFields();
    if (!fields.length) {
      // maybe the form hides behind an Apply button — try one reveal click
      const btn = [...document.querySelectorAll('button, a')]
        .find((b) => /^\s*apply(\s*now)?\s*$/i.test(b.textContent || '') && b.offsetParent !== null);
      if (btn) {
        btn.click();
        await sleep(1800);
        const retry = extractFields();
        if (!retry.length) {
          toast('⚠️ No application form found on this page.');
          return { ok: false, error: 'no-form' };
        }
        return autofillWith(retry, config);
      }
      toast('⚠️ No application form found on this page.');
      return { ok: false, error: 'no-form' };
    }
    return autofillWith(fields, config);
  } catch (e) {
    toast('⚠️ HirePilot hit a snag: ' + String(e?.message || e).slice(0, 120));
    return { ok: false, error: String(e?.message || e) };
  }
}

async function autofillWith(fields, config) {
  toast(`🤖 Mapping ${fields.length} fields to your resume…`);
  const res = await chrome.runtime.sendMessage({
    action: 'mapFields', apiKey: config.geminiKey, fields, profile: config.profile,
  });
  if (!res?.ok) {
    toast('⚠️ Brain failed: ' + String(res?.error || 'unknown').slice(0, 120));
    return { ok: false, error: res?.error };
  }
  const mapping = res.mapping || {};
  let filled = 0;
  const left = [];
  for (const f of fields) {
    const label = fieldLabel(f);
    if (f.type === 'file') { left.push(label + ' (upload your resume)'); continue; }
    if (mapping[f.key] !== undefined) {
      const out = await fillField(f, mapping[f.key]);
      if (out === 'filled') filled++;
      else left.push(label);
      await sleep(180);
    } else {
      left.push(label);
    }
  }
  const leftHtml = left.length
    ? `<div style="margin-top:8px;color:#fbbf24">Check: ${left.slice(0, 6).map((l) => escapeHtml(l)).join(' · ')}${left.length > 6 ? ` (+${left.length - 6} more)` : ''}</div>`
    : '<div style="margin-top:8px;color:#34d399">All mapped fields filled ✓</div>';
  toast(`<b>✅ HirePilot filled ${filled}/${fields.length} fields.</b>${leftHtml}<div style="margin-top:8px;color:#94a3b8">Review the form — <b>you</b> click submit. I never do.</div>`, 9000);
  return { ok: true, filled, total: fields.length, left };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.action === 'autofill') {
    autofill().then((r) => sendResponse(r));
    return true;
  }
});
