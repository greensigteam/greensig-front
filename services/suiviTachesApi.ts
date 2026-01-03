/**
 * Service API pour le module Suivi des Tâches
 * Gère les produits, consommations et photos
 */

import {
    ProduitList,
    ProduitDetail,
    ProduitCreate,
    ProduitMatiereActive,
    ProduitMatiereActiveCreate,
    DoseProduit,
    DoseProduitCreate,
    ConsommationProduit,
    ConsommationProduitCreate,
    Photo,
    PhotoList,
    PhotoCreate
} from '../types/suiviTaches';
const API_BASE_URL = '/api/suivi-taches';

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
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Erreur réseau' }));
        throw new Error(error.detail || `Erreur ${response.status}`);
    }
    return response.json();
};

// ============================================================================
// PRODUITS
// ============================================================================

export const fetchProduits = async (params?: {
    actif?: boolean;
    cible?: string;
    search?: string;
    ordering?: string;
}): Promise<ProduitList[]> => {
    const queryParams = new URLSearchParams();
    if (params?.actif !== undefined) queryParams.append('actif', String(params.actif));
    if (params?.cible) queryParams.append('cible', params.cible);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.ordering) queryParams.append('ordering', params.ordering);

    const url = `${API_BASE_URL}/produits/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    const data = await handleResponse<any>(response);

    // Django REST Framework retourne {results: [...], count: X} avec pagination
    // Retourner results si c'est un objet paginé, sinon retourner data directement
    return data.results || data;
};

export const fetchProduitById = async (id: number): Promise<ProduitDetail> => {
    const response = await fetch(`${API_BASE_URL}/produits/${id}/`, {
        headers: getAuthHeaders()
    });
    return handleResponse<ProduitDetail>(response);
};

export const createProduit = async (data: ProduitCreate): Promise<ProduitDetail> => {
    const response = await fetch(`${API_BASE_URL}/produits/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    const result = await handleResponse<ProduitDetail>(response);
    return result;
};

export const updateProduit = async (id: number, data: Partial<ProduitCreate>): Promise<ProduitDetail> => {
    const response = await fetch(`${API_BASE_URL}/produits/${id}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    const result = await handleResponse<ProduitDetail>(response);
    return result;
};

export const deleteProduit = async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/produits/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
    }
};

export const fetchProduitsActifs = async (): Promise<ProduitList[]> => {
    const response = await fetch(`${API_BASE_URL}/produits/actifs/`, {
        headers: getAuthHeaders()
    });
    const data = await handleResponse<any>(response);
    return data.results || data;
};

export const fetchProduitsExpiresBientot = async (): Promise<ProduitList[]> => {
    const response = await fetch(`${API_BASE_URL}/produits/expires_bientot/`, {
        headers: getAuthHeaders()
    });
    const data = await handleResponse<any>(response);
    return data.results || data;
};

export const softDeleteProduit = async (id: number): Promise<{ message: string; produit: ProduitDetail }> => {
    const response = await fetch(`${API_BASE_URL}/produits/${id}/soft_delete/`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    const result = await handleResponse<{ message: string; produit: ProduitDetail }>(response);
    return result;
};

export const reactivateProduit = async (id: number): Promise<{ message: string; produit: ProduitDetail }> => {
    const response = await fetch(`${API_BASE_URL}/produits/${id}/reactivate/`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    const result = await handleResponse<{ message: string; produit: ProduitDetail }>(response);
    return result;
};

// ============================================================================
// MATIERES ACTIVES
// ============================================================================

export const fetchMatieresActives = async (produitId?: number): Promise<ProduitMatiereActive[]> => {
    const url = produitId
        ? `${API_BASE_URL}/matieres-actives/?produit=${produitId}`
        : `${API_BASE_URL}/matieres-actives/`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse<ProduitMatiereActive[]>(response);
};

export const createMatiereActive = async (data: ProduitMatiereActiveCreate): Promise<ProduitMatiereActive> => {
    const response = await fetch(`${API_BASE_URL}/matieres-actives/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    const result = await handleResponse<ProduitMatiereActive>(response);
    return result;
};

export const updateMatiereActive = async (
    id: number,
    data: Partial<ProduitMatiereActiveCreate>
): Promise<ProduitMatiereActive> => {
    const response = await fetch(`${API_BASE_URL}/matieres-actives/${id}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    const result = await handleResponse<ProduitMatiereActive>(response);
    return result;
};

export const deleteMatiereActive = async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/matieres-actives/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
    }
};

// ============================================================================
// DOSES
// ============================================================================

export const fetchDoses = async (produitId?: number): Promise<DoseProduit[]> => {
    const url = produitId
        ? `${API_BASE_URL}/doses/?produit=${produitId}`
        : `${API_BASE_URL}/doses/`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse<DoseProduit[]>(response);
};

export const createDose = async (data: DoseProduitCreate): Promise<DoseProduit> => {
    const response = await fetch(`${API_BASE_URL}/doses/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    return handleResponse<DoseProduit>(response);
};

export const updateDose = async (id: number, data: Partial<DoseProduitCreate>): Promise<DoseProduit> => {
    const response = await fetch(`${API_BASE_URL}/doses/${id}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    return handleResponse<DoseProduit>(response);
};

export const deleteDose = async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/doses/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
    }
};

// ============================================================================
// CONSOMMATIONS
// ============================================================================

export const fetchConsommations = async (params?: {
    tache?: number;
    produit?: number;
}): Promise<ConsommationProduit[]> => {
    const queryParams = new URLSearchParams();
    if (params?.tache) queryParams.append('tache', String(params.tache));
    if (params?.produit) queryParams.append('produit', String(params.produit));

    const url = `${API_BASE_URL}/consommations/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse<ConsommationProduit[]>(response);
};

export const fetchConsommationsParTache = async (tacheId: number): Promise<ConsommationProduit[]> => {
    const response = await fetch(`${API_BASE_URL}/consommations/par_tache/?tache_id=${tacheId}`, {
        headers: getAuthHeaders()
    });
    return handleResponse<ConsommationProduit[]>(response);
};

export const createConsommation = async (data: ConsommationProduitCreate): Promise<ConsommationProduit> => {
    const response = await fetch(`${API_BASE_URL}/consommations/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    const result = await handleResponse<ConsommationProduit>(response);

    return result;
};

export const updateConsommation = async (
    id: number,
    data: Partial<ConsommationProduitCreate>
): Promise<ConsommationProduit> => {
    const response = await fetch(`${API_BASE_URL}/consommations/${id}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    const result = await handleResponse<ConsommationProduit>(response);

    return result;
};

export const deleteConsommation = async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/consommations/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
    }
};

// ============================================================================
// PHOTOS
// ============================================================================

export const fetchPhotos = async (params?: {
    type_photo?: string;
    tache?: number;
    objet?: number;
}): Promise<PhotoList[]> => {
    const queryParams = new URLSearchParams();
    if (params?.type_photo) queryParams.append('type_photo', params.type_photo);
    if (params?.tache) queryParams.append('tache', String(params.tache));
    if (params?.objet) queryParams.append('objet', String(params.objet));

    const url = `${API_BASE_URL}/photos/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse<PhotoList[]>(response);
};

export const fetchPhotosParTache = async (tacheId: number): Promise<PhotoList[]> => {
    const response = await fetch(`${API_BASE_URL}/photos/par_tache/?tache_id=${tacheId}`, {
        headers: getAuthHeaders()
    });
    return handleResponse<PhotoList[]>(response);
};

export const fetchPhotosAvant = async (tacheId: number): Promise<PhotoList[]> => {
    const response = await fetch(`${API_BASE_URL}/photos/avant/?tache_id=${tacheId}`, {
        headers: getAuthHeaders()
    });
    return handleResponse<PhotoList[]>(response);
};

export const fetchPhotosApres = async (tacheId: number): Promise<PhotoList[]> => {
    const response = await fetch(`${API_BASE_URL}/photos/apres/?tache_id=${tacheId}`, {
        headers: getAuthHeaders()
    });
    return handleResponse<PhotoList[]>(response);
};

export const createPhoto = async (data: PhotoCreate): Promise<Photo> => {
    const formData = new FormData();
    formData.append('fichier', data.fichier);
    formData.append('type_photo', data.type_photo);
    if (data.tache) formData.append('tache', String(data.tache));
    if (data.objet) formData.append('objet', String(data.objet));
    if (data.reclamation) formData.append('reclamation', String(data.reclamation));
    if (data.legende) formData.append('legende', data.legende);
    if (data.latitude) formData.append('latitude', String(data.latitude));
    if (data.longitude) formData.append('longitude', String(data.longitude));

    const token = localStorage.getItem('token');
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(`${API_BASE_URL}/photos/`, {
        method: 'POST',
        headers: headers,
        body: formData
    });
    const result = await handleResponse<Photo>(response);

    return result;
};

export const updatePhoto = async (id: number, data: Partial<PhotoCreate>): Promise<Photo> => {
    const response = await fetch(`${API_BASE_URL}/photos/${id}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    const result = await handleResponse<Photo>(response);

    return result;
};

export const deletePhoto = async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/photos/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
    }
};
