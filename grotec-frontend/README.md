# GROTEC FarmerOS - Frontend (TypeScript, wired to real backend)

Real React + TypeScript app, typed against the backend's Pydantic schemas.
No dummy data — every screen calls the FastAPI backend via `fetch`.

## How this connects (important)

This artifact runs **in your browser**, not on Anthropic's servers. For it to
reach the backend, the backend must be reachable from wherever your browser
opens this artifact. The simplest setup:

1. Run the backend on your own machine:
   ```bash
   cd grotec-backend
   pip install -r requirements.txt
   python3 seed.py
   uvicorn app.main:app --reload
   ```
2. Open this artifact in a browser on the **same machine** — your browser's
   `fetch` to `http://localhost:8000` reaches your own local backend (CORS is
   already open on the backend for this).
3. To test from a different device, deploy the backend somewhere reachable
   and set that URL in "API endpoint settings" on the login screen.

## Why TypeScript

The types in this file (`LoginResponse`, `CustomerOut`, `CallOut`,
`CallCreatePayload`, etc.) mirror the backend's Pydantic schemas
(`app/schemas.py`) and enums (`app/models.py`) field-for-field. Verified with
`tsc --noEmit --strict` — zero type errors. If the backend's contract changes
(a field renamed, an enum value added), this now surfaces as a compile error
here instead of a silent runtime bug (e.g. `undefined` rendering as blank text).

## Demo accounts (from `seed.py`)

| username | password    | role       |
|----------|-------------|------------|
| priya    | priya123    | telecaller |
| arun     | arun123     | manager    |
| karthik  | karthik123  | founder    |

## What's wired up

- **Login** — real JWT auth against `/auth/login`
- **Agent Workspace** (PRD's #1 priority) — search customers, view history +
  knowledge base suggestions, record a call outcome:
  - Interested → Callback (date/time) or Sales (pick RM, transfers ownership)
  - Not interested / Not answered — single click
- **Customers** — full list from `/customers`
- **My callbacks** — pending callbacks from `/agents/{id}/callbacks`
- **Employees** — HRMS employee picker, shared by Payroll and Attendance
- **Payroll** (founder/manager/staff) — version history for the selected
  employee, plus a form to save a new revision. Every revision is its own
  row — nothing is overwritten, verified against the backend
- **Attendance** (founder/manager/staff) — HRMS system-of-record view for the
  selected employee
- **Audit log** — visible only to the founder role (sidebar hides it for
  everyone else, and the backend also enforces this with a 403)

## Known gaps
- Token is kept in memory only (no localStorage, per artifact sandbox rules) —
  refreshing the page logs you out. Fine for a demo, not for real usage.
- Leave management has backend endpoints (`/leave-requests`, `/leave-types`)
  but no UI screen yet.
