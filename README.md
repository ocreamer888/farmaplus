# FarmaPlus

Monorepo for the FarmaPlus product: web app, data services, and Supabase-backed backend, following the same layout conventions as `sicop-health`.

---

## Project layout

```
farmaplus/
├── apps/
│   └── web/                 # Next.js (App Router) + Tailwind
│       └── src/
│           ├── app/         # Routes and layouts
│           ├── components/  # Shared UI
│           └── lib/         # Types, clients, utilities
├── supabase/
│   ├── migrations/          # SQL migrations
│   └── functions/         # Edge functions (Deno)
├── services/
│   └── etl/                # Python jobs / pipelines
├── docs/
│   └── plans/              # Design and delivery notes
├── scripts/                # One-off automation
├── md/                     # Scratch markdown / exports
├── claude/                 # Agent context for Claude Code
├── .github/
│   └── workflows/          # CI / cron
├── PROJECT.md
├── TASKS.md
└── README.md
```

---

## Quick start

From the repository root:

```bash
npm install
npm run dev
```

The dev server runs the `apps/web` workspace (default: http://localhost:3000).

---

## Supabase

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then from this repo root run `supabase init` if you need a local `config.toml`. SQL migrations live in `supabase/migrations/`.

---

## Python ETL

See `services/etl/README.md`. Use a virtual environment under `services/etl/.venv/` (gitignored).
