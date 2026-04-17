"""Seed hq.employees + hq.departments from All Employee_s Record.xlsx.

Merges 8 messy sheets by employee name. Idempotent via UPSERT on full_name.
Reads .env.local for SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
"""
from __future__ import annotations
import json
import os
import re
import sys
from datetime import date
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / ".claude" / "All Employee_s Record.xlsx"


def load_env() -> dict[str, str]:
    envp = ROOT / ".env.local"
    env: dict[str, str] = {}
    for line in envp.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^([A-Z_][A-Z0-9_]*)=(.*)$", line)
        if m:
            env[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    return env


def norm_str(v) -> str | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    return s if s else None


def norm_phone(v) -> str | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    try:
        f = float(v)
        if pd.isna(f):
            return None
        return str(int(f))
    except Exception:
        s = re.sub(r"[^\d]", "", str(v))
        return s or None


def norm_date(v) -> str | None:
    if v is None:
        return None
    if isinstance(v, float) and pd.isna(v):
        return None
    try:
        if pd.isna(v):
            return None
    except Exception:
        pass
    if isinstance(v, (pd.Timestamp,)):
        return v.date().isoformat()
    try:
        return pd.to_datetime(v).date().isoformat()
    except Exception:
        return None


def norm_salary(v) -> float | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    try:
        return float(v)
    except Exception:
        return None


def normalise_name(s: str | None) -> str | None:
    if not s:
        return None
    return re.sub(r"\s+", " ", s).strip().title()


def normalise_type(raw: str | None) -> str:
    if not raw:
        return "FTE"
    r = raw.strip().lower()
    if "intern" in r:
        return "Intern"
    if "ops" in r or "operation" in r:
        return "FTE-Ops"
    if "contract" in r:
        return "Contract"
    if "fte" in r or "full" in r:
        return "FTE"
    return "FTE"


def normalise_dept(raw: str | None) -> str | None:
    if not raw:
        return None
    r = raw.strip().lower()
    mapping = {
        "operation": "Operations", "operations": "Operations", "ops": "Operations",
        "sales": "Sales", "hr": "HR", "accounts": "Accounts", "account": "Accounts",
        "finance": "Finance", "marketing": "Marketing", "imports": "Imports",
        "import": "Imports", "tech": "Tech", "it": "IT", "legal": "Legal",
        "director": "Leadership", "admin": "Admin", "support": "Support",
    }
    for k, v in mapping.items():
        if k in r:
            return v
    return raw.strip().title()


def rpc(url: str, key: str, fn: str, payload: dict) -> dict | str:
    r = requests.post(
        f"{url}/rest/v1/rpc/{fn}",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "params=single-object",
        },
        json=payload,
        timeout=30,
    )
    if not r.ok:
        return f"ERR {r.status_code}: {r.text[:200]}"
    try:
        return r.json()
    except Exception:
        return r.text


def main():
    env = load_env()
    url = env.get("SUPABASE_URL") or env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("[FAIL] missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); sys.exit(1)

    xf = pd.ExcelFile(XLSX)
    # ----- Core: "Details" (Gurgaon) + "RWR Employees" (Rewari)
    details = pd.read_excel(XLSX, sheet_name="Details")
    rwr     = pd.read_excel(XLSX, sheet_name="RWR Employees")
    details["_office"] = "Gurgaon"
    rwr["_office"]     = "Rewari"

    # Unify columns we care about
    rename = {
        "Candidate Name As Per Aadhar Cards": "full_name",
        "Father's Name As Per Aadhar Card":  "father_name",
        "Relation":                          "relation",
        "Date Of Birth":                     "dob",
        "Personal Contact No":               "phone",
        "Address As Per Aadhar Cards":       "aadhaar_address",
        "Status":                            "emp_type",     # "FTE" | "FTE/ Operations" | "Intern"
        " Status":                           "status",        # "Active" / blank
        "Salary":                            "salary_monthly",
        "PF If Any":                         "pf_applicable",
        "ESIC If Any":                       "esic_applicable",
        "Pan Card No":                       "pan_no",
        "Verified Bank Name":                "bank_name",
        "Verified Account No":               "bank_account",
        "Verified IFSC CODE":                "ifsc",
        "Date of Joining":                   "join_date",
    }
    details = details.rename(columns=rename)
    rwr     = rwr.rename(columns=rename)

    core = pd.concat([details, rwr], ignore_index=True, sort=False)

    # ----- Side tables by normalized name
    dept_map: dict[str, str] = {}
    ed = pd.read_excel(XLSX, sheet_name="Employees Details")
    for col_name, col_dept in [("Name", "Departement"), ("Name ", "Departement.1")]:
        if col_name in ed.columns and col_dept in ed.columns:
            for _, r in ed.iterrows():
                nm = normalise_name(norm_str(r.get(col_name)))
                dp = normalise_dept(norm_str(r.get(col_dept)))
                if nm and dp:
                    dept_map[nm] = dp

    # DOB sheet (partial, leadership + some employees)
    dob_map: dict[str, tuple[str | None, str | None]] = {}
    try:
        dobs = pd.read_excel(XLSX, sheet_name="Employees Date of Birth", header=1)
        for _, r in dobs.iterrows():
            nm = normalise_name(norm_str(r.get("Name")))
            if not nm: continue
            dob_map[nm] = (norm_date(r.get("Date of Birth")), normalise_dept(norm_str(r.get("Department"))))
    except Exception:
        pass

    # Office / personal phones from Rewari contact + Emp Contact Details
    office_phone_map: dict[str, str] = {}
    try:
        rc = pd.read_excel(XLSX, sheet_name="Rewari Office Emp Contact")
        for _, r in rc.iterrows():
            nm = normalise_name(norm_str(r.get("Employee Name")))
            op = norm_phone(r.get("Office Contact No"))
            if nm and op:
                office_phone_map[nm] = op
    except Exception:
        pass

    try:
        ec = pd.read_excel(XLSX, sheet_name="Emp Contact Details ", header=1)
        # columns: Sr. No / Name / Office / Department / Official Number / Personal Number
        for _, r in ec.iterrows():
            nm = normalise_name(norm_str(r.get("Name")))
            if not nm: continue
            off = norm_str(r.get("Office"))
            dept = normalise_dept(norm_str(r.get("Department")))
            off_phone = norm_phone(r.get("Official Number"))
            if dept: dept_map.setdefault(nm, dept)
            if off_phone and off_phone != "-": office_phone_map.setdefault(nm, off_phone)
    except Exception:
        pass

    # ----- Ensure departments exist
    all_depts = {d for d in dept_map.values() if d} | {"Leadership","Sales","Operations","HR","Accounts","Imports"}
    dept_id_map: dict[str, str] = {}
    for d in sorted(all_depts):
        res = rpc(url, key, "hq_upsert_department", {"p_name": d, "p_vertical": "hq"})
        if isinstance(res, str) and res.startswith("ERR"):
            print(f"[WARN] dept {d}: {res}")
        else:
            dept_id_map[d] = str(res).strip('"')
    print(f"[OK] departments: {len(dept_id_map)}")

    # ----- Build normalized employee payloads
    seen: set[str] = set()
    upserts: list[dict] = []
    for _, r in core.iterrows():
        nm = normalise_name(norm_str(r.get("full_name")))
        if not nm or nm in seen:
            continue
        seen.add(nm)

        dept_name = dept_map.get(nm)
        # fallback: derive from emp_type
        emp_type_raw = norm_str(r.get("emp_type"))
        if not dept_name:
            if emp_type_raw and "operation" in emp_type_raw.lower():
                dept_name = "Operations"

        dob_val = norm_date(r.get("dob")) or (dob_map.get(nm, (None,None))[0])

        # Leadership-only names from DOB sheet → upsert as employees too
        payload = {
            "full_name":       nm,
            "father_name":     norm_str(r.get("father_name")),
            "relation":        norm_str(r.get("relation")),
            "dob":             dob_val,
            "phone":           norm_phone(r.get("phone")),
            "aadhaar_address": norm_str(r.get("aadhaar_address")),
            "status":          "active" if (norm_str(r.get("status")) or "").lower().startswith("active") else "active",
            "employment_type": normalise_type(emp_type_raw),
            "pan_no":          norm_str(r.get("pan_no")),
            "bank_name":       norm_str(r.get("bank_name")),
            "bank_account":    norm_phone(r.get("bank_account")),
            "ifsc":            norm_str(r.get("ifsc")),
            "join_date":       norm_date(r.get("join_date")),
            "salary_monthly":  norm_salary(r.get("salary_monthly")),
            "pf_applicable":   bool(r.get("pf_applicable")) if pd.notna(r.get("pf_applicable")) else False,
            "esic_applicable": bool(r.get("esic_applicable")) if pd.notna(r.get("esic_applicable")) else False,
            "office":          r.get("_office"),
            "office_phone":    office_phone_map.get(nm),
            "department_id":   dept_id_map.get(dept_name) if dept_name else None,
            "role_title":      dept_name or "Staff",
            "vertical":        "hq",
        }
        upserts.append(payload)

    # Also add leadership from DOB sheet that isn't already in core
    for nm, (dob_v, dept_v) in dob_map.items():
        if nm in seen: continue
        seen.add(nm)
        dept_key = dept_v or "Leadership"
        upserts.append({
            "full_name":       nm,
            "dob":             dob_v,
            "department_id":   dept_id_map.get(dept_key),
            "role_title":      dept_v or "Director",
            "office":          "Gurgaon",
            "employment_type": "FTE",
            "status":          "active",
            "vertical":        "hq",
        })

    print(f"[INFO] upserting {len(upserts)} employees...")
    ok, fail = 0, 0
    for p in upserts:
        # drop None values — server uses COALESCE with existing
        clean = {k: v for k, v in p.items() if v is not None and v != ""}
        res = rpc(url, key, "hq_upsert_employee", {"p": clean})
        if isinstance(res, str) and res.startswith("ERR"):
            print(f"[FAIL] {p['full_name']}: {res}"); fail += 1
        else:
            ok += 1
    print(f"[DONE] ok={ok} fail={fail}")


if __name__ == "__main__":
    main()
