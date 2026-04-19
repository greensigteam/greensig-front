/**
 * Service API — Core HTTP client avec JWT auth
 *
 * Les fonctions métier sont dans des fichiers dédiés :
 *   - siteApi.ts          (sites CRUD, recherche, détection)
 *   - inventoryApi.ts     (inventaire, objets, filtres, recherche)
 *   - geometryApi.ts      (opérations géométriques)
 *   - importExportApi.ts  (import/export PDF, Excel, GeoJSON, KML, Shapefile)
 *   - statisticsApi.ts    (tableau de bord, KPIs)
 *
 * Ce fichier ré-exporte tout pour compatibilité avec les imports existants.
 */

import logger from './logger';
import type { Utilisateur } from '../types/users';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// ==============================================================================
// AUTH TOKENS
// ==============================================================================

export const hasExistingToken = () => {
  return !!localStorage.getItem('token');
};

export const AUTH_LOGOUT_EVENT = 'auth:logout';

export function clearAuthTokens() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
}

// ==============================================================================
// GESTION DES ERREURS D'AUTORISATION (403)
// ==============================================================================

export const API_FORBIDDEN_EVENT = 'api:forbidden';

export interface ApiForbiddenEventDetail {
  url: string;
  message: string;
}

function emitForbiddenError(url: string, message: string) {
  const event = new CustomEvent<ApiForbiddenEventDetail>(API_FORBIDDEN_EVENT, {
    detail: { url, message },
  });
  window.dispatchEvent(event);
}

// ==============================================================================
// FETCH WRAPPER : token injection + refresh dédupliqué + timeout
// ==============================================================================

const DEFAULT_TIMEOUT_MS = 30_000;

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    clearAuthTokens();
    return null;
  }

  try {
    // Relative path so Vite proxy + MSW can both match; absolute VITE_API_BASE_URL
    // breaks test interception and isn't required at runtime (proxy handles it).
    const response = await fetch('/api/token/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.access);
      if (data.refresh) {
        localStorage.setItem('refreshToken', data.refresh);
      }
      return data.access;
    }

    clearAuthTokens();
    return null;
  } catch (error) {
    logger.error('Erreur refresh token:', error);
    clearAuthTokens();
    return null;
  }
}

function buildHeaders(token: string | null, options: RequestInit): HeadersInit {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function withTimeout(
  options: RequestInit,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void; isCallerAbort: () => boolean } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let callerAborted = false;

  if (options.signal) {
    if (options.signal.aborted) {
      callerAborted = true;
      controller.abort();
    } else {
      options.signal.addEventListener(
        'abort',
        () => {
          callerAborted = true;
          controller.abort();
        },
        { once: true },
      );
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
    isCallerAbort: () => callerAborted,
  };
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  const { signal, cleanup, isCallerAbort } = withTimeout(options, DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: buildHeaders(token, options),
      signal,
    });
  } catch (err) {
    cleanup();
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (isCallerAbort()) {
        // L'appelant a annulé la requête (ex: changement de page/onglet) → propager l'AbortError tel quel
        throw err;
      }
      // Timeout interne → convertir en erreur lisible
      throw new Error(`Requête expirée après ${DEFAULT_TIMEOUT_MS / 1000}s: ${url}`);
    }
    throw err;
  }
  cleanup();

  // 401 → tenter un refresh dédupliqué, puis rejouer la requête une fois
  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false;
      });
    }

    const newToken = await refreshPromise;
    refreshPromise = null;

    if (newToken) {
      const retryCtrl = withTimeout(options, DEFAULT_TIMEOUT_MS);
      try {
        response = await fetch(url, {
          ...options,
          headers: buildHeaders(newToken, options),
          signal: retryCtrl.signal,
        });
      } finally {
        retryCtrl.cleanup();
      }
    }
    // Si pas de newToken, clearAuthTokens a déjà émis 'auth:logout'.
  }

  if (response.status === 403) {
    logger.warn('Accès refusé (403):', url);
    let errorMessage = "Accès refusé - Vous n'avez pas les permissions nécessaires";
    try {
      const errorData = await response.clone().json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch {
      // Ignore JSON parse errors
    }
    emitForbiddenError(url, errorMessage);
  }

  return response;
}

export async function fetchCurrentUser(): Promise<Utilisateur> {
  const response = await apiFetch(`${API_BASE_URL}/users/me/`);
  return handleResponse<Utilisateur>(response);
}

// ==============================================================================
// GESTION DES ERREURS
// ==============================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
      throw new ApiError(errorMessage, response.status, errorData);
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(errorMessage, response.status);
    }
  }
  return response.json();
}

// ==============================================================================
// TYPE-TO-PATH MAP (shared by inventory, import/export)
// ==============================================================================

export const typeToPathMap: Record<string, string> = {
  arbre: 'arbres',
  palmier: 'palmiers',
  gazon: 'gazons',
  arbuste: 'arbustes',
  vivace: 'vivaces',
  cactus: 'cactus',
  graminee: 'graminees',
  puit: 'puits',
  pompe: 'pompes',
  vanne: 'vannes',
  clapet: 'clapets',
  canalisation: 'canalisations',
  aspersion: 'aspersions',
  goutte: 'gouttes',
  ballon: 'ballons',
};

// ==============================================================================
// UTILITAIRES
// ==============================================================================

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function geoJSONToLatLng(coords: [number, number]): { lat: number; lng: number } {
  return {
    lat: coords[1],
    lng: coords[0],
  };
}

export function latLngToGeoJSON(latLng: { lat: number; lng: number }): [number, number] {
  return [latLng.lng, latLng.lat];
}

// ==============================================================================
// API CLIENT OBJECT (axios-like interface)
// ==============================================================================

export const api = {
  async get(url: string, config?: { params?: Record<string, any> }) {
    let fullUrl = url;
    if (config?.params) {
      const params = new URLSearchParams();
      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      fullUrl = `${url}?${params.toString()}`;
    }
    const response = await apiFetch(fullUrl, { method: 'GET' });
    const data = await response.json();
    return { data };
  },

  async post(url: string, data?: any, config?: RequestInit) {
    const response = await apiFetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...config,
    });
    const responseData = await response.json();
    return { data: responseData };
  },

  async patch(url: string, data?: any, config?: RequestInit) {
    const response = await apiFetch(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...config,
    });
    const responseData = await response.json();
    return { data: responseData };
  },

  async put(url: string, data?: any, config?: RequestInit) {
    const response = await apiFetch(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...config,
    });
    const responseData = await response.json();
    return { data: responseData };
  },

  async delete(url: string, config?: RequestInit) {
    const response = await apiFetch(url, {
      method: 'DELETE',
      ...config,
    });
    if (response.status === 204) {
      return { data: null };
    }
    const data = await response.json();
    return { data };
  },
};

// ==============================================================================
// RE-EXPORTS — compatibilité avec les imports existants
// ==============================================================================

export {
  // siteApi
  fetchAllSites,
  getSiteById,
  getSitesByCategory,
  searchSites,
  fetchSites,
  fetchSiteById,
  detectSiteFromGeometry,
  createSite,
  updateSite,
  deleteSite,
} from './siteApi';
export type {
  SiteGeoJSON,
  SiteResponse,
  SiteFrontend,
  DetectedSiteResult,
  CreateSiteData,
  UpdateSiteData,
} from './siteApi';

export {
  // inventoryApi
  fetchMapData,
  fetchInventory,
  fetchInventoryItem,
  fetchArbres,
  fetchGazons,
  fetchInventorySelectIds,
  fetchFilterOptions,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  bulkDeleteInventory,
  searchObjects,
} from './inventoryApi';
export type {
  InventoryFilters,
  InventoryResponse,
  FilterOptions,
  SelectIdItem,
  CreateInventoryItemData,
  BulkDeleteResponse,
  SearchResult,
} from './inventoryApi';

export {
  // geometryApi
  simplifyGeometry,
  calculateGeometryMetrics,
  validateGeometry,
  bufferGeometry,
  mergePolygons,
  splitPolygon,
  getObjectsInGeometry,
} from './geometryApi';
export type {
  GeometryOperationResult,
  ObjectInGeometry,
  ObjectsInGeometryResponse,
} from './geometryApi';

export {
  // importExportApi
  exportPDF,
  exportData,
  exportInventoryExcel,
  exportInventoryPDF,
  exportGeoData,
  exportSelection,
  getExportFileExtension,
  getExportMimeType,
  importPreview,
  importValidate,
  importExecute,
} from './importExportApi';
export type {
  ExportPDFRequest,
  ExportFormat,
  ImportFormat,
  ImportMode,
  ImportFeature,
  ImportPreviewResponse,
  ImportValidationResponse,
  ImportExecuteResponse,
  AttributeMapping,
} from './importExportApi';

export {
  // statisticsApi
  fetchStatistics,
} from './statisticsApi';
export type { Statistics } from './statisticsApi';
