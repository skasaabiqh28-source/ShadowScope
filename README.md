# ShadowScopeAI — AI Security Testing Platform

> A modern web-based application security testing platform built around the
> open-source **Strix** penetration-testing engine, with AI-powered analysis
> via Gemini and Ollama.

![Python 3.13+](https://img.shields.io/badge/Python-3.13+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green)
![React 18](https://img.shields.io/badge/React-18-61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC)

---

## Features

| Feature | Description |
|---------|-------------|
| **Scan Orchestration** | Launch Strix scans against local projects or GitHub repos |
| **Real-time Monitoring** | Live terminal log viewer with auto-scroll |
| **Finding Management** | Filter, triage, and annotate security findings |
| **Attack Path Visualization** | 3-stage attack path graph (entry → vuln → endpoint) |
| **API Security** | Upload OpenAPI/Swagger specs for endpoint risk analysis |
| **Scan Comparison** | Diff two scans to see new, resolved, and persistent findings |
| **AI Assistant** | Chat with Gemini/Ollama grounded on your scan data |
| **Report Generation** | Export HTML, PDF, or JSON reports |
| **Training Labs** | Pre-configured labs (OWASP Juice Shop, BOLA API, WhiteBox) |
| **LLM Failover** | Automatic Gemini → Ollama fallback with cooldown timer |

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.13+ | With pip |
| Node.js | 18+ | With npm |
| Strix CLI | 1.6+ | `pip install strix-agent` |
| Docker | 24+ | Required by Strix sandbox |
| Git | 2.40+ | For GitHub repo scanning |

---

## Quick Start

### 1. Clone & Install

```powershell
git clone <your-repo-url> ShadowScopeAI
cd ShadowScopeAI

# Backend dependencies (already installed with strix-agent)
pip install fastapi uvicorn[standard] sqlalchemy aiosqlite httpx pyyaml reportlab python-multipart

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure

```powershell
copy .env.example .env
# Edit .env with your settings (or leave defaults — picks up Strix config automatically)
```

### 3. Run

**Option A — Scripts:**
```powershell
# Terminal 1: Backend
.\scripts\start-backend.ps1

# Terminal 2: Frontend
.\scripts\start-frontend.ps1
```

**Option B — Manual:**
```powershell
# Terminal 1: Backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 4. Open

Navigate to **http://localhost:5173** in your browser.

---

## Project Structure

```
ShadowScopeAI/
├── backend/
│   ├── api/              # FastAPI route handlers (10 routers)
│   ├── core/             # Configuration, logging, input validation
│   ├── database/         # SQLAlchemy models & async connection
│   ├── integrations/
│   │   ├── llm/          # Gemini + Ollama clients, provider manager
│   │   └── strix/        # Runner, parser, adapter, models
│   ├── reports/          # HTML/PDF/JSON report generator
│   ├── schemas/          # Pydantic request/response schemas
│   ├── tests/            # Pytest async test suite
│   └── main.py           # FastAPI app with lifespan
├── frontend/
│   ├── src/
│   │   ├── components/   # Sidebar, Header, badges
│   │   ├── pages/        # 12 page components
│   │   ├── services/     # Centralized API client
│   │   └── types/        # TypeScript interfaces
│   └── ...               # Vite + Tailwind config
├── scripts/              # PowerShell launchers
├── strix_runs/           # Scan output directory (gitignored)
├── reports/              # Generated reports (gitignored)
├── .env.example          # Environment variable template
├── .gitignore
├── pytest.ini
└── README.md
```

---

## API Endpoints

| Group | Prefix | Key Endpoints |
|-------|--------|---------------|
| Health | `/` | `GET /health` |
| Dashboard | `/api/dashboard` | KPI summary |
| Scans | `/api/scans` | CRUD, logs, cancel |
| Findings | `/api/findings` | CRUD, notes, retest |
| Attack Paths | `/api/attack-paths` | Graph nodes & edges |
| API Security | `/api/api-security` | Spec upload & parse |
| Reports | `/api/reports` | Generate & download |
| Assistant | `/api/assistant` | AI chat |
| Labs | `/api/labs` | Training lab launcher |
| Provider | `/api/provider` | LLM status & mode |
| Settings | `/api/settings` | System diagnostics |

---

## Running Tests

```powershell
python -m pytest -v
```

---

## Architecture

```
┌─────────────────────────────────────┐
│          React Frontend             │
│   (Vite + TypeScript + Tailwind)    │
└──────────────┬──────────────────────┘
               │ HTTP (proxy :5173 → :8000)
┌──────────────▼──────────────────────┐
│         FastAPI Backend             │
│  ┌─────────┐  ┌──────────────────┐  │
│  │ Routes  │  │ Provider Manager │  │
│  └────┬────┘  └───────┬──────────┘  │
│       │               │             │
│  ┌────▼────┐  ┌───────▼──────────┐  │
│  │  Strix  │  │  Gemini / Ollama │  │
│  │ Adapter │  │    LLM Clients   │  │
│  └────┬────┘  └──────────────────┘  │
│       │                             │
│  ┌────▼────┐  ┌──────────────────┐  │
│  │  Strix  │  │    SQLite DB     │  │
│  │ Runner  │  │  (aiosqlite)     │  │
│  └────┬────┘  └──────────────────┘  │
└───────┼─────────────────────────────┘
        │ subprocess
┌───────▼─────────────────────────────┐
│     Strix CLI + Docker Sandbox      │
└─────────────────────────────────────┘
```

---

## License

This project is for **authorized security testing only**.  
Always obtain explicit written permission before testing any application.
