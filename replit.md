# FINN Investment Intelligence

An investment intelligence workspace for portfolio monitoring, company-event triage, and source-grounded research.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/finn-intelligence run dev` — run the FINN frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- FINN currently needs no user-supplied environment variables. The only API endpoint available is `/api/healthz`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TypeScript, Recharts, Lucide, wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/finn-intelligence/` — FINN web application
- `artifacts/api-server/` — shared Express API; currently exposes only its health check
- `lib/api-spec/openapi.yaml` — source of truth for generated API contracts

## Architecture decisions

- Keep synthetic portfolio figures and verified historical company evidence visibly distinct.
- Do not present market prices or announcements as current unless a live provider is connected.
- Keep every research claim tied to its selected document and reporting period; do not combine periods.

## Product

FINN is a responsive workspace for portfolio overview, prioritized company announcements, Infosys document research, company profiles, and analyst preferences. Historical research includes official April and July 2025 Infosys sources; current market and announcement feeds are not connected.

## User preferences

- Prioritize source transparency and correct period/currency comparisons over filling the interface with unsupported claims.

## Gotchas

- `/api/healthz` reports service health only; it is not a financial-data endpoint.
- Demo portfolio values are illustrative, not live or verified market data.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
