# DeliveryBridge Development Rules

## Project Context

Unified delivery worker platform — smart launcher for hub employees juggling multiple carrier apps.
Solo dev (Glenn). Bootstrap phase. Every token and dollar counts.

## Current Phase: Phase 1 — Smart Launcher MVP

- Auth (register/login)
- Platform catalog + search
- Link platforms to dashboard
- Deep link / web portal launch
- Basic earnings overview
- **DO NOT build Phase 2+ features until Phase 1 ships**

## Development Workflow

- Use CLI scaffolding tools (create-expo-app, prisma init, etc.) — never hand-write boilerplate
- Test as you build, not as a separate pass
- Run `tsc --noEmit` + `vitest run` after every change set
- Don't rewrite entire files — use Edit tool for targeted changes
- Don't read files you just wrote

## Subagent Model Routing

| Model      | Use For                                                                             |
| ---------- | ----------------------------------------------------------------------------------- |
| **Haiku**  | File searches, grep/glob, validation, quick lookups                                 |
| **Sonnet** | Code edits, repetitive refactors (same pattern across N files), tests, route wiring |
| **Opus**   | Architecture decisions, complex multi-file debugging, system design                 |

- 2+ independent tasks → parallel subagents
- Same-pattern edits across multiple files → single sonnet subagent
- Never use opus for lookups or simple edits

## Token Discipline

- Shorter responses. No filler. No restating.
- Batch related edits into single tool calls
- Don't over-build. Only what's needed for the current phase.
- Prefer Edit over Write (targeted changes over full file rewrites)
- Don't scaffold features speculatively

## Code Standards

- All routes use `asyncHandler()` — no manual try/catch
- All errors use `AppError` class — consistent error responses
- Env vars validated via `src/lib/env.ts` (zod + dotenv)
- Prisma singleton at `src/lib/prisma.ts` — never `new PrismaClient()`
- Auth: `authenticate`, `optionalAuth`, `requireRole` from `src/middleware/auth.ts`
- Zod validation via `validate()` middleware

## Stack

- **API**: Express + TypeScript + Prisma + PostgreSQL (Railway)
- **Mobile**: React Native + Expo + Zustand + React Query
- **Shared**: `packages/shared` for cross-app types
- **Testing**: Vitest + Supertest
- **CI**: GitHub Actions (lint, typecheck, test)

## Deployment

- Railway project: `deliverybridge` (isolated from Aura)
- GitHub: `GSWAVEYY/delivery-tool-service`
- Don't deploy unless Glenn explicitly asks
