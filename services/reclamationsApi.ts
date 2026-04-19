import {
  Reclamation,
  ReclamationCreate,
  TypeReclamation,
  Urgence,
  SatisfactionClient,
  SatisfactionCreate,
  ReclamationStats,
} from '../types/reclamations';
import { apiFetch } from './api';

const API_BASE_URL = '/api/reclamations';

// ============================================================================
// HELPERS
// ============================================================================

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur réseau' }));

    let errorMessage = error.detail || `Erreur ${response.status}`;

    if (typeof error === 'object' && !error.detail) {
      const fieldErrors: string[] = [];
      for (const [field, messages] of Object.entries(error)) {
        if (Array.isArray(messages)) {
          fieldErrors.push(`${field}: ${messages.join(', ')}`);
        } else {
          fieldErrors.push(`${field}: ${messages}`);
        }
      }
      if (fieldErrors.length > 0) {
        errorMessage = fieldErrors.join(' | ');
      }
    }

    throw new Error(errorMessage);
  }
  return response.json();
};

// ============================================================================
// REFERENTIELS
// ============================================================================

export const fetchTypesReclamations = async (): Promise<TypeReclamation[]> => {
  const response = await apiFetch(`${API_BASE_URL}/types-reclamations/`);
  const data = await handleResponse<any>(response);
  return data.results || data;
};

export const fetchUrgences = async (): Promise<Urgence[]> => {
  const response = await apiFetch(`${API_BASE_URL}/urgences/`);
  const data = await handleResponse<any>(response);
  return data.results || data;
};

// ============================================================================
// RECLAMATIONS
// ============================================================================

export const fetchReclamations = async (params?: {
  statut?: string;
  search?: string;
  site?: number;
  ordering?: string;
  date_debut?: string;
  date_fin?: string;
  auto_cloturee?: boolean;
}): Promise<Reclamation[]> => {
  const queryParams = new URLSearchParams();
  if (params?.statut) queryParams.append('statut', params.statut);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.site) queryParams.append('site', String(params.site));
  if (params?.ordering) queryParams.append('ordering', params.ordering);
  if (params?.date_debut) queryParams.append('date_debut', params.date_debut);
  if (params?.date_fin) queryParams.append('date_fin', params.date_fin);
  if (params?.auto_cloturee !== undefined)
    queryParams.append('auto_cloturee', String(params.auto_cloturee));

  const url = `${API_BASE_URL}/reclamations/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiFetch(url);
  const data = await handleResponse<any>(response);
  return data.results || data;
};

export const fetchReclamationById = async (id: number): Promise<Reclamation> => {
  const response = await apiFetch(`${API_BASE_URL}/reclamations/${id}/`);
  return handleResponse<Reclamation>(response);
};

export const createReclamation = async (data: ReclamationCreate): Promise<Reclamation> => {
  const response = await apiFetch(`${API_BASE_URL}/reclamations/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<Reclamation>(response);
};

export const fetchReclamationSuivi = async (id: number): Promise<Reclamation> => {
  const response = await apiFetch(`${API_BASE_URL}/reclamations/${id}/suivi/`);
  return handleResponse<Reclamation>(response);
};

export const updateReclamation = async (
  id: number,
  data: Partial<ReclamationCreate>,
): Promise<Reclamation> => {
  const response = await apiFetch(`${API_BASE_URL}/reclamations/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return handleResponse<Reclamation>(response);
};

export const deleteReclamation = async (id: number): Promise<void> => {
  const response = await apiFetch(`${API_BASE_URL}/reclamations/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Erreur lors de la suppression');
  }
};

export const assignReclamation = async (id: number, equipeId: number): Promise<Reclamation> => {
  const response = await apiFetch(`${API_BASE_URL}/reclamations/${id}/assignation/`, {
    method: 'PUT',
    body: JSON.stringify({ equipe_id: equipeId }),
  });
  return handleResponse<Reclamation>(response);
};

export const uploadPhoto = async (formData: FormData): Promise<any> => {
  const response = await apiFetch(`/api/suivi-taches/photos/`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    let error: any = {};

    try {
      if (contentType && contentType.includes('application/json')) {
        error = await response.json();
      } else {
        const text = await response.text();
        error = { detail: `Erreur serveur (${response.status}): ${text.substring(0, 200)}` };
      }
    } catch {
      error = { detail: `Erreur serveur (${response.status})` };
    }

    let errorMessage = 'Erreur upload photo';
    if (error.detail) {
      errorMessage = error.detail;
    } else if (error.non_field_errors) {
      errorMessage = error.non_field_errors.join(', ');
    } else if (typeof error === 'object') {
      const fieldErrors = Object.entries(error)
        .filter(([key]) => key !== 'detail')
        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
        .join('; ');
      if (fieldErrors) errorMessage = fieldErrors;
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

// ============================================================================
// USER 6.6.12 - CLÔTURE
// ============================================================================

export const cloturerReclamation = async (id: number): Promise<Reclamation> => {
  const response = await apiFetch(`${API_BASE_URL}/reclamations/${id}/cloturer/`, {
    method: 'POST',
  });
  const result = await handleResponse<any>(response);
  return result.reclamation || result;
};

export const validerCloture = async (id: number): Promise<Reclamation> => {
  const response = await apiFetch(`${API_BASE_URL}/reclamations/${id}/valider_cloture/`, {
    method: 'POST',
  });
  const result = await handleResponse<any>(response);
  return result.reclamation || result;
};

export const refuserCloture = async (
  id: number,
  commentaireRefus: string,
): Promise<Reclamation> => {
  const response = await apiFetch(`${API_BASE_URL}/reclamations/${id}/refuser_cloture/`, {
    method: 'POST',
    body: JSON.stringify({ commentaire_refus: commentaireRefus }),
  });
  const result = await handleResponse<any>(response);
  return result.reclamation || result;
};

export const rejeterReclamation = async (
  id: number,
  justification: string,
): Promise<Reclamation> => {
  const response = await apiFetch(`${API_BASE_URL}/reclamations/${id}/rejeter/`, {
    method: 'POST',
    body: JSON.stringify({ justification }),
  });
  const result = await handleResponse<any>(response);
  return result.reclamation || result;
};

/**
 * Refuser une intervention (Client uniquement)
 * Le motif de refus est obligatoire
 */
export const refuserIntervention = async (id: number, motifRefus: string): Promise<Reclamation> => {
  const response = await apiFetch(`${API_BASE_URL}/reclamations/${id}/refuser_intervention/`, {
    method: 'POST',
    body: JSON.stringify({ motif_refus: motifRefus }),
  });
  const result = await handleResponse<any>(response);
  return result.reclamation || result;
};

/**
 * Reprendre une intervention après refus client (Admin/Superviseur)
 */
export const reprendreIntervention = async (id: number): Promise<Reclamation> => {
  const response = await apiFetch(`${API_BASE_URL}/reclamations/${id}/reprendre_intervention/`, {
    method: 'POST',
  });
  const result = await handleResponse<any>(response);
  return result.reclamation || result;
};

// ============================================================================
// USER 6.6.13 - SATISFACTION CLIENT
// ============================================================================

export const createSatisfaction = async (data: SatisfactionCreate): Promise<SatisfactionClient> => {
  const response = await apiFetch(`${API_BASE_URL}/satisfactions/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<SatisfactionClient>(response);
};

export const fetchSatisfactionByReclamation = async (
  reclamationId: number,
): Promise<SatisfactionClient | null> => {
  const response = await apiFetch(`${API_BASE_URL}/satisfactions/?reclamation=${reclamationId}`);
  const data = await handleResponse<any>(response);
  const results = data.results || data;
  return results.length > 0 ? results[0] : null;
};

// ============================================================================
// DETECTION DE SITE DEPUIS GEOMETRIE
// ============================================================================

export interface DetectedSiteInfo {
  site_id: number | null;
  site_nom: string | null;
  zone_id: number | null;
  zone_nom: string | null;
}

/**
 * Détecte le site correspondant à une géométrie (point, polygone, etc.)
 * Utilisé pour afficher le site avant la création d'une réclamation.
 */
export const detectSiteFromGeometry = async (geometry: {
  type: string;
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}): Promise<DetectedSiteInfo> => {
  const response = await apiFetch(`${API_BASE_URL}/reclamations/detect-site/`, {
    method: 'POST',
    body: JSON.stringify({ geometry }),
  });
  return handleResponse<DetectedSiteInfo>(response);
};

// ============================================================================
// CARTE - RÉCLAMATIONS POUR AFFICHAGE SUR LA CARTE
// ============================================================================

export interface ReclamationMapFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  properties: {
    id: number;
    object_type: 'Reclamation';
    numero_reclamation: string;
    statut: string;
    statut_display: string;
    couleur_statut: string;
    urgence: string | null;
    urgence_couleur: string | null;
    type_reclamation: string | null;
    type_reclamation_symbole?: string | null;
    type_reclamation_categorie?: string | null;
    description: string | null;
    site?: number | null;
    site_nom: string | null;
    zone_nom: string | null;
    date_creation: string | null;
  };
}

export interface ReclamationMapResponse {
  type: 'FeatureCollection';
  features: ReclamationMapFeature[];
  count: number;
  statut_colors: Record<string, string>;
}

/**
 * Récupère les réclamations pour affichage sur la carte.
 * Retourne uniquement les réclamations non clôturées avec une localisation.
 */
export const fetchReclamationsForMap = async (params?: {
  bbox?: string;
  statut?: string;
}): Promise<ReclamationMapResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.bbox) queryParams.append('bbox', params.bbox);
  if (params?.statut) queryParams.append('statut', params.statut);

  const url = `${API_BASE_URL}/reclamations/map/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiFetch(url);
  return handleResponse<ReclamationMapResponse>(response);
};

// ============================================================================
// USER 6.6.14 - STATISTIQUES
// ============================================================================

export const fetchReclamationStats = async (filters?: {
  date_debut?: string;
  date_fin?: string;
  site?: number;
  zone?: number;
  type_reclamation?: number;
}): Promise<ReclamationStats> => {
  const params = new URLSearchParams();
  if (filters?.date_debut) params.append('date_debut', filters.date_debut);
  if (filters?.date_fin) params.append('date_fin', filters.date_fin);
  if (filters?.site) params.append('site', filters.site.toString());
  if (filters?.zone) params.append('zone', filters.zone.toString());
  if (filters?.type_reclamation)
    params.append('type_reclamation', filters.type_reclamation.toString());

  const response = await apiFetch(`${API_BASE_URL}/reclamations/stats/?${params.toString()}`);
  return handleResponse<ReclamationStats>(response);
};

// ============================================================================
// EXPORT EXCEL
// ============================================================================

export interface ReclamationExportFilters {
  statut?: string;
  urgence?: number;
  type_reclamation?: number;
  site?: number;
  date_debut?: string;
  date_fin?: string;
}

/**
 * Export des réclamations en Excel avec horodatage de toutes les étapes
 * Retourne un Blob du fichier Excel
 */
export const exportReclamationsExcel = async (
  filters?: ReclamationExportFilters,
): Promise<Blob> => {
  const params = new URLSearchParams();

  if (filters?.statut) params.append('statut', filters.statut);
  if (filters?.urgence) params.append('urgence', filters.urgence.toString());
  if (filters?.type_reclamation)
    params.append('type_reclamation', filters.type_reclamation.toString());
  if (filters?.site) params.append('site', filters.site.toString());
  if (filters?.date_debut) params.append('date_debut', filters.date_debut);
  if (filters?.date_fin) params.append('date_fin', filters.date_fin);

  const response = await apiFetch(`${API_BASE_URL}/export/excel/?${params.toString()}`, {
    method: 'GET',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Aucune réclamation à exporter');
    }
    throw new Error(`Erreur export: ${response.status}`);
  }

  return response.blob();
};
