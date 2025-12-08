/**
 * Service API pour communication avec le backend Django
 *
 * Base URL configurée via .env (VITE_API_BASE_URL)
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

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
    sumLng += ring[i][0]
    sumLat += ring[i][1]
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
      const response = await fetch(`${API_BASE_URL}/sites/?page=${page}`)
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

    console.log(`Sites chargés: ${transformedSites.length} sites depuis l'API`)
    return transformedSites

  } catch (error) {
    console.error('Erreur fetchAllSites:', error)

    // Retourner le cache même expiré en cas d'erreur
    if (sitesCache) {
      console.warn('Utilisation du cache expiré suite à une erreur')
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
