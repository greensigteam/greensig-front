/**
 * Service API pour communication avec le backend Django
 *
 * Base URL configurée via .env (VITE_API_BASE_URL)
 */

export const hasExistingToken = () => {
  return !!localStorage.getItem('token');
};

import logger from './logger';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// Wrapper fetch pour ajouter automatiquement le token
export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  } as HeadersInit;

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expiré ou invalide
    console.warn('Token invalide ou expiré, redirection login...');
    localStorage.removeItem('token');
    window.location.href = '/';
  }

  return response;
}

export async function fetchCurrentUser(): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/users/me/`);
  return handleResponse(response);
}

// ==============================================================================
// GESTION DES ERREURS
// ==============================================================================

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.detail || errorData.message || errorMessage
      throw new ApiError(errorMessage, response.status, errorData)
    } catch (e) {
      if (e instanceof ApiError) throw e
      throw new ApiError(errorMessage, response.status)
    }
  }
  return response.json()
}

// ==============================================================================
// SITES
// ==============================================================================

// Structure GeoJSON retournée par l'API backend
export interface SiteGeoJSON {
  type: 'Feature'
  id: number
  geometry: {
    type: 'Polygon'
    coordinates: number[][][]
  }
  properties: {
    nom_site: string
    code_site: string
    adresse?: string
    superficie_totale?: number
    actif: boolean
    date_debut_contrat?: string
    date_fin_contrat?: string
    centroid?: {
      type: 'Point'
      coordinates: [number, number]
    }
  }
}

export interface SiteResponse {
  count: number
  next: string | null
  previous: string | null
  results: {
    type: 'FeatureCollection'
    features: SiteGeoJSON[]
  } | SiteGeoJSON[]
}

// Structure frontend compatible (utilisée dans toute l'application)
export interface SiteFrontend {
  id: string
  name: string
  coordinates: { lat: number; lng: number }
  description: string
  category: 'RECHERCHE' | 'INFRASTRUCTURE' | 'RESIDENCE' | 'SANTE' | 'HOTELLERIE'
  color: string
  // Données supplémentaires de l'API
  code_site?: string
  adresse?: string
  superficie_totale?: number
  actif?: boolean
  date_debut_contrat?: string
  date_fin_contrat?: string
  geometry?: {
    type: 'Polygon'
    coordinates: number[][][]
  }
}

// Couleurs par défaut pour les catégories
const CATEGORY_COLORS: Record<string, string> = {
  'RECHERCHE': '#8b5cf6',
  'INFRASTRUCTURE': '#3b82f6',
  'RESIDENCE': '#10b981',
  'SANTE': '#ef4444',
  'HOTELLERIE': '#f59e0b',
  'DEFAULT': '#6b7280'
}

// Palette de couleurs pour sites sans catégorie
const SITE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

/**
 * Calcule le centroïde d'un polygone GeoJSON
 */
function calculatePolygonCentroid(coordinates: number[][][]): { lat: number; lng: number } {
  const ring = coordinates[0] // Premier anneau (extérieur)
  if (!ring || ring.length === 0) {
    return { lat: 0, lng: 0 }
  }

  let sumLng = 0
  let sumLat = 0
  const n = ring.length - 1 // Exclure le point de fermeture (dernier = premier)

  for (let i = 0; i < n; i++) {
    const coord = ring[i];
    if (coord) {
      sumLng += coord[0];
      sumLat += coord[1];
    }
  }

  return {
    lng: sumLng / n,
    lat: sumLat / n
  }
}

/**
 * Détermine la catégorie d'un site basée sur son nom ou code
 */
function inferCategory(site: SiteGeoJSON): SiteFrontend['category'] {
  const name = (site.properties.nom_site || '').toLowerCase()
  const code = (site.properties.code_site || '').toLowerCase()
  const combined = `${name} ${code}`

  if (combined.includes('recherche') || combined.includes('lab') || combined.includes('phenotyp') || combined.includes('dice')) {
    return 'RECHERCHE'
  }
  if (combined.includes('hopital') || combined.includes('sante') || combined.includes('geriatrie') || combined.includes('clinic')) {
    return 'SANTE'
  }
  if (combined.includes('hotel') || combined.includes('hilton') || combined.includes('hebergement')) {
    return 'HOTELLERIE'
  }
  if (combined.includes('villa') || combined.includes('residence') || combined.includes('logement') || combined.includes('locatif')) {
    return 'RESIDENCE'
  }
  return 'INFRASTRUCTURE'
}

/**
 * Transforme un site GeoJSON en format frontend
 */
function transformSiteToFrontend(site: SiteGeoJSON, index: number): SiteFrontend {
  // Calculer les coordonnées (centroïde ou depuis centroid pré-calculé)
  let coordinates: { lat: number; lng: number }

  if (site.properties.centroid?.coordinates) {
    coordinates = {
      lng: site.properties.centroid.coordinates[0],
      lat: site.properties.centroid.coordinates[1]
    }
  } else if (site.geometry?.coordinates) {
    coordinates = calculatePolygonCentroid(site.geometry.coordinates)
  } else {
    coordinates = { lat: 0, lng: 0 }
  }

  const category = inferCategory(site)
  const color = CATEGORY_COLORS[category] || SITE_COLORS[index % SITE_COLORS.length]

  return {
    id: String(site.id),
    name: site.properties.nom_site,
    coordinates,
    description: site.properties.adresse || `Site ${site.properties.code_site}`,
    category,
    color,
    code_site: site.properties.code_site,
    adresse: site.properties.adresse,
    superficie_totale: site.properties.superficie_totale,
    actif: site.properties.actif,
    date_debut_contrat: site.properties.date_debut_contrat,
    date_fin_contrat: site.properties.date_fin_contrat,
    geometry: site.geometry
  }
}

// Cache pour les sites chargés
let sitesCache: SiteFrontend[] | null = null
let sitesCacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Charge tous les sites depuis l'API et les transforme en format frontend
 * Utilise un cache de 5 minutes pour éviter les requêtes répétées
 */
export async function fetchAllSites(forceRefresh = false): Promise<SiteFrontend[]> {
  // Vérifier le cache
  const now = Date.now()
  if (!forceRefresh && sitesCache && (now - sitesCacheTimestamp) < CACHE_DURATION) {
    return sitesCache
  }

  try {
    const allSites: SiteGeoJSON[] = []
    let page = 1
    let hasMore = true

    // Charger toutes les pages
    while (hasMore) {
      const response = await apiFetch(`${API_BASE_URL}/sites/?page=${page}`)
      const data = await handleResponse<SiteResponse>(response)

      // Gérer les deux formats possibles (avec ou sans FeatureCollection)
      let features: SiteGeoJSON[]
      if (data.results && 'type' in data.results && data.results.type === 'FeatureCollection') {
        features = data.results.features
      } else if (Array.isArray(data.results)) {
        features = data.results
      } else {
        features = []
      }

      allSites.push(...features)

      hasMore = data.next !== null
      page++

      // Sécurité : max 10 pages
      if (page > 10) break
    }

    // Transformer en format frontend
    const transformedSites = allSites.map((site, index) => transformSiteToFrontend(site, index))

    // Mettre en cache
    sitesCache = transformedSites
    sitesCacheTimestamp = now

    logger.info(`Sites chargés: ${transformedSites.length} sites depuis l'API`)
    return transformedSites

  } catch (error) {
    logger.error('Erreur fetchAllSites:', error)

    // Retourner le cache même expiré en cas d'erreur
    if (sitesCache) {
      logger.warn('Utilisation du cache expiré suite à une erreur')
      return sitesCache
    }

    throw error
  }
}

/**
 * Recherche un site par ID (utilise le cache)
 */
export async function getSiteById(id: string): Promise<SiteFrontend | undefined> {
  const sites = await fetchAllSites()
  return sites.find(site => site.id === id)
}

/**
 * Recherche des sites par catégorie (utilise le cache)
 */
export async function getSitesByCategory(category: SiteFrontend['category']): Promise<SiteFrontend[]> {
  const sites = await fetchAllSites()
  return sites.filter(site => site.category === category)
}

/**
 * Recherche textuelle dans les sites (nom, description, code)
 */
export async function searchSites(query: string): Promise<SiteFrontend[]> {
  if (query.length < 2) return []

  const sites = await fetchAllSites()
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  return sites.filter(site => {
    const searchText = `${site.name} ${site.description} ${site.code_site || ''}`.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return searchText.includes(normalizedQuery)
  })
}

/**
 * Vide le cache des sites (utile après une modification)
 */
export function clearSitesCache() {
  sitesCache = null
  sitesCacheTimestamp = 0
}

// Anciennes fonctions conservées pour compatibilité
export async function fetchSites(page = 1): Promise<SiteResponse> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/sites/?page=${page}`)
    return handleResponse<SiteResponse>(response)
  } catch (error) {
    logger.error('Erreur fetchSites:', error)
    throw error
  }
}

export async function fetchSiteById(id: number) {
  try {
    const response = await apiFetch(`${API_BASE_URL}/sites/${id}/`)
    return handleResponse(response)
  } catch (error) {
    logger.error(`Erreur fetchSiteById(${id}):`, error)
    throw error
  }
}

// ==============================================================================
// INVENTAIRE UNIFIÉ (15 types combinés)
// ==============================================================================

export interface InventoryFilters {
  type?: string      // 'Arbre', 'Gazon', 'Puit', etc.
  site?: number
  search?: string    // Recherche textuelle
  page?: number
  page_size?: number // Taille de la page (défaut: 50)
}

export interface InventoryResponse {
  count: number
  next: string | null
  previous: string | null
  results: Array<{
    type: 'Feature'
    id: number
    geometry: {
      type: 'Point' | 'Polygon' | 'LineString'
      coordinates: number[] | number[][] | number[][][]
    }
    properties: {
      object_type: string  // Type d'objet ('Arbre', 'Gazon', etc.)
      nom?: string
      famille?: string
      site_nom: string
      sous_site_nom?: string
      [key: string]: any   // Propriétés spécifiques au type
    }
  }>
}

export async function fetchInventory(filters?: Record<string, string | number>): Promise<InventoryResponse> {
  try {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        params.append(key, String(value));
      });
    }

    const url = `${API_BASE_URL}/inventory/?${params}`;
    const response = await apiFetch(url);
    return handleResponse<InventoryResponse>(response);
  } catch (error) {
    logger.error('Erreur fetchInventory:', error);
    throw error;
  }
}

const typeToPathMap: Record<string, string> = {
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

export async function fetchInventoryItem(objectType: string, objectId: string): Promise<any> {
  const pathSegment = typeToPathMap[objectType.toLowerCase()];

  // If type is not in the mapping (e.g., 'equipement'), use the unified inventory endpoint
  if (!pathSegment) {
    logger.info(`Type inconnu '${objectType}', utilisation de l'endpoint unifié`);
    try {
      const response = await fetchInventory({ id: parseInt(objectId) });
      if (response.results && response.results.length > 0) {
        return response.results[0]; // Return the first (and should be only) result
      } else {
        const errorMessage = `Objet non trouvé avec ID: ${objectId}`;
        logger.error(errorMessage);
        throw new ApiError(errorMessage, 404);
      }
    } catch (error) {
      logger.error(`Erreur fetchInventoryItem via unified endpoint (${objectType}, ${objectId}):`, error);
      throw error;
    }
  }

  // Otherwise, use the type-specific endpoint
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
// ENDPOINTS SPÉCIFIQUES PAR TYPE (optionnel, si besoin)
// ==============================================================================

export async function fetchArbres(filters?: { page?: number; taille?: string; famille?: string; site?: number }) {
  const params = new URLSearchParams()
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.taille) params.append('taille', filters.taille)
  if (filters?.famille) params.append('famille__icontains', filters.famille)
  if (filters?.site) params.append('site', filters.site.toString())

  const response = await apiFetch(`${API_BASE_URL}/arbres/?${params}`)
  return handleResponse(response)
}

export async function fetchGazons(filters?: { page?: number; site?: number }) {
  const params = new URLSearchParams()
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.site) params.append('site', filters.site.toString())

  const response = await apiFetch(`${API_BASE_URL}/gazons/?${params}`)
  return handleResponse(response)
}

// Ajouter d'autres endpoints si nécessaire (palmiers, puits, etc.)

// ==============================================================================
// RECHERCHE
// ==============================================================================

export interface SearchResult {
  id: string
  name: string
  type: string
  location: {
    type: 'Point'
    coordinates: [number, number]  // [lng, lat]
  } | null
}

export async function searchObjects(query: string): Promise<SearchResult[]> {
  if (query.length < 2) return []

  try {
    const response = await apiFetch(`${API_BASE_URL}/search/?q=${encodeURIComponent(query)}`)
    return handleResponse<SearchResult[]>(response)
  } catch (error) {
    logger.error('Erreur searchObjects:', error)
    throw error
  }
}

// ==============================================================================
// STATISTIQUES
// ==============================================================================

export interface Statistics {
  hierarchy: {
    total_sites: number
    total_sous_sites: number
    active_sites: number
  }
  vegetation: {
    arbres: {
      total: number
      by_taille: Record<string, number>
      top_families: Array<{ famille: string; count: number }>
    }
    gazons: {
      total: number
      total_area_sqm: number
    }
    palmiers: {
      total: number
      by_taille: Record<string, number>
    }
    // ... autres types
  }
  hydraulique: {
    puits: {
      total: number
      avg_profondeur: number
      max_profondeur: number
    }
    pompes: {
      total: number
      avg_puissance: number
      avg_debit: number
    }
    // ... autres types
  }
  global: {
    total_objets: number
    total_vegetation: number
    total_hydraulique: number
  }
}

export async function fetchStatistics(): Promise<Statistics> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/statistics/`)
    return handleResponse<Statistics>(response)
  } catch (error) {
    logger.error('Erreur fetchStatistics:', error)
    throw error
  }
}

// ==============================================================================
// EXPORT PDF
// ==============================================================================

export interface ExportPDFRequest {
  title: string
  mapImageBase64: string
  visibleLayers: Record<string, boolean>
  center: [number, number]  // [lng, lat]
  zoom: number
}

export async function exportPDF(data: ExportPDFRequest): Promise<Blob> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/export/pdf/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new ApiError(`Erreur export PDF: ${response.status}`, response.status)
    }

    return response.blob()
  } catch (error) {
    logger.error('Erreur exportPDF:', error)
    throw error
  }
}

// ==============================================================================
// EXPORT DONNÉES (CSV/Excel)
// ==============================================================================

export async function exportData(
  model: string,  // 'arbres', 'gazons', 'puits', etc.
  format: 'csv' | 'xlsx'
): Promise<Blob> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/export/${model}/?format=${format}`)

    if (!response.ok) {
      throw new ApiError(`Erreur export ${format.toUpperCase()}: ${response.status}`, response.status)
    }

    return response.blob()
  } catch (error) {
    logger.error(`Erreur exportData(${model}, ${format}):`, error)
    throw error
  }
}

// ==============================================================================
// UTILITAIRES
// ==============================================================================

/**
 * Télécharge un blob en tant que fichier
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Transforme les coordonnées GeoJSON [lng, lat] en {lat, lng}
 */
export function geoJSONToLatLng(coords: [number, number]): { lat: number; lng: number } {
  return {
    lat: coords[1],
    lng: coords[0],
  }
}

/**
 * Transforme {lat, lng} en coordonnées GeoJSON [lng, lat]
 */
export function latLngToGeoJSON(latLng: { lat: number; lng: number }): [number, number] {
  return [latLng.lng, latLng.lat]
}

/**
 * Update an inventory item
 * @param objectType - Type of object (arbre, gazon, puit, etc.)
 * @param objectId - ID of the object
 * @param data - Partial object data to update
 * @returns Updated object in GeoJSON format
 */
export async function updateInventoryItem(
  objectType: string,
  objectId: string,
  data: Partial<any>
): Promise<any> {
  const endpoint = typeToPathMap[objectType.toLowerCase()];

  if (!endpoint) {
    throw new ApiError(`Type d'objet non supporté: ${objectType}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}/${objectId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return await handleResponse<any>(response);
  } catch (error) {
    logger.error(`Error updating ${objectType} #${objectId}:`, error);
    throw error;
  }
}

// Exporter l'erreur pour usage dans les composants
export { ApiError }

// ==============================================================================
// OPTIONS DE FILTRAGE
// ==============================================================================

export interface FilterOptions {
  sites: Array<{ id: number; name: string }>
  zones: string[]
  families: string[]
  materials: string[]
  sizes: string[]
  states: string[]
}

export async function fetchFilterOptions(type?: string): Promise<FilterOptions> {
  const params = new URLSearchParams()
  if (type) params.append('type', type)

  try {
    const url = `${API_BASE_URL}/inventory/filter-options/?${params}`;
    const response = await apiFetch(url)
    return handleResponse<FilterOptions>(response)
  } catch (error) {
    logger.error('Erreur fetchFilterOptions:', error)
    // Return empty options on error to prevent UI crash
    return {
      sites: [],
      zones: [],
      families: [],
      materials: [],
      sizes: [],
      states: []
    }
  }
}

// ==============================================================================
// CRÉATION D'OBJETS (DESSIN)
// ==============================================================================

export interface CreateInventoryItemData {
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
    coordinates: number[] | number[][] | number[][][] | number[][][][];
  };
  site_id: number;
  sous_site_id?: number;
  properties: Record<string, any>;
}

/**
 * Create a new inventory item
 * @param objectType - Type of object (Arbre, Gazon, Puit, etc.)
 * @param data - Object data including geometry and properties
 * @returns Created object in GeoJSON format
 */
export async function createInventoryItem(
  objectType: string,
  data: CreateInventoryItemData
): Promise<any> {
  const endpoint = typeToPathMap[objectType.toLowerCase()];

  if (!endpoint) {
    throw new ApiError(`Type d'objet non supporté: ${objectType}`);
  }

  try {
    // Build the request body in GeoJSON format expected by DRF-GIS
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

    return await handleResponse<any>(response);
  } catch (error) {
    logger.error(`Error creating ${objectType}:`, error);
    throw error;
  }
}

/**
 * Delete an inventory item
 * @param objectType - Type of object (arbre, gazon, puit, etc.)
 * @param objectId - ID of the object
 */
export async function deleteInventoryItem(
  objectType: string,
  objectId: string
): Promise<void> {
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

// ==============================================================================
// OPÉRATIONS GÉOMÉTRIQUES
// ==============================================================================

export interface GeometryOperationResult {
  geometry?: any;
  geometries?: any[];
  stats?: Record<string, any>;
  metrics?: Record<string, any>;
  error?: string;
}

/**
 * Simplify a geometry
 */
export async function simplifyGeometry(
  geometry: any,
  tolerance: number = 0.0001,
  preserveTopology: boolean = true
): Promise<GeometryOperationResult> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/geometry/simplify/`, {
      method: 'POST',
      body: JSON.stringify({
        geometry,
        tolerance,
        preserve_topology: preserveTopology,
      }),
    });
    return handleResponse<GeometryOperationResult>(response);
  } catch (error) {
    logger.error('Error simplifying geometry:', error);
    throw error;
  }
}

/**
 * Calculate geometry metrics (area, length, perimeter)
 */
export async function calculateGeometryMetrics(
  geometry: any
): Promise<GeometryOperationResult> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/geometry/calculate/`, {
      method: 'POST',
      body: JSON.stringify({ geometry }),
    });
    return handleResponse<GeometryOperationResult>(response);
  } catch (error) {
    logger.error('Error calculating geometry metrics:', error);
    throw error;
  }
}

/**
 * Validate a geometry
 */
export async function validateGeometry(
  geometry: any,
  options?: {
    targetType?: string;
    siteId?: number;
    checkDuplicates?: boolean;
    checkWithinSite?: boolean;
  }
): Promise<any> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/geometry/validate/`, {
      method: 'POST',
      body: JSON.stringify({
        geometry,
        target_type: options?.targetType,
        site_id: options?.siteId,
        check_duplicates: options?.checkDuplicates,
        check_within_site: options?.checkWithinSite,
      }),
    });
    return handleResponse<any>(response);
  } catch (error) {
    logger.error('Error validating geometry:', error);
    throw error;
  }
}

/**
 * Create a buffer around a geometry
 */
export async function bufferGeometry(
  geometry: any,
  distanceMeters: number
): Promise<GeometryOperationResult> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/geometry/buffer/`, {
      method: 'POST',
      body: JSON.stringify({
        geometry,
        distance: distanceMeters,
      }),
    });
    return handleResponse<GeometryOperationResult>(response);
  } catch (error) {
    logger.error('Error creating buffer:', error);
    throw error;
  }
}

/**
 * Merge multiple polygons
 */
export async function mergePolygons(
  polygons: any[]
): Promise<GeometryOperationResult> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/geometry/merge/`, {
      method: 'POST',
      body: JSON.stringify({ polygons }),
    });
    return handleResponse<GeometryOperationResult>(response);
  } catch (error) {
    logger.error('Error merging polygons:', error);
    throw error;
  }
}

/**
 * Split a polygon with a line
 */
export async function splitPolygon(
  polygon: any,
  splitLine: any
): Promise<GeometryOperationResult> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/geometry/split/`, {
      method: 'POST',
      body: JSON.stringify({
        polygon,
        split_line: splitLine,
      }),
    });
    return handleResponse<GeometryOperationResult>(response);
  } catch (error) {
    logger.error('Error splitting polygon:', error);
    throw error;
  }
}

// ==============================================================================
// IMPORT GÉOGRAPHIQUE
// ==============================================================================

export type ImportFormat = 'geojson' | 'kml' | 'shapefile' | 'auto';

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
    geometry_type: string;
    mapped_properties: Record<string, any>;
  }>;
}

export interface ImportExecuteResponse {
  created: number[];
  errors: Array<{
    index: number;
    error: string;
  }>;
  summary: {
    total: number;
    created: number;
    failed: number;
  };
}

export interface AttributeMapping {
  [targetField: string]: string | null; // source field name or null
}

/**
 * Preview an import file - upload and get features preview
 * @param file - File to import (GeoJSON, KML, or Shapefile ZIP)
 * @param format - Format hint ('auto' for auto-detection)
 */
export async function importPreview(
  file: File,
  format: ImportFormat = 'auto'
): Promise<ImportPreviewResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('format', format);

  try {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData - browser will set it with boundary

    const response = await fetch(`${API_BASE_URL}/import/preview/`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return handleResponse<ImportPreviewResponse>(response);
  } catch (error) {
    logger.error('Error previewing import:', error);
    throw error;
  }
}

/**
 * Validate import features with attribute mapping
 * @param features - Features from preview
 * @param targetType - Target object type (Arbre, Gazon, etc.)
 * @param mapping - Attribute mapping configuration
 * @param siteId - Target site ID
 */
export async function importValidate(
  features: ImportFeature[],
  targetType: string,
  mapping: AttributeMapping,
  siteId: number
): Promise<ImportValidationResponse> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/import/validate/`, {
      method: 'POST',
      body: JSON.stringify({
        features,
        target_type: targetType,
        mapping,
        site_id: siteId,
      }),
    });

    return handleResponse<ImportValidationResponse>(response);
  } catch (error) {
    logger.error('Error validating import:', error);
    throw error;
  }
}

/**
 * Execute import - create objects in database
 * @param features - Validated features
 * @param targetType - Target object type
 * @param mapping - Attribute mapping
 * @param siteId - Target site ID
 * @param sousSiteId - Optional sous-site ID
 */
export async function importExecute(
  features: ImportFeature[],
  targetType: string,
  mapping: AttributeMapping,
  siteId: number,
  sousSiteId?: number
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
      }),
    });

    return handleResponse<ImportExecuteResponse>(response);
  } catch (error) {
    logger.error('Error executing import:', error);
    throw error;
  }
}

// ==============================================================================
// EXPORT GÉOGRAPHIQUE
// ==============================================================================

export type ExportFormat = 'csv' | 'xlsx' | 'geojson' | 'kml' | 'shapefile';

/**
 * Export data in various formats
 * @param modelName - Model to export (arbres, gazons, etc.)
 * @param format - Export format
 * @param ids - Optional list of IDs to export (if not provided, exports all)
 */
export async function exportGeoData(
  modelName: string,
  format: ExportFormat,
  ids?: number[]
): Promise<Blob> {
  try {
    const params = new URLSearchParams();
    params.append('format', format);
    if (ids && ids.length > 0) {
      params.append('ids', ids.join(','));
    }

    const response = await apiFetch(`${API_BASE_URL}/export/${modelName}/?${params}`);

    if (!response.ok) {
      throw new ApiError(`Erreur export ${format.toUpperCase()}: ${response.status}`, response.status);
    }

    return response.blob();
  } catch (error) {
    logger.error(`Error exporting ${modelName} as ${format}:`, error);
    throw error;
  }
}

/**
 * Export selected inventory items
 * @param objectType - Type of objects
 * @param ids - List of object IDs
 * @param format - Export format
 */
export async function exportSelection(
  objectType: string,
  ids: number[],
  format: ExportFormat
): Promise<Blob> {
  const endpoint = typeToPathMap[objectType.toLowerCase()];
  if (!endpoint) {
    throw new ApiError(`Type d'objet non supporté: ${objectType}`);
  }

  return exportGeoData(endpoint, format, ids);
}

/**
 * Get file extension for export format
 */
export function getExportFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'csv': return '.csv';
    case 'xlsx': return '.xlsx';
    case 'geojson': return '.geojson';
    case 'kml': return '.kml';
    case 'shapefile': return '.zip';
    default: return '.dat';
  }
}

/**
 * Get MIME type for export format
 */
export function getExportMimeType(format: ExportFormat): string {
  switch (format) {
    case 'csv': return 'text/csv';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'geojson': return 'application/geo+json';
    case 'kml': return 'application/vnd.google-earth.kml+xml';
    case 'shapefile': return 'application/zip';
    default: return 'application/octet-stream';
  }
}
