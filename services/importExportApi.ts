import logger from './logger';
import { apiFetch, handleResponse, ApiError } from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// ==============================================================================
// EXPORT TYPES
// ==============================================================================

export interface ExportPDFRequest {
  mapImageBase64: string;
  visibleLayers: Record<string, boolean>;
  center: [number, number];
  zoom: number;
  siteNames?: string[];
}

export type ExportFormat = 'xlsx' | 'geojson' | 'kml' | 'shapefile';

// ==============================================================================
// IMPORT TYPES
// ==============================================================================

export type ImportFormat = 'geojson' | 'kml' | 'shapefile' | 'auto';
export type ImportMode = 'create' | 'skip_duplicates' | 'replace';

export interface ImportFeature {
  index: number;
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: Record<string, any>;
  original_properties?: Record<string, any>;
}

export interface ImportPreviewResponse {
  format: string;
  feature_count: number;
  geometry_types: string[];
  sample_properties: string[];
  features: ImportFeature[];
  suggested_mapping?: Record<string, string>;
  bbox?: [number, number, number, number];
}

export interface ImportValidationResponse {
  valid_count: number;
  invalid_count: number;
  existing_count?: number;
  import_mode?: ImportMode;
  warnings: Array<{
    index: number;
    message: string;
    code: string;
  }>;
  errors: Array<{
    index: number;
    message: string;
    code: string;
  }>;
  features: Array<{
    index: number;
    is_valid: boolean;
    is_existing?: boolean;
    existing_match?: {
      id: number;
      nom: string;
      match_type: string;
    };
    geometry_type: string;
    mapped_properties: Record<string, any>;
    detected_site_name?: string;
    detected_site_id?: number;
  }>;
}

export interface ImportExecuteResponse {
  created: number[];
  updated?: number[];
  skipped?: number[];
  errors: Array<{
    index: number;
    error: string;
  }>;
  summary: {
    total: number;
    created: number;
    updated?: number;
    skipped?: number;
    failed: number;
  };
}

export interface AttributeMapping {
  [targetField: string]: string | null;
}

// ==============================================================================
// EXPORT FUNCTIONS
// ==============================================================================

export async function exportPDF(data: ExportPDFRequest): Promise<Blob> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/export/pdf/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new ApiError(`Erreur export PDF: ${response.status}`, response.status);
    }

    return response.blob();
  } catch (error) {
    logger.error('Erreur exportPDF:', error);
    throw error;
  }
}

export async function exportData(model: string, format: 'xlsx' = 'xlsx'): Promise<Blob> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/export/${model}/?format=${format}`);

    if (!response.ok) {
      throw new ApiError(
        `Erreur export ${format.toUpperCase()}: ${response.status}`,
        response.status,
      );
    }

    return response.blob();
  } catch (error) {
    logger.error(`Erreur exportData(${model}, ${format}):`, error);
    throw error;
  }
}

export async function exportInventoryExcel(filters: {
  types?: string[];
  site?: string;
  etat?: string;
  famille?: string;
  search?: string;
  ids?: number[];
}): Promise<Blob> {
  try {
    const params = new URLSearchParams();

    if (filters.ids && filters.ids.length > 0) {
      params.append('ids', filters.ids.join(','));
    } else {
      if (filters.types && filters.types.length > 0) {
        params.append('types', filters.types.join(','));
      }
      if (filters.site && filters.site !== 'all') {
        params.append('site', filters.site);
      }
      if (filters.etat && filters.etat !== 'all') {
        params.append('etat', filters.etat);
      }
      if (filters.famille && filters.famille !== 'all') {
        params.append('famille', filters.famille);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
    }

    const url = `${API_BASE_URL}/export/inventory/excel/?${params.toString()}`;
    const response = await apiFetch(url);

    if (!response.ok) {
      throw new ApiError(`Erreur export Excel inventaire: ${response.status}`, response.status);
    }

    return response.blob();
  } catch (error) {
    logger.error('Erreur exportInventoryExcel:', error);
    throw error;
  }
}

export async function exportInventoryPDF(filters: {
  types?: string[];
  site?: string;
  etat?: string;
  famille?: string;
  search?: string;
  ids?: number[];
}): Promise<Blob> {
  try {
    const params = new URLSearchParams();

    if (filters.ids && filters.ids.length > 0) {
      params.append('ids', filters.ids.join(','));
    } else {
      if (filters.types && filters.types.length > 0) {
        params.append('types', filters.types.join(','));
      }
      if (filters.site && filters.site !== 'all') {
        params.append('site', filters.site);
      }
      if (filters.etat && filters.etat !== 'all') {
        params.append('etat', filters.etat);
      }
      if (filters.famille && filters.famille !== 'all') {
        params.append('famille', filters.famille);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
    }

    const url = `${API_BASE_URL}/export/inventory/pdf/?${params.toString()}`;
    const response = await apiFetch(url);

    if (!response.ok) {
      throw new ApiError(`Erreur export PDF inventaire: ${response.status}`, response.status);
    }

    return response.blob();
  } catch (error) {
    logger.error('Erreur exportInventoryPDF:', error);
    throw error;
  }
}

export async function exportGeoData(
  modelName: string,
  format: ExportFormat,
  ids?: number[],
): Promise<Blob> {
  try {
    const params = new URLSearchParams();
    params.append('format', format);
    if (ids && ids.length > 0) {
      params.append('ids', ids.join(','));
    }

    const response = await apiFetch(`${API_BASE_URL}/export/${modelName}/?${params}`);

    if (!response.ok) {
      throw new ApiError(
        `Erreur export ${format.toUpperCase()}: ${response.status}`,
        response.status,
      );
    }

    return response.blob();
  } catch (error) {
    logger.error(`Error exporting ${modelName} as ${format}:`, error);
    throw error;
  }
}

export async function exportSelection(
  objectType: string,
  ids: number[],
  format: ExportFormat,
): Promise<Blob> {
  const { typeToPathMap } = await import('./api');
  const endpoint = typeToPathMap[objectType.toLowerCase()];
  if (!endpoint) {
    throw new ApiError(`Type d'objet non supporté: ${objectType}`);
  }

  return exportGeoData(endpoint, format, ids);
}

export function getExportFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'xlsx':
      return '.xlsx';
    case 'geojson':
      return '.geojson';
    case 'kml':
      return '.kml';
    case 'shapefile':
      return '.zip';
    default:
      return '.dat';
  }
}

export function getExportMimeType(format: ExportFormat): string {
  switch (format) {
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'geojson':
      return 'application/geo+json';
    case 'kml':
      return 'application/vnd.google-earth.kml+xml';
    case 'shapefile':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
}

// ==============================================================================
// IMPORT FUNCTIONS
// ==============================================================================

export async function importPreview(
  file: File,
  format: ImportFormat = 'auto',
): Promise<ImportPreviewResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('format', format);

  try {
    const response = await apiFetch(`${API_BASE_URL}/import/preview/`, {
      method: 'POST',
      body: formData,
    });

    return handleResponse<ImportPreviewResponse>(response);
  } catch (error) {
    logger.error('Error previewing import:', error);
    throw error;
  }
}

export async function importValidate(
  features: ImportFeature[],
  targetType: string,
  mapping: AttributeMapping,
  siteId: number | null,
  autoDetectSite: boolean = false,
  importMode: ImportMode = 'create',
): Promise<ImportValidationResponse> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/import/validate/`, {
      method: 'POST',
      body: JSON.stringify({
        features,
        target_type: targetType,
        mapping,
        site_id: siteId,
        auto_detect_site: autoDetectSite,
        import_mode: importMode,
      }),
    });

    return handleResponse<ImportValidationResponse>(response);
  } catch (error) {
    logger.error('Error validating import:', error);
    throw error;
  }
}

export async function importExecute(
  features: ImportFeature[],
  targetType: string,
  mapping: AttributeMapping,
  siteId: number | null,
  sousSiteId?: number,
  autoDetectSite: boolean = false,
  importMode: ImportMode = 'create',
): Promise<ImportExecuteResponse> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/import/execute/`, {
      method: 'POST',
      body: JSON.stringify({
        features,
        target_type: targetType,
        mapping,
        site_id: siteId,
        sous_site_id: sousSiteId,
        auto_detect_site: autoDetectSite,
        import_mode: importMode,
      }),
    });

    return handleResponse<ImportExecuteResponse>(response);
  } catch (error) {
    logger.error('Error executing import:', error);
    throw error;
  }
}
