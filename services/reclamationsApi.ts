import {
    Reclamation,
    ReclamationCreate,
    TypeReclamation,
    Urgence,
    SatisfactionClient,
    SatisfactionCreate,
    ReclamationStats
} from '../types/reclamations';
const API_BASE_URL = '/api/reclamations';

// ============================================================================
// HELPERS
// ============================================================================

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
    };
};

const handleResponse = async <T>(response: Response): Promise<T> => {
    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
        throw new Error('Session expirée');
    }
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Erreur réseau' }));

        // Extraire le message d'erreur détaillé
        let errorMessage = error.detail || `Erreur ${response.status}`;

        // Si c'est une erreur de validation (objet avec champs)
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
    const response = await fetch(`${API_BASE_URL}/types-reclamations/`, { headers: getAuthHeaders() });
    const data = await handleResponse<any>(response);
    return data.results || data;
};

export const fetchUrgences = async (): Promise<Urgence[]> => {
    const response = await fetch(`${API_BASE_URL}/urgences/`, { headers: getAuthHeaders() });
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
}): Promise<Reclamation[]> => {
    const queryParams = new URLSearchParams();
    if (params?.statut) queryParams.append('statut', params.statut);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.site) queryParams.append('site', String(params.site));
    if (params?.ordering) queryParams.append('ordering', params.ordering);

    const url = `${API_BASE_URL}/reclamations/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    const data = await handleResponse<any>(response);
    return data.results || data; // Gère pagination standard DRF
};

export const fetchReclamationById = async (id: number): Promise<Reclamation> => {
    const response = await fetch(`${API_BASE_URL}/reclamations/${id}/`, {
        headers: getAuthHeaders()
    });
    return handleResponse<Reclamation>(response);
};

export const createReclamation = async (data: ReclamationCreate): Promise<Reclamation> => {
    const response = await fetch(`${API_BASE_URL}/reclamations/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    const result = await handleResponse<Reclamation>(response);
    return result;
};

export const fetchReclamationSuivi = async (id: number): Promise<Reclamation> => {
    const response = await fetch(`${API_BASE_URL}/reclamations/${id}/suivi/`, {
        headers: getAuthHeaders()
    });
    return handleResponse<Reclamation>(response);
};

export const updateReclamation = async (id: number, data: Partial<ReclamationCreate>): Promise<Reclamation> => {
    const response = await fetch(`${API_BASE_URL}/reclamations/${id}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    const result = await handleResponse<Reclamation>(response);
    return result;
};

export const deleteReclamation = async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/reclamations/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
        throw new Error('Session expirée');
    }
    if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
    }
};

export const assignReclamation = async (id: number, equipeId: number): Promise<Reclamation> => {
    const response = await fetch(`${API_BASE_URL}/reclamations/${id}/assignation/`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ equipe_id: equipeId })
    });
    const result = await handleResponse<Reclamation>(response);
    return result;
};

export const uploadPhoto = async (formData: FormData): Promise<any> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/suivi-taches/photos/`, {
        method: 'POST',
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: formData
    });

    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
        throw new Error('Session expirée');
    }

    if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let error: any = {};

        try {
            if (contentType && contentType.includes('application/json')) {
                error = await response.json();
            } else {
                const text = await response.text();
                console.error('Server error (non-JSON):', text);
                error = { detail: `Erreur serveur (${response.status}): ${text.substring(0, 200)}` };
            }
        } catch (parseError) {
            console.error('Error parsing response:', parseError);
            error = { detail: `Erreur serveur (${response.status})` };
        }

        console.error('Upload photo error response:', error);

        // Gérer les différents formats d'erreur DRF
        let errorMessage = 'Erreur upload photo';
        if (error.detail) {
            errorMessage = error.detail;
        } else if (error.non_field_errors) {
            errorMessage = error.non_field_errors.join(', ');
        } else if (typeof error === 'object') {
            // Erreurs de champs spécifiques
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
    const response = await fetch(`${API_BASE_URL}/reclamations/${id}/cloturer/`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    const result = await handleResponse<any>(response);
    return result.reclamation || result;
};

export const validerCloture = async (id: number): Promise<Reclamation> => {
    const response = await fetch(`${API_BASE_URL}/reclamations/${id}/valider_cloture/`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    const result = await handleResponse<any>(response);
    return result.reclamation || result;
};

// ============================================================================
// USER 6.6.13 - SATISFACTION CLIENT
// ============================================================================

export const createSatisfaction = async (data: SatisfactionCreate): Promise<SatisfactionClient> => {
    const response = await fetch(`${API_BASE_URL}/satisfactions/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    const result = await handleResponse<SatisfactionClient>(response);
    return result;
};

export const fetchSatisfactionByReclamation = async (reclamationId: number): Promise<SatisfactionClient | null> => {
    const response = await fetch(`${API_BASE_URL}/satisfactions/?reclamation=${reclamationId}`, {
        headers: getAuthHeaders()
    });
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
    const response = await fetch(`${API_BASE_URL}/reclamations/detect-site/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ geometry })
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
        description: string | null;
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
    const response = await fetch(url, { headers: getAuthHeaders() });
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
    if (filters?.type_reclamation) params.append('type_reclamation', filters.type_reclamation.toString());

    const response = await fetch(`${API_BASE_URL}/reclamations/stats/?${params.toString()}`, {
        headers: getAuthHeaders()
    });
    return handleResponse<ReclamationStats>(response);
};

