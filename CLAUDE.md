# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the frontend for **GreenSIG**, a green spaces management system (Système de Gestion des Espaces Verts) with GIS capabilities. Built with React 19 + TypeScript + Vite, featuring OpenLayers mapping.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build (runs TypeScript check - fails on type errors)
npm run preview      # Preview production build

# Testing
npm run test         # Run all tests (vitest)
npm run test:watch   # Watch mode
npm run test:ui      # Vitest UI
npm run test:coverage # Coverage report (v8)
npm run e2e          # Playwright E2E tests
npm run e2e:ui       # Playwright UI mode

# Quality
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint (--max-warnings 0)
npm run lint:fix     # ESLint autofix
npm run format       # Prettier
```

TypeScript strict mode is enabled with `noUncheckedIndexedAccess` - array/object access returns `T | undefined`.

Environment variables (`.env`):

- `VITE_API_BASE_URL` - Backend API URL (optional, Vite proxies `/api` to localhost:8000)
- `VITE_USE_TUNNEL=true` - Enable Cloudflare tunnel mode (WSS on port 443)
- `GEMINI_API_KEY` - Google Gemini AI API key (for AI features)

## Architecture

### File Structure

Files are at the root level (no `src/` directory):

- `App.tsx` - Main component with routing via `createBrowserRouter` (React Router data router), global state via `AppStateContext` (user, map state, search, overlays)
- `index.tsx` - Application entry point
- `types.ts` - TypeScript interfaces (User, Role, ViewState, MapLayerType, Coordinates, etc.)
- `constants.ts` - Map layer configurations (PLAN, SATELLITE, TERRAIN tile URLs)
- `store.ts` - Mock data for development

### Key Directories

- `pages/` - Route components (Dashboard, MapPage, Inventory, Planning, Teams, Claims, Reclamations, Users, Sites, Reporting, ClientPortal, Login)
- `components/` - Reusable UI components
- `components/map/` - Map-specific components (MapFloatingTools, MapSearchBar, MapZoomControls, SelectionPanel, SiteCarousel)
- `components/import/` - Import wizard components (ImportWizard, AttributeMapper, ImportPreview, ValidationResults)
- `components/export/` - Export functionality (ExportPanel)
- `contexts/` - React contexts (MapContext, SelectionContext, DrawingContext, ToastContext, SearchContext, NotificationContext, AppStateContext, ExportContext)
- `hooks/` - Custom hooks for map interaction and business logic
- `services/` - API clients and mock data

### Core Components

- `OLMap.tsx` - OpenLayers map with clustering, overlays, measurement tools, drawing/editing
- `Layout.tsx` - Main layout wrapper with sidebar and map
- `DataTable.tsx` - Generic sortable/paginated table component
- `Sidebar.tsx` - Navigation sidebar with role-based menu items

### Services Layer

- `api.ts` - Unified HTTP client with JWT auth (token refresh, 403 events, logout). All services use `apiFetch()` from this file.
- `usersApi.ts` - User management (CRUD, roles, structures, equipes, absences)
- `planningService.ts` - Task planning (taches, types, distributions, ratios, duplication)
- `reclamationsApi.ts` - Claims lifecycle (create, assign, close, reject, satisfaction)
- `suiviTachesApi.ts` - Task tracking (produits, photos, fertilisants, ravageurs)
- `kpiApi.ts` - KPI data and historical trends
- `reportsApi.ts` - Monthly report data

### Custom Hooks

- `useDrawingTools` - Drawing tool state and interactions
- `useMeasurementTools` - Distance/area measurement on map
- `useBoxSelection` - Multi-select via bounding box
- `useGeometryOperations` - Geometry manipulation (buffer, simplify, merge)
- `useSplitTool` - Split polygons/lines
- `useMapClickHandler` - Map click event handling
- `useMapHoverTooltip` - Feature hover tooltips
- `useSearch` - Search with debouncing and suggestions
- `useSearchHighlight` - Highlight search results on map
- `useGeolocation` - GPS location tracking

### Context Providers

- `MapProvider` - Map instance and state management
- `SelectionProvider` - Multi-feature selection state
- `DrawingProvider` - Drawing tool state (active tool, geometry type)
- `ToastProvider` - User notifications
- `SearchProvider` - Search state and debouncing
- `NotificationProvider` - WebSocket real-time notifications
- `AppStateContext` - All app-level state (user, map handlers, sidebar state) — shared with module-level route components to avoid prop drilling through data router
- `ExportProvider` - Tracks in-progress/completed export jobs; `blocking` flag controls navigation guard via `useBlocker`

## Map Integration

- Uses OpenLayers (`ol` package) in `components/OLMap.tsx`
- Map layers: Plan (OSM), Satellite (Esri), Terrain (OpenTopoMap)
- Coordinates use EPSG:4326 (WGS84) - GeoJSON format is `[lng, lat]`, frontend uses `{lat, lng}`
- Search flow: queries `/api/search/` first, falls back to Nominatim geocoding
- Features: clustering, overlay toggles, measurement tools, drawing/editing, import/export (GeoJSON, KML, Shapefile)

## Code Conventions

### TypeScript/React

- Components: PascalCase, named exports (`export function DataTable()`)
- Interfaces: PascalCase, no `I` prefix (`User` not `IUser`)
- Props interfaces: `ComponentNameProps`
- Variables/functions: camelCase
- Event handlers: `handle*` prefix (`handleSort`, `handleSubmit`)
- Event props: `on*` prefix (`onClick`, `onExport`)
- Constants: UPPER_SNAKE_CASE (`MOCK_KPIS`)
- Enums: PascalCase name, UPPER_CASE values

### Styling

- Tailwind CSS for styling
- Custom CSS in `styles/` directory when needed

## API Configuration

Vite proxies `/api` and `/media` to `http://127.0.0.1:8000` (configured in `vite.config.ts`).
Path alias: `@/*` maps to project root (e.g., `import { api } from '@/services/api'`).

## User Roles (✅ Refactoring Complete)

- `ADMIN` - Full access to all features
- `SUPERVISEUR` - Manages teams, planning, and field operations (replaces CHEF_EQUIPE)
- `CLIENT` - Client portal access only (redirected on login)

**Former roles** (removed in refactoring):

- ~~`CHEF_EQUIPE`~~ → Now `SUPERVISEUR` (user role for team management)
- ~~`OPERATEUR`~~ → Now HR data only (operators don't log in)

## Key Types

```typescript
type Role = 'ADMIN' | 'SUPERVISEUR' | 'CLIENT';

enum MapLayerType {
  PLAN,
  SATELLITE,
  TERRAIN,
  NAVIGATION,
}
interface Coordinates {
  lat: number;
  lng: number;
}
interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

// See types/users.ts for user/HR types:
// Utilisateur, SuperviseurList, OperateurList, EquipeList, Client, StructureClient
// See types/planning.ts for task types:
// Tache, TacheCreate, DistributionCharge, TypeTache, RatioProductivite
// See types/reclamations.ts for claims types:
// Reclamation, SatisfactionClient, TypeReclamation, Urgence
```

## Testing

**Stack**: Vitest + @testing-library/react + happy-dom + MSW + Playwright

```bash
npm run test                    # All unit/integration tests
npm run test:coverage           # With v8 coverage report
npm run e2e                     # Playwright E2E (requires dev server)
```

### Test Structure

- `**/__tests__/*.test.{ts,tsx}` - Co-located unit tests
- `tests/smoke/` - Smoke tests (app mounts, module imports)
- `tests/e2e/` - Playwright E2E specs
- `tests/mocks/handlers.ts` - MSW request handlers
- `tests/utils/renderWithProviders.tsx` - Test wrapper with QueryClient + Router + Contexts

### Testing Patterns

- **Service tests**: Mock `apiFetch` via `vi.mock('../api')`, test URL construction, HTTP methods, error handling
- **Component tests**: Use `@testing-library/react`, test rendering, user interactions, callbacks
- **Hook tests**: Use `renderHook` with providers wrapper
- **Coverage thresholds**: Lines 12%, Statements 12%, Functions 39%, Branches 79% (enforced in vitest.config.ts)

### Key Test Files

| File                                         | Tests                                                | Coverage             |
| -------------------------------------------- | ---------------------------------------------------- | -------------------- |
| `services/__tests__/apiFetch.test.ts`        | JWT injection, 401 refresh, 403 events, logout       | `api.ts` auth flow   |
| `services/__tests__/planningService.test.ts` | CRUD, date validation, distributions, duplication    | `planningService.ts` |
| `services/__tests__/reclamationsApi.test.ts` | Workflow actions, error formatting, export           | `reclamationsApi.ts` |
| `services/__tests__/usersApi.test.ts`        | All CRUD, snake/camel conversion, superviseur merge  | `usersApi.ts`        |
| `services/__tests__/suiviTachesApi.test.ts`  | Produits, photos pagination, fertilisants, ravageurs | `suiviTachesApi.ts`  |

## Related Documentation

See parent directory `../CLAUDE.md` for full monorepo documentation including backend architecture, API endpoints, and deployment instructions.
