# FarmaPlus — technical context

Use this file for architecture decisions, stack choices, and links to detailed plans under `docs/plans/`.

## Product

FarmaPlus — fill in domain, users, and core workflows as the product is defined.

## Stack (initial)

| Layer        | Technology                          | Notes                    |
| ------------ | ----------------------------------- | ------------------------ |
| Web          | Next.js (App Router), React, TS     | `apps/web`               |
| Styling      | Tailwind CSS                        |                          |
| Backend / DB | Supabase (Postgres, Auth, Storage)  | Migrations in `supabase/` |
| Jobs         | Python 3                          | `services/etl`           |
