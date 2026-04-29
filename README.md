# FixedIncome

A bond portfolio management app built with Django REST Framework + React 19, containerised with Docker Compose.

Built as a **BSc thesis project** — not production-ready, but goes well beyond a tutorial. It applies real patterns (JWT auth, role-based permissions, server-side filtering, streaming exports, CI pipelines) in a domain that's usually locked behind expensive enterprise tools.

**Who it's for:** finance students, junior developers learning full-stack Django + React, or anyone curious how a structured fixed-income data model translates into a working web app.

**Features at a glance:** bond & issuer catalogue · buy/sell transaction log · portfolio analytics charts (bond type, credit rating, industry, maturity buckets) · US Treasury yield curve + 10Y−2Y spread dashboard · CSV import with preview & conflict detection · streaming CSV export · role-based access (Admin / Editor / Viewer) · structured logging

---

---

## Stack

| | |
|---|---|
| **Backend** | Django 5.2, Django REST Framework, SimpleJWT, django-filter, psycopg2 |
| **Frontend** | React 19, Vite, Material UI v7, Material React Table, Recharts, React Hook Form + Yup |
| **Database** | PostgreSQL 16 |
| **Auth** | JWT — 30 min access token, 7 day refresh, role-based permissions (Admin / Editor / Viewer) |
| **External API** | Alpha Vantage `TREASURY_YIELD` — fetches 2Y / 10Y / 30Y monthly yields |
| **CI** | Azure Pipelines (code quality + build) |
| **Tests** | Django `TestCase` + DRF `APIClient` · Vitest + React Testing Library |
| **Containers** | Docker Compose — `db`, `backend`, `frontend` services |

---

## Architecture

```
React SPA (Vite)  ──►  Django REST API  ──►  PostgreSQL
                              │
                              └──►  Alpha Vantage API (on-demand sync)
```

- **Permissions** are DRF `BasePermission` subclasses that read `UserProfile.role` — no inline `if` checks in views
- **Filtering / ordering / search** handled by `django-filter` + DRF backends; all server-side
- **CSV export** uses Django `StreamingHttpResponse` + a row generator so large exports never load into memory
- **Treasury sync** upserts via `update_or_create` keyed on `(observation_date, maturity, interval)` — safe to re-run
- **Logging** enriches every record with `user_id` and `user_name` via a custom `logging.Filter`; writes to a rotating file (10 MB × 5)

---

## Run locally

```bash
git clone <repo-url> && cd FixedIncome
docker compose up --build
# frontend → http://localhost:5173
# API      → http://localhost:8000
docker compose exec backend python manage.py createsuperuser
```

## Useful commands

```bash
docker compose exec backend python manage.py test          # backend tests
docker compose exec frontend npm run test                  # frontend tests
docker compose exec backend python manage.py sync_treasury_yields
docker compose down -v                                     # wipe DB volume
```
