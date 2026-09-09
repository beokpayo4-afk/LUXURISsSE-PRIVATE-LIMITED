# LUXURISSE PRIVATE LIMITED — Tour & Travels Platform

Full-stack foundation for a professional travel platform.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (JavaScript), Vite, React Router, Axios, React Hook Form, Tailwind CSS, Recharts |
| Backend | FastAPI, SQLAlchemy 2.x, Pydantic, Alembic, PostgreSQL |
| Auth | JWT Bearer tokens, role-based access (`customer`, `admin`, `staff`) |

## Verified company details (do not invent others)

- **Address:** Shop No-4, Telghani Naka, Kamal Super Bazar, Raipur Ganj, Raipur, Chhattisgarh - 492009
- **Email:** pvtltdluxruisses@gmail.com
- **Phone:** 9294744219
- **Managing Director:** Lucky Nirmalkar
- **Director:** Ajay Tarak

Do not invent GSTIN, CIN, PAN, package prices, destinations, awards, or customer counts.

## Project structure

```
frontend/     React + Vite app (public site, customer dashboard, admin console)
backend/      FastAPI API + Alembic migrations + tests
```

## Setup — Backend

```bash
cd backend
python -m venv .venv
# Windows Git Bash:
source .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET_KEY (not CHANGE_ME placeholders)
```

Create the PostgreSQL database, then:

```bash
alembic upgrade head
# Optional — seed verified company settings (+ admin if ADMIN_BOOTSTRAP_PASSWORD is set):
set ADMIN_BOOTSTRAP_PASSWORD=your-strong-password   # Windows cmd
# export ADMIN_BOOTSTRAP_PASSWORD=...               # bash
python -m scripts.seed
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs  
Health: http://localhost:8000/api/v1/health

## Setup — Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App: http://localhost:5173

## Checks

```bash
# Frontend
cd frontend && npm run lint && npm run build

# Backend
cd backend && source .venv/Scripts/activate && pytest -q
```

## Foundation modules (API under `/api/v1`)

Auth, users, destinations, tours, bookings, enquiries, quotations, payments, hotels, transport, offers, reviews, blog, settings, reports.

## Admin panel

Staff roles (`super_admin`, `admin`, `manager`, `staff`) can open `/admin` after login.

- Live dashboard cards + charts from `GET /api/v1/reports/dashboard` (zeros when empty — no fake stats)
- Module list pages for sidebar sections, with search, pagination, loading/empty/error states, confirm dialogs, and toasts

## Deploy — Render (backend)

Render fails if the API binds only to localhost. This project starts with:

```bash
python main.py
```

That always uses `0.0.0.0` and Render’s `$PORT`.

### Dashboard settings

| Setting | Value |
|--------|--------|
| **Root Directory** | `backend` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `python main.py` |

Overwrite any old start command such as `uvicorn …` without `--host 0.0.0.0`.

Set env vars from `backend/.env.example` (`DATABASE_URL`, `JWT_SECRET_KEY`, `CORS_ORIGINS` with your frontend URL, etc.).
