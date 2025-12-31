// ============================================================================
// API SERVICE - Module Gestion des Utilisateurs
// Service pour les appels API vers le backend api_users
// ============================================================================

// Logging conditionnel (désactivé en production)
const DEBUG_CACHE = import.meta.env.DEV && false; // Mettre à true pour debug cache
const logCache = (...args: unknown[]) => {
  if (DEBUG_CACHE) console.log(...args);
};

import {
  Utilisateur,
  UtilisateurCreate,
  UtilisateurUpdate,
  ChangePassword,
  Role,
  StructureClient,
  StructureClientDetail,
  StructureClientCreate,
  StructureClientUpdate,
  StructureClientFilters,
  Client,
  ClientUser,
  ClientCreate,
  ClientUpdate,
  ClientFilters,
  Competence,
  CompetenceOperateur,
  CompetenceOperateurCreate,
  OperateurList,
  OperateurDetail,
  OperateurCreate,
  OperateurUpdate,
  SuperviseurList,
  EquipeList,
  EquipeDetail,
  EquipeCreate,
  EquipeUpdate,
  CategorieCompetence,
  EquipeStatut,
  AffecterMembres,
  Absence,
  AbsenceCreate,
  AbsenceUpdate,

  HistoriqueRH,
  StatistiquesUtilisateurs,
  PaginatedResponse,
  UtilisateurFilters,
  OperateurFilters,
  EquipeFilters,
  AbsenceFilters,
  CompetenceFilters,
  HistoriqueRHFilters
} from '../types/users';

// Import mock data for development


// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const USERS_API_URL = `${API_BASE_URL}/users`;

// Import Dexie cache
import { db, cacheKeys, cacheTTL } from './db';

// ============================================================================
// CACHE HELPERS - Utilise Dexie (IndexedDB)
// ============================================================================

export async function invalidateCache(keyPrefix?: string): Promise<void> {
  if (keyPrefix) {
    await db.invalidatePrefix(keyPrefix);
  } else {
    await db.clearAll();
  }
}

// ============================================================================
// UTILITAIRES
// ============================================================================

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Convertir camelCase vers snake_case pour envoi au backend
function camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      const value = obj[key];
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[snakeKey] = camelToSnake(value as Record<string, unknown>);
      } else {
        result[snakeKey] = value;
      }
    }
  }
  return result;
}

// Convertir snake_case vers camelCase pour reception du backend
function snakeToCamel<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamel(item)) as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key in obj as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = snakeToCamel((obj as Record<string, unknown>)[key]);
      }
    }
    return result as T;
  }
  return obj as T;
}

// Construire les query params depuis un objet de filtres
function buildQueryParams(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      params.append(snakeKey, String(value));
    }
  }
  return params.toString();
}

// Fetch avec gestion d'erreurs et authentification JWT
async function fetchApi<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  // Utilise apiFetch pour garantir le token JWT
  const response = await import('./apiFetch').then(m => m.apiFetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  }));

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new ApiError(response.status, response.statusText, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();
  return snakeToCamel<T>(data);
}



// ============================================================================
// UTILISATEURS
// ============================================================================

export async function fetchUtilisateurs(
  filters: UtilisateurFilters = {}
): Promise<PaginatedResponse<Utilisateur>> {
  const queryString = buildQueryParams(filters as Record<string, unknown>);
  return fetchApi<PaginatedResponse<Utilisateur>>(
    `${USERS_API_URL}/utilisateurs/?${queryString}`
  );
}

export async function fetchCurrentUser(): Promise<Utilisateur> {
  return fetchApi<Utilisateur>(`${USERS_API_URL}/me/`);
}

export async function fetchUtilisateurById(id: number): Promise<Utilisateur> {
  return fetchApi<Utilisateur>(`${USERS_API_URL}/utilisateurs/${id}/`);
}

export async function createUtilisateur(data: UtilisateurCreate): Promise<Utilisateur> {
  const result = await fetchApi<Utilisateur>(`${USERS_API_URL}/utilisateurs/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });

  // Invalider le cache
  await db.remove(cacheKeys.users());
  return result;
}

export async function updateUtilisateur(
  id: number,
  data: UtilisateurUpdate
): Promise<Utilisateur> {
  const result = await fetchApi<Utilisateur>(`${USERS_API_URL}/utilisateurs/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });

  // Invalider les caches utilisateurs et clients
  await db.remove(cacheKeys.users());
  await db.remove('clients');
  return result;
}

export async function deleteUtilisateur(id: number): Promise<void> {
  await fetchApi<void>(`${USERS_API_URL}/utilisateurs/${id}/`, {
    method: 'DELETE'
  });

  // Invalider le cache
  await db.remove(cacheKeys.users());
}

export async function changePassword(
  id: number,
  data: ChangePassword
): Promise<{ message: string }> {
  return fetchApi<{ message: string }>(
    `${USERS_API_URL}/utilisateurs/${id}/change_password/`,
    {
      method: 'POST',
      body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
    }
  );
}

// ============================================================================
// ROLES
// ============================================================================

export async function fetchRoles(): Promise<Role[]> {
  const response = await fetchApi<PaginatedResponse<Role>>(
    `${USERS_API_URL}/roles/`
  );
  return response.results;
}

// ============================================================================
// STRUCTURES CLIENTS
// ============================================================================

export async function fetchStructures(
  filters: StructureClientFilters = {},
  forceRefresh = false
): Promise<PaginatedResponse<StructureClient>> {
  const queryString = buildQueryParams(filters as Record<string, unknown>);
  const cacheKey = queryString ? `structures:${queryString}` : 'structures';

  if (!forceRefresh) {
    const cached = await db.get<PaginatedResponse<StructureClient>>(cacheKey);
    if (cached) {
      logCache('[Cache HIT] Structures');
      return cached;
    }
  }

  logCache('[Cache MISS] Structures - Appel API');
  const result = await fetchApi<PaginatedResponse<StructureClient>>(
    `${USERS_API_URL}/structures/?${queryString}`
  );
  await db.set(cacheKey, result, cacheTTL.standard);
  return result;
}

export async function fetchStructureById(id: number): Promise<StructureClientDetail> {
  return fetchApi<StructureClientDetail>(`${USERS_API_URL}/structures/${id}/`);
}

export async function createStructure(data: StructureClientCreate): Promise<StructureClient> {
  const result = await fetchApi<StructureClient>(`${USERS_API_URL}/structures/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });

  // Invalider le cache
  await db.invalidatePrefix('structures');
  return result;
}

export async function updateStructure(
  id: number,
  data: StructureClientUpdate
): Promise<StructureClient> {
  const result = await fetchApi<StructureClient>(`${USERS_API_URL}/structures/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });

  // Invalider le cache
  await db.invalidatePrefix('structures');
  return result;
}

export async function deleteStructure(id: number): Promise<void> {
  await fetchApi<void>(`${USERS_API_URL}/structures/${id}/`, {
    method: 'DELETE'
  });

  // Invalider le cache
  await db.invalidatePrefix('structures');
  await db.remove('clients');
}

export async function fetchStructureUtilisateurs(structureId: number): Promise<ClientUser[]> {
  return fetchApi<ClientUser[]>(`${USERS_API_URL}/structures/${structureId}/utilisateurs/`);
}

export async function addUserToStructure(
  structureId: number,
  userData: { email: string; nom: string; prenom: string; password: string }
): Promise<Client> {
  const result = await fetchApi<Client>(
    `${USERS_API_URL}/structures/${structureId}/ajouter_utilisateur/`,
    {
      method: 'POST',
      body: JSON.stringify(camelToSnake(userData as unknown as Record<string, unknown>))
    }
  );

  // Invalider les caches
  await db.invalidatePrefix('structures');
  await db.remove('clients');
  return result;
}

// ============================================================================
// CLIENTS (Utilisateurs de structures)
// ============================================================================

export async function fetchClients(forceRefresh = false): Promise<PaginatedResponse<Client>> {
  if (!forceRefresh) {
    const cached = await db.get<PaginatedResponse<Client>>('clients');
    if (cached) {
      logCache('[Cache HIT] Clients');
      return cached;
    }
  }

  logCache('[Cache MISS] Clients - Appel API');
  const result = await fetchApi<PaginatedResponse<Client>>(`${USERS_API_URL}/clients/`);
  await db.set('clients', result, cacheTTL.standard);
  return result;
}

/**
 * Récupère un client par son ID utilisateur
 * Utilise l'endpoint /clients/?utilisateur={id} pour filtrer
 */
export async function fetchClientByUserId(userId: number): Promise<Client | null> {
  try {
    // L'API supporte le filtre par utilisateur
    const result = await fetchApi<PaginatedResponse<Client>>(`${USERS_API_URL}/clients/?utilisateur=${userId}`);
    if (result.results && result.results.length > 0) {
      return result.results[0] ?? null;
    }
    return null;
  } catch (error) {
    console.error('Erreur fetchClientByUserId:', error);
    return null;
  }
}

export async function createClient(data: ClientCreate): Promise<Client> {
  let result: Client;

  // Si le logo est présent et est une data URL base64, utiliser FormData
  if (data.logo && typeof data.logo === 'string' && data.logo.startsWith('data:')) {
    const formData = new FormData();

    // Convertir base64 en Blob
    const base64Response = await fetch(data.logo);
    const blob = await base64Response.blob();
    formData.append('logo', blob, 'logo.png');

    // Ajouter les champs obligatoires et optionnels
    formData.append('email', data.email);
    formData.append('nom', data.nom);
    formData.append('prenom', data.prenom);
    formData.append('password', data.password);
    formData.append('nom_structure', data.nomStructure);

    if (data.adresse) formData.append('adresse', data.adresse);
    if (data.telephone) formData.append('telephone', data.telephone);
    if (data.contactPrincipal) formData.append('contact_principal', data.contactPrincipal);
    if (data.emailFacturation) formData.append('email_facturation', data.emailFacturation);

    // Utiliser apiFetch directement sans Content-Type JSON
    const response = await import('./apiFetch').then(m => m.apiFetch(`${USERS_API_URL}/clients/`, {
      method: 'POST',
      body: formData
    }));

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ApiError(response.status, response.statusText, errorData);
    }

    const responseData = await response.json();
    result = snakeToCamel<Client>(responseData);
  } else {
    // Si pas de logo, utiliser JSON standard
    result = await fetchApi<Client>(`${USERS_API_URL}/clients/`, {
      method: 'POST',
      body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
    });
  }

  // Invalider le cache
  await db.remove('clients');
  return result;
}

export async function updateClient(
  id: number,
  data: ClientUpdate
): Promise<Client> {
  logCache('📤 updateClient appelé:', { id, data, hasLogo: !!data.logo, logoType: typeof data.logo });

  let result: Client;

  // Si le logo est présent et est une data URL base64, utiliser FormData
  if (data.logo && typeof data.logo === 'string' && data.logo.startsWith('data:')) {
    logCache('✅ Utilisation de FormData pour upload logo');
    const formData = new FormData();

    // Convertir base64 en Blob
    const base64Response = await fetch(data.logo);
    const blob = await base64Response.blob();
    formData.append('logo', blob, 'logo.png');

    // Ajouter les autres champs
    if (data.nomStructure !== undefined) formData.append('nom_structure', data.nomStructure);
    if (data.adresse !== undefined) formData.append('adresse', data.adresse);
    if (data.telephone !== undefined) formData.append('telephone', data.telephone);
    if (data.contactPrincipal !== undefined) formData.append('contact_principal', data.contactPrincipal);
    if (data.emailFacturation !== undefined) formData.append('email_facturation', data.emailFacturation);

    // Utiliser apiFetch directement sans Content-Type JSON
    const response = await import('./apiFetch').then(m => m.apiFetch(`${USERS_API_URL}/clients/${id}/`, {
      method: 'PATCH',
      body: formData
      // Pas de Content-Type header - le navigateur le définit automatiquement avec boundary
    }));

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Erreur FormData:', { status: response.status, statusText: response.statusText, errorData });
      throw new ApiError(response.status, response.statusText, errorData);
    }

    const responseData = await response.json();
    result = snakeToCamel<Client>(responseData);
  } else {
    // Si pas de logo ou logo === undefined (suppression), utiliser JSON standard
    logCache('📝 Utilisation de JSON standard (pas de logo ou logo non modifié)');
    const payload = camelToSnake(data as unknown as Record<string, unknown>);
    logCache('📝 Payload JSON:', payload);

    result = await fetchApi<Client>(`${USERS_API_URL}/clients/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  // Invalider le cache
  await db.remove('clients');
  return result;
}

export async function deleteClient(id: number): Promise<void> {
  await fetchApi<void>(`${USERS_API_URL}/clients/${id}/`, {
    method: 'DELETE'
  });

  // Invalider le cache
  await db.remove('clients');
}

// ============================================================================
// COMPETENCES
// ============================================================================

export async function fetchCompetences(
  filters: CompetenceFilters = {}
): Promise<Competence[]> {
  // Cache uniquement sans filtres
  const hasFilters = Object.keys(filters).length > 0;

  if (!hasFilters) {
    const cached = await db.get<Competence[]>(cacheKeys.competences());
    if (cached) {
      logCache('[Cache HIT] Compétences');
      return cached;
    }
  }

  logCache('[Cache MISS] Compétences - Appel API');
  const queryString = buildQueryParams(filters as Record<string, unknown>);
  const response = await fetchApi<PaginatedResponse<Competence>>(
    `${USERS_API_URL}/competences/?${queryString}`
  );

  if (!hasFilters) await db.set(cacheKeys.competences(), response.results, cacheTTL.static);
  return response.results;
}

export async function createCompetence(
  data: { nomCompetence: string; categorie: CategorieCompetence; description?: string; ordreAffichage?: number }
): Promise<Competence> {
  const result = await fetchApi<Competence>(`${USERS_API_URL}/competences/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as Record<string, unknown>))
  });

  // Invalider le cache
  await db.remove(cacheKeys.competences());
  return result;
}

export async function updateCompetence(
  id: number,
  data: { nomCompetence?: string; categorie?: CategorieCompetence; description?: string; ordreAffichage?: number }
): Promise<Competence> {
  const result = await fetchApi<Competence>(`${USERS_API_URL}/competences/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as Record<string, unknown>))
  });

  // Invalider le cache
  await db.remove(cacheKeys.competences());
  return result;
}

export async function deleteCompetence(id: number): Promise<void> {
  await fetchApi<void>(`${USERS_API_URL}/competences/${id}/`, { method: 'DELETE' });

  // Invalider le cache
  await db.remove(cacheKeys.competences());
}

// ============================================================================
// OPERATEURS
// ============================================================================

export async function fetchOperateurs(
  filters: OperateurFilters = {}
): Promise<PaginatedResponse<OperateurList>> {
  // Improved cache: also cache paginated results with a unique key
  const queryString = buildQueryParams(filters as Record<string, unknown>);
  const cacheKey = queryString ? `operateurs:${queryString}` : cacheKeys.operateurs();

  const cached = await db.get<PaginatedResponse<OperateurList>>(cacheKey);
  if (cached) {
    logCache('[Cache HIT] Opérateurs', queryString || 'no filters');
    return cached;
  }

  logCache('[Cache MISS] Opérateurs - Appel API', queryString || 'no filters');
  const result = await fetchApi<PaginatedResponse<OperateurList>>(
    `${USERS_API_URL}/operateurs/?${queryString}`
  );

  // Cache with shorter TTL for paginated results (2 minutes instead of 5)
  const ttl = Object.keys(filters).length > 0 ? 120000 : cacheTTL.standard;
  await db.set(cacheKey, result, ttl);
  return result;
}

export async function fetchOperateurById(id: number): Promise<OperateurDetail> {
  return fetchApi<OperateurDetail>(`${USERS_API_URL}/operateurs/${id}/`);
}

export async function createOperateur(data: OperateurCreate): Promise<OperateurList> {
  const result = await fetchApi<OperateurList>(`${USERS_API_URL}/operateurs/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });

  // Invalider le cache
  await db.remove(cacheKeys.operateurs());
  return result;
}

export async function updateOperateur(
  id: number,
  data: OperateurUpdate
): Promise<OperateurList> {
  const result = await fetchApi<OperateurList>(`${USERS_API_URL}/operateurs/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });

  // Invalider le cache (y compris toutes les pages mises en cache)
  await db.remove(cacheKeys.operateur(id));
  await db.invalidatePrefix('operateurs:');
  return result;
}

export async function deleteOperateur(id: number): Promise<void> {
  await fetchApi<void>(`${USERS_API_URL}/operateurs/${id}/`, {
    method: 'DELETE'
  });

  // Invalider le cache (y compris toutes les pages mises en cache)
  await db.remove(cacheKeys.operateur(id));
  await db.invalidatePrefix('operateurs:');
}

export async function fetchOperateursDisponibles(): Promise<OperateurList[]> {
  const response = await fetchApi<OperateurList[]>(
    `${USERS_API_URL}/operateurs/disponibles/`
  );
  return response;
}

export async function fetchChefsPotentiels(): Promise<OperateurList[]> {
  // Récupérer les opérateurs pouvant être chef d'équipe (par compétence "Gestion d'équipe")
  // Note: Les chefs d'équipe sont des opérateurs (données RH), pas des utilisateurs
  const operateursRes = await fetchApi<OperateurList[]>(`${USERS_API_URL}/operateurs/chefs_potentiels/`);

  // Les superviseurs (utilisateurs) ne sont PAS des opérateurs, donc on ne les inclut pas ici
  const usersRes = await fetchApi<PaginatedResponse<Utilisateur>>(
    `${USERS_API_URL}/utilisateurs/?role=SUPERVISEUR&actif=true`
  ).catch(() => ({ count: 0, next: null, previous: null, results: [] } as PaginatedResponse<Utilisateur>));

  const usersAsOperateurs: OperateurList[] = (usersRes && usersRes.results ? usersRes.results : []).map(u => ({
    utilisateur: u.id,
    email: u.email,
    nom: u.nom,
    prenom: u.prenom,
    fullName: u.fullName || `${u.prenom} ${u.nom}`,
    actif: u.actif,
    numeroImmatriculation: '',
    statut: null as any,
    equipe: null as any,
    equipeNom: null as any,
    dateEmbauche: null as any,
    telephone: '',
    photo: null as any,
    estChefEquipe: true,
    estDisponible: false
  }));

  // Merge unique by `utilisateur` id
  const merged: OperateurList[] = [];
  const seen = new Set<number>();
  for (const op of operateursRes) {
    merged.push(op);
    seen.add(op.utilisateur);
  }
  for (const u of usersAsOperateurs) {
    if (!seen.has(u.utilisateur)) {
      merged.push(u);
      seen.add(u.utilisateur);
    }
  }

  return merged;
}

export async function fetchCompetencesOperateur(
  operateurId: number
): Promise<CompetenceOperateur[]> {
  // Correction: le retour doit être un tableau
  return fetchApi<CompetenceOperateur[]>(
    `${USERS_API_URL}/operateurs/${operateurId}/competences/`
  );
}

export async function affecterCompetence(
  operateurId: number,
  data: CompetenceOperateurCreate
): Promise<CompetenceOperateur> {
  const result = await fetchApi<CompetenceOperateur>(
    `${USERS_API_URL}/operateurs/${operateurId}/affecter_competence/`,
    {
      method: 'POST',
      body: JSON.stringify({
        competence_id: data.competenceId,
        niveau: data.niveau
      })
    }
  );

  // Invalider le cache des opérateurs (y compris toutes les pages)
  await db.invalidatePrefix('operateurs:');
  return result;
}

// ============================================================================
// SUPERVISEURS
// ============================================================================

export async function fetchSuperviseurs(): Promise<PaginatedResponse<SuperviseurList>> {
  // Récupérer les utilisateurs avec le rôle SUPERVISEUR
  const result = await fetchApi<PaginatedResponse<SuperviseurList>>(
    `${USERS_API_URL}/superviseurs/`
  );
  return result;
}

// ============================================================================
// EQUIPES
// ============================================================================

export async function fetchEquipes(
  filters: EquipeFilters = {},
  forceRefresh = false
): Promise<PaginatedResponse<EquipeList>> {
  // Improved cache: also cache paginated results with a unique key
  const queryString = buildQueryParams(filters as Record<string, unknown>);
  const cacheKey = queryString ? `equipes:${queryString}` : cacheKeys.equipes();

  console.log('[fetchEquipes] Filters:', filters);
  console.log('[fetchEquipes] Query string:', queryString);
  console.log('[fetchEquipes] Full URL:', `${USERS_API_URL}/equipes/?${queryString}`);

  if (!forceRefresh) {
    const cached = await db.get<PaginatedResponse<EquipeList>>(cacheKey);
    if (cached) {
      logCache('[Cache HIT] Équipes', queryString || 'no filters');
      console.log('[fetchEquipes] Returning cached result:', cached.results.length, 'teams');
      return cached;
    }
  }

  logCache('[Cache MISS] Équipes - Appel API', queryString || 'no filters');
  const result = await fetchApi<PaginatedResponse<EquipeList>>(
    `${USERS_API_URL}/equipes/?${queryString}`
  );
  console.log('[fetchEquipes] API returned:', result.results.length, 'teams');

  // Cache with shorter TTL for paginated results (2 minutes instead of 5)
  const ttl = Object.keys(filters).length > 0 ? 120000 : cacheTTL.standard;
  await db.set(cacheKey, result, ttl);
  return result;
}

export async function fetchEquipeById(id: number): Promise<EquipeDetail> {
  return fetchApi<EquipeDetail>(`${USERS_API_URL}/equipes/${id}/`);
}

export async function createEquipe(data: EquipeCreate): Promise<EquipeList> {
  const result = await fetchApi<EquipeList>(`${USERS_API_URL}/equipes/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });

  // Invalider le cache des équipes (y compris toutes les pages)
  await db.invalidatePrefix('equipes:');
  return result;
}

export async function updateEquipe(
  id: number,
  data: EquipeUpdate
): Promise<EquipeList> {
  const result = await fetchApi<EquipeList>(`${USERS_API_URL}/equipes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });

  // Invalider le cache des équipes (y compris toutes les pages)
  await db.invalidatePrefix('equipes:');
  return result;
}

export async function deleteEquipe(id: number): Promise<void> {
  await fetchApi<void>(`${USERS_API_URL}/equipes/${id}/`, {
    method: 'DELETE'
  });

  // Invalider le cache des équipes et opérateurs (y compris toutes les pages)
  await db.invalidatePrefix('equipes:');
  await db.invalidatePrefix('operateurs:');
}

export async function fetchEquipeMembres(equipeId: number): Promise<OperateurList[]> {
  return fetchApi<OperateurList[]>(
    `${USERS_API_URL}/equipes/${equipeId}/membres/`
  );
}

export async function affecterMembres(
  equipeId: number,
  data: AffecterMembres
): Promise<EquipeDetail> {
  const result = await fetchApi<EquipeDetail>(
    `${USERS_API_URL}/equipes/${equipeId}/affecter_membres/`,
    {
      method: 'POST',
      body: JSON.stringify({ operateurs: data.operateurs })
    }
  );

  // Invalider le cache des équipes et opérateurs (y compris toutes les pages)
  await db.invalidatePrefix('equipes:');
  await db.invalidatePrefix('operateurs:');
  return result;
}

export async function fetchEquipeStatut(equipeId: number): Promise<EquipeStatut> {
  return fetchApi<EquipeStatut>(
    `${USERS_API_URL}/equipes/${equipeId}/statut/`
  );
}

export async function retirerMembre(
  equipeId: number,
  operateurId: number
): Promise<EquipeDetail> {
  const result = await fetchApi<EquipeDetail>(
    `${USERS_API_URL}/equipes/${equipeId}/retirer_membre/`,
    {
      method: 'POST',
      body: JSON.stringify({ operateur_id: operateurId })
    }
  );

  // Invalider le cache des équipes et opérateurs (y compris toutes les pages)
  await db.invalidatePrefix('equipes:');
  await db.invalidatePrefix('operateurs:');
  return result;
}

// ============================================================================
// ABSENCES
// ============================================================================

export async function fetchAbsences(
  filters: AbsenceFilters = {}
): Promise<PaginatedResponse<Absence>> {
  // Improved cache: also cache paginated results with a unique key
  const queryString = buildQueryParams(filters as Record<string, unknown>);
  const cacheKey = queryString ? `absences:${queryString}` : cacheKeys.absences();

  const cached = await db.get<PaginatedResponse<Absence>>(cacheKey);
  if (cached) {
    logCache('[Cache HIT] Absences', queryString || 'no filters');
    return cached;
  }

  logCache('[Cache MISS] Absences - Appel API', queryString || 'no filters');
  const result = await fetchApi<PaginatedResponse<Absence>>(
    `${USERS_API_URL}/absences/?${queryString}`
  );

  // Cache with shorter TTL for paginated results (1 minute for absences - more dynamic data)
  const ttl = Object.keys(filters).length > 0 ? 60000 : cacheTTL.dynamic;
  await db.set(cacheKey, result, ttl);
  return result;
}

export async function fetchAbsenceById(id: number): Promise<Absence> {
  return fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/`);
}

export async function createAbsence(data: AbsenceCreate): Promise<Absence> {
  const result = await fetchApi<Absence>(`${USERS_API_URL}/absences/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });

  // Invalider le cache (y compris toutes les pages)
  await db.invalidatePrefix('absences:');
  return result;
}

export async function validerAbsence(
  id: number,
  commentaire?: string
): Promise<Absence> {
  const result = await fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/valider/`, {
    method: 'POST',
    body: JSON.stringify({ commentaire })
  });

  // Invalider le cache (y compris toutes les pages)
  await db.invalidatePrefix('absences:');
  return result;
}

export async function refuserAbsence(
  id: number,
  commentaire?: string
): Promise<Absence> {
  const result = await fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/refuser/`, {
    method: 'POST',
    body: JSON.stringify({ commentaire })
  });

  // Invalider le cache (y compris toutes les pages)
  await db.invalidatePrefix('absences:');
  return result;
}

export async function fetchAbsencesEnCours(): Promise<Absence[]> {
  return fetchApi<Absence[]>(`${USERS_API_URL}/absences/en_cours/`);
}

export async function fetchAbsencesAValider(): Promise<Absence[]> {
  return fetchApi<Absence[]>(`${USERS_API_URL}/absences/a_valider/`);
}

export async function updateAbsence(
  id: number,
  data: AbsenceUpdate
): Promise<Absence> {
  const result = await fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });

  // Invalider le cache (y compris toutes les pages)
  await db.invalidatePrefix('absences:');
  return result;
}

export async function annulerAbsence(id: number): Promise<Absence> {
  const result = await fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/annuler/`, {
    method: 'POST'
  });

  // Invalider le cache (y compris toutes les pages)
  await db.invalidatePrefix('absences:');
  return result;
}

// ============================================================================
// HISTORIQUE RH
// ============================================================================

export async function fetchHistoriqueRH(
  filters: HistoriqueRHFilters = {}
): Promise<HistoriqueRH> {
  const queryString = buildQueryParams(filters as Record<string, unknown>);
  return fetchApi<HistoriqueRH>(
    `${USERS_API_URL}/historique-rh/?${queryString}`
  );
}

// ============================================================================
// STATISTIQUES
// ============================================================================

export async function fetchStatistiquesUtilisateurs(): Promise<StatistiquesUtilisateurs> {
  return fetchApi<StatistiquesUtilisateurs>(
    `${USERS_API_URL}/statistiques/`
  );
}

// ATTRIBUER UN ROLE
export async function attribuerRole(utilisateurId: string, roleId: string): Promise<{ message: string }> {
  const result = await fetchApi<{ message: string }>(
    `${USERS_API_URL}/utilisateurs/${utilisateurId}/attribuer_role/`,
    {
      method: 'POST',
      body: JSON.stringify({ role_id: roleId })
    }
  );

  // Invalider le cache des utilisateurs
  await db.remove(cacheKeys.users());
  return result;
}

// RETIRER UN ROLE
export async function retirerRole(utilisateurId: string, roleId: string): Promise<{ message: string }> {
  const result = await fetchApi<{ message: string }>(
    `${USERS_API_URL}/utilisateurs/${utilisateurId}/retirer_role/`,
    {
      method: 'POST',
      body: JSON.stringify({ role_id: roleId })
    }
  );

  // Invalider le cache des utilisateurs
  await db.remove(cacheKeys.users());
  return result;
}

// ============================================================================
// DECLARATION GLOBALE
// ============================================================================



