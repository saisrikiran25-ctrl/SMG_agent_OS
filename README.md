# SMB-Agent-OS

**Multi-tenant, Human-Supervised AI Operating System for Indian SMBs**

A production-grade, fully deterministic AI platform that automates inbound lead qualification and WhatsApp follow-ups while keeping the human owner in full control via an approval gate before any external message is sent.

---

## Key Features

- **Lead Qualification Agent** — Extracts intent, product, quantity, location, budget from multilingual messages
- **Multilingual Support** — English, Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati
- **Human Approval Gate** — NO external message is ever sent without Owner/Manager review and approval
- **Multi-Tenant Isolation** — Strict tenant-scoped data; cross-tenant queries blocked at the repository layer
- **Knowledge Hub (RAG)** — Owner-uploaded catalogues ground AI responses; prevents hallucinated prices
- **Partial Failure Recovery** — State machine resumes exactly where it failed
- **Evaluation Suite** — 10-case multilingual + adversarial benchmark with grounded metrics (10/10 passing)
- **Audit Trail** — Append-only event log with latency, cost, inputs/outputs for every agent action
- **Usage Metering** — Per-tenant token and cost tracking

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start the API server (port 3001)

```bash
cd apps/api
npx tsx src/index.ts
```

### 3. Start the web frontend (port 3000)

```bash
cd apps/web
npm run dev
```

Open http://localhost:3000 — the app auto-bootstraps a demo tenant.

---

## Running Tests

```bash
# API tests (11 tests)
cd apps/api && npm test

# Shared package tests (2 tests)
cd packages/shared && npm test
```

All 13 tests pass in under 5 seconds using the in-memory database adapter.

---

## End-to-End Lead Workflow (9 Steps)

```
RECEIVED -> AUTHENTICATED -> CLASSIFIED -> CONTEXT_RETRIEVED ->
PLAN_CREATED -> VALIDATED -> AWAITING_APPROVAL -> EXECUTING -> COMPLETED
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/signup | Create tenant + owner account |
| POST | /api/auth/login | Login, returns JWT |
| POST | /api/webhooks/whatsapp | WhatsApp Cloud API webhook |
| POST | /api/webhooks/form | Web form submission |
| GET | /api/approvals/pending | List pending approvals |
| POST | /api/approvals/:id/action | APPROVE / REJECT / ESCALATE |
| GET | /api/workflows/executions | List workflow executions |
| GET | /api/workflows/executions/:id/trace | Full step-by-step trace |
| POST | /api/knowledge/upload | Upload a knowledge document |
| GET | /api/knowledge/search?q=... | Semantic product search |
| POST | /api/evaluations/run | Run 10-case eval benchmark |
| GET | /api/dashboard/stats | KPI summary |
| GET | /api/audit | Audit event log |

---

## Security Model

- Cross-tenant isolation at the repository layer (Security Error on missing tenant_id)
- Approval gate: `send_approved_message` requires an APPROVED row in the DB
- RBAC via JWT + requireRole() middleware
- Adversarial injection detection in the AI extraction layer

---

## Phase 1 Evaluation Baseline (10/10)

| Metric | Value |
|--------|-------|
| Intent Extraction Accuracy | 100% |
| Adversarial Block Rate | 100% |
| Approval Gate Enforcement | 100% |
| Cross-Tenant Isolation | 0 leaks |
| Multilingual Coverage | EN, TE, HI, TA, KN |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | Express + TypeScript + tsx |
| Frontend | React 18 + Vite + Tailwind CSS |
| Shared Types | Zod + TypeScript |
| Database | PostgreSQL 16 + pgvector / in-memory |
| Auth | JWT + bcryptjs |
| Tests | Vitest |
| CI | GitHub Actions |
| Container | Docker Compose |
