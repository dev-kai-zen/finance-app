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

### Drizzle Migration Generation & Naming Rule

- **Always provide a descriptive name**: Run `npx drizzle-kit generate --name <descriptive_name>` (e.g., `npx drizzle-kit generate --name add_category_budgets`).
- **NEVER use default auto-generated names**: Drizzle Kit defaults to random names (e.g., `bitter_meltdown`, `slippery_gargoyle`). This is strictly forbidden. All migration files in `drizzle/` must have clear, human-readable names describing the schema change (e.g., `0024_add_category_budgets.sql`).
- Verify that `drizzle/migrations.js` and `drizzle/meta/_journal.json` reflect the descriptive migration tag.

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
13. **Descriptive Drizzle Migration Names**: When generating Drizzle migrations, always pass `--name <descriptive_name>` (e.g. `npx drizzle-kit generate --name add_category_budgets`). Never generate or commit migrations with Drizzle's auto-generated random names (e.g. `bitter_meltdown`).
14. **Version History & Semantic Versioning Rule**: Follow the Version History and Semantic Versioning (`MAJOR.MINOR.PATCH`) guidelines in Section 18 when updating or adding release notes. Whenever a new feature (`MINOR`), bug fix/polish (`PATCH`), or breaking change (`MAJOR`) is implemented, proactively ask the user whether to bump the version across `package.json`, `app.json`, `android/app/build.gradle`, and `RELEASE_NOTES`.
15. **Mandatory Performance Assessment & 60–120fps Standard**: Every new feature, refactor, bug fix, or architectural/thought discussion ("asking for thoughts") must explicitly evaluate runtime performance impact and strictly follow the 60–120fps engineering rules in Section 19.
16. **Mandatory Pre-Change 4-Question Gate**: Before changing any production code (especially during audits, bug fixes, or refactors), AI agents must explicitly answer the four mandatory pre-change questions in Section 20 to prevent unnecessary code sprawl and maintain full codebase clarity.
17. **No Auto-Commits Without Explicit Instruction**: AI agents must never automatically create git commits (`git commit`) unless the user explicitly instructs them to do so. Always keep changes in the working tree, report what was modified, run validations, and wait for the user's explicit instruction before committing.

---

# 17. Minimal Diff Principle

Prefer minimal, surgical changes to existing code.

- Make only the changes necessary to complete the requested task.
- Preserve unrelated code, comments, formatting, naming, ordering, and structure.
- Do not refactor, reorganize, rename, or reformat unrelated code.
- Apply localized patches instead of rewriting entire files or large blocks when a smaller edit is sufficient.
- Preserve each file's existing line endings, encoding, and final-newline convention.
- Do not run repository-wide formatters, linters with automatic fixes, or import organizers unless explicitly requested or required by the task.
- If formatting is necessary, limit it to the directly affected code.
- Larger changes are acceptable when required for correctness. Make all necessary supporting changes, but keep unrelated code untouched.
- Before finishing, review the Git diff and remove any unrelated or incidental changes.
- Report any unavoidable formatting or generated-file changes in the final response.

The Minimal Diff Principle means minimizing unrelated and incidental changes, not minimizing the raw number of changed lines. Make all changes required for correctness, type safety, tests, migrations, and consistency with the requested behavior. Do not omit necessary changes merely to produce a smaller diff.

---

# 18. Version History & Release Notes Rules

When adding or updating "Version History" release notes (`src/modules/version-history/`):

1. **Continuous Release Notes Updates**:
   - Whenever you implement a new feature, improvement, or bug fix, proactively add it to the active release notes in `src/modules/version-history/constants/release-notes.ts`.
   - Never postpone release note entries; keep them synchronized with code changes and commits.
2. **Category Grouping (`New:`, `Improve:`, `Fix:`)**:
   - For all post-v1.0.0 releases, organize updates under standard category headers:
     - `New:` (`versionHistory.categories.new`) – Brand-new features and capabilities.
     - `Improve:` (`versionHistory.categories.improve`) – Enhancements to existing workflows and UI.
     - `Fix:` (`versionHistory.categories.fix`) – Bug fixes and performance optimizations.
   - Initial deployment (v1.0.0) remains grouped by feature domain.
3. **Release Dates Requirement**:
   - Every release block must specify a localized `dateKey` (e.g. `versionHistory.v120.date`) matching the deployment date (e.g., "October 27, 2026").
4. **Strict Layman's Terms (Plain Language)**:
   - Notes must be written from the user's perspective in simple, non-technical language.
   - Describe what the user can do, what was improved, or what issue was resolved.
   - Never expose internal code mechanics, component names, API details, or technical jargon (e.g., avoid "refactored component", "state reducer", "SQLite WAL mode", "null check added").
   - Example (Good):
     ```text
     Fix:
     • Fix bugs when selecting date
     • Show daily spending totals directly on the calendar
     ```
   - Example (Bad):
     ```text
     Fix:
     • Refactored DatePicker memoized hook and resolved state mutation race condition
     ```
5. **Concise Bullet Points**:
   - Limit items to 1 clear, punchy sentence (15–20 words max per bullet).
   - Use active verbs: *Add*, *Fix*, *Improve*, *Update*.
6. **Localization Requirement Across All Supported Languages**:
   - All string keys must exist in `src/infrastructure/localization/translations/en.ts`, `fil.ts`, and `es.ts`.
   - Never add English release notes without the matching Filipino and Spanish translations.
7. **Semantic Versioning (`MAJOR.MINOR.PATCH`) & Proactive Version Bump Alignment**:
   - The application strictly follows **Semantic Versioning (`MAJOR.MINOR.PATCH`)**:
     - **`MAJOR` (`X.0.0`)**: Major architectural overhauls or breaking changes.
     - **`MINOR` (`1.X.0`)**: Brand-new user-facing features or capabilities (e.g., `1.2.1` → `1.3.0`).
     - **`PATCH` (`1.2.X`)**: Bug fixes, UI polish, and minor improvements without new features (e.g., `1.2.1` → `1.2.2`).
   - **Proactively Ask the User**: When a new feature, improvement, or fix is implemented during development, the agent must ask the user whether they want to keep it in the current active release or bump the version (recommending the appropriate `MINOR` or `PATCH` increment based on Semantic Versioning) and increment `versionCode`.
   - Whenever the application version is incremented in `package.json` and `app.json`, add a new release block at the top of `RELEASE_NOTES` in `src/modules/version-history/constants/release-notes.ts`.
   - First deployment (v1.0.0) provides a comprehensive overview of all app features; subsequent versions summarize only what changed or was fixed in that release.

---

# 19. Performance Engineering & 60–120fps Standard

All development, code reviews, refactors, and design discussions must target a sustained **60–120fps** frame rate (keeping JavaScript thread work under **8.3ms–16.6ms per frame** during navigation transitions, gestures, and scrolling).

1. **Mandatory Performance Assessment (Code & Design Discussions)**:
   - Whenever the user asks for thoughts, architectural recommendations, plans, or code changes, agents **must** proactively assess and state the performance impact:
     - Will this block the JS thread during screen navigation or animations?
     - Will this trigger unnecessary re-render cascades across context consumers or mounted screens in `<Stack>`?
     - How many synchronous SQLite queries will execute on mount/focus (`useFocusEffect`), and what is their algorithmic complexity ($O(1)$ vs $O(N)$)?
2. **Context & Root Provider Discipline**:
   - **Split State and Dispatch Contexts**: Never combine frequently changing state and setter functions in a single un-memoized Context value consumed by screens (e.g. `AppShellHeaderStateContext` vs `AppShellHeaderDispatchContext`).
   - **Isolate Route Hooks (`usePathname`)**: Never call `usePathname()` or subscribe to high-frequency navigation state at the top of root layout/provider trees (`_layout.tsx`) when only a leaf component needs it.
   - **Memoize Provider Values**: Always wrap Context provider values in `useMemo` and callbacks in `useCallback`.
3. **Modal, Tab & Offscreen Gating**:
   - **Early-Return Visibility Guard**: Every modal component must gate its expensive hooks and subtree behind an outer `if (!props.visible) return null;` wrapper before mounting domain hooks (`useTransactions`, `useAccounts`, `useGeneralSearch`, `useModalWalkthrough`, etc.).
   - **Lightweight Global Providers**: Root-level modal hosts (e.g. `QuickEntryProvider`, `GeneralSearchModal`) must never mount heavy domain data hooks while closed.
   - **Lazy Secondary Views**: Defer Trash queries, non-selected report/calendar tabs, and empty-input search domains until the user actually opens or selects them.
4. **SQLite Query Bounding, Pagination & Indexing**:
   - **Never Hydrate Unbounded Tables to Slice in JS**: Feeds, recent-item cards, search previews, and calendar month views must filter, sort, and bound rows in SQLite (`LIMIT`, keyset cursor, or date window)—never load the full ledger and `.slice(0, N)` in JS.
   - **Keyset Pagination + Dedicated Export Path**: Paginated feeds must use a deterministic total order ending in `id` (fetching `limit + 1` for `hasMore`), compute historical balances with bounded anchor sums rather than full-ledger scans, and keep a separate unpaginated service path (e.g. `getTransactionsForExport`) for complete CSV exports.
   - **Chunk Dynamic `IN (...)` Queries at ≤ 500 IDs**: Always chunk array lookups (labels, attachments, splits, transfer siblings) at 500 IDs to stay under SQLite's bind-parameter limit.
   - **Empty Fast-Exits & 1-Row Existence Probes**: Return early (`if (rows.length === 0) return [];`) before running supporting hydration queries (e.g. empty Trash). Use `SELECT id ... LIMIT 1` (`hasNotes`, `hasTransactions`) instead of hydrating collections just to check `.length > 0`.
   - **Explicit Outer Column Qualification in Correlated SQL**: Inside raw `sql` correlated subqueries (`EXISTS`, scalar aggregates) against the same table, explicitly qualify outer columns (`"transactions"."id"` or an explicit outer alias like `target.id`) so single-table queries never shadow columns against the inner alias.
   - **Partial Indexes for Hot Active Feeds**: Add partial composite indexes (`WHERE deleted_at IS NULL`) via named Drizzle migrations (`npx drizzle-kit generate --custom --name ...`) and verify index usage via `EXPLAIN QUERY PLAN`.
5. **Hook Efficiency, Query Scoping & Mutation Ownership**:
   - **No Duplicate Mount + Focus Queries**: Never pair `useEffect(() => refresh(), [refresh])` with `useFocusEffect` for the same query.
   - **Cancel & Coalesce Deferred Reads**: Always capture and invoke cancel handles from `scheduleAfterPaint` / `runDeferredSyncQuery` on re-trigger, blur, or unmount, and guard multi-stage reads (e.g. `useDashboard` base + deferred net-worth history) with a monotonic `requestIdRef`.
   - **Single Mutation Owner & Self-Echo Guard**: Emit `FINANCE_APP_TRANSACTION_MUTATED` once per committed write with `{ sourceId }`. Focused feeds subscribe and refresh only when `payload?.sourceId !== selfId` so external hosts (e.g. Global Quick Entry) refresh active screens without double-refreshing self-initiated saves.
   - **Scope Picker vs. Management Reads & Reuse Snapshots**: Selection hooks (`useAccounts()` default) must opt out of credit-card monitoring and management flags (`isDeletable`, `canChangeCurrency`), keeping authoritative checks before regulated writes. When one screen mounts multiple services needing base balances (e.g. `AccountsScreen`), fetch balances once and pass preloaded arrays down.
   - **Batch Aggregations & Single-Pass `Map` Lookups**: Group shared-period SQL aggregations (e.g. budgets) instead of querying in a loop, and pre-index child rows/import companions into `Map`s ($O(N)$) instead of nested `.find()` / `.filter()` loops.
   - **Batch & Cache High-Frequency Settings**: Settings read across many components (`useExperiencePreferences`, `usePrivacyMode`, `useDefaultAccounts`) must batch reads and cache in memory, invalidating on writes or DB replacement.
   - **Avoid Full-Ledger Reads for Mutation-Only Hosts & Unstable Defaults**: Pass `{ skipQuery: true }` when only mutation callbacks are needed, and never use inline `new Date()`, `{}`, or `[]` as default hook parameters.
6. **List & Style Rendering Discipline**:
   - **Memoize List Rows & Stabilize Callbacks**: Wrap recurring list row components (`TransactionRow`, `AccountRow`, etc.) in `React.memo`, and hoist or `useCallback`-stabilize `ItemSeparatorComponent`, `renderItem`, and all row callbacks (`onPress`, `onDelete`, `onDuplicate`)—never pass inline arrow functions into memoized rows.
   - **Hoist Style Factories**: Always define `useThemeStyles(createStyles)` factory functions at module scope—never inline arrow functions inside a component body.
7. **Instant Presentation, Background Skeletons & Live Input Responsiveness**:
   - **Never Freeze on Heavy Background Loads (Universal Skeleton Rule)**: Whenever a screen, tab (e.g. Calendar Balance Sheet, Reports), chart, modal, or form must execute non-trivial SQLite queries or computations—even if prior data is already in state—render the interactive shell/header on frame 1, display a native-driven skeleton loader (`useNativeDriver: true`, e.g. `PageLoadingState` / form skeleton) while the load is pending, and defer the synchronous work after paint (`runDeferredSyncQuery` / `scheduleAfterPaint`) so the UI never appears frozen, stale, or stuck. Only omit the skeleton when no background load is needed for the current inputs.
   - **Zero-Query Live Typing & Debounced Search**: Never run synchronous SQLite queries on every keystroke inside `useMemo` (e.g. `BudgetLiveIndicator`). Query a baseline snapshot once per category/date/currency change and evaluate amounts in pure $O(1)$ JS (keeping save-time DB checks authoritative). Batch missing form lookups (`findLabelsByIds`) and debounce DB-backed search inputs (~150ms, instant on clear).
   - **Synchronized Transition Skeletons (No Artificial Timers)**: Never hide sort/filter/tab skeletons with fixed `setTimeout` or mismatched `requestAnimationFrame` guesses. Update the resolved state (`resolvedFilter` / `loading`) in the same batched React commit as the fetched data so stale rows never flash after the skeleton closes.
8. **Touch Target Ergonomics & Keyboard Tap Persistence**:
   - **Minimum Touch Targets & Hit Slops**: All header action and dismiss buttons (especially close "✕" buttons) must have an effective touch target of at least 44×44px or generous hit slop (`hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}`).
   - **Keyboard Tap Dismissal**: Modal close callbacks must call `Keyboard.dismiss()` so the software keyboard responder never swallows the first tap.
9. **Background Listeners, Startup Maintenance & Resume Throttling**:
   - **Prevent Change-Listener Self-Invalidation**: Never watch a table in `addDatabaseChangeListener` that the callback itself writes to (e.g. `WidgetSyncProcessor` excludes `settings` and subscribes explicitly to Pro/currency changes). Check for active consumers (e.g. `getWidgetInfo`) before running background computations.
   - **Side-Effect-Free Reads & Gated Cold-Start Maintenance**: Never run legacy repair `UPDATE`s or write reconciliations during ordinary reads (`listCategories`, read hooks without dirty/date guards). Gate cold-start maintenance in `migrator.ts` by schema/maintenance revision (`__db_maintenance_tag` + `__drizzle_migrations`) while enforcing `{ forceFullCheck: true }` on fresh installs, upgrades, restores, and resets.
   - **Stagger Resume Processors & Reuse Config**: Never fire `AppState` `"active"` or `NetInfo` background processors synchronously on frame 1—stagger by 1.0s–2.0s (cancelling on background/unmount), pass already-read config into sync services, keep immediate background flush, and never call lifecycle `notify()` unless state actually mutated.
10. **Performance Regression Verification**:
    - **Automated SQL & Parity Tests**: For performance-critical queries/services, add real in-memory SQLite tests (`node --test`) asserting bounded SQL statement counts, `EXPLAIN QUERY PLAN` index usage (zero temp B-tree sorts), and field-by-field equivalence against the baseline (covering transfers, fees, splits, tied timestamps, wildcards, and historical balances).
    - **Visual & Device Checks**: Verify row/form re-renders in React Native DevTools (**Highlight updates** + **Profiler**) and validate cold start, scrolling, and idle stability on release builds (`npm run android:apk:release`) with large fixtures (1k–10k+ rows).

---

# 20. Mandatory Pre-Change Investigation Gate (Audit & Bug Fix Protocol)

Before letting AI change any production code (especially during audit findings remediation, bug fixing, or refactoring), the AI agent must explicitly answer four questions:

1. **What is the actual problem?**
   Demonstrate it with a failing test, reproduction, or concrete evidence.
2. **Why does the current implementation cause it?**
   Show the specific function and execution path.
3. **What is the smallest reasonable fix?**
   Explain why a new abstraction or file is necessary, if one is proposed.
4. **How will we prove the fix does not break other features?**
   Specify the regression tests.

### Guarding Against Audit Code Sprawl
During audits and remediation, AI agents must not rewrite surrounding logic, restructure unrelated modules, or introduce cascading abstractions that make the application logic harder to understand. Every fix must remain surgical, adhere strictly to the Minimal Diff Principle (Section 17), and preserve complete clarity for the developer.



