"""Seed the Hiring module with real recruitment data from the xlsx.

Idempotent: keyed off external_ref (= S.no from the sheet). Re-running
replaces values for unchanged rows and adds any new ones.

Reads .env.local for SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
Uses the Supabase PostgREST (v1 REST) with service-role auth so RLS is
bypassed and we can hit hq.* directly.
"""
from __future__ import annotations
import json
import os
import re
import sys
import time
from datetime import date, datetime
from pathlib import Path

import pandas as pd
import requests


ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / ".claude" / "Recrutiment.xlsx"


def load_env() -> dict[str, str]:
    envp = ROOT / ".env.local"
    env: dict[str, str] = {}
    for line in envp.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^([A-Z_][A-Z0-9_]*)=(.*)$", line)
        if m:
            env[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    return env


SOURCE_MAP = {
    "naukri": "Naukri Resdex",
    "naukri resdex": "Naukri Resdex",
    "naurki": "Naukri Resdex",
    "workindia": "Applied on Workindia",
    "applied on workindia": "Applied on Workindia",
    "internshala": "Internshala",
    "indeed": "Indeed",
    "email": "Email",
    "whatsapp": "WhatsApp",
    "poster": "Poster",
    "postor": "Poster",
    "referral": "Referral",
    "direct": "Direct",
    "instagram": "Instagram",
    "linkedin": "LinkedIn",
}


def normalise_source(raw: str | float | None) -> str:
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return "Other"
    return SOURCE_MAP.get(str(raw).strip().lower(), "Other")


def norm_text(v) -> str | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    return s or None


def norm_date(v) -> str | None:
    # pd.isna handles None, NaN, NaT uniformly. Wrap in try/except because
    # pd.isna raises on some object types.
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    if v is None:
        return None
    if isinstance(v, (pd.Timestamp, datetime, date)):
        ts = pd.Timestamp(v)
        if pd.isna(ts):
            return None
        return ts.date().isoformat()
    s = str(v).strip()
    if not s or s.lower() in ("nat", "nan", "none"):
        return None
    try:
        parsed = pd.to_datetime(s, dayfirst=False, errors="coerce")
        if pd.isna(parsed):
            return None
        return parsed.date().isoformat()
    except Exception:
        return None


def norm_int(v) -> int:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return 0
    try:
        return int(float(v))
    except Exception:
        return 0


def norm_phone(v) -> str | None:
    p = norm_text(v)
    if not p:
        return None
    # strip spaces; keep + and digits
    cleaned = re.sub(r"[^+\d]", "", p)
    return cleaned or None


def rpc(env: dict[str, str], fn: str, payload) -> any:
    """Call a public.* function via PostgREST RPC. We route through public
    because PostgREST's schema cache for hq tables is flaky after ALTER."""
    url = f"{env['SUPABASE_URL']}/rest/v1/rpc/{fn}"
    headers = {
        "apikey": env["SUPABASE_SERVICE_ROLE_KEY"],
        "Authorization": f"Bearer {env['SUPABASE_SERVICE_ROLE_KEY']}",
        "Content-Type": "application/json",
    }
    resp = requests.post(url, headers=headers, data=json.dumps(payload, default=str), timeout=120)
    if resp.status_code >= 300:
        raise RuntimeError(f"rpc/{fn} {resp.status_code}: {resp.text[:500]}")
    return resp.json() if resp.text else None


def post_rest(env, path, body, prefer=None):  # kept for compat; not used
    raise NotImplementedError("use rpc() instead")


def batched(rows: list[dict], size: int = 500):
    for i in range(0, len(rows), size):
        yield rows[i : i + size]


def seed_candidates(env, cands_df: pd.DataFrame) -> dict[str, str]:
    payload: list[dict] = []
    refs: list[str] = []
    for _, r in cands_df.iterrows():
        ext = f"cand-{int(r['S.no'])}"
        refs.append(ext)
        payload.append({
            "external_ref": ext,
            "name": norm_text(r.get("Name")) or "Unknown",
            "phone": norm_phone(r.get("Phone Number")),
            "email": None,
            "source": normalise_source(r.get("Source")),
            "applied_for": norm_text(r.get("Applied For")),
            "profile_url": norm_text(r.get("Profile URL")),
            "cv_url": norm_text(r.get("CV")),
            "stage": "applied",
            "last_activity_at": norm_date(r.get("Call Date")),
        })
    print(f"Upserting {len(payload)} candidates via RPC...")
    for chunk in batched(payload, 500):
        rpc(env, "seed_hq_candidates", {"payload": chunk})
    # Resolve ids
    id_map: dict[str, str] = {}
    for chunk in batched(refs, 500):
        rows = rpc(env, "hq_candidate_ids", {"refs": chunk}) or []
        for row in rows:
            id_map[row["external_ref"]] = row["id"]
    print(f"  [OK] {len(id_map)} ids resolved")
    return id_map


def seed_calls(env, cands_df: pd.DataFrame, id_map: dict[str, str]):
    """Each candidate row also encodes one call log — upsert into hq.candidate_calls."""
    payload: list[dict] = []
    for _, r in cands_df.iterrows():
        ext_cand = f"cand-{int(r['S.no'])}"
        cid = id_map.get(ext_cand)
        if not cid:
            continue
        called_at = norm_date(r.get("Call Date"))
        call_status = norm_text(r.get("Call Status"))
        if not called_at or not call_status:
            continue
        payload.append({
            "external_ref": f"call-{int(r['S.no'])}",
            "candidate_id": cid,
            "called_at": called_at,
            "call_status": call_status,
            "call_response": norm_text(r.get("Call Response")),
            "call_notes": norm_text(r.get("Call Notes")),
            "called_by": "Recruiter",
        })
    print(f"Upserting {len(payload)} call logs via RPC...")
    for chunk in batched(payload, 500):
        rpc(env, "seed_hq_candidate_calls", {"payload": chunk})
    print("  [OK] calls seeded")


def seed_assignments(env, sheet: pd.DataFrame, id_map: dict[str, str]):
    """Video-edit assignment sheet."""
    payload: list[dict] = []
    # these candidates may not be in the Candidates sheet; upsert a thin row for them
    cand_payload: list[dict] = []
    for _, r in sheet.iterrows():
        sno = r.get("S.no")
        if pd.isna(sno):
            continue
        ext = f"assign-cand-{int(sno)}"
        cand_payload.append({
            "external_ref": ext,
            "name": norm_text(r.get("Name")) or "Unknown",
            "phone": norm_phone(r.get("Number")),
            "email": norm_text(r.get("Email ID")),
            "source": "Other",
            "stage": "assessment",
            "applied_for": "Video Editor",
        })
    cid_map: dict[str, str] = {}
    if cand_payload:
        for chunk in batched(cand_payload, 500):
            rpc(env, "seed_hq_candidates", {"payload": chunk})
        refs = [c["external_ref"] for c in cand_payload]
        for chunk in batched(refs, 500):
            rows = rpc(env, "hq_candidate_ids", {"refs": chunk}) or []
            for row in rows:
                cid_map[row["external_ref"]] = row["id"]

    for _, r in sheet.iterrows():
        sno = r.get("S.no")
        if pd.isna(sno):
            continue
        cid = cid_map.get(f"assign-cand-{int(sno)}")
        if not cid:
            continue
        payload.append({
            "external_ref": f"assign-{int(sno)}",
            "candidate_id": cid,
            "assignment_type": "video_edit",
            "submission_url": norm_text(r.get("Assignment  Link")),
            "submission_date": norm_date(r.get("Rating")),  # odd: xlsx col is titled "Rating" but has dates
            "rating": None,
            "remarks": norm_text(r.get("Remarks")),
            "decision": "rejected" if "rejected" in (norm_text(r.get("Interview Scheduled")) or "").lower() else ("selected" if "selc" in (norm_text(r.get("Interview Scheduled")) or "").lower() else "pending"),
            "reviewed_by": "Admin",
        })
    print(f"Upserting {len(payload)} assignments via RPC...")
    for chunk in batched(payload, 200):
        rpc(env, "seed_hq_candidate_assignments", {"payload": chunk})
    print("  [OK] assignments seeded")


def seed_daily_reports(env, sheet: pd.DataFrame):
    """The 'Daily Reporting' sheet has a header row at index 0."""
    rows: list[dict] = []
    col_map = {
        "Daily Reporting": "report_date",
        "Unnamed: 1": "total_calls",
        "Unnamed: 2": "connected_calls",
        "Unnamed: 3": "interviews_scheduled",
        "Unnamed: 4": "interviews_tomorrow",
        "Unnamed: 5": "interviews_next_days",
        "Unnamed: 6": "interviews_taken",
        "Unnamed: 7": "selected",
        "Unnamed: 8": "onboarding_done",
        "Unnamed: 9": "job_postings",
        "Unnamed: 10": "other_tasks",
        "Unnamed: 11": "remarks",
    }
    for idx, r in sheet.iterrows():
        if idx == 0:  # xlsx header row
            continue
        rec = {dst: r.get(src) for src, dst in col_map.items()}
        d = norm_date(rec["report_date"])
        if not d:
            continue
        rows.append({
            "report_date": d,
            "recruiter": "HR",
            "total_calls": norm_int(rec["total_calls"]),
            "connected_calls": norm_int(rec["connected_calls"]),
            "interviews_scheduled": norm_int(rec["interviews_scheduled"]),
            "interviews_tomorrow": norm_int(rec["interviews_tomorrow"]),
            "interviews_next_days": norm_int(rec["interviews_next_days"]),
            "interviews_taken": norm_int(rec["interviews_taken"]),
            "selected": norm_int(rec["selected"]),
            "onboarding_done": norm_int(rec["onboarding_done"]),
            "job_postings": norm_int(rec["job_postings"]),
            "other_tasks": norm_text(rec["other_tasks"]),
            "remarks": norm_text(rec["remarks"]),
        })
    print(f"Upserting {len(rows)} daily reports via RPC...")
    for chunk in batched(rows, 200):
        rpc(env, "seed_hq_daily_reports", {"payload": chunk})
    print("  [OK] daily reports seeded")


def seed_issues(env, sheet: pd.DataFrame):
    rows: list[dict] = []
    for _, r in sheet.iterrows():
        t = norm_text(r.get("Issues for Rewari hiring"))
        if not t:
            continue
        rows.append({
            "title": t,
            "location": "Rewari",
            "status": "open",
        })
    if not rows:
        return
    print(f"Skipping {len(rows)} issues (non-idempotent path); run manually via SQL or the admin UI if needed.")


def main():
    env = load_env()
    if "SUPABASE_URL" not in env:
        env["SUPABASE_URL"] = env.get("NEXT_PUBLIC_SUPABASE_URL", "")
    if not env.get("SUPABASE_URL") or not env.get("SUPABASE_SERVICE_ROLE_KEY"):
        print("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local")
        sys.exit(1)
    sheets = pd.read_excel(XLSX, sheet_name=None)

    cands = sheets["Candidates"]
    cands = cands[cands["Name"].notna() & cands["S.no"].notna()].copy()

    id_map = seed_candidates(env, cands)
    seed_calls(env, cands, id_map)
    if "Submittion of Edited Video" in sheets:
        seed_assignments(env, sheets["Submittion of Edited Video"], id_map)
    seed_daily_reports(env, sheets["Daily Reporting"])
    seed_issues(env, sheets["Issues to be resolved"])
    print("\n[OK] Hiring seed complete.")


if __name__ == "__main__":
    main()
