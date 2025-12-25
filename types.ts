
export type Role = 'ADMIN' | 'OPERATEUR' | 'CLIENT' | 'CHEF_EQUIPE';
export type ViewState = 'LOGIN' | 'DASHBOARD' | 'MAP' | 'INVENTORY' | 'PLANNING' | 'INTERVENTIONS' | 'CLAIMS' | 'TEAMS' | 'USERS' | 'REPORTING' | 'CLIENT_PORTAL' | 'PRODUCTS' | 'SITES';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface KPI {
  label: string;
  value: string | number;
  change: number; // percentage
  trend: 'up' | 'down' | 'neutral';
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  status: 'DISPONIBLE' | 'EN_MAINTENANCE' | 'HORS_SERVICE';
  location: string;
  lastService: string;
  nextService?: string;
  serialNumber?: string;
  description?: string; // Added for User 2.2.3
}

export interface Task {
  id: string;
  title: string;
  type: 'TAILLE' | 'TONTE' | 'NETTOYAGE' | 'PLANTATION' | 'ARROSAGE' | 'TRAITEMENT';
  status: 'A_FAIRE' | 'EN_COURS' | 'TERMINE';
  date: string;
  assignee?: string;
  recurrence?: string; // e.g., "1x/semaine"
  duration?: string; // Added for User 3.3.2
  zone?: string; // Added for User 3.3.1
}

export type HRStatus = 'DISPONIBLE' | 'OCCUPE' | 'MALADIE' | 'CONGE' | 'ACCIDENT' | 'ABSENT';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: HRStatus;
  avatar: string;
  productivity?: string; // e.g. "450 m²/h"
  monthlyInterventions?: number;
  skills?: string[]; // Added for User 5.5.2
}

// Map Types
export interface Coordinates {
  lat: number;
  lng: number;
}

// User 1.1.10 - Geolocation with accuracy
export interface UserLocation extends Coordinates {
  accuracy?: number; // Accuracy radius in meters
}

export interface MapSearchResult {
  name: string;
  coordinates: Coordinates;
  description: string;
  zoom?: number;
  // For highlighting the found object (User 1.1.6 enhancement)
  objectId?: string;
  objectType?: string;
}

export enum MapLayerType {
  PLAN = 'PLAN',
  SATELLITE = 'SATELLITE',
  TERRAIN = 'TERRAIN',
  NAVIGATION = 'NAVIGATION'
}

export interface LayerConfig {
  id: MapLayerType;
  name: string;
  url: string;
  attribution: string;
  maxNativeZoom?: number;
}

export interface AnalysisResult {
  title: string;
  content: string;
  facts: string[];
}

export interface OverlayState {
  parcels: boolean;
  networks: boolean;
  greenSpaces: boolean;
  works: boolean;
  reclamations: boolean;
}

// User 1.1.5 - Detailed Object Interface
export interface MapObjectDetail {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  attributes: Record<string, string>;
  lastIntervention?: string;
  nextIntervention?: string;
  geometry?: GeoJSONGeometry;
}

// ========================
// PHASE 4.3: TypeScript Strict Typing - New Interfaces
// ========================

/**
 * MapHandle - Interface for Map component imperative handle
 * Replaces `mapRef: any` with strongly typed ref
 */
export interface MapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  getZoom: () => number;
  getCenter: () => Coordinates | null;
  getMapElement: () => HTMLDivElement | null;
  exportCanvas: () => Promise<string | null>;
  invalidateSize: () => void;
}

/**
 * SymbologyConfig - Layer symbology configuration
 * Replaces `symbologyConfig: any` in OLMap components
 */
export interface SymbologyConfig {
  color?: string;
  size?: number;
  opacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  icon?: string;
}

/**
 * SearchSuggestion - Autocomplete suggestion interface
 * Moved from useSearch.ts for global access
 * Replaces `searchSuggestions: any[]` in Layout/Header
 */
export interface SearchSuggestion {
  id: string;
  name: string;
  type: string;
  coordinates?: Coordinates;
}

/**
 * TargetLocation - Map navigation target
 * Replaces `loc: any` in setTargetLocation callbacks
 */
export interface TargetLocation {
  coordinates: Coordinates;
  zoom?: number;
}

// ========================
// OpenLayers Type Re-exports
// ========================
// Re-export OpenLayers types to avoid importing ol in every component

import OLMapBrowserEvent from 'ol/MapBrowserEvent';
import type { EventsKey as OLEventsKey } from 'ol/events';
import type { Feature as OLFeature } from 'ol';
import type { Geometry as OLGeometry } from 'ol/geom';

export type MapBrowserEvent = OLMapBrowserEvent<any>;
export type EventsKey = OLEventsKey;
export type Feature<G extends OLGeometry = OLGeometry> = OLFeature<G>;
export type Geometry = OLGeometry;

export type MeasurementType = 'distance' | 'area';

export interface Measurement {
  id: string;
  type: MeasurementType;
  value: string;
  timestamp: number;
}

// ==============================================================================
// DRAWING & EDITING TYPES
// ==============================================================================

export type DrawingMode = 'none' | 'point' | 'line' | 'polygon' | 'circle';
export type EditingMode = 'none' | 'modify' | 'move' | 'delete';

export type ObjectCategory = 'vegetation' | 'hydraulique' | 'site';

export interface ObjectTypeInfo {
  id: string;
  name: string;
  namePlural: string;
  category: ObjectCategory;
  geometryType: 'Point' | 'LineString' | 'Polygon';
  color: string;
  icon: string;
  fields: ObjectFieldConfig[];
}

export interface ObjectFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  required?: boolean;
  options?: string[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface DrawingState {
  isDrawing: boolean;
  drawingMode: DrawingMode;
  editingMode: EditingMode;
  selectedObjectType: string | null;
  currentGeometry: GeoJSONGeometry | null;
  calculatedMetrics: GeometryMetrics | null;
}

export interface GeoJSONGeometry {
  type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

export interface GeometryMetrics {
  area_m2?: number;
  area_hectares?: number;
  length_m?: number;
  length_km?: number;
  perimeter_m?: number;
  centroid?: { lng: number; lat: number };
}

export interface CreateObjectData {
  type: string;
  geometry: GeoJSONGeometry;
  site_id: number;
  sous_site_id?: number;
  properties: Record<string, any>;
}

// ==============================================================================
// FILTRES AVANCÉS - Re-export depuis filters.ts
// ==============================================================================
export type {
  AdvancedFilters,
  FilterOptions,
  SiteOption,
  FilterRanges,
  SavedFilter,
  FilterPanelProps,
  FilterBadgesProps,
  RangeFilterProps,
  DateRangeFilterProps,
  SavedFiltersProps,
  FilterSectionProps,
  UseAdvancedFiltersReturn,
  UseSavedFiltersReturn,
  StateType,
  SizeType
} from './types/filters';

export {
  filtersToQueryParams,
  countActiveFilters,
  getFilterLabel,
  isArray
} from './types/filters';
