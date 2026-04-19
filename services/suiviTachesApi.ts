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
  PhotoCreate,
  FertilisantList,
  FertilisantDetail,
  FertilisantCreate,
  RavageurMaladieList,
  RavageurMaladieDetail,
  RavageurMaladieCreate,
  TypeFertilisant,
  CategorieRavageurMaladie,
} from '../types/suiviTaches';
import { apiFetch } from './api';
const API_BASE_URL = '/api/suivi-taches';

// ============================================================================
// HELPERS
// ============================================================================

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
  const response = await apiFetch(url);
  const data = await handleResponse<any>(response);

  // Django REST Framework retourne {results: [...], count: X} avec pagination
  // Retourner results si c'est un objet paginé, sinon retourner data directement
  return data.results || data;
};

export const fetchProduitById = async (id: number): Promise<ProduitDetail> => {
  const response = await apiFetch(`${API_BASE_URL}/produits/${id}/`);
  return handleResponse<ProduitDetail>(response);
};

export const createProduit = async (data: ProduitCreate): Promise<ProduitDetail> => {
  const response = await apiFetch(`${API_BASE_URL}/produits/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await handleResponse<ProduitDetail>(response);
  return result;
};

export const updateProduit = async (
  id: number,
  data: Partial<ProduitCreate>,
): Promise<ProduitDetail> => {
  const response = await apiFetch(`${API_BASE_URL}/produits/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  const result = await handleResponse<ProduitDetail>(response);
  return result;
};

export const deleteProduit = async (id: number): Promise<void> => {
  const response = await apiFetch(`${API_BASE_URL}/produits/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Erreur lors de la suppression');
  }
};

export const fetchProduitsActifs = async (): Promise<ProduitList[]> => {
  const response = await apiFetch(`${API_BASE_URL}/produits/actifs/`);
  const data = await handleResponse<any>(response);
  return data.results || data;
};

export const fetchProduitsExpiresBientot = async (): Promise<ProduitList[]> => {
  const response = await apiFetch(`${API_BASE_URL}/produits/expires_bientot/`);
  const data = await handleResponse<any>(response);
  return data.results || data;
};

export const softDeleteProduit = async (
  id: number,
): Promise<{ message: string; produit: ProduitDetail }> => {
  const response = await apiFetch(`${API_BASE_URL}/produits/${id}/soft_delete/`, {
    method: 'POST',
  });
  const result = await handleResponse<{ message: string; produit: ProduitDetail }>(response);
  return result;
};

export const reactivateProduit = async (
  id: number,
): Promise<{ message: string; produit: ProduitDetail }> => {
  const response = await apiFetch(`${API_BASE_URL}/produits/${id}/reactivate/`, {
    method: 'POST',
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
  const response = await apiFetch(url);
  return handleResponse<ProduitMatiereActive[]>(response);
};

export const createMatiereActive = async (
  data: ProduitMatiereActiveCreate,
): Promise<ProduitMatiereActive> => {
  const response = await apiFetch(`${API_BASE_URL}/matieres-actives/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await handleResponse<ProduitMatiereActive>(response);
  return result;
};

export const updateMatiereActive = async (
  id: number,
  data: Partial<ProduitMatiereActiveCreate>,
): Promise<ProduitMatiereActive> => {
  const response = await apiFetch(`${API_BASE_URL}/matieres-actives/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  const result = await handleResponse<ProduitMatiereActive>(response);
  return result;
};

export const deleteMatiereActive = async (id: number): Promise<void> => {
  const response = await apiFetch(`${API_BASE_URL}/matieres-actives/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Erreur lors de la suppression');
  }
};

// ============================================================================
// DOSES
// ============================================================================

export const fetchDoses = async (produitId?: number): Promise<DoseProduit[]> => {
  const url = produitId ? `${API_BASE_URL}/doses/?produit=${produitId}` : `${API_BASE_URL}/doses/`;
  const response = await apiFetch(url);
  return handleResponse<DoseProduit[]>(response);
};

export const createDose = async (data: DoseProduitCreate): Promise<DoseProduit> => {
  const response = await apiFetch(`${API_BASE_URL}/doses/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<DoseProduit>(response);
};

export const updateDose = async (
  id: number,
  data: Partial<DoseProduitCreate>,
): Promise<DoseProduit> => {
  const response = await apiFetch(`${API_BASE_URL}/doses/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return handleResponse<DoseProduit>(response);
};

export const deleteDose = async (id: number): Promise<void> => {
  const response = await apiFetch(`${API_BASE_URL}/doses/${id}/`, {
    method: 'DELETE',
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
  const response = await apiFetch(url);
  return handleResponse<ConsommationProduit[]>(response);
};

export const fetchConsommationsParTache = async (
  tacheId: number,
): Promise<ConsommationProduit[]> => {
  const response = await apiFetch(`${API_BASE_URL}/consommations/par_tache/?tache_id=${tacheId}`);
  return handleResponse<ConsommationProduit[]>(response);
};

export const createConsommation = async (
  data: ConsommationProduitCreate,
): Promise<ConsommationProduit> => {
  const response = await apiFetch(`${API_BASE_URL}/consommations/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await handleResponse<ConsommationProduit>(response);

  return result;
};

export const updateConsommation = async (
  id: number,
  data: Partial<ConsommationProduitCreate>,
): Promise<ConsommationProduit> => {
  const response = await apiFetch(`${API_BASE_URL}/consommations/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  const result = await handleResponse<ConsommationProduit>(response);

  return result;
};

export const deleteConsommation = async (id: number): Promise<void> => {
  const response = await apiFetch(`${API_BASE_URL}/consommations/${id}/`, {
    method: 'DELETE',
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
  const response = await apiFetch(url);
  return handleResponse<PhotoList[]>(response);
};

export const fetchPhotosParTache = async (tacheId: number): Promise<PhotoList[]> => {
  // ⚡ OPTIMISATION: Le backend renvoie maintenant des réponses paginées
  // On récupère toutes les pages pour garder la compatibilité
  const allPhotos: PhotoList[] = [];
  let nextUrl: string | null = `${API_BASE_URL}/photos/par_tache/?tache_id=${tacheId}`;

  while (nextUrl) {
    const response = await apiFetch(nextUrl);
    const data = await handleResponse<any>(response);

    // Gérer les réponses paginées (results + next) et non-paginées (array)
    if (Array.isArray(data)) {
      // Réponse non-paginée (fallback)
      return data;
    }

    // Réponse paginée
    if (data.results) {
      allPhotos.push(...data.results);
    }
    nextUrl = data.next || null;
  }

  return allPhotos;
};

export const fetchPhotosAvant = async (tacheId: number): Promise<PhotoList[]> => {
  const response = await apiFetch(`${API_BASE_URL}/photos/avant/?tache_id=${tacheId}`);
  return handleResponse<PhotoList[]>(response);
};

export const fetchPhotosApres = async (tacheId: number): Promise<PhotoList[]> => {
  const response = await apiFetch(`${API_BASE_URL}/photos/apres/?tache_id=${tacheId}`);
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

  const response = await apiFetch(`${API_BASE_URL}/photos/`, {
    method: 'POST',
    body: formData,
  });
  const result = await handleResponse<Photo>(response);

  return result;
};

export const updatePhoto = async (id: number, data: Partial<PhotoCreate>): Promise<Photo> => {
  const response = await apiFetch(`${API_BASE_URL}/photos/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  const result = await handleResponse<Photo>(response);

  return result;
};

export const deletePhoto = async (id: number): Promise<void> => {
  const response = await apiFetch(`${API_BASE_URL}/photos/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Erreur lors de la suppression');
  }
};

// ============================================================================
// FERTILISANTS
// ============================================================================

export const fetchFertilisants = async (params?: {
  actif?: boolean;
  type_fertilisant?: TypeFertilisant;
  search?: string;
  ordering?: string;
}): Promise<FertilisantList[]> => {
  const queryParams = new URLSearchParams();
  if (params?.actif !== undefined) queryParams.append('actif', String(params.actif));
  if (params?.type_fertilisant) queryParams.append('type_fertilisant', params.type_fertilisant);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.ordering) queryParams.append('ordering', params.ordering);

  const url = `${API_BASE_URL}/fertilisants/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiFetch(url);
  const data = await handleResponse<FertilisantList[] | { results: FertilisantList[] }>(response);
  return Array.isArray(data) ? data : data.results;
};

export const fetchFertilisantById = async (id: number): Promise<FertilisantDetail> => {
  const response = await apiFetch(`${API_BASE_URL}/fertilisants/${id}/`);
  return handleResponse<FertilisantDetail>(response);
};

export const createFertilisant = async (data: FertilisantCreate): Promise<FertilisantDetail> => {
  const response = await apiFetch(`${API_BASE_URL}/fertilisants/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<FertilisantDetail>(response);
};

export const updateFertilisant = async (
  id: number,
  data: Partial<FertilisantCreate>,
): Promise<FertilisantDetail> => {
  const response = await apiFetch(`${API_BASE_URL}/fertilisants/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return handleResponse<FertilisantDetail>(response);
};

export const deleteFertilisant = async (id: number): Promise<void> => {
  const response = await apiFetch(`${API_BASE_URL}/fertilisants/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Erreur lors de la suppression');
  }
};

export const fetchFertilisantsActifs = async (): Promise<FertilisantList[]> => {
  const response = await apiFetch(`${API_BASE_URL}/fertilisants/actifs/`);
  const data = await handleResponse<FertilisantList[] | { results: FertilisantList[] }>(response);
  return Array.isArray(data) ? data : data.results;
};

export const fetchFertilisantsParType = async (
  type: TypeFertilisant,
): Promise<FertilisantList[]> => {
  const response = await apiFetch(`${API_BASE_URL}/fertilisants/par_type/?type=${type}`);
  const data = await handleResponse<FertilisantList[] | { results: FertilisantList[] }>(response);
  return Array.isArray(data) ? data : data.results;
};

export const softDeleteFertilisant = async (
  id: number,
): Promise<{ message: string; fertilisant: FertilisantDetail }> => {
  const response = await apiFetch(`${API_BASE_URL}/fertilisants/${id}/soft_delete/`, {
    method: 'POST',
  });
  return handleResponse<{ message: string; fertilisant: FertilisantDetail }>(response);
};

export const reactivateFertilisant = async (
  id: number,
): Promise<{ message: string; fertilisant: FertilisantDetail }> => {
  const response = await apiFetch(`${API_BASE_URL}/fertilisants/${id}/reactivate/`, {
    method: 'POST',
  });
  return handleResponse<{ message: string; fertilisant: FertilisantDetail }>(response);
};

// ============================================================================
// RAVAGEURS ET MALADIES
// ============================================================================

export const fetchRavageursMaladies = async (params?: {
  actif?: boolean;
  categorie?: CategorieRavageurMaladie;
  search?: string;
  ordering?: string;
}): Promise<RavageurMaladieList[]> => {
  const queryParams = new URLSearchParams();
  if (params?.actif !== undefined) queryParams.append('actif', String(params.actif));
  if (params?.categorie) queryParams.append('categorie', params.categorie);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.ordering) queryParams.append('ordering', params.ordering);

  const url = `${API_BASE_URL}/ravageurs-maladies/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiFetch(url);
  const data = await handleResponse<RavageurMaladieList[] | { results: RavageurMaladieList[] }>(
    response,
  );
  return Array.isArray(data) ? data : data.results;
};

export const fetchRavageurMaladieById = async (id: number): Promise<RavageurMaladieDetail> => {
  const response = await apiFetch(`${API_BASE_URL}/ravageurs-maladies/${id}/`);
  return handleResponse<RavageurMaladieDetail>(response);
};

export const createRavageurMaladie = async (
  data: RavageurMaladieCreate,
): Promise<RavageurMaladieDetail> => {
  const response = await apiFetch(`${API_BASE_URL}/ravageurs-maladies/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<RavageurMaladieDetail>(response);
};

export const updateRavageurMaladie = async (
  id: number,
  data: Partial<RavageurMaladieCreate>,
): Promise<RavageurMaladieDetail> => {
  const response = await apiFetch(`${API_BASE_URL}/ravageurs-maladies/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return handleResponse<RavageurMaladieDetail>(response);
};

export const deleteRavageurMaladie = async (id: number): Promise<void> => {
  const response = await apiFetch(`${API_BASE_URL}/ravageurs-maladies/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Erreur lors de la suppression');
  }
};

export const fetchRavageursMaladiesActifs = async (): Promise<RavageurMaladieList[]> => {
  const response = await apiFetch(`${API_BASE_URL}/ravageurs-maladies/actifs/`);
  const data = await handleResponse<RavageurMaladieList[] | { results: RavageurMaladieList[] }>(
    response,
  );
  return Array.isArray(data) ? data : data.results;
};

export const fetchRavageursMaladiesParCategorie = async (
  categorie: CategorieRavageurMaladie,
): Promise<RavageurMaladieList[]> => {
  const response = await apiFetch(
    `${API_BASE_URL}/ravageurs-maladies/par_categorie/?categorie=${categorie}`,
  );
  const data = await handleResponse<RavageurMaladieList[] | { results: RavageurMaladieList[] }>(
    response,
  );
  return Array.isArray(data) ? data : data.results;
};

export const softDeleteRavageurMaladie = async (
  id: number,
): Promise<{ message: string; ravageur_maladie: RavageurMaladieDetail }> => {
  const response = await apiFetch(`${API_BASE_URL}/ravageurs-maladies/${id}/soft_delete/`, {
    method: 'POST',
  });
  return handleResponse<{ message: string; ravageur_maladie: RavageurMaladieDetail }>(response);
};

export const reactivateRavageurMaladie = async (
  id: number,
): Promise<{ message: string; ravageur_maladie: RavageurMaladieDetail }> => {
  const response = await apiFetch(`${API_BASE_URL}/ravageurs-maladies/${id}/reactivate/`, {
    method: 'POST',
  });
  return handleResponse<{ message: string; ravageur_maladie: RavageurMaladieDetail }>(response);
};
