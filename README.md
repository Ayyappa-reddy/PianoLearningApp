# Piano Learning Progress System

A personal, cross-device web application for recording and reviewing one person's piano-learning journey, from beginner study through advanced learning. It organizes the learning content the user chooses, weekly goals, practice records, repertoire, reviews, and historical progress. It does not prescribe a curriculum.

## Project status

**Functional implementation in progress.** The catalog, weekly planning and carry-forward, learning progress, manual practice, songs/sections, optional reviews, streaks, achievements/milestones, progress views, and JSON/CSV export are implemented on the documented schema. UI/UX refinement and production authentication remain separate follow-up work.

## Planned technology

- **Frontend and server-side application:** Next.js and TypeScript
- **Styling:** Tailwind CSS
- **Database:** Hosted PostgreSQL
- **ORM:** Prisma
- **Validation:** Zod
- **Testing:** Vitest and Playwright
- **Initial database provider recommendation:** Neon, using its PostgreSQL service; see [Architecture](docs/ARCHITECTURE.md) for rationale and current free/low-cost limits.
- **Version control and project documentation:** Git and GitHub

The application is planned as a modular monolith. Its domain and application/use-case logic will remain independent of UI components and persistence details, so a future interface can reuse those rules.

## Development philosophy

- The user chooses what to learn and manually creates learning content and weekly goals.
- Catalog items and prerequisites are informational; they never create a mandatory curriculum or block learning.
- Core workflows work without AI. AI is not a dependency or part of the v1 scope.
- Preserve meaningful learning, goal, deferral, review, and login history.
- Keep the application personal and understandable; do not add infrastructure or abstractions without a clear need.
- Treat the user's data as theirs and provide complete JSON and CSV exports.
- Practice is entered manually after it happens. There are no live timers or automatic audio/MIDI analysis.

## Documentation

- [Project specification](docs/PROJECT_SPEC.md) — finalized product requirements and operating rules.
- [Architecture](docs/ARCHITECTURE.md) — modular monolith, stack, provider recommendation, and remaining implementation decisions.
- [Database design](docs/DATABASE_DESIGN.md) — proposed entities, attributes, constraints, relationships, historical behavior, and export design.
- [Roadmap](docs/ROADMAP.md) — design-to-release phases.

## Local development

Requirements and domain behavior remain defined by [the project specification](docs/PROJECT_SPEC.md) and [the database design](docs/DATABASE_DESIGN.md). The Prisma schema in `prisma/schema.prisma` is the implementation of that logical model.

1. Use Node.js 20.9 or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` (runtime) and `DIRECT_URL` (Prisma CLI/migrations) to PostgreSQL connection strings. Do not commit `.env`.
4. Apply the initial migration with `npm run prisma:migrate:dev`.
5. Start the application with `npm run dev` and open `http://localhost:3000`.

The database-backed pages require the configured PostgreSQL database; the system-status page reports availability without exposing connection details. Database access is server-only. For streak tracking, a successful application load records a daily login event; this is activity tracking, not authentication. Authentication has not been implemented, so do not expose a deployment to the public internet until access control is added.

Useful checks:

- `npm run prisma:validate`
- `npm run typecheck`
- `npm test`
- With the app running at `http://127.0.0.1:3000`, `npm run test:e2e`
- `npm run build`
