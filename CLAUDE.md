# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the frontend for **GreenSIG**, a green spaces management system (Système de Gestion des Espaces Verts) with GIS capabilities. Built with React 19 + TypeScript + Vite, featuring OpenLayers mapping.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
```

Environment: Create `.env` with `VITE_API_BASE_URL=http://localhost:8000/api` (defaults to `/api`).

## Architecture

### File Structure
Files are at the root level (no `src/` directory):
- `App.tsx` - Main component with routing, global state (user, map state, search, overlays)
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
- `contexts/` - React contexts (MapContext, SelectionContext, DrawingContext, ToastContext)
- `hooks/` - Custom hooks for map interaction and business logic
- `services/` - API clients and mock data

### Core Components
- `OLMap.tsx` - OpenLayers map with clustering, overlays, measurement tools, drawing/editing
- `Layout.tsx` - Main layout wrapper with sidebar and map
- `DataTable.tsx` - Generic sortable/paginated table component
- `Sidebar.tsx` - Navigation sidebar with role-based menu items

### Services Layer
- `api.ts` - Main backend API client with JWT auth, caching (5-minute site cache)
- `usersApi.ts` - User management endpoints
- `planningService.ts` - Task planning endpoints
- `reclamationsApi.ts` - Claims/complaints endpoints
- `suiviTachesApi.ts` - Task tracking endpoints
- `apiFetch.ts` - Fetch wrapper with auth token injection

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

Backend CORS allows `http://localhost:5173` (Vite dev server).
Frontend expects backend at localhost:8000 (configured in services/api.ts).

## User Roles
- `ADMIN` - Full access
- `CHEF_EQUIPE` - Team leader
- `OPERATEUR` - Standard operations
- `CLIENT` - Client portal only (redirected on login)

## Key Types (from types.ts)

```typescript
type Role = 'ADMIN' | 'OPERATEUR' | 'CLIENT' | 'CHEF_EQUIPE';
enum MapLayerType { PLAN, SATELLITE, TERRAIN, NAVIGATION }
interface Coordinates { lat: number; lng: number; }
interface User { id: string; name: string; email: string; role: Role; }
```

## Related Documentation

See parent directory `../CLAUDE.md` for full monorepo documentation including backend architecture, API endpoints, and deployment instructions.
