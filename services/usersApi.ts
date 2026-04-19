// ============================================================================
// API SERVICE - Module Gestion des Utilisateurs
// Service pour les appels API vers le backend api_users
// ============================================================================

import {
  Utilisateur,
  UtilisateurCreate,
  UtilisateurUpdate,
  ChangePassword,
  AdminResetPassword,
  Role,
  StructureClient,
  StructureClientDetail,
  StructureClientCreate,
  StructureClientUpdate,
  StructureClientFilters,
  Client,
  ClientUser,
  ClientCreate,
  ClientWithStructureCreate,
  ClientUpdate,
  Competence,
  CompetenceOperateur,
  CompetenceOperateurCreate,
  OperateurList,
  OperateurDetail,
  OperateurCreate,
  OperateurUpdate,
  SuperviseurList,
  SuperviseurCreate,
  CategorieCompetence,
  HistoriqueRH,
  StatistiquesUtilisateurs,
  PaginatedResponse,
  UtilisateurFilters,
  OperateurFilters,
  CompetenceFilters,
  HistoriqueRHFilters,
} from '../types/users';

// Import mock data for development

// ============================================================================
// SHARED UTILITIES (imported from usersApiUtils)
// ============================================================================

import {
  fetchApi,
  camelToSnake,
  snakeToCamel,
  buildQueryParams,
  USERS_API_URL,
  ApiError,
} from './usersApiUtils';

// Re-export team & absence functions for backward compatibility
export {
  fetchEquipes,
  fetchEquipeById,
  createEquipe,
  updateEquipe,
  deleteEquipe,
  fetchEquipeMembres,
  affecterMembres,
  fetchEquipeStatut,
  retirerMembre,
  fetchAbsences,
  fetchAbsenceById,
  createAbsence,
  validerAbsence,
  refuserAbsence,
  fetchAbsencesEnCours,
  fetchAbsencesAValider,
  updateAbsence,
  annulerAbsence,
} from './teamAbsenceService';

// ============================================================================
// UTILISATEURS
// ============================================================================

export async function fetchUtilisateurs(
  filters: UtilisateurFilters = {},
): Promise<PaginatedResponse<Utilisateur>> {
  const queryString = buildQueryParams(filters as Record<string, unknown>);
  return fetchApi<PaginatedResponse<Utilisateur>>(`${USERS_API_URL}/utilisateurs/?${queryString}`);
}

export async function fetchCurrentUser(): Promise<Utilisateur> {
  return fetchApi<Utilisateur>(`${USERS_API_URL}/me/`);
}

export async function fetchUtilisateurById(id: number): Promise<Utilisateur> {
  return fetchApi<Utilisateur>(`${USERS_API_URL}/utilisateurs/${id}/`);
}

export async function createUtilisateur(data: UtilisateurCreate): Promise<Utilisateur> {
  return fetchApi<Utilisateur>(`${USERS_API_URL}/utilisateurs/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>)),
  });
}

export async function updateUtilisateur(id: number, data: UtilisateurUpdate): Promise<Utilisateur> {
  return fetchApi<Utilisateur>(`${USERS_API_URL}/utilisateurs/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>)),
  });
}

export async function deleteUtilisateur(id: number): Promise<void> {
  await fetchApi<void>(`${USERS_API_URL}/utilisateurs/${id}/`, {
    method: 'DELETE',
  });
}

export async function changePassword(
  id: number,
  data: ChangePassword,
): Promise<{ message: string }> {
  return fetchApi<{ message: string }>(`${USERS_API_URL}/utilisateurs/${id}/change_password/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>)),
  });
}

export async function adminResetPassword(
  id: number,
  data: AdminResetPassword,
): Promise<{ message: string }> {
  return fetchApi<{ message: string }>(
    `${USERS_API_URL}/utilisateurs/${id}/admin_reset_password/`,
    {
      method: 'POST',
      body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>)),
    },
  );
}

// ============================================================================
// ROLES
// ============================================================================

export async function fetchRoles(): Promise<Role[]> {
  const response = await fetchApi<PaginatedResponse<Role>>(`${USERS_API_URL}/roles/`);
  return response.results;
}

// ============================================================================
// STRUCTURES CLIENTS
// ============================================================================

export async function fetchStructures(
  filters: StructureClientFilters = {},
): Promise<PaginatedResponse<StructureClient>> {
  const queryString = buildQueryParams(filters as Record<string, unknown>);
  return fetchApi<PaginatedResponse<StructureClient>>(
    `${USERS_API_URL}/structures/?${queryString}`,
  );
}

export async function fetchStructureById(id: number): Promise<StructureClientDetail> {
  return fetchApi<StructureClientDetail>(`${USERS_API_URL}/structures/${id}/`);
}

export async function createStructure(data: StructureClientCreate): Promise<StructureClient> {
  // Si un fichier logo est fourni, utiliser FormData
  if (data.logo instanceof File) {
    const formData = new FormData();
    formData.append('nom', data.nom);
    if (data.adresse) formData.append('adresse', data.adresse);
    if (data.telephone) formData.append('telephone', data.telephone);
    if (data.contactPrincipal) formData.append('contact_principal', data.contactPrincipal);
    if (data.emailFacturation) formData.append('email_facturation', data.emailFacturation);
    formData.append('logo', data.logo);

    // Utiliser apiFetch pour garantir le token JWT et le refresh automatique
    const response = await import('./api').then((m) =>
      m.apiFetch(`${USERS_API_URL}/structures/`, {
        method: 'POST',
        body: formData,
        // Note: Ne pas mettre Content-Type, le navigateur le définit automatiquement avec boundary pour FormData
      }),
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(JSON.stringify(errorData));
    }
    return snakeToCamel(await response.json()) as StructureClient;
  }

  // Sinon, utiliser JSON avec logo_url
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'logo') continue; // Ignorer logo (fichier) si null
    cleanData[key] = value;
  }
  return fetchApi<StructureClient>(`${USERS_API_URL}/structures/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(cleanData)),
  });
}

export async function updateStructure(
  id: number,
  data: StructureClientUpdate,
): Promise<StructureClient> {
  // Si un fichier logo est fourni, utiliser FormData
  if (data.logo instanceof File) {
    const formData = new FormData();
    if (data.nom) formData.append('nom', data.nom);
    if (data.adresse) formData.append('adresse', data.adresse);
    if (data.telephone) formData.append('telephone', data.telephone);
    if (data.contactPrincipal) formData.append('contact_principal', data.contactPrincipal);
    if (data.emailFacturation) formData.append('email_facturation', data.emailFacturation);
    if (data.actif !== undefined) formData.append('actif', String(data.actif));
    formData.append('logo', data.logo);

    // Utiliser apiFetch pour garantir le token JWT et le refresh automatique
    const response = await import('./api').then((m) =>
      m.apiFetch(`${USERS_API_URL}/structures/${id}/`, {
        method: 'PATCH',
        body: formData,
        // Note: Ne pas mettre Content-Type, le navigateur le définit automatiquement avec boundary pour FormData
      }),
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(JSON.stringify(errorData));
    }
    return snakeToCamel(await response.json()) as StructureClient;
  }

  // Sinon, utiliser JSON avec logo_url
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'logo') continue; // Ignorer logo (fichier) si null
    cleanData[key] = value;
  }
  return fetchApi<StructureClient>(`${USERS_API_URL}/structures/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(cleanData)),
  });
}

export async function deleteStructure(id: number): Promise<void> {
  await fetchApi<void>(`${USERS_API_URL}/structures/${id}/`, {
    method: 'DELETE',
  });
}

export async function fetchStructureUtilisateurs(structureId: number): Promise<ClientUser[]> {
  return fetchApi<ClientUser[]>(`${USERS_API_URL}/structures/${structureId}/utilisateurs/`);
}

export async function addUserToStructure(
  structureId: number,
  userData: { email: string; nom: string; prenom: string; password: string },
): Promise<Client> {
  return fetchApi<Client>(`${USERS_API_URL}/structures/${structureId}/ajouter_utilisateur/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(userData as unknown as Record<string, unknown>)),
  });
}

// ============================================================================
// CLIENTS (Utilisateurs de structures)
// ============================================================================

export async function fetchClients(): Promise<PaginatedResponse<Client>> {
  return fetchApi<PaginatedResponse<Client>>(`${USERS_API_URL}/clients/`);
}

/**
 * Récupère un client par son ID utilisateur
 * Utilise l'endpoint /clients/?utilisateur={id} pour filtrer
 */
export async function fetchClientByUserId(userId: number): Promise<Client | null> {
  try {
    // Accès direct via l'endpoint /clients/{id}/ car utilisateur est la PK du modèle Client
    const result = await fetchApi<Client>(`${USERS_API_URL}/clients/${userId}/`);
    return result;
  } catch {
    return null;
  }
}

export async function createClient(
  data: ClientCreate | ClientWithStructureCreate,
): Promise<Client> {
  const isLegacy = (d: ClientCreate | ClientWithStructureCreate): d is ClientWithStructureCreate =>
    'nomStructure' in d;
  const legacyData = isLegacy(data) ? data : null;
  // Si le logo est présent et est une data URL base64, utiliser FormData
  if (
    legacyData?.logo &&
    typeof legacyData.logo === 'string' &&
    legacyData.logo.startsWith('data:')
  ) {
    const formData = new FormData();

    // Convertir base64 en Blob
    const base64Response = await fetch(legacyData.logo);
    const blob = await base64Response.blob();
    formData.append('logo', blob, 'logo.png');

    // Ajouter les champs obligatoires et optionnels
    formData.append('email', legacyData.email);
    formData.append('nom', legacyData.nom);
    formData.append('prenom', legacyData.prenom);
    formData.append('password', legacyData.password);
    formData.append('nom_structure', legacyData.nomStructure);

    if (legacyData.adresse) formData.append('adresse', legacyData.adresse);
    if (legacyData.telephone) formData.append('telephone', legacyData.telephone);
    if (legacyData.contactPrincipal)
      formData.append('contact_principal', legacyData.contactPrincipal);
    if (legacyData.emailFacturation)
      formData.append('email_facturation', legacyData.emailFacturation);

    // Utiliser apiFetch directement sans Content-Type JSON
    const response = await import('./api').then((m) =>
      m.apiFetch(`${USERS_API_URL}/clients/`, {
        method: 'POST',
        body: formData,
      }),
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ApiError(response.statusText, response.status, errorData);
    }

    const responseData = await response.json();
    return snakeToCamel<Client>(responseData);
  } else {
    // Si pas de logo, utiliser JSON standard
    return fetchApi<Client>(`${USERS_API_URL}/clients/`, {
      method: 'POST',
      body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>)),
    });
  }
}

export async function updateClient(id: number, data: ClientUpdate): Promise<Client> {
  // Si le logo est présent et est une data URL base64, utiliser FormData
  if (data.logo && typeof data.logo === 'string' && data.logo.startsWith('data:')) {
    const formData = new FormData();

    // Convertir base64 en Blob
    const base64Response = await fetch(data.logo);
    const blob = await base64Response.blob();
    formData.append('logo', blob, 'logo.png');

    // Ajouter les autres champs
    if (data.nomStructure !== undefined) formData.append('nom_structure', data.nomStructure);
    if (data.adresse !== undefined) formData.append('adresse', data.adresse);
    if (data.telephone !== undefined) formData.append('telephone', data.telephone);
    if (data.contactPrincipal !== undefined)
      formData.append('contact_principal', data.contactPrincipal);
    if (data.emailFacturation !== undefined)
      formData.append('email_facturation', data.emailFacturation);

    // Utiliser apiFetch directement sans Content-Type JSON
    const response = await import('./api').then((m) =>
      m.apiFetch(`${USERS_API_URL}/clients/${id}/`, {
        method: 'PATCH',
        body: formData,
        // Pas de Content-Type header - le navigateur le définit automatiquement avec boundary
      }),
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ApiError(response.statusText, response.status, errorData);
    }

    const responseData = await response.json();
    return snakeToCamel<Client>(responseData);
  } else {
    // Si pas de logo ou logo === undefined (suppression), utiliser JSON standard
    const payload = camelToSnake(data as unknown as Record<string, unknown>);

    return fetchApi<Client>(`${USERS_API_URL}/clients/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
}

export async function deleteClient(id: number): Promise<void> {
  await fetchApi<void>(`${USERS_API_URL}/clients/${id}/`, {
    method: 'DELETE',
  });
}

/**
 * Récupère les clients sans structure (orphelins)
 */
export async function fetchOrphanClients(): Promise<Client[]> {
  const response = await fetchApi<PaginatedResponse<Client>>(
    `${USERS_API_URL}/clients/?structure__isnull=true`,
  );
  return response.results || [];
}

/**
 * Affecte un client à une structure
 */
export async function assignClientToStructure(
  clientId: number,
  structureId: number,
): Promise<Client> {
  return fetchApi<Client>(`${USERS_API_URL}/clients/${clientId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ structure_id: structureId }),
  });
}

// ============================================================================
// COMPETENCES
// ============================================================================

export async function fetchCompetences(filters: CompetenceFilters = {}): Promise<Competence[]> {
  const queryString = buildQueryParams(filters as Record<string, unknown>);
  const response = await fetchApi<PaginatedResponse<Competence>>(
    `${USERS_API_URL}/competences/?${queryString}`,
  );
  return response.results;
}

export async function createCompetence(data: {
  nomCompetence: string;
  categorie: CategorieCompetence;
  description?: string;
  ordreAffichage?: number;
}): Promise<Competence> {
  const result = await fetchApi<Competence>(`${USERS_API_URL}/competences/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as Record<string, unknown>)),
  });
  return result;
}

export async function updateCompetence(
  id: number,
  data: {
    nomCompetence?: string;
    categorie?: CategorieCompetence;
    description?: string;
    ordreAffichage?: number;
  },
): Promise<Competence> {
  const result = await fetchApi<Competence>(`${USERS_API_URL}/competences/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as Record<string, unknown>)),
  });
  return result;
}

export async function deleteCompetence(id: number): Promise<void> {
  await fetchApi<void>(`${USERS_API_URL}/competences/${id}/`, { method: 'DELETE' });
}

// ============================================================================
// OPERATEURS
// ============================================================================

export async function fetchOperateurs(
  filters: OperateurFilters = {},
): Promise<PaginatedResponse<OperateurList>> {
  const queryString = buildQueryParams(filters as Record<string, unknown>);
  const result = await fetchApi<PaginatedResponse<OperateurList>>(
    `${USERS_API_URL}/operateurs/?${queryString}`,
  );
  return result;
}

export async function fetchOperateurById(id: number): Promise<OperateurDetail> {
  return fetchApi<OperateurDetail>(`${USERS_API_URL}/operateurs/${id}/`);
}

export async function createOperateur(data: OperateurCreate): Promise<OperateurList> {
  const result = await fetchApi<OperateurList>(`${USERS_API_URL}/operateurs/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>)),
  });
  return result;
}

export async function updateOperateur(id: number, data: OperateurUpdate): Promise<OperateurList> {
  const result = await fetchApi<OperateurList>(`${USERS_API_URL}/operateurs/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>)),
  });
  return result;
}

export async function deleteOperateur(id: number): Promise<void> {
  await fetchApi<void>(`${USERS_API_URL}/operateurs/${id}/`, {
    method: 'DELETE',
  });
}

export async function fetchOperateursDisponibles(): Promise<OperateurList[]> {
  const response = await fetchApi<OperateurList[]>(`${USERS_API_URL}/operateurs/disponibles/`);
  return response;
}

export async function fetchChefsPotentiels(): Promise<OperateurList[]> {
  // Récupérer uniquement les opérateurs pouvant être chef d'équipe
  // Les superviseurs sont des UTILISATEURS (comptes de connexion), pas des opérateurs (données RH)
  // Ils ne doivent PAS apparaître dans cette liste
  const operateursRes = await fetchApi<OperateurList[]>(
    `${USERS_API_URL}/operateurs/chefs_potentiels/`,
  );
  return operateursRes;
}

export async function fetchCompetencesOperateur(
  operateurId: number,
): Promise<CompetenceOperateur[]> {
  // Correction: le retour doit être un tableau
  return fetchApi<CompetenceOperateur[]>(`${USERS_API_URL}/operateurs/${operateurId}/competences/`);
}

export async function affecterCompetence(
  operateurId: number,
  data: CompetenceOperateurCreate,
): Promise<CompetenceOperateur> {
  const result = await fetchApi<CompetenceOperateur>(
    `${USERS_API_URL}/operateurs/${operateurId}/affecter_competence/`,
    {
      method: 'POST',
      body: JSON.stringify({
        competence_id: data.competenceId,
        niveau: data.niveau,
      }),
    },
  );
  return result;
}

// ============================================================================
// SUPERVISEURS
// ============================================================================

export async function fetchSuperviseurs(): Promise<PaginatedResponse<SuperviseurList>> {
  // D'abord essayer de récupérer depuis le modèle Superviseur
  const superviseurResult = await fetchApi<PaginatedResponse<SuperviseurList>>(
    `${USERS_API_URL}/superviseurs/`,
  ).catch(() => ({ count: 0, next: null, previous: null, results: [] }));

  // Ensuite récupérer les utilisateurs avec le rôle SUPERVISEUR
  const usersResult = await fetchApi<PaginatedResponse<Utilisateur>>(
    `${USERS_API_URL}/utilisateurs/?role=SUPERVISEUR&actif=true`,
  ).catch(() => ({ count: 0, next: null, previous: null, results: [] }));

  // Fusionner les deux listes (éviter les doublons par email)
  const seen = new Set<string>();
  const merged: SuperviseurList[] = [];

  // Ajouter d'abord les superviseurs du modèle Superviseur
  for (const sup of superviseurResult.results) {
    if (sup.email && !seen.has(sup.email)) {
      seen.add(sup.email);
      merged.push(sup);
    }
  }

  // Ajouter les utilisateurs avec le rôle SUPERVISEUR qui ne sont pas déjà dans la liste
  for (const user of usersResult.results) {
    if (user.email && !seen.has(user.email)) {
      seen.add(user.email);
      merged.push({
        utilisateur: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        fullName: user.fullName || `${user.prenom} ${user.nom}`,
        actif: user.actif,
        nombreEquipesGerees: 0,
      });
    }
  }

  return {
    count: merged.length,
    next: null,
    previous: null,
    results: merged,
  };
}

export async function createSuperviseur(data: SuperviseurCreate): Promise<SuperviseurList> {
  // Crée automatiquement : Utilisateur + Profil Superviseur + Rôle SUPERVISEUR
  const result = await fetchApi<SuperviseurList>(`${USERS_API_URL}/superviseurs/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>)),
  });
  return result;
}

// ============================================================================
// HISTORIQUE RH
// ============================================================================

export async function fetchHistoriqueRH(filters: HistoriqueRHFilters = {}): Promise<HistoriqueRH> {
  const queryString = buildQueryParams(filters as Record<string, unknown>);
  return fetchApi<HistoriqueRH>(`${USERS_API_URL}/historique-rh/?${queryString}`);
}

// ============================================================================
// STATISTIQUES
// ============================================================================

export async function fetchStatistiquesUtilisateurs(): Promise<StatistiquesUtilisateurs> {
  return fetchApi<StatistiquesUtilisateurs>(`${USERS_API_URL}/statistiques/`);
}

// ATTRIBUER UN ROLE
export async function attribuerRole(
  utilisateurId: string,
  roleId: string,
): Promise<{ message: string }> {
  const result = await fetchApi<{ message: string }>(
    `${USERS_API_URL}/utilisateurs/${utilisateurId}/attribuer_role/`,
    {
      method: 'POST',
      body: JSON.stringify({ role_id: roleId }),
    },
  );
  return result;
}

// RETIRER UN ROLE
export async function retirerRole(
  utilisateurId: string,
  roleId: string,
): Promise<{ message: string }> {
  const result = await fetchApi<{ message: string }>(
    `${USERS_API_URL}/utilisateurs/${utilisateurId}/retirer_role/`,
    {
      method: 'POST',
      body: JSON.stringify({ role_id: roleId }),
    },
  );
  return result;
}

// ============================================================================
// DECLARATION GLOBALE
// ============================================================================
