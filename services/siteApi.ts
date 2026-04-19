import logger from './logger';
import { apiFetch, handleResponse } from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// ==============================================================================
// TYPES
// ==============================================================================

export interface SiteGeoJSON {
  type: 'Feature';
  id: number;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  properties: {
    nom_site: string;
    code_site: string;
    client_nom?: string;
    structure_client?: number;
    structure_client_nom?: string;
    superviseur?: number;
    superviseur_nom?: string;
    adresse?: string;
    superficie_totale?: number;
    superficie_calculee?: number;
    actif: boolean;
    date_debut_contrat?: string;
    date_fin_contrat?: string;
    centroid?: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
}

export interface SiteResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results:
    | {
        type: 'FeatureCollection';
        features: SiteGeoJSON[];
      }
    | SiteGeoJSON[];
}

export interface SiteFrontend {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  description: string;
  category: 'RECHERCHE' | 'INFRASTRUCTURE' | 'RESIDENCE' | 'SANTE' | 'HOTELLERIE';
  color: string;
  code_site?: string;
  client_nom?: string;
  structure_client?: number;
  structure_client_nom?: string;
  superviseur?: number;
  superviseur_nom?: string;
  adresse?: string;
  superficie_totale?: number;
  superficie_calculee?: number;
  actif?: boolean;
  date_debut_contrat?: string;
  date_fin_contrat?: string;
  geometry?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface DetectedSiteResult {
  site: {
    id: number;
    nom_site: string;
    code_site: string;
  };
  sous_site: {
    id: number;
    nom: string;
  } | null;
}

export interface CreateSiteData {
  nom_site: string;
  code_site?: string;
  structure_client: number;
  superviseur?: number;
  adresse?: string;
  superficie_totale?: number;
  date_debut_contrat?: string;
  date_fin_contrat?: string;
  actif?: boolean;
  geometrie_emprise: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface UpdateSiteData {
  nom_site?: string;
  code_site?: string;
  structure_client?: number | null;
  superviseur?: number | null;
  adresse?: string;
  superficie_totale?: number | null;
  date_debut_contrat?: string | null;
  date_fin_contrat?: string | null;
  actif?: boolean;
}

// ==============================================================================
// HELPERS
// ==============================================================================

const CATEGORY_COLORS: Record<string, string> = {
  RECHERCHE: '#8b5cf6',
  INFRASTRUCTURE: '#3b82f6',
  RESIDENCE: '#10b981',
  SANTE: '#ef4444',
  HOTELLERIE: '#f59e0b',
  DEFAULT: '#6b7280',
};

const SITE_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

function calculatePolygonCentroid(coordinates: number[][][]): { lat: number; lng: number } {
  const ring = coordinates[0];
  if (!ring || ring.length === 0) {
    return { lat: 0, lng: 0 };
  }

  let sumLng = 0;
  let sumLat = 0;
  const n = ring.length - 1;

  for (let i = 0; i < n; i++) {
    const coord = ring[i];
    if (coord && coord.length >= 2) {
      sumLng += coord[0] || 0;
      sumLat += coord[1] || 0;
    }
  }

  return {
    lng: sumLng / n,
    lat: sumLat / n,
  };
}

function inferCategory(site: SiteGeoJSON): SiteFrontend['category'] {
  const name = (site.properties.nom_site || '').toLowerCase();
  const code = (site.properties.code_site || '').toLowerCase();
  const combined = `${name} ${code}`;

  if (
    combined.includes('recherche') ||
    combined.includes('lab') ||
    combined.includes('phenotyp') ||
    combined.includes('dice')
  ) {
    return 'RECHERCHE';
  }
  if (
    combined.includes('hopital') ||
    combined.includes('sante') ||
    combined.includes('geriatrie') ||
    combined.includes('clinic')
  ) {
    return 'SANTE';
  }
  if (
    combined.includes('hotel') ||
    combined.includes('hilton') ||
    combined.includes('hebergement')
  ) {
    return 'HOTELLERIE';
  }
  if (
    combined.includes('villa') ||
    combined.includes('residence') ||
    combined.includes('logement') ||
    combined.includes('locatif')
  ) {
    return 'RESIDENCE';
  }
  return 'INFRASTRUCTURE';
}

function transformSiteToFrontend(site: SiteGeoJSON, index: number): SiteFrontend {
  let coordinates: { lat: number; lng: number };

  if (site.properties.centroid?.coordinates) {
    coordinates = {
      lng: site.properties.centroid.coordinates[0],
      lat: site.properties.centroid.coordinates[1],
    };
  } else if (site.geometry?.coordinates) {
    coordinates = calculatePolygonCentroid(site.geometry.coordinates);
  } else {
    coordinates = { lat: 0, lng: 0 };
  }

  const category = inferCategory(site);
  const color = CATEGORY_COLORS[category] || SITE_COLORS[index % SITE_COLORS.length];

  return {
    id: String(site.id),
    name: site.properties.nom_site,
    coordinates,
    description: site.properties.adresse || `Site ${site.properties.code_site}`,
    category,
    color: color || '#22c55e',
    code_site: site.properties.code_site,
    client_nom: site.properties.client_nom,
    structure_client: site.properties.structure_client,
    structure_client_nom: site.properties.structure_client_nom,
    superviseur: site.properties.superviseur,
    superviseur_nom: site.properties.superviseur_nom,
    adresse: site.properties.adresse,
    superficie_totale: site.properties.superficie_totale,
    superficie_calculee: site.properties.superficie_calculee,
    actif: site.properties.actif,
    date_debut_contrat: site.properties.date_debut_contrat,
    date_fin_contrat: site.properties.date_fin_contrat,
    geometry: site.geometry,
  };
}

// ==============================================================================
// API FUNCTIONS
// ==============================================================================

export async function fetchAllSites(): Promise<SiteFrontend[]> {
  try {
    const allSites: SiteGeoJSON[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await apiFetch(`${API_BASE_URL}/sites/?page=${page}`);
      const data = await handleResponse<SiteResponse>(response);

      let features: SiteGeoJSON[];
      if (data.results && 'type' in data.results && data.results.type === 'FeatureCollection') {
        features = data.results.features;
      } else if (Array.isArray(data.results)) {
        features = data.results;
      } else {
        features = [];
      }

      allSites.push(...features);
      hasMore = data.next !== null;
      page++;
      if (page > 10) break;
    }

    const transformedSites = allSites.map((site, index) => transformSiteToFrontend(site, index));

    logger.info(`Sites chargés depuis API: ${transformedSites.length}`);
    return transformedSites;
  } catch (error) {
    logger.error('Erreur fetchAllSites:', error);
    throw error;
  }
}

export async function getSiteById(id: string): Promise<SiteFrontend | undefined> {
  const sites = await fetchAllSites();
  return sites.find((site) => site.id === id);
}

export async function getSitesByCategory(
  category: SiteFrontend['category'],
): Promise<SiteFrontend[]> {
  const sites = await fetchAllSites();
  return sites.filter((site) => site.category === category);
}

export async function searchSites(query: string): Promise<SiteFrontend[]> {
  if (query.length < 2) return [];

  const sites = await fetchAllSites();
  const normalizedQuery = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return sites.filter((site) => {
    const searchText = `${site.name} ${site.description} ${site.code_site || ''}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return searchText.includes(normalizedQuery);
  });
}

export async function fetchSites(page = 1): Promise<SiteResponse> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/sites/?page=${page}`);
    return handleResponse<SiteResponse>(response);
  } catch (error) {
    logger.error('Erreur fetchSites:', error);
    throw error;
  }
}

export async function fetchSiteById(id: number) {
  try {
    const response = await apiFetch(`${API_BASE_URL}/sites/${id}/`);
    return handleResponse(response);
  } catch (error) {
    logger.error(`Erreur fetchSiteById(${id}):`, error);
    throw error;
  }
}

export async function detectSiteFromGeometry(geometry: {
  type: string;
  coordinates: number[] | number[][] | number[][][];
}): Promise<DetectedSiteResult> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/sites/detect/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ geometry }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Aucun site trouvé pour cette position');
    }

    return await response.json();
  } catch (error: any) {
    logger.error('Erreur detectSiteFromGeometry:', error);
    throw error;
  }
}

export async function createSite(data: CreateSiteData): Promise<SiteFrontend> {
  try {
    const geoJsonPayload = {
      type: 'Feature',
      geometry: data.geometrie_emprise,
      properties: {
        nom_site: data.nom_site,
        structure_client: data.structure_client,
        superviseur: data.superviseur || null,
        ...(data.code_site && { code_site: data.code_site }),
        adresse: data.adresse || null,
        superficie_totale: data.superficie_totale || null,
        date_debut_contrat: data.date_debut_contrat || null,
        date_fin_contrat: data.date_fin_contrat || null,
        actif: data.actif !== undefined ? data.actif : true,
      },
    };

    const response = await apiFetch(`${API_BASE_URL}/sites/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geoJsonPayload),
    });

    const result = await handleResponse<any>(response);

    const coords = result.geometry?.coordinates?.[0]?.[0] || [0, 0];
    return {
      id: String(result.id || result.properties?.id),
      name: result.properties?.nom_site || data.nom_site,
      coordinates: { lat: coords[1], lng: coords[0] },
      description: result.properties?.adresse || '',
      category: 'INFRASTRUCTURE' as const,
      color: '#22c55e',
      code_site: result.properties?.code_site,
      client_nom: result.properties?.client_nom,
      structure_client: result.properties?.structure_client,
      structure_client_nom: result.properties?.structure_client_nom,
      superviseur: result.properties?.superviseur,
      superviseur_nom: result.properties?.superviseur_nom,
      adresse: result.properties?.adresse,
      superficie_totale: result.properties?.superficie_totale,
      actif: result.properties?.actif,
      date_debut_contrat: result.properties?.date_debut_contrat,
      date_fin_contrat: result.properties?.date_fin_contrat,
    };
  } catch (error) {
    logger.error('Erreur createSite:', error);
    throw error;
  }
}

export async function updateSite(id: number, data: UpdateSiteData): Promise<SiteFrontend> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/sites/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'Feature',
        properties: data,
      }),
    });

    const result = await handleResponse<any>(response);

    const coords = result.geometry?.coordinates?.[0]?.[0] || [0, 0];
    return {
      id: String(result.id || result.properties?.id),
      name: result.properties?.nom_site,
      coordinates: { lat: coords[1], lng: coords[0] },
      description: result.properties?.adresse || '',
      category: 'INFRASTRUCTURE' as const,
      color: '#22c55e',
      code_site: result.properties?.code_site,
      client_nom: result.properties?.client_nom,
      structure_client: result.properties?.structure_client,
      structure_client_nom: result.properties?.structure_client_nom,
      superviseur: result.properties?.superviseur,
      superviseur_nom: result.properties?.superviseur_nom,
      adresse: result.properties?.adresse,
      superficie_totale: result.properties?.superficie_totale,
      actif: result.properties?.actif,
      date_debut_contrat: result.properties?.date_debut_contrat,
      date_fin_contrat: result.properties?.date_fin_contrat,
    };
  } catch (error) {
    logger.error('Erreur updateSite:', error);
    throw error;
  }
}

export async function deleteSite(id: number): Promise<void> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/sites/${id}/`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      throw new Error('Erreur lors de la suppression du site');
    }
  } catch (error) {
    logger.error('Erreur deleteSite:', error);
    throw error;
  }
}
