// ============================================================================
// API SERVICE - Module Gestion des Utilisateurs
// Service pour les appels API vers le backend api_users
// ============================================================================

import {
  Utilisateur,
  UtilisateurCreate,
  UtilisateurUpdate,
  ChangePassword,
  Role,
  Client,
  ClientCreate,
  ClientUpdate,
  Competence,
  CompetenceOperateur,
  CompetenceOperateurCreate,
  OperateurList,
  OperateurDetail,
  OperateurCreate,
  OperateurUpdate,
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


// ============================================================================
// CACHE SYSTEM - Pour éviter les re-fetch constants
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(keyPrefix?: string): void {
  if (keyPrefix) {
    for (const key of cache.keys()) {
      if (key.startsWith(keyPrefix)) cache.delete(key);
    }
  } else {
    cache.clear();
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
  return fetchApi<Utilisateur>(`${USERS_API_URL}/utilisateurs/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function updateUtilisateur(
  id: number,
  data: UtilisateurUpdate
): Promise<Utilisateur> {
  return fetchApi<Utilisateur>(`${USERS_API_URL}/utilisateurs/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function deleteUtilisateur(id: number): Promise<void> {
  await fetchApi<void>(`${USERS_API_URL}/utilisateurs/${id}/`, {
    method: 'DELETE'
  });
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
// CLIENTS
// ============================================================================

export async function fetchClients(forceRefresh = false): Promise<PaginatedResponse<Client>> {
  const cacheKey = 'clients';

  if (!forceRefresh) {
    const cached = getCached<PaginatedResponse<Client>>(cacheKey);
    if (cached) return cached;
  }

  const result = await fetchApi<PaginatedResponse<Client>>(`${USERS_API_URL}/clients/`);
  setCache(cacheKey, result);
  return result;
}

export async function createClient(data: ClientCreate): Promise<Client> {
  return fetchApi<Client>(`${USERS_API_URL}/clients/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function updateClient(
  id: number,
  data: ClientUpdate
): Promise<Client> {
  return fetchApi<Client>(`${USERS_API_URL}/clients/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function deleteClient(id: number): Promise<void> {
  await fetchApi<void>(`${USERS_API_URL}/clients/${id}/`, {
    method: 'DELETE'
  });
}

// ============================================================================
// COMPETENCES
// ============================================================================

export async function fetchCompetences(
  filters: CompetenceFilters = {}
): Promise<Competence[]> {
  const queryString = buildQueryParams(filters as Record<string, unknown>);
  const response = await fetchApi<PaginatedResponse<Competence>>(
    `${USERS_API_URL}/competences/?${queryString}`
  );
  return response.results;
}

export async function createCompetence(
  data: { nomCompetence: string; categorie: CategorieCompetence; description?: string; ordreAffichage?: number }
): Promise<Competence> {
  return fetchApi<Competence>(`${USERS_API_URL}/competences/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as Record<string, unknown>))
  });
}

export async function updateCompetence(
  id: number,
  data: { nomCompetence?: string; categorie?: CategorieCompetence; description?: string; ordreAffichage?: number }
): Promise<Competence> {
  return fetchApi<Competence>(`${USERS_API_URL}/competences/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as Record<string, unknown>))
  });
}

export async function deleteCompetence(id: number): Promise<void> {
  await fetchApi<void>(`${USERS_API_URL}/competences/${id}/`, { method: 'DELETE' });
}

// ============================================================================
// OPERATEURS
// ============================================================================

export async function fetchOperateurs(
  filters: OperateurFilters = {}
): Promise<PaginatedResponse<OperateurList>> {
  const queryString = buildQueryParams(filters as Record<string, unknown>);
  return fetchApi<PaginatedResponse<OperateurList>>(
    `${USERS_API_URL}/operateurs/?${queryString}`
  );
}

export async function fetchOperateurById(id: number): Promise<OperateurDetail> {
  return fetchApi<OperateurDetail>(`${USERS_API_URL}/operateurs/${id}/`);
}

export async function createOperateur(data: OperateurCreate): Promise<OperateurList> {
  return fetchApi<OperateurList>(`${USERS_API_URL}/operateurs/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function updateOperateur(
  id: number,
  data: OperateurUpdate
): Promise<OperateurList> {
  return fetchApi<OperateurList>(`${USERS_API_URL}/operateurs/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function deleteOperateur(id: number): Promise<void> {
  await fetchApi<void>(`${USERS_API_URL}/operateurs/${id}/`, {
    method: 'DELETE'
  });
}

export async function fetchOperateursDisponibles(): Promise<OperateurList[]> {
  const response = await fetchApi<OperateurList[]>(
    `${USERS_API_URL}/operateurs/disponibles/`
  );
  return response;
}

export async function fetchChefsPotentiels(): Promise<OperateurList[]> {
  // Récupérer à la fois les opérateurs pouvant être chef (par compétence)
  // et les utilisateurs qui se sont vus attribuer le rôle `CHEF_EQUIPE`.
  const operateursRes = await fetchApi<OperateurList[]>(`${USERS_API_URL}/operateurs/chefs_potentiels/`);

  // Les utilisateurs avec le rôle CHEF_EQUIPE
  const usersRes = await fetchApi<PaginatedResponse<Utilisateur>>(
    `${USERS_API_URL}/utilisateurs/?role=CHEF_EQUIPE&actif=true`
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
  return fetchApi<CompetenceOperateur>(
    `${USERS_API_URL}/operateurs/${operateurId}/affecter_competence/`,
    {
      method: 'POST',
      body: JSON.stringify({
        competence_id: data.competenceId,
        niveau: data.niveau
      })
    }
  );
}

// ============================================================================
// EQUIPES
// ============================================================================

export async function fetchEquipes(
  filters: EquipeFilters = {},
  forceRefresh = false
): Promise<PaginatedResponse<EquipeList>> {
  // Cache uniquement quand pas de filtres (cas le plus courant)
  const hasFilters = Object.keys(filters).length > 0;
  const cacheKey = 'equipes';

  if (!hasFilters && !forceRefresh) {
    const cached = getCached<PaginatedResponse<EquipeList>>(cacheKey);
    if (cached) return cached;
  }

  const queryString = buildQueryParams(filters as Record<string, unknown>);
  const result = await fetchApi<PaginatedResponse<EquipeList>>(
    `${USERS_API_URL}/equipes/?${queryString}`
  );
  if (!hasFilters) setCache(cacheKey, result);
  return result;
}

export async function fetchEquipeById(id: number): Promise<EquipeDetail> {
  return fetchApi<EquipeDetail>(`${USERS_API_URL}/equipes/${id}/`);
}

export async function createEquipe(data: EquipeCreate): Promise<EquipeList> {
  return fetchApi<EquipeList>(`${USERS_API_URL}/equipes/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function updateEquipe(
  id: number,
  data: EquipeUpdate
): Promise<EquipeList> {
  return fetchApi<EquipeList>(`${USERS_API_URL}/equipes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function deleteEquipe(id: number): Promise<void> {
  await fetchApi<void>(`${USERS_API_URL}/equipes/${id}/`, {
    method: 'DELETE'
  });
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
  return fetchApi<EquipeDetail>(
    `${USERS_API_URL}/equipes/${equipeId}/affecter_membres/`,
    {
      method: 'POST',
      body: JSON.stringify({ operateurs: data.operateurs })
    }
  );
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
  return fetchApi<EquipeDetail>(
    `${USERS_API_URL}/equipes/${equipeId}/retirer_membre/`,
    {
      method: 'POST',
      body: JSON.stringify({ operateur_id: operateurId })
    }
  );
}

// ============================================================================
// ABSENCES
// ============================================================================

export async function fetchAbsences(
  filters: AbsenceFilters = {}
): Promise<PaginatedResponse<Absence>> {
  const queryString = buildQueryParams(filters as Record<string, unknown>);
  return fetchApi<PaginatedResponse<Absence>>(
    `${USERS_API_URL}/absences/?${queryString}`
  );
}

export async function fetchAbsenceById(id: number): Promise<Absence> {
  return fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/`);
}

export async function createAbsence(data: AbsenceCreate): Promise<Absence> {
  return fetchApi<Absence>(`${USERS_API_URL}/absences/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function validerAbsence(
  id: number,
  commentaire?: string
): Promise<Absence> {
  return fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/valider/`, {
    method: 'POST',
    body: JSON.stringify({ commentaire })
  });
}

export async function refuserAbsence(
  id: number,
  commentaire?: string
): Promise<Absence> {
  return fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/refuser/`, {
    method: 'POST',
    body: JSON.stringify({ commentaire })
  });
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
  return fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function annulerAbsence(id: number): Promise<Absence> {
  return fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/annuler/`, {
    method: 'POST'
  });
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
  return fetchApi<{ message: string }>(
    `${USERS_API_URL}/utilisateurs/${utilisateurId}/attribuer_role/`,
    {
      method: 'POST',
      body: JSON.stringify({ role_id: roleId })
    }
  );
}

// RETIRER UN ROLE
export async function retirerRole(utilisateurId: string, roleId: string): Promise<{ message: string }> {
  return fetchApi<{ message: string }>(
    `${USERS_API_URL}/utilisateurs/${utilisateurId}/retirer_role/`,
    {
      method: 'POST',
      body: JSON.stringify({ role_id: roleId })
    }
  );
}

// ============================================================================
// DECLARATION GLOBALE
// ============================================================================



