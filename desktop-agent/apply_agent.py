#!/usr/bin/env python3
"""
HirePilot desktop agent — the hands.

Reads an apply pack exported from HirePilot (jobs you selected + your resume),
opens each application page in YOUR OWN Chrome (so you're already logged in),
reads each form it has never seen before, fills it from your resume using the
Gemini field-mapper, screenshots the result, and LEAVES THE TAB OPEN.

It never clicks submit. You review every tab and fire the submit yourself.

Usage:
    pip install -r requirements.txt
    python apply_agent.py --pack hirepilot-apply-pack.json --resume-pdf ~/resume.pdf

    # optional:
    python apply_agent.py --pack pack.json --profile-dir "/custom/chrome/profile/path"

The Gemini key is read from HIREPILOT_GEMINI_KEY or asked interactively
(never written to disk).
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import platform
import random
import re
import sys
import time
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

from field_mapper import extract_fields, map_fields

# ---------------------------------------------------------------------------
# Safety: the agent fills forms. It NEVER performs a submission.
# ---------------------------------------------------------------------------
SUBMIT_RE = re.compile(
    r"submit|apply\s*now|send\s*application|confirm\s*application|finish\s*apply",
    re.I,
)
REVEAL_RE = re.compile(r"^\s*apply(\s*now)?\s*$", re.I)

REVIEW_LINES: list[str] = []


def log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def pause(a: float = 0.3, b: float = 0.9) -> None:
    time.sleep(random.uniform(a, b))


# ---------------------------------------------------------------------------
# Chrome profile: use the user's REAL profile so logins persist.
# ---------------------------------------------------------------------------

def default_profile_dir() -> str | None:
    home = os.path.expanduser("~")
    sysname = platform.system()
    candidates = []
    if sysname == "Windows":
        base = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Google", "Chrome", "User Data")
        candidates = [base]
    elif sysname == "Darwin":
        candidates = [os.path.join(home, "Library", "Application Support", "Google", "Chrome")]
    else:
        candidates = [
            os.path.join(home, ".config", "google-chrome"),
            os.path.join(home, ".config", "chromium"),
        ]
    for c in candidates:
        if c and os.path.isdir(c):
            return c
    return None


def launch_chrome(profile_dir: str):
    opts = Options()
    opts.add_argument(f"--user-data-dir={profile_dir}")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)
    # keep the window visible — the user watches the agent work
    try:
        driver = webdriver.Chrome(options=opts)
    except Exception as e:
        msg = str(e)
        if "already in use" in msg or "DevToolsActivePort" in msg or "user data directory" in msg:
            log("Chrome profile is locked — please CLOSE Chrome completely, then re-run.")
            sys.exit(2)
        raise
    driver.execute_script(
        "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    )
    return driver


# ---------------------------------------------------------------------------
# Page helpers
# ---------------------------------------------------------------------------

def looks_like_login(driver) -> bool:
    try:
        pw = driver.find_elements(By.CSS_SELECTOR, 'input[type="password"]')
        return len(pw) > 0 and len(extract_fields(driver)) <= 3
    except Exception:
        return False


def has_captcha(driver) -> bool:
    try:
        src = driver.page_source.lower()
        return "g-recaptcha" in src or "hcaptcha" in src or "cf-turnstile" in src
    except Exception:
        return False


def click_reveal_apply(driver) -> bool:
    """If the page is a job description with an Apply button, click it once
    to REVEAL the form. Never used after a form is visible."""
    try:
        for el in driver.find_elements(By.XPATH, "//button | //a"):
            try:
                if not el.is_displayed():
                    continue
                if REVEAL_RE.match((el.text or "")):
                    log("    revealing the application form…")
                    el.click()
                    pause(1.2, 2.0)
                    return True
            except Exception:
                continue
    except Exception:
        pass
    return False


def fill_field(driver, field: dict, value: str, resume_pdf: str | None) -> str:
    """Fill one field. Returns 'filled' | 'skipped' | 'manual'."""
    key = field["key"]
    el = driver.find_element(By.CSS_SELECTOR, f'[data-hp-key="{key}"]')
    driver.execute_script("arguments[0].scrollIntoView({block:'center'})", el)
    pause(0.15, 0.4)
    tag, ftype = field["tag"], field["type"]

    # resume file upload — handled by the agent itself, not Gemini
    if ftype == "file":
        if resume_pdf and os.path.isfile(resume_pdf):
            el.send_keys(os.path.abspath(resume_pdf))
            return "filled"
        return "manual"

    if tag == "select":
        return select_option(el, value)

    if ftype == "radio":
        return pick_radio(driver, field, value)

    if ftype == "checkbox":
        # only tick when the mapping explicitly says yes — conservative
        if value.strip().lower() in ("yes", "true", "1", "agree", "checked"):
            if not el.is_selected():
                el.click()
            return "filled"
        return "skipped"

    # text-like inputs and textareas
    try:
        el.click()
        el.clear()
        # type in chunks — reads as human, triggers framework bindings
        for i in range(0, len(value), 12):
            el.send_keys(value[i:i + 12])
            time.sleep(random.uniform(0.02, 0.08))
        pause(0.1, 0.3)
        return "filled"
    except Exception:
        # fallback: set via JS + dispatch events (React-controlled forms)
        try:
            driver.execute_script(
                """
                const el = arguments[0], v = arguments[1];
                const setter = Object.getOwnPropertyDescriptor(
                    el.__proto__, 'value')?.set
                    || Object.getOwnPropertyDescriptor(
                        HTMLInputElement.prototype, 'value')?.set;
                // native setter path for React
                const proto = el.tagName === 'TEXTAREA'
                    ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
                Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
                el.dispatchEvent(new Event('input', {bubbles: true}));
                el.dispatchEvent(new Event('change', {bubbles: true}));
                """,
                el, value,
            )
            return "filled"
        except Exception:
            return "manual"


def pick_radio(driver, field: dict, value: str) -> str:
    """Click the radio in the group whose label best matches the mapped value."""
    want = value.strip().lower()
    name = field.get("name", "")
    if not name:
        return "manual"
    try:
        group = driver.find_elements(By.CSS_SELECTOR, f'input[type="radio"][name="{name}"]')
    except Exception:
        return "manual"
    best = None
    for g in group:
        try:
            gid = g.get_attribute("id") or ""
            lab = ""
            if gid:
                lab_el = driver.find_elements(By.CSS_SELECTOR, f'label[for="{gid}"]')
                lab = lab_el[0].text.strip() if lab_el else ""
            if not lab:
                try:
                    lab = driver.execute_script(
                        "const l = arguments[0].closest('label'); return l ? l.innerText : '';", g
                    ).strip()
                except Exception:
                    pass
            cand = (lab or g.get_attribute("value") or "").strip().lower()
            if cand and (cand == want or want in cand or cand in want):
                best = g
                break
        except Exception:
            continue
    if best is None:
        return "manual"
    try:
        driver.execute_script("arguments[0].scrollIntoView({block:'center'})", best)
        pause(0.1, 0.3)
        if not best.is_selected():
            best.click()
        return "filled"
    except Exception:
        return "manual"


def select_option(el, value: str) -> str:
    from selenium.webdriver.support.ui import Select

    try:
        sel = Select(el)
    except Exception:
        return "manual"
    want = value.strip().lower()
    # exact visible-text match first
    for opt in sel.options:
        if opt.text.strip().lower() == want:
            sel.select_by_visible_text(opt.text)
            return "filled"
    # then substring match
    for opt in sel.options:
        t = opt.text.strip().lower()
        if t and (want in t or t in want):
            sel.select_by_visible_text(opt.text)
            return "filled"
    return "manual"


# ---------------------------------------------------------------------------
# Per-job run
# ---------------------------------------------------------------------------

def run_job(driver, job: dict, profile: dict, gemini_key: str,
            resume_pdf: str | None, out_dir: str, index: int, total: int) -> dict:
    title = f"{job.get('title', '?')} @ {job.get('company', '?')}"
    url = job.get("applyUrl", "")
    log(f"── job {index}/{total}: {title}")
    result = {"title": title, "url": url, "status": "failed",
              "filled": 0, "left_blank": [], "note": ""}

    if not url:
        result["note"] = "no application URL"
        return result

    driver.switch_to.new_window("tab")
    pause(0.5, 1.0)
    driver.get(url)
    pause(2.0, 3.0)

    if looks_like_login(driver):
        log("    🔑 login wall — log in inside THIS tab, then press Enter here.")
        input("    press Enter when logged in… ")
        pause(1.5, 2.5)

    fields = extract_fields(driver)
    if not fields and click_reveal_apply(driver):
        fields = extract_fields(driver)

    if has_captcha(driver):
        result["note"] = "CAPTCHA present — solve it in the tab during review"
        log("    ⚠ CAPTCHA detected — you'll solve it while reviewing.")

    if not fields:
        result["note"] = "no fillable form found (custom portal?)"
        log("    ⚠ no form detected — tab left open for manual apply.")
        REVIEW_LINES.append(f"- {title}: NO FORM FOUND — apply manually: {url}")
        return result

    log(f"    form detected: {len(fields)} fields — asking the brain where things go…")
    try:
        mapping = map_fields(gemini_key, fields, profile, job.get("coverLetter", ""))
    except Exception as e:
        result["note"] = f"field-mapping failed: {e}"
        log(f"    ⚠ mapping failed ({e}) — tab left open.")
        return result

    by_key = {f["key"]: f for f in fields}
    filled, left = 0, []
    for f in fields:
        label = f.get("label") or f.get("aria") or f.get("placeholder") or f.get("name") or f["key"]
        if f["key"] in mapping:
            outcome = fill_field(driver, f, mapping[f["key"]], resume_pdf)
            if outcome == "filled":
                filled += 1
            else:
                left.append(label)
            pause(0.2, 0.6)
        else:
            # file inputs still get the resume even without a Gemini mapping
            if f["type"] == "file":
                outcome = fill_field(driver, f, "", resume_pdf)
                if outcome == "filled":
                    filled += 1
                else:
                    left.append(label + " (resume upload)")
            else:
                left.append(label)

    shot = os.path.join(out_dir, f"job-{index:02d}.png")
    try:
        driver.save_screenshot(shot)
    except Exception:
        shot = "(screenshot failed)"

    result.update(status="filled" if filled else "manual",
                  filled=filled, left_blank=left,
                  note=f"screenshot: {shot}")
    log(f"    ✓ filled {filled}/{len(fields)} fields" +
        (f" — left for you: {', '.join(left)}" if left else ""))
    REVIEW_LINES.append(
        f"- {title}: filled {filled}/{len(fields)}"
        + (f"; CHECK: {', '.join(left)}" if left else "; all mapped fields filled")
        + f" → {url}"
    )
    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    ap = argparse.ArgumentParser(description="HirePilot desktop apply agent")
    ap.add_argument("--pack", required=True, help="apply pack JSON exported from HirePilot")
    ap.add_argument("--resume-pdf", default=None, help="path to your resume PDF (for upload fields)")
    ap.add_argument("--profile-dir", default=None, help="Chrome user-data dir (auto-detected if omitted)")
    ap.add_argument("--gemini-key", default=None, help="Gemini API key (or HIREPILOT_GEMINI_KEY env, or prompt)")
    args = ap.parse_args()

    with open(args.pack, encoding="utf-8") as fh:
        pack = json.load(fh)
    jobs = pack.get("jobs", [])
    profile = pack.get("resume", {})
    if not jobs:
        log("apply pack has no jobs — nothing to do.")
        return

    gemini_key = (args.gemini_key or os.environ.get("HIREPILOT_GEMINI_KEY")
                  or getpass.getpass("Gemini API key (not stored): ").strip())
    if not gemini_key:
        log("no Gemini key — aborting.")
        return

    profile_dir = args.profile_dir or default_profile_dir()
    if not profile_dir:
        log("could not find your Chrome profile — pass --profile-dir explicitly.")
        return

    resume_pdf = args.resume_pdf
    if resume_pdf and not os.path.isfile(resume_pdf):
        log(f"warning: resume PDF not found: {resume_pdf} (upload fields will be left blank)")
        resume_pdf = None

    out_dir = os.path.join(os.getcwd(), "hirepilot-proof")
    os.makedirs(out_dir, exist_ok=True)

    log(f"HirePilot agent engaged — {len(jobs)} application(s)")
    log(f"Chrome profile: {profile_dir}")
    log("SAFETY: I fill forms. I never click submit. Every tab stays open for you.\n")

    driver = launch_chrome(profile_dir)
    results = []
    try:
        for i, job in enumerate(jobs, 1):
            try:
                results.append(run_job(driver, job, profile, gemini_key,
                                       resume_pdf, out_dir, i, len(jobs)))
            except Exception as e:
                log(f"    ⚠ error on this job: {e} — tab left open, moving on.")
                results.append({"title": job.get("title", "?"), "status": "error",
                                "note": str(e)})
            pause(1.0, 2.0)
    finally:
        pass  # browser stays open — the user reviews the tabs

    report = os.path.join(os.getcwd(), "REVIEW_CHECKLIST.md")
    with open(report, "w", encoding="utf-8") as fh:
        fh.write("# HirePilot — review checklist\n\n")
        fh.write("The agent filled what it could. **Review every tab, then YOU click submit.**\n\n")
        fh.write("\n".join(REVIEW_LINES) + "\n")

    log("\n══ DONE ══════════════════════════════════════")
    ok = sum(1 for r in results if r["status"] == "filled")
    log(f"filled: {ok}/{len(results)} · screenshots: {out_dir} · checklist: {report}")
    log("Now walk the open tabs, verify each form, and hit submit where it's right.")
    log("(The browser stays open. Close it when you're done.)")


if __name__ == "__main__":
    main()
