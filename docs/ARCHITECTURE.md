# Architecture

**Status:** Modular-monolith architecture implemented for the current functional workflows. Authentication and final UI/UX redesign remain deferred.

## Goals and constraints

- One responsive web application, accessible across devices.
- A modular monolith; no microservices or event-sourced architecture.
- Domain rules independent of React, Next.js UI components, and persistence specifics.
- Hosted relational database; production is not local-only SQLite.
- User-owned records remain exportable and historically meaningful.
- Core product has no AI dependency.

## Proposed shape

```text
Responsive Next.js UI
        ↓
Application / use-case layer
        ↓
Domain rules and input validation
        ↓
Persistence adapter (Prisma)
        ↓
Hosted PostgreSQL (Neon recommended)
```

This is one deployable web application with internal module boundaries. It does not require a separate API service. Server-side application entry points expose operations to the UI and future clients. Database credentials and direct database connections stay server-side.

## Responsibilities

- **UI:** Responsive planning, learning catalog, practice, repertoire, reviews, dashboard, calendar, timeline, and export interactions.
- **Application/use-case layer:** Orchestrates actions such as creating a seven-day period, resolving carry-forward items, changing progress, recording practice, creating reviews, and exporting data. Multi-row planning and rollover should be transactional.
- **Domain layer:** Owns status transitions, seven-day period rules, rollover threshold behavior, non-blocking prerequisites, review-cycle eligibility based on completion of all Main goals in each of three associated periods, streak calculation, and achievement evaluation. It uses ordinary TypeScript/domain types rather than UI or Prisma types.
- **Review flow:** Persist the three associated periods, their Main-goal completion, the offer, and the user's accept/skip decision separately from the Review record. Creating the next normal week is independent of that decision and of review completion.
- **Validation:** Zod validates input at application boundaries. Database constraints enforce relational and simple value invariants as a second line of defense.
- **Persistence:** Prisma/PostgreSQL access behind repository/query boundaries. Keep Prisma models and provider details out of UI and domain rules.
- **Analytics:** Derived queries from primary records; no independent stored totals unless future measured performance makes a specific cache necessary.
- **Export:** Application-level serialization over canonical records, with versioned JSON and related CSV datasets. The export format should not mirror UI screens.

## Database provider recommendation

Use **Neon**, initially on the **Free** plan, as the hosted PostgreSQL provider. Prefer **AWS Europe Central 1 (Frankfurt, `eu-central-1`)** because the owner is in the Europe/Berlin timezone and keeping the database nearby reduces avoidable latency. Neon lists Frankfurt as an available region. [Neon regional latency dashboard](https://neon.com/demos/regional-latency) · [Neon Europe region announcement](https://neon.com/blog/category/changelog)

Neon's current Free tier is suitable for development and a small personal application: $0, 100 compute-hours and 0.5 GB storage per project. Compute scales to zero after five minutes of inactivity, and reaching quotas can suspend compute. Its usage-based Launch plan has no monthly minimum and can disable scale-to-zero, providing a direct upgrade if the user needs more dependable always-available access. Recheck plan details before deployment because terms change. [Neon Free plan limits](https://github.com/neondatabase/website/blob/main/content/faqs/free-plan-limits-and-quotas.md) · [Neon plan comparison and pricing](https://neon.com/pricing)

This recommendation favors a direct PostgreSQL service and low initial cost. Supabase is a valid alternative, but its broader platform services are unnecessary for current needs; its free project can pause after one week of inactivity. [Supabase pricing](https://supabase.com/pricing)

Prisma documents Neon as a supported PostgreSQL provider and describes pooled connections for application traffic and direct connections for migration commands. Verify the connection approach against the Prisma and deployment runtime versions selected during implementation. [Prisma Neon guide](https://www.prisma.io/docs/orm/v6/overview/databases/neon)

Free-tier scale-to-zero may add latency on first access and quota suspension may interrupt access. Choose a paid plan only if those operational limitations become unacceptable. No separate cloud services, storage service, or background workers are required for v1.

## Time and timezone boundary

- Store the owner's configured IANA timezone in profile/preferences.
- Store a timezone snapshot on each weekly planning period and login-day row so historical local-day interpretation does not silently change if the preference later changes.
- Represent weekly boundaries, practice dates, started/completed dates, and review dates as local calendar dates (`DATE`) where the product describes a day rather than a precise instant.
- Store audit/creation/decision instants as UTC timestamps (`TIMESTAMPTZ`); render them in the current configured timezone.
- Weekly period end is exclusive: `start_on + 7 days`. It therefore contains exactly seven local dates, even across daylight-saving changes.
- A timezone change affects future local date calculations; historical date-only records and period snapshots remain as entered.

## Historical data approach

Keep current state on primary records for straightforward reads. Append narrow history records for meaningful lifecycle changes and carry-forward decisions where required. This is not event sourcing: history rows do not replace current state or require replay to reconstruct it. Correcting a date/status appends a correction/state-change record and updates the current value in one transaction. Ordinary corrections to editable text and rating fields update the current record; there is no generic audit log of every keystroke.

Prefer archive flags/timestamps over deleting content already referenced by history. Preserve foreign keys to old records and use restrictive deletion behavior for meaningful records.

## Security and identity

The data model represents one owner/profile and avoids premature multi-tenant complexity. Cross-device production access requires a real sign-in/session mechanism and secure server-side authorization before deployment. This task intentionally does not select or implement authentication. Never expose a PostgreSQL connection string or Prisma Client to browser code.

## Implementation notes

- The initial owner profile uses `Europe/Berlin`, matching the configured development environment; the owner can change it in Settings. Weekly periods snapshot the profile timezone at creation.
- Because authentication is intentionally deferred, the current streak tracker records one login day when a browser loads the application shell. It does not identify or authenticate a person and is suitable only for a private personal deployment.
- Database-backed routes render on request rather than during static build, so building the application does not require a live database connection or write profile/achievement rows.
- JSON export includes all modeled tables and profile metadata. CSV export provides one CSV per logical dataset inside a ZIP archive.

## Important risks

- Neon Free is inexpensive but can sleep and can suspend compute at quotas; upgrade if these limitations affect availability.
- A managed database plus web hosting still requires secret management and network/security configuration, but does not justify a microservice architecture.
- Historical updates and explicit rollover introduce transactional operations; implement them atomically to avoid orphaned or duplicate planning records.
- Analytics definitions can drift if repeated in UI code. Centralize date/category/streak queries in application/domain modules.
- Prisma does not express every PostgreSQL-specific index or check equally well. Review generated migrations and add reviewed SQL constraints/indexes when needed.
- Provider pricing and free-tier terms may change; provider choice is a recommendation, not a permanent product requirement.

## Decisions intentionally kept for implementation

- Exact Next.js module/folder layout; no separate package or service is presently justified.
- Web application hosting provider; database direction is Neon Frankfurt, starting on Free.
- Authentication/session provider and account recovery.
- Whether database-level row-level security is needed in addition to application authorization.
- Exact accessibility/browser support targets and offline behavior.
- Rating labels in the UI for the chosen 1–5 values.
