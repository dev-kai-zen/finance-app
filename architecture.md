# Reusable React Native and Expo Architecture

This guide defines a reusable modular-monolith structure for Expo applications. Expo Router owns navigation; feature modules own application behavior.

## Recommended structure

```text
project/
├── src/
│   ├── app/                       # Expo Router routes/layouts only
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── +not-found.tsx
│   │   ├── (public)/
│   │   │   ├── _layout.tsx
│   │   │   └── sign-in.tsx
│   │   └── (authenticated)/
│   │       ├── _layout.tsx
│   │       └── (tabs)/_layout.tsx
│   ├── modules/
│   │   └── example-feature/
│   │       ├── screens/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── services/
│   │       ├── repositories/
│   │       ├── libraries/
│   │       ├── state/
│   │       ├── schemas/
│   │       ├── types/
│   │       ├── utils/
│   │       └── index.ts
│   ├── components/                # Cross-feature UI
│   ├── constants/                 # App-wide constants
│   ├── layouts/                   # Visual shells/sidebar
│   ├── infrastructure/            # API, storage, database, logging
│   ├── providers/
│   ├── hooks/
│   ├── types/
│   └── utils/
├── assets/
├── app.json                       # Or app.config.js/app.config.ts
├── eas.json
└── package.json
```

Expo supports `src/app` directly. Avoid unusual custom route roots because Expo tooling expects `app` or `src/app`.

## Expo Router

`src/app` is the routing and composition layer. Keep route files thin:

```tsx
import { ExampleScreen } from '@/modules/example-feature';

export default function ExampleRoute() {
  return <ExampleScreen />;
}
```

Routes may map URLs to screens, read parameters, set navigation options, enforce access, and redirect. Keep large UI, business rules, API clients, and complex state in modules.

- `index.tsx` is the directory's default route.
- `_layout.tsx` defines stacks, tabs, drawers, providers, shared navigation UI, or access boundaries.
- The root `src/app/_layout.tsx` is the navigation entry point and initializes the app.
- Parenthesized folders such as `(public)` group routes without changing URLs.
- Brackets create dynamic routes: `items/[itemId].tsx` matches `/items/123`.

Route groups describe navigation relationships; they do not replace business modules.

## Module responsibilities

Each directory in `src/modules` owns one cohesive feature. Create only the subfolders a feature needs.

- `screens`: page-level components imported by routes. Prefer `sign-in-screen.tsx` over many files named `screen.tsx`.
- `components`: feature-only UI.
- `hooks`: React orchestration, queries, mutations, forms, and subscriptions.
- `services`: feature operations and use cases.
- `repositories`: data-access contracts and implementations.
- `libraries`: substantial feature-specific integrations/helpers. Prefer a more precise folder when possible.
- `state`: feature-wide state; keep temporary UI state local.
- `schemas`: runtime validation for forms, routes, persistence, and APIs.
- `types`: feature-owned types.
- `utils`: pure feature-specific helpers.
- `index.ts`: the module's public API.

Expose only supported module entry points:

```ts
export { ExampleScreen } from './screens/example-screen';
export { useExample } from './hooks/use-example';
export type { ExampleItem } from './types/example-item';
```

Consumers should import from `@/modules/example-feature`, not deep-import its internals.

## Shared folders

`src/components` contains UI genuinely reused across unrelated modules: buttons, fields, cards, dialogs, typography, loading indicators, and empty states. Start specialized UI in its owning module and promote it only after real cross-feature reuse. Shared components must not import feature modules.

`src/constants` contains stable app-wide values such as route identifiers, storage keys, locales, and static UI values. Never store secrets, signing credentials, or private keys there.

`src/layouts` contains reusable visual shells such as an app frame, sidebar, or authentication shell. Route `_layout.tsx` files define navigation; visual layouts define presentation. Platform files such as `app-shell.native.tsx` and `app-shell.web.tsx` can provide native tabs/drawers and a web sidebar.

## Dependency rules

```text
routes/layouts → feature modules → shared UI/infrastructure
```

1. Routes import module public APIs, layouts, providers, and shared code.
2. Modules may import shared UI and infrastructure.
3. Shared UI and infrastructure must not import feature screens.
4. Modules must not deep-import another module's internals.
5. Cross-module access uses the target module's public API.
6. Remove circular dependencies by changing ownership or extracting a shared contract.

These rules can be enforced with ESLint import restrictions.

## State, data, and authentication

Use component state for temporary interactions, module state for feature concerns, server-state tooling for remote caching, and global state only for app-wide concerns. Larger features may follow:

```text
route → screen → hook → service/use case → repository → API/storage
```

Do not create empty layers solely to match the diagram.

For authentication, use `(public)` and `(authenticated)` route groups. Routing decides access and redirects; the authentication module owns session behavior and UI. Sensitive tokens belong in secure device storage.

## Testing and adoption

Unit-test services/schemas, component-test UI, integration-test module workflows, and end-to-end-test critical journeys. Keep tests near implementation where practical.

Adopt incrementally:

1. Restrict `src/app` to routes/layouts.
2. Move one feature into `src/modules`.
3. Replace its route with a thin adapter.
4. Define its public `index.ts`.
5. Promote only genuinely shared UI.
6. Add import-boundary linting and tests.
7. Repeat feature by feature.

This structure does not break Expo. Follow Router conventions, install compatible native dependencies with `npx expo install`, and rebuild after native dependency/configuration changes.

## References

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Router notation](https://docs.expo.dev/router/basics/notation/)
- [Navigation layouts](https://docs.expo.dev/router/basics/navigation-layouts/)
- [Top-level src directory](https://docs.expo.dev/router/reference/src-directory/)
