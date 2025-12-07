/**
 * Service API pour communication avec le backend Django
 *
 * Base URL configurée via .env (VITE_API_BASE_URL)
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

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

export interface SiteResponse {
  count: number
  next: string | null
  previous: string | null
  results: Array<{
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
    }
  }>
}

export async function fetchSites(page = 1): Promise<SiteResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/sites/?page=${page}`)
    return handleResponse<SiteResponse>(response)
  } catch (error) {
    console.error('Erreur fetchSites:', error)
    throw error
  }
}

export async function fetchSiteById(id: number) {
  try {
    const response = await fetch(`${API_BASE_URL}/sites/${id}/`)
    return handleResponse(response)
  } catch (error) {
    console.error(`Erreur fetchSiteById(${id}):`, error)
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

export async function fetchInventory(filters?: InventoryFilters): Promise<InventoryResponse> {
  try {
    const params = new URLSearchParams()
    if (filters?.type) params.append('type', filters.type)
    if (filters?.site) params.append('site', filters.site.toString())
    if (filters?.search) params.append('search', filters.search)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.page_size) params.append('page_size', filters.page_size.toString())

    const url = `${API_BASE_URL}/inventory/?${params}`
    const response = await fetch(url)
    return handleResponse<InventoryResponse>(response)
  } catch (error) {
    console.error('Erreur fetchInventory:', error)
    throw error
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

  const response = await fetch(`${API_BASE_URL}/arbres/?${params}`)
  return handleResponse(response)
}

export async function fetchGazons(filters?: { page?: number; site?: number }) {
  const params = new URLSearchParams()
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.site) params.append('site', filters.site.toString())

  const response = await fetch(`${API_BASE_URL}/gazons/?${params}`)
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
    const response = await fetch(`${API_BASE_URL}/search/?q=${encodeURIComponent(query)}`)
    return handleResponse<SearchResult[]>(response)
  } catch (error) {
    console.error('Erreur searchObjects:', error)
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
    const response = await fetch(`${API_BASE_URL}/statistics/`)
    return handleResponse<Statistics>(response)
  } catch (error) {
    console.error('Erreur fetchStatistics:', error)
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
    const response = await fetch(`${API_BASE_URL}/export/pdf/`, {
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
    console.error('Erreur exportPDF:', error)
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
    const response = await fetch(`${API_BASE_URL}/export/${model}/?format=${format}`)

    if (!response.ok) {
      throw new ApiError(`Erreur export ${format.toUpperCase()}: ${response.status}`, response.status)
    }

    return response.blob()
  } catch (error) {
    console.error(`Erreur exportData(${model}, ${format}):`, error)
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

// Exporter l'erreur pour usage dans les composants
export { ApiError }
