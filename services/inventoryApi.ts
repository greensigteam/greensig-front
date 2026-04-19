import logger from './logger';
import { apiFetch, handleResponse, ApiError, typeToPathMap } from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// ==============================================================================
// TYPES
// ==============================================================================

export interface InventoryFilters {
  type?: string;
  site?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface InventoryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{
    type: 'Feature';
    id: number;
    geometry: {
      type: 'Point' | 'Polygon' | 'LineString';
      coordinates: number[] | number[][] | number[][][];
    };
    properties: {
      object_type: string;
      nom?: string;
      famille?: string;
      site_nom: string;
      sous_site_nom?: string;
      etat?: string;
      [key: string]: any;
    };
  }>;
}

export interface FilterOptions {
  sites: Array<{ id: number; name: string }>;
  zones: string[];
  families: string[];
  materials: string[];
  sizes: string[];
  states: string[];
}

export interface SelectIdItem {
  id: number;
  type_objet: string;
  display_name: string;
  site_id: number;
  nom_site: string;
  sous_site_id: number | null;
  sous_site_nom: string | null;
  etat: string;
}

export interface CreateInventoryItemData {
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
    coordinates: number[] | number[][] | number[][][] | number[][][][];
  };
  site_id: number;
  sous_site_id?: number;
  properties: Record<string, any>;
}

export interface BulkDeleteResponse {
  deleted?: number;
  async: boolean;
  task_id?: string;
  total?: number;
  message?: string;
}

// ==============================================================================
// FETCH
// ==============================================================================

export async function fetchMapData(bbox: string, types: string, zoom: number): Promise<any> {
  try {
    const response = await apiFetch(
      `${API_BASE_URL}/map/?bbox=${bbox}&types=${types}&zoom=${zoom}`,
    );
    const data = await handleResponse<any>(response);
    return data;
  } catch (error) {
    logger.error('Erreur fetchMapData:', error);
    throw error;
  }
}

export async function fetchInventory(
  filters?: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<InventoryResponse> {
  try {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        params.append(key, String(value));
      });
    }

    const url = `${API_BASE_URL}/inventory/?${params}`;
    const response = await apiFetch(url, { signal });
    return handleResponse<InventoryResponse>(response);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    logger.error('Erreur fetchInventory:', error);
    throw error;
  }
}

export async function fetchInventoryItem(objectType: string, objectId: string): Promise<any> {
  const pathSegment = typeToPathMap[objectType.toLowerCase()];

  if (!pathSegment) {
    logger.info(`Type inconnu '${objectType}', utilisation de l'endpoint unifié`);
    try {
      const response = await fetchInventory({ id: parseInt(objectId) });
      if (response.results && response.results.length > 0) {
        return response.results[0];
      } else {
        const errorMessage = `Objet non trouvé avec ID: ${objectId}`;
        logger.error(errorMessage);
        throw new ApiError(errorMessage, 404);
      }
    } catch (error) {
      logger.error(
        `Erreur fetchInventoryItem via unified endpoint (${objectType}, ${objectId}):`,
        error,
      );
      throw error;
    }
  }

  try {
    const url = `${API_BASE_URL}/${pathSegment}/${objectId}/`;
    const response = await apiFetch(url);
    return handleResponse<any>(response);
  } catch (error) {
    logger.error(`Erreur fetchInventoryItem(${objectType}, ${objectId}):`, error);
    throw error;
  }
}

// ==============================================================================
// PER-TYPE ENDPOINTS
// ==============================================================================

export async function fetchArbres(filters?: {
  page?: number;
  taille?: string;
  famille?: string;
  site?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.taille) params.append('taille', filters.taille);
  if (filters?.famille) params.append('famille__icontains', filters.famille);
  if (filters?.site) params.append('site', filters.site.toString());

  const response = await apiFetch(`${API_BASE_URL}/arbres/?${params}`);
  return handleResponse(response);
}

export async function fetchGazons(filters?: { page?: number; site?: number }) {
  const params = new URLSearchParams();
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.site) params.append('site', filters.site.toString());

  const response = await apiFetch(`${API_BASE_URL}/gazons/?${params}`);
  return handleResponse(response);
}

// ==============================================================================
// FILTER OPTIONS
// ==============================================================================

export async function fetchInventorySelectIds(filters: {
  type?: string;
  site?: string;
  etat?: string;
  famille?: string;
  search?: string;
}): Promise<{ total: number; truncated: boolean; items: SelectIdItem[] }> {
  const params = new URLSearchParams();
  if (filters.type && filters.type !== 'all') params.append('type', filters.type);
  if (filters.site && filters.site !== 'all') params.append('site', filters.site);
  if (filters.etat && filters.etat !== 'all') params.append('etat', filters.etat);
  if (filters.famille && filters.famille !== 'all') params.append('famille', filters.famille);
  if (filters.search) params.append('search', filters.search);
  const url = `${API_BASE_URL}/inventory/select-ids/?${params.toString()}`;
  const response = await apiFetch(url);
  if (!response.ok) throw new ApiError(`Erreur select-ids: ${response.status}`, response.status);
  return response.json();
}

export async function fetchFilterOptions(type?: string): Promise<FilterOptions> {
  const params = new URLSearchParams();
  if (type) params.append('type', type);

  try {
    const url = `${API_BASE_URL}/inventory/filter-options/?${params}`;
    const response = await apiFetch(url);
    return handleResponse<FilterOptions>(response);
  } catch (error) {
    logger.error('Erreur fetchFilterOptions:', error);
    return {
      sites: [],
      zones: [],
      families: [],
      materials: [],
      sizes: [],
      states: [],
    };
  }
}

// ==============================================================================
// CRUD
// ==============================================================================

export async function createInventoryItem(
  objectType: string,
  data: CreateInventoryItemData,
): Promise<any> {
  const endpoint = typeToPathMap[objectType.toLowerCase()];

  if (!endpoint) {
    throw new ApiError(`Type d'objet non supporté: ${objectType}`);
  }

  try {
    const requestBody = {
      type: 'Feature',
      geometry: data.geometry,
      properties: {
        site: data.site_id,
        sous_site: data.sous_site_id || null,
        ...data.properties,
      },
    };

    const response = await apiFetch(`${API_BASE_URL}/${endpoint}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const result = await handleResponse<any>(response);
    return result;
  } catch (error) {
    logger.error(`Error creating ${objectType}:`, error);
    throw error;
  }
}

export async function updateInventoryItem(
  objectType: string,
  objectId: string,
  data: Partial<any>,
): Promise<any> {
  const endpoint = typeToPathMap[objectType.toLowerCase()];

  if (!endpoint) {
    throw new ApiError(`Type d'objet non supporté: ${objectType}`);
  }

  try {
    const response = await apiFetch(`${API_BASE_URL}/${endpoint}/${objectId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await handleResponse<any>(response);
    return result;
  } catch (error) {
    logger.error(`Error updating ${objectType} #${objectId}:`, error);
    throw error;
  }
}

export async function deleteInventoryItem(objectType: string, objectId: string): Promise<void> {
  const endpoint = typeToPathMap[objectType.toLowerCase()];

  if (!endpoint) {
    throw new ApiError(`Type d'objet non supporté: ${objectType}`);
  }

  try {
    const response = await apiFetch(`${API_BASE_URL}/${endpoint}/${objectId}/`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      throw new ApiError(`Erreur lors de la suppression: ${response.status}`, response.status);
    }
  } catch (error) {
    logger.error(`Error deleting ${objectType} #${objectId}:`, error);
    throw error;
  }
}

export async function bulkDeleteInventory(ids: number[]): Promise<BulkDeleteResponse> {
  const response = await apiFetch(`${API_BASE_URL}/inventory/bulk-delete/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  return handleResponse<BulkDeleteResponse>(response);
}

// ==============================================================================
// SEARCH
// ==============================================================================

export interface SearchResult {
  id: string;
  name: string;
  type: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  } | null;
}

export async function searchObjects(query: string): Promise<SearchResult[]> {
  if (query.length < 2) return [];

  try {
    const response = await apiFetch(`${API_BASE_URL}/search/?q=${encodeURIComponent(query)}`);
    return handleResponse<SearchResult[]>(response);
  } catch (error) {
    logger.error('Erreur searchObjects:', error);
    throw error;
  }
}
