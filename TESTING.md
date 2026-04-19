# Testing & Quality — GreenSIG Frontend

Foundation installed during Sprint 0 of the stabilization initiative.

## Stack

- **Vitest** — unit & integration tests (happy-dom environment)
- **@testing-library/react** + **user-event** — component testing
- **MSW** — HTTP mocking (Node for unit, browser routes for Playwright)
- **Playwright** — end-to-end tests (Chromium)
- **ESLint 9 flat config** — static analysis, TypeScript-aware
- **Prettier** — formatting
- **Husky + lint-staged** — pre-commit hook

## Commands

```bash
npm run dev              # Dev server
npm run build            # Production build
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint (warnings allowed)
npm run lint:strict      # ESLint — zero warnings (target for later sprints)
npm run lint:fix         # Autofix
npm run format           # Prettier write
npm run format:check     # Prettier check
npm run test             # Vitest single run
npm run test:watch       # Vitest watch mode
npm run test:ui          # Vitest web UI
npm run test:coverage    # Coverage report
npm run e2e              # Playwright E2E
npm run e2e:ui           # Playwright interactive UI
```

## Directory layout

```
tests/
├── e2e/                 # Playwright specs (*.spec.ts)
├── smoke/               # Module-load + core utility tests
├── mocks/
│   ├── handlers.ts      # MSW request handlers (shared defaults)
│   └── server.ts        # setupServer for Vitest environment
└── utils/
    ├── renderWithProviders.tsx  # wraps QueryClient + MemoryRouter
    └── factories.ts             # typed fixtures (User/Site/Tache/…)
```

Component tests go next to the code they cover:

```
components/foo/Foo.tsx
components/foo/Foo.test.tsx
hooks/useBar.ts
hooks/__tests__/useBar.test.tsx
```

## Baseline (Sprint 0)

- ✅ Toolchain installed and smoke-tested (8 unit tests pass)
- ✅ Husky pre-commit runs lint-staged (ESLint + Prettier on staged files)
- ✅ CI workflow at `.github/workflows/frontend.yml`
- ⚠️ **TypeScript strict mode surfaces 432 pre-existing errors** — baseline documented. Typecheck is **non-blocking in CI until Sprint 1 cleans them up**. The bulk are TS6133 (unused imports, 190) and TS2322 (type mismatch, 52). Zero of these errors were introduced by Sprint 0.
- ⚠️ ESLint currently reports 925 warnings, 0 errors. Most are `no-console` and `@typescript-eslint/no-explicit-any`. These rules will be promoted to `error` progressively across Sprints 1–7.

## Progressive tightening plan

| Sprint | Rule change                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------ |
| 1      | Typecheck becomes blocking (after cleaning TS errors). `no-explicit-any` → error in `services/`. |
| 2      | `react-hooks/exhaustive-deps` → error (catch stale closures).                                    |
| 3      | `no-console` → error; all errors must route to `ToastContext`.                                   |
| 6      | `no-explicit-any` → error in `hooks/*Tools.ts` (map drawing).                                    |
| 7      | `lint:strict` (zero warnings) becomes the default.                                               |

## Writing tests

### Unit / component

```tsx
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../tests/utils/renderWithProviders';
import { makeTache } from '../../tests/utils/factories';
import { TaskCard } from './TaskCard';

describe('TaskCard', () => {
  it('renders the task title', () => {
    const tache = makeTache({ titre: 'Tailler les arbres' });
    const { getByText } = renderWithProviders(<TaskCard tache={tache} />);
    expect(getByText('Tailler les arbres')).toBeInTheDocument();
  });
});
```

### Hook

```tsx
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../../tests/utils/renderWithProviders';
import { useFoo } from './useFoo';

it('returns data', async () => {
  const client = createTestQueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useFoo(), { wrapper });
  // assertions
});
```

### E2E

Prefer Playwright route interception for tests that don't need a live backend:

```ts
await page.route('**/api/sites/', (route) =>
  route.fulfill({ status: 200, body: JSON.stringify({ results: [...] }) }),
);
```

For tests that exercise the real backend, set `PLAYWRIGHT_BASE_URL` and ensure Django + Celery + Redis are running.

## Philosophy

Every bug fixed in Sprints 1–7 ships with a regression test that would have failed before the fix. That's how we stop the "bug comes back at next deploy" loop.
