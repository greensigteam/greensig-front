/**
 * Types TypeScript pour le système de filtres avancés
 * Module Inventaire - GreenSIG
 */

// ==============================================================================
// TYPES DE BASE
// ==============================================================================

export type StateType = 'bon' | 'moyen' | 'mauvais' | 'critique';
export type SizeType = 'Petit' | 'Moyen' | 'Grand';

// ==============================================================================
// FILTRES AVANCÉS
// ==============================================================================

export interface AdvancedFilters {
  // Filtres communs
  site?: number | number[];
  zone?: string | string[];
  state?: StateType[];
  
  // Filtres par plages numériques
  surfaceRange?: [number, number];
  diameterRange?: [number, number];
  depthRange?: [number, number];
  densityRange?: [number, number];
  
  // Filtres par date
  lastInterventionStart?: Date | null;
  lastInterventionEnd?: Date | null;
  neverIntervened?: boolean;
  urgentMaintenance?: boolean; // > 6 mois
  
  // Filtres spécifiques végétaux
  family?: string | string[];
  size?: SizeType[];
  
  // Filtres spécifiques hydraulique
  material?: string | string[];
  equipmentType?: string | string[];
  
  // Recherche textuelle
  search?: string;
}

// ==============================================================================
// OPTIONS DE FILTRAGE
// ==============================================================================

export interface FilterOptions {
  sites: SiteOption[];
  zones: string[];
  families: string[];
  materials: string[];
  equipment_types: string[];
  sizes: SizeType[];
  states: StateType[];
  ranges: FilterRanges;
}

export interface SiteOption {
  id: number;
  name: string;
}

export interface FilterRanges {
  surface?: [number, number];
  diameter?: [number, number];
  depth?: [number, number];
  density?: [number, number];
}

// ==============================================================================
// FILTRES SAUVEGARDÉS
// ==============================================================================

export interface SavedFilter {
  id: string;
  name: string;
  filters: AdvancedFilters;
  objectType: string;
  createdAt: Date;
}

// ==============================================================================
// PROPS DES COMPOSANTS
// ==============================================================================

export interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  activeObjectType: string;
  filterOptions: FilterOptions | null;
  resultCount: number;
  isLoading?: boolean;
}

export interface FilterBadgesProps {
  filters: AdvancedFilters;
  onRemoveFilter: (filterKey: keyof AdvancedFilters) => void;
  onClearAll: () => void;
}

export interface RangeFilterProps {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  availableRange: [number, number];
  step?: number;
}

export interface DateRangeFilterProps {
  value: {
    start: Date | null;
    end: Date | null;
  };
  onChange: (value: { start: Date | null; end: Date | null }) => void;
  neverIntervened?: boolean;
  urgentMaintenance?: boolean;
  onNeverIntervenedChange?: (value: boolean) => void;
  onUrgentMaintenanceChange?: (value: boolean) => void;
}

export interface SavedFiltersProps {
  savedFilters: SavedFilter[];
  onLoadFilter: (filter: SavedFilter) => void;
  onDeleteFilter: (filterId: string) => void;
}

export interface FilterSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

// ==============================================================================
// HOOK RETURN TYPES
// ==============================================================================

export interface UseAdvancedFiltersReturn {
  filters: AdvancedFilters;
  filterOptions: FilterOptions | null;
  isLoading: boolean;
  resultCount: number;
  updateFilter: <K extends keyof AdvancedFilters>(
    key: K,
    value: AdvancedFilters[K]
  ) => void;
  removeFilter: (key: keyof AdvancedFilters) => void;
  resetFilters: () => void;
  applyFilters: () => void;
}

export interface UseSavedFiltersReturn {
  savedFilters: SavedFilter[];
  saveFilter: (name: string, filters: AdvancedFilters, objectType: string) => void;
  loadFilter: (filter: SavedFilter) => void;
  deleteFilter: (filterId: string) => void;
}

// ==============================================================================
// UTILITAIRES
// ==============================================================================

/**
 * Type guard pour vérifier si une valeur est un tableau
 */
export function isArray<T>(value: T | T[]): value is T[] {
  return Array.isArray(value);
}

/**
 * Convertit les filtres en paramètres de requête pour l'API
 */
export function filtersToQueryParams(filters: AdvancedFilters): Record<string, string> {
  const params: Record<string, string> = {};

  // Site
  if (filters.site !== undefined) {
    params.site = isArray(filters.site) 
      ? filters.site.join(',') 
      : filters.site.toString();
  }

  // Zone
  if (filters.zone !== undefined) {
    params.zone = isArray(filters.zone) 
      ? filters.zone.join(',') 
      : filters.zone;
  }

  // État
  if (filters.state && filters.state.length > 0) {
    params.state = filters.state.join(',');
  }

  // Plages
  if (filters.surfaceRange) {
    params.surface_min = filters.surfaceRange[0].toString();
    params.surface_max = filters.surfaceRange[1].toString();
  }

  if (filters.diameterRange) {
    params.diameter_min = filters.diameterRange[0].toString();
    params.diameter_max = filters.diameterRange[1].toString();
  }

  if (filters.depthRange) {
    params.depth_min = filters.depthRange[0].toString();
    params.depth_max = filters.depthRange[1].toString();
  }

  if (filters.densityRange) {
    params.density_min = filters.densityRange[0].toString();
    params.density_max = filters.densityRange[1].toString();
  }

  // Dates
  if (filters.lastInterventionStart) {
    params.last_intervention_start = filters.lastInterventionStart.toISOString().split('T')[0];
  }

  if (filters.lastInterventionEnd) {
    params.last_intervention_end = filters.lastInterventionEnd.toISOString().split('T')[0];
  }

  if (filters.neverIntervened) {
    params.never_intervened = 'true';
  }

  if (filters.urgentMaintenance) {
    params.urgent_maintenance = 'true';
  }

  // Famille
  if (filters.family !== undefined) {
    params.family = isArray(filters.family) 
      ? filters.family.join(',') 
      : filters.family;
  }

  // Taille
  if (filters.size && filters.size.length > 0) {
    params.size = filters.size.join(',');
  }

  // Matériau
  if (filters.material !== undefined) {
    params.material = isArray(filters.material) 
      ? filters.material.join(',') 
      : filters.material;
  }

  // Type d'équipement
  if (filters.equipmentType !== undefined) {
    params.equipment_type = isArray(filters.equipmentType) 
      ? filters.equipmentType.join(',') 
      : filters.equipmentType;
  }

  // Recherche
  if (filters.search) {
    params.search = filters.search;
  }

  return params;
}

/**
 * Compte le nombre de filtres actifs
 */
export function countActiveFilters(filters: AdvancedFilters): number {
  let count = 0;

  if (filters.site !== undefined) count++;
  if (filters.zone !== undefined) count++;
  if (filters.state && filters.state.length > 0) count++;
  if (filters.surfaceRange) count++;
  if (filters.diameterRange) count++;
  if (filters.depthRange) count++;
  if (filters.densityRange) count++;
  if (filters.lastInterventionStart || filters.lastInterventionEnd) count++;
  if (filters.neverIntervened) count++;
  if (filters.urgentMaintenance) count++;
  if (filters.family !== undefined) count++;
  if (filters.size && filters.size.length > 0) count++;
  if (filters.material !== undefined) count++;
  if (filters.equipmentType !== undefined) count++;
  if (filters.search) count++;

  return count;
}

/**
 * Génère un label lisible pour un filtre
 */
export function getFilterLabel(key: keyof AdvancedFilters, value: any): string {
  switch (key) {
    case 'site':
      return `Site: ${isArray(value) ? value.length + ' sites' : 'ID ' + value}`;
    case 'zone':
      return `Zone: ${isArray(value) ? value.join(', ') : value}`;
    case 'state':
      return `État: ${isArray(value) ? value.join(', ') : value}`;
    case 'surfaceRange':
      return `Surface: ${value[0]}-${value[1]} m²`;
    case 'diameterRange':
      return `Diamètre: ${value[0]}-${value[1]} cm`;
    case 'depthRange':
      return `Profondeur: ${value[0]}-${value[1]} m`;
    case 'densityRange':
      return `Densité: ${value[0]}-${value[1]}`;
    case 'lastInterventionStart':
    case 'lastInterventionEnd':
      return `Intervention: ${value.toLocaleDateString('fr-FR')}`;
    case 'neverIntervened':
      return 'Jamais intervenu';
    case 'urgentMaintenance':
      return 'Maintenance urgente';
    case 'family':
      return `Famille: ${isArray(value) ? value.join(', ') : value}`;
    case 'size':
      return `Taille: ${isArray(value) ? value.join(', ') : value}`;
    case 'material':
      return `Matériau: ${isArray(value) ? value.join(', ') : value}`;
    case 'equipmentType':
      return `Type: ${isArray(value) ? value.join(', ') : value}`;
    case 'search':
      return `Recherche: "${value}"`;
    default:
      return String(value);
  }
}
