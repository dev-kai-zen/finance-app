# Project Boilerplate & Template Setup Guide

This repository serves as a production-ready boilerplate for React Native + Expo applications built with Clean Architecture, Expo Router, Expo SQLite, and Drizzle ORM.

---

## 1. Quick Start for a New Project

1. **Clone or copy this repository**:
   ```bash
   git clone <repo-url> my-new-app
   cd my-new-app
   ```
2. **Install dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```
3. **Verify typecheck & database tooling**:
   ```bash
   npm run typecheck
   npm run db:generate
   ```

---

## 2. Project Renaming Checklist

When creating a new project from this template, update these 4 files:

| File | Setting to Change | Example |
| :--- | :--- | :--- |
| **`package.json`** | `"name"` | `"my-new-app"` |
| **`app.json`** | `name`, `slug`, `scheme`, `android.package` | `com.mycompany.myapp` |
| **`src/infrastructure/database/client.ts`** | Database filename | `openDatabaseSync('myapp.db')` |
| **`src/components/sidebar/sidebar.tsx`** | Brand name / navigation links | Brand logo & screen titles |

---

## 3. Core Development Workflows

### Defining Database Tables & Migrations
1. Add or modify schemas in `src/infrastructure/database/schema/`.
2. Export the new schema in `src/infrastructure/database/schema/index.ts`.
3. Generate migrations:
   ```bash
   npm run db:generate
   ```
   *Migrations are automatically written to `drizzle/` and executed on app boot by `DatabaseProvider`.*

### Adding a New Feature Module
Create a folder in `src/modules/<feature-name>/`:
```text
src/modules/<feature>/
├── screens/         # Feature screen views
├── components/      # UI components used only in this feature
├── hooks/           # Feature React hooks (queries / state)
├── services/        # Business use cases & mutations (writes)
├── repositories/    # Drizzle ORM queries
├── schemas/         # Zod input/form validation schemas
├── types/           # Domain TypeScript types
└── index.ts         # Public API (routes import ONLY from here)
```

### Adding a Route
Routes in `src/app/` must remain thin adapters:
```tsx
import { MyFeatureScreen } from '@/modules/my-feature';

export default function MyFeatureRoute() {
  return <MyFeatureScreen />;
}
```

### Validating Code
Run the TypeScript check at any time:
```bash
npm run typecheck
```

---

## 4. Reference Features Included

* **`src/modules/dashboard`**: Minimal module screen example.
* **`src/modules/transactions`**: Reference module showing table relationships, schema setup, and modular organization.
