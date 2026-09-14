# React Expo App Architecture

## Purpose

This document defines the required architecture for this React Expo application.

AI agents and developers must follow these rules when creating, modifying, or refactoring code.

The application uses:

- React Native with Expo (SDK 57)
- TypeScript
- Expo Router
- Expo SQLite
- Drizzle ORM
- Offline-first architecture
- Feature-based modular structure

---

# Expo SDK 57 Note

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing code.

---

# 1. Project Directory Structure & Path Aliases

All application source code resides strictly inside `src/`.

**Never** create top-level `app/`, `modules/`, `db/`, or `shared/` directories in the repository root.

Use the configured TypeScript path alias `@/*` pointing to `src/*`:

```text
src/
├── app/                       # Expo Router routes & navigation layouts ONLY
│   ├── _layout.tsx            # Root layout, providers & app shell
│   ├── index.tsx              # Route adapter for dashboard
│   └── transactions.tsx       # Route adapter for transactions
├── modules/                   # Feature-based domain modules
│   ├── dashboard/
│   ├── transactions/
│   ├── accounts/
│   ├── categories/
│   └── settings/
├── infrastructure/            # Core system & platform services
│   ├── database/              # SQLite client, Drizzle setup, schemas, provider
│   │   ├── client.ts
│   │   ├── database-provider.tsx
│   │   └── schema/            # Drizzle table definitions
│   └── sync/                  # Offline sync engine, queues, conflict resolution
├── components/                # Cross-feature, reusable dumb UI components
│   ├── app-shell/
│   └── sidebar/
├── constants/                 # App-wide global constants
├── hooks/                     # Generic cross-cutting React hooks
├── types/                     # App-wide global TypeScript types
└── utils/                     # Pure, app-wide utility functions
```

Root-level non-`src` directories:

- `drizzle/` – Generated Drizzle SQL migrations and `migrations.ts`
- `assets/` – Static images, fonts, and icons

---

# 2. Core Architecture Flow

The architecture differentiates between **Mutations** (data writes with business logic) and **Queries** (simple reads):

### Mutations & Business Operations (Strict Flow)

```text
Expo Router (src/app/)
    ↓
Screen (src/modules/<feature>/screens/)
    ↓
Hook (src/modules/<feature>/hooks/)
    ↓
Service / Use Case (src/modules/<feature>/services/)
    ↓
Repository (src/modules/<feature>/repositories/)
    ↓
Drizzle ORM
    ↓
Expo SQLite (src/infrastructure/database/)
```

### Queries & Data Reads (Pragmatic Flow)

```text
Expo Router
    ↓
Screen
    ↓
Hook
    ↓
Repository
    ↓
Drizzle ORM / Expo SQLite
```

> **Rule**: When an operation is a simple read query without business rules or validations, hooks may call repositories directly. Do NOT create empty, one-line pass-through service files just to fulfill a diagram.

---

# 3. Expo Router (`src/app/`)

The `src/app/` folder is reserved for route definition and navigation composition only.

Route files must remain thin adapters:

```tsx
import { TransactionsScreen } from "@/modules/transactions";

export default function TransactionsRoute() {
  return <TransactionsScreen />;
}
```

Route files may:

- Define routes and URL layouts
- Read route parameters
- Configure navigation headers and options
- Import and render module screens via the module's public entry point

Route files must NOT contain:

- Direct database queries or Drizzle references
- Business rules or validation logic
- Complex UI or styling
- Feature state management

Actual feature screens belong inside `src/modules/<feature>/screens/`.

---

# 4. Feature-Based Modules (`src/modules/<feature>/`)

Organize application code primarily by feature domain.

Each module owns its feature-specific implementation:

```text
src/modules/<feature>/
├── screens/         # Screen-level views rendered by routes
├── components/      # UI components used only within this feature
├── hooks/           # Feature React hooks and state coordination
├── services/        # Business use cases and atomic operations (writes)
├── repositories/    # Data-access methods and Drizzle queries
├── schemas/         # Feature input/form validation schemas (e.g. Zod)
├── types/           # Feature domain types
├── constants/       # Feature-specific constants
├── utils/           # Feature-specific helper functions
└── index.ts         # Public API boundary
```

Only create subdirectories that are actually needed by the feature.

### Public API Boundary (`index.ts`)

Every module must have an `index.ts` exporting only its public interface:

```ts
export { TransactionsScreen } from "./screens/transactions-screen";
export { useTransactions } from "./hooks/use-transactions";
export type { TransactionItem } from "./types/transaction.types";
```

**Boundary Rule**: External code (routes or other modules) must import only from `@/modules/<feature>`. Never deep-import into internal files of another module (e.g., `import ... from '@/modules/transactions/screens/...'` is strictly forbidden).

### Cross-Module Communication via Services

When a feature module (e.g. `accounts` or `dashboard`) requires data, calculations, or business logic belonging to another feature domain (e.g. `transactions`):
- **Never** directly query another module's database tables or import another module's repositories.
- The owning feature module must encapsulate that logic into a reusable **Service** (e.g. `getAccountBalanceDeltas`) and export it via its public API (`@/modules/<feature>`).
- Consuming modules import and call that Service through the public boundary, preserving domain encapsulation and avoiding duplicate logic.

---

# 5. Screens

Screens represent complete feature views.

Screens may:

- Compose feature and shared components
- Call feature hooks
- Handle presentation state
- Trigger user actions and navigation

Screens must NOT:

- Query SQLite or Drizzle directly
- Contain persistence logic
- Contain multi-step business logic (delegate to services via hooks)

---

# 6. Components

- Feature-specific components must reside inside `src/modules/<feature>/components/`.
- Promote a component to `src/components/` only when it is genuinely reused across multiple unrelated modules (e.g., Button, Modal, TextField, AppShell).
- Shared components must never import feature screens or feature modules.
- Components must not directly query the database.

---

# 7. Hooks

Hooks connect UI components to application logic.

Hooks may:

- Manage UI and interaction state
- Call services (for mutations/workflows)
- Call repositories (for simple reads)
- Expose `data`, `loading`, and `error` states
- Handle React lifecycle and reactive subscriptions

Hooks must NOT contain direct SQLite or Drizzle SQL statements.

---

# 8. Services / Use Cases

Services represent application use cases and business operations.

Prefer one focused service file per meaningful business operation:

- `create-transaction.service.ts`
- `transfer-funds.service.ts`
- `delete-account.service.ts`

Services may:

- Apply business rules and conditions
- Validate business constraints
- Orchestrate multiple repositories
- Execute database transactions (`db.transaction(...)`)
- Queue offline sync operations

Services must NOT contain UI, React state, or navigation logic.

---

# 9. Repositories

Repositories encapsulate Drizzle ORM queries and local data persistence.

Repositories may:

- Query records using Drizzle ORM
- Insert, update, and delete database records
- Accept an optional transaction context (`tx`) to participate in transactions
- Expose clean domain data

Repositories must NOT contain:

- UI or React logic
- Navigation logic
- Business workflow decisions

Group related database queries cleanly (e.g., `transactions-read.repository.ts` and `transactions-write.repository.ts`, or a single `transactions.repository.ts` if concise).

---

# 10. Database (`src/infrastructure/database/`)

All persistent local application data must use **Expo SQLite** and **Drizzle ORM**.

Structure:

```text
src/infrastructure/database/
├── client.ts              # SQLite database initialization & Drizzle instance
├── database-provider.tsx  # React provider for migration execution & readiness
├── schema/                # Drizzle schema table definitions
│   ├── accounts.ts
│   ├── categories.ts
│   ├── transactions.ts
│   ├── settings.ts
│   └── index.ts
```

- Table definitions belong in `src/infrastructure/database/schema/`.
- Migrations are generated into `drizzle/` and executed via `useMigrations` in `database-provider.tsx`.
- Database schemas define data models only; form/input validations belong in `src/modules/<feature>/schemas/`.

---

# 11. Offline-First Architecture

The application is offline-first.

1. Local SQLite is the single source of truth at runtime.
2. User actions write locally first.
3. Operations succeed immediately without network dependency.
4. When connectivity is available, changes are synced in the background.

Normal flow:

```text
User Action
    ↓
Service
    ↓
SQLite Transaction
    ↓
Local Data Updated
    ↓
Sync Operation Queued
    ↓
Background Remote Sync
```

The UI must never block waiting for cloud synchronization.

---

# 12. Sync Architecture (`src/infrastructure/sync/`)

Remote synchronization logic must remain isolated from UI logic:

```text
src/infrastructure/sync/
├── engine/       # Background sync orchestrator
├── queue/        # Outbox mutation queue (stored in SQLite)
├── conflicts/    # Conflict resolution strategies
└── adapters/     # Remote API sync client
```

Feature screens must never directly perform remote network synchronization.

---

# 13. Database Transactions

- Use database transactions (`db.transaction(...)`) whenever a single business operation modifies multiple related records (e.g., transferring money between accounts).
- Operations that must succeed or fail together must be atomic.
- The service layer controls transaction boundaries and passes the `tx` context to repositories.

---

# 14. Shared Code (`src/components/`, `src/utils/`, `src/types/`, `src/constants/`, `src/hooks/`)

- Generic code lives in the corresponding top-level `src/` directory.
- Feature-specific code stays in `src/modules/<feature>/`.
- Do not move code into shared folders prematurely.
- Shared code must never depend on feature modules.

---

# 15. Dependency Direction

Maintain a strict one-way dependency direction:

```text
src/app/ (routes)
    ↓
src/modules/ (screens & features)
    ↓
services
    ↓
repositories
    ↓
src/infrastructure/database (Drizzle / SQLite)
```

Lower-level layers must never depend on higher-level layers. Infrastructure and shared UI must never import feature screens or services.

---

# 16. AI Agent Development Rules

When modifying this project, AI agents must:

1. **Follow the `src/` hierarchy**: Place all new routes in `src/app/`, features in `src/modules/<feature>/`, and shared components in `src/components/`. Never create top-level root folders.
2. **Use `@/*` path alias**: Always import via `@/modules/...`, `@/components/...`, `@/infrastructure/...`.
3. **Respect public boundaries**: Import other modules only through their `@/modules/<feature>` entry point.
4. **Keep route files thin**: Routes only render module screens.
5. **No direct Drizzle in UI**: Screens and components must not call Drizzle or SQLite directly.
6. **Differentiate queries from mutations**:
   - Write operations with business logic go through a service.
   - Read operations can be fetched directly via a repository hook without unnecessary boilerplate.
7. **Use transactions for atomic multi-table updates**: Pass transaction handles through repositories.
8. **Preserve offline-first**: Never make local UI actions await remote network requests.
9. **Verify code**: Run `npx tsc --noEmit` to verify type integrity after making changes.
10. **Do not over-engineer**: Do not create unnecessary layers of abstraction. Use the simplest implementation that respects the architecture.
11. **DO NOT EDIT ANY FILES INSIDE THE `node_modules`**: AI agents are strictly forbidden from modifying any file inside `node_modules`. All fixes and adaptations must be made in application code or configuration.
12. **Cross-module access via Services**: Never query another module's database tables or repositories. Always encapsulate and consume cross-module capabilities via public Services exported through `@/modules/<feature>`.
