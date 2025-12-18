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
  HistoriqueEquipeOperateur,
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
import {
  MOCK_UTILISATEURS,
  MOCK_ROLES,
  MOCK_CLIENTS,
  MOCK_COMPETENCES,
  MOCK_COMPETENCES_OPERATEURS,
  MOCK_OPERATEURS,
  MOCK_EQUIPES,
  MOCK_ABSENCES,
  MOCK_HISTORIQUE_EQUIPES,
  MOCK_STATISTIQUES,
  getUtilisateurById,
  getOperateurById,
  getEquipeById,
  getOperateursByEquipe,
  getCompetencesOperateur,
  getAbsencesByOperateur,
  getAbsencesEnCours,
  getAbsencesAValider,
  getOperateursDisponibles,
  getChefsPotentiels,
  getEquipeDetail,
  getOperateurDetail
} from './mockUsersData';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const USERS_API_URL = `${API_BASE_URL}/users`;

// Mode: 'mock' pour developpement, 'api' pour production
const API_MODE: 'mock' | 'api' = 'api';

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

// Simuler delai reseau pour le mock
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// UTILISATEURS
// ============================================================================

export async function fetchUtilisateurs(
  filters: UtilisateurFilters = {}
): Promise<PaginatedResponse<Utilisateur>> {
  if (API_MODE === 'mock') {
    await delay(200);
    let results = [...MOCK_UTILISATEURS];

    // Appliquer les filtres
    if (filters.search) {
      const search = filters.search.toLowerCase();
      results = results.filter(u =>
        u.nom.toLowerCase().includes(search) ||
        u.prenom.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search)
      );
    }
    // Filtrage par rôle déjà géré côté frontend
    if (filters.actif !== undefined) {
      results = results.filter(u => u.actif === filters.actif);
    }

    return {
      count: results.length,
      next: null,
      previous: null,
      results
    };
  }

  const queryString = buildQueryParams(filters as Record<string, unknown>);
  return fetchApi<PaginatedResponse<Utilisateur>>(
    `${USERS_API_URL}/utilisateurs/?${queryString}`
  );
}

export async function fetchUtilisateurById(id: number): Promise<Utilisateur> {
  if (API_MODE === 'mock') {
    await delay(100);
    const utilisateur = getUtilisateurById(id);
    if (!utilisateur) {
      throw new ApiError(404, 'Utilisateur non trouve');
    }
    return utilisateur;
  }

  return fetchApi<Utilisateur>(`${USERS_API_URL}/utilisateurs/${id}/`);
}

export async function createUtilisateur(data: UtilisateurCreate): Promise<Utilisateur> {
  if (API_MODE === 'mock') {
    await delay(300);
    const newUser: Utilisateur = {
      id: Math.max(...MOCK_UTILISATEURS.map(u => u.id)) + 1,
      email: data.email,
      nom: data.nom,
      prenom: data.prenom,
      fullName: `${data.prenom} ${data.nom}`,
      // typeUtilisateur supprimé, gestion par roles uniquement
      dateCreation: new Date().toISOString(),
      actif: data.actif ?? true,
      derniereConnexion: null,
      roles: []
    };
    MOCK_UTILISATEURS.push(newUser);
    return newUser;
  }

  return fetchApi<Utilisateur>(`${USERS_API_URL}/utilisateurs/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function updateUtilisateur(
  id: number,
  data: UtilisateurUpdate
): Promise<Utilisateur> {
  if (API_MODE === 'mock') {
    await delay(200);
    const idx = MOCK_UTILISATEURS.findIndex(u => u.id === id);
    if (idx === -1) {
      throw new ApiError(404, 'Utilisateur non trouve');
    }
    Object.assign(MOCK_UTILISATEURS[idx], data);
    if (data.nom || data.prenom) {
      MOCK_UTILISATEURS[idx].fullName = `${MOCK_UTILISATEURS[idx].prenom} ${MOCK_UTILISATEURS[idx].nom}`;
    }
    return MOCK_UTILISATEURS[idx];
  }

  return fetchApi<Utilisateur>(`${USERS_API_URL}/utilisateurs/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function deleteUtilisateur(id: number): Promise<void> {
  if (API_MODE === 'mock') {
    await delay(200);
    const idx = MOCK_UTILISATEURS.findIndex(u => u.id === id);
    if (idx !== -1) {
      MOCK_UTILISATEURS[idx].actif = false;
    }
    return;
  }

  await fetchApi<void>(`${USERS_API_URL}/utilisateurs/${id}/`, {
    method: 'DELETE'
  });
}

export async function changePassword(
  id: number,
  data: ChangePassword
): Promise<{ message: string }> {
  if (API_MODE === 'mock') {
    await delay(300);
    return { message: 'Mot de passe modifie avec succes' };
  }

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
  if (API_MODE === 'mock') {
    await delay(100);
    return MOCK_ROLES;
  }

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

  if (API_MODE === 'mock') {
    await delay(200);
    const result = {
      count: MOCK_CLIENTS.length,
      next: null,
      previous: null,
      results: MOCK_CLIENTS
    };
    setCache(cacheKey, result);
    return result;
  }

  const result = await fetchApi<PaginatedResponse<Client>>(`${USERS_API_URL}/clients/`);
  setCache(cacheKey, result);
  return result;
}

export async function createClient(data: ClientCreate): Promise<Client> {
  if (API_MODE === 'mock') {
    await delay(300);
    const newClient: Client = {
      utilisateur: Math.max(...MOCK_UTILISATEURS.map(u => u.id)) + 1,
      email: data.email,
      nom: data.nom,
      prenom: data.prenom,
      actif: true,
      nomStructure: data.nomStructure,
      adresse: data.adresse || '',
      telephone: data.telephone || '',
      contactPrincipal: data.contactPrincipal || '',
      emailFacturation: data.emailFacturation || '',
      logo: data.logo || null
    };
    MOCK_CLIENTS.push(newClient);
    return newClient;
  }

  return fetchApi<Client>(`${USERS_API_URL}/clients/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function updateClient(
  id: number,
  data: ClientUpdate
): Promise<Client> {
  if (API_MODE === 'mock') {
    await delay(200);
    const idx = MOCK_CLIENTS.findIndex(c => c.utilisateur === id);
    if (idx === -1) {
      throw new ApiError(404, 'Client non trouve');
    }
    Object.assign(MOCK_CLIENTS[idx], data);
    return MOCK_CLIENTS[idx];
  }

  return fetchApi<Client>(`${USERS_API_URL}/clients/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function deleteClient(id: number): Promise<void> {
  if (API_MODE === 'mock') {
    await delay(200);
    const idx = MOCK_CLIENTS.findIndex(c => c.utilisateur === id);
    if (idx !== -1) {
      MOCK_CLIENTS[idx].actif = false;
    }
    return;
  }

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
  if (API_MODE === 'mock') {
    await delay(100);
    let results = [...MOCK_COMPETENCES];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      results = results.filter(c =>
        c.nomCompetence.toLowerCase().includes(search) ||
        c.description.toLowerCase().includes(search)
      );
    }
    if (filters.categorie) {
      results = results.filter(c => c.categorie === filters.categorie);
    }

    return results;
  }

  const queryString = buildQueryParams(filters as Record<string, unknown>);
  const response = await fetchApi<PaginatedResponse<Competence>>(
    `${USERS_API_URL}/competences/?${queryString}`
  );
  return response.results;
}

export async function createCompetence(
  data: { nomCompetence: string; categorie: CategorieCompetence; description?: string; ordreAffichage?: number }
): Promise<Competence> {
  if (API_MODE === 'mock') {
    await delay(150);
    const newId = Math.max(...MOCK_COMPETENCES.map(c => c.id)) + 1;
    const newComp: Competence = {
      id: newId,
      nomCompetence: data.nomCompetence,
      categorie: data.categorie,
      categorieDisplay: data.categorie,
      description: data.description || '',
      ordreAffichage: data.ordreAffichage || 0
    };
    MOCK_COMPETENCES.push(newComp);
    return newComp;
  }

  return fetchApi<Competence>(`${USERS_API_URL}/competences/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as Record<string, unknown>))
  });
}

export async function updateCompetence(
  id: number,
  data: { nomCompetence?: string; categorie?: CategorieCompetence; description?: string; ordreAffichage?: number }
): Promise<Competence> {
  if (API_MODE === 'mock') {
    await delay(150);
    const idx = MOCK_COMPETENCES.findIndex(c => c.id === id);
    if (idx === -1) throw new ApiError(404, 'Competence non trouvee');
    Object.assign(MOCK_COMPETENCES[idx], data);
    return MOCK_COMPETENCES[idx];
  }

  return fetchApi<Competence>(`${USERS_API_URL}/competences/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as Record<string, unknown>))
  });
}

export async function deleteCompetence(id: number): Promise<void> {
  if (API_MODE === 'mock') {
    await delay(100);
    const idx = MOCK_COMPETENCES.findIndex(c => c.id === id);
    if (idx !== -1) MOCK_COMPETENCES.splice(idx, 1);
    return;
  }

  await fetchApi<void>(`${USERS_API_URL}/competences/${id}/`, { method: 'DELETE' });
}

// ============================================================================
// OPERATEURS
// ============================================================================

export async function fetchOperateurs(
  filters: OperateurFilters = {}
): Promise<PaginatedResponse<OperateurList>> {
  if (API_MODE === 'mock') {
    await delay(200);
    let results = [...MOCK_OPERATEURS];

    // Appliquer les filtres
    if (filters.search) {
      const search = filters.search.toLowerCase();
      results = results.filter(o =>
        o.nom.toLowerCase().includes(search) ||
        o.prenom.toLowerCase().includes(search) ||
        o.email.toLowerCase().includes(search) ||
        o.numeroImmatriculation.toLowerCase().includes(search)
      );
    }
    if (filters.statut) {
      results = results.filter(o => o.statut === filters.statut);
    }
    if (filters.actif !== undefined) {
      results = results.filter(o => o.actif === filters.actif);
    }
    if (filters.equipe) {
      results = results.filter(o => o.equipe === filters.equipe);
    }
    if (filters.sansEquipe) {
      results = results.filter(o => o.equipe === null);
    }
    if (filters.disponible !== undefined) {
      results = results.filter(o => o.estDisponible === filters.disponible);
    }
    if (filters.estChef !== undefined) {
      results = results.filter(o => o.estChefEquipe === filters.estChef);
    }

    return {
      count: results.length,
      next: null,
      previous: null,
      results
    };
  }

  const queryString = buildQueryParams(filters as Record<string, unknown>);
  return fetchApi<PaginatedResponse<OperateurList>>(
    `${USERS_API_URL}/operateurs/?${queryString}`
  );
}

export async function fetchOperateurById(id: number): Promise<OperateurDetail> {
  if (API_MODE === 'mock') {
    await delay(100);
    const operateur = getOperateurDetail(id);
    if (!operateur) {
      throw new ApiError(404, 'Operateur non trouve');
    }
    return operateur;
  }

  return fetchApi<OperateurDetail>(`${USERS_API_URL}/operateurs/${id}/`);
}

export async function createOperateur(data: OperateurCreate): Promise<OperateurList> {
  if (API_MODE === 'mock') {
    await delay(300);
    const newOperateur: OperateurList = {
      utilisateur: Math.max(...MOCK_OPERATEURS.map(o => o.utilisateur)) + 1,
      email: data.email,
      nom: data.nom,
      prenom: data.prenom,
      fullName: `${data.prenom} ${data.nom}`,
      actif: true,
      numeroImmatriculation: data.numeroImmatriculation,
      statut: data.statut || 'ACTIF',
      equipe: data.equipe || null,
      equipeNom: data.equipe ? getEquipeById(data.equipe)?.nomEquipe || null : null,
      dateEmbauche: data.dateEmbauche,
      telephone: data.telephone || '',
      photo: data.photo || null,
      estChefEquipe: false,
      estDisponible: true
    };
    MOCK_OPERATEURS.push(newOperateur);
    return newOperateur;
  }

  return fetchApi<OperateurList>(`${USERS_API_URL}/operateurs/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function updateOperateur(
  id: number,
  data: OperateurUpdate
): Promise<OperateurList> {
  if (API_MODE === 'mock') {
    await delay(200);
    const idx = MOCK_OPERATEURS.findIndex(o => o.utilisateur === id);
    if (idx === -1) {
      throw new ApiError(404, 'Operateur non trouve');
    }
    Object.assign(MOCK_OPERATEURS[idx], data);
    if (data.nom || data.prenom) {
      MOCK_OPERATEURS[idx].fullName = `${MOCK_OPERATEURS[idx].prenom} ${MOCK_OPERATEURS[idx].nom}`;
    }
    return MOCK_OPERATEURS[idx];
  }

  return fetchApi<OperateurList>(`${USERS_API_URL}/operateurs/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function deleteOperateur(id: number): Promise<void> {
  if (API_MODE === 'mock') {
    await delay(200);
    const idx = MOCK_OPERATEURS.findIndex(o => o.utilisateur === id);
    if (idx !== -1) {
      MOCK_OPERATEURS[idx].actif = false;
    }
    return;
  }

  await fetchApi<void>(`${USERS_API_URL}/operateurs/${id}/`, {
    method: 'DELETE'
  });
}

export async function fetchOperateursDisponibles(): Promise<OperateurList[]> {
  if (API_MODE === 'mock') {
    await delay(150);
    return getOperateursDisponibles();
  }

  const response = await fetchApi<OperateurList[]>(
    `${USERS_API_URL}/operateurs/disponibles/`
  );
  return response;
}

export async function fetchChefsPotentiels(): Promise<OperateurList[]> {
  if (API_MODE === 'mock') {
    await delay(150);
    return getChefsPotentiels();
  }

  // Récupérer à la fois les opérateurs pouvant être chef (par compétence)
  // et les utilisateurs qui se sont vus attribuer le rôle `CHEF_EQUIPE`.
  const operateursRes = await fetchApi<OperateurList[]>(`${USERS_API_URL}/operateurs/chefs_potentiels/`);

  // Les utilisateurs avec le rôle CHEF_EQUIPE
  const usersRes = await fetchApi<PaginatedResponse<Utilisateur>>(
    `${USERS_API_URL}/utilisateurs/?role=CHEF_EQUIPE&actif=true`
  ).catch(() => ({ results: [] } as PaginatedResponse<Utilisateur>));

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
  if (API_MODE === 'mock') {
    await delay(100);
    return getCompetencesOperateur(operateurId);
  }

  // Correction: le retour doit être un tableau
  return fetchApi<CompetenceOperateur[]>(
    `${USERS_API_URL}/operateurs/${operateurId}/competences/`
  );
}

export async function affecterCompetence(
  operateurId: number,
  data: CompetenceOperateurCreate
): Promise<CompetenceOperateur> {
  if (API_MODE === 'mock') {
    await delay(200);
    const newCompOp: CompetenceOperateur = {
      id: Math.max(...MOCK_COMPETENCES_OPERATEURS.map(co => co.id)) + 1,
      operateur: operateurId,
      operateurNom: getOperateurById(operateurId)?.fullName || '',
      competence: data.competenceId,
      niveau: data.niveau,
      niveauDisplay: data.niveau,
      dateAcquisition: new Date().toISOString().split('T')[0],
      dateModification: new Date().toISOString()
    };
    MOCK_COMPETENCES_OPERATEURS.push(newCompOp);
    return newCompOp;
  }

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

  if (API_MODE === 'mock') {
    await delay(200);
    let results = [...MOCK_EQUIPES];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      results = results.filter(e =>
        e.nomEquipe.toLowerCase().includes(search) ||
        e.specialite.toLowerCase().includes(search) ||
        e.chefEquipeNom.toLowerCase().includes(search)
      );
    }
    if (filters.actif !== undefined) {
      results = results.filter(e => e.actif === filters.actif);
    }
    if (filters.statutOperationnel) {
      results = results.filter(e => e.statutOperationnel === filters.statutOperationnel);
    }

    const result = {
      count: results.length,
      next: null,
      previous: null,
      results
    };
    if (!hasFilters) setCache(cacheKey, result);
    return result;
  }

  const queryString = buildQueryParams(filters as Record<string, unknown>);
  const result = await fetchApi<PaginatedResponse<EquipeList>>(
    `${USERS_API_URL}/equipes/?${queryString}`
  );
  if (!hasFilters) setCache(cacheKey, result);
  return result;
}

export async function fetchEquipeById(id: number): Promise<EquipeDetail> {
  if (API_MODE === 'mock') {
    await delay(100);
    const equipe = getEquipeDetail(id);
    if (!equipe) {
      throw new ApiError(404, 'Equipe non trouvee');
    }
    return equipe;
  }

  return fetchApi<EquipeDetail>(`${USERS_API_URL}/equipes/${id}/`);
}

export async function createEquipe(data: EquipeCreate): Promise<EquipeList> {
  if (API_MODE === 'mock') {
    await delay(300);
    const chef = data.chefEquipe ? getOperateurById(data.chefEquipe) : null;
    const newEquipe: EquipeList = {
      id: Math.max(...MOCK_EQUIPES.map(e => e.id)) + 1,
      nomEquipe: data.nomEquipe,
      chefEquipe: data.chefEquipe,
      chefEquipeNom: chef?.fullName || '',
      specialite: data.specialite || '',
      actif: data.actif ?? true,
      dateCreation: new Date().toISOString().split('T')[0],
      nombreMembres: (data.membres?.length || 0) + (data.chefEquipe ? 1 : 0),
      statutOperationnel: 'COMPLETE'
    };
    MOCK_EQUIPES.push(newEquipe);

    // Mettre a jour le chef
    if (data.chefEquipe) {
      const chefIdx = MOCK_OPERATEURS.findIndex(o => o.utilisateur === data.chefEquipe);
      if (chefIdx !== -1) {
        MOCK_OPERATEURS[chefIdx].estChefEquipe = true;
        MOCK_OPERATEURS[chefIdx].equipe = newEquipe.id;
        MOCK_OPERATEURS[chefIdx].equipeNom = newEquipe.nomEquipe;
      }
    }

    return newEquipe;
  }

  return fetchApi<EquipeList>(`${USERS_API_URL}/equipes/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function updateEquipe(
  id: number,
  data: EquipeUpdate
): Promise<EquipeList> {
  if (API_MODE === 'mock') {
    await delay(200);
    const idx = MOCK_EQUIPES.findIndex(e => e.id === id);
    if (idx === -1) {
      throw new ApiError(404, 'Equipe non trouvee');
    }
    Object.assign(MOCK_EQUIPES[idx], data);
    return MOCK_EQUIPES[idx];
  }

  return fetchApi<EquipeList>(`${USERS_API_URL}/equipes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function deleteEquipe(id: number): Promise<void> {
  if (API_MODE === 'mock') {
    await delay(200);
    const idx = MOCK_EQUIPES.findIndex(e => e.id === id);
    if (idx !== -1) {
      MOCK_EQUIPES[idx].actif = false;
    }
    return;
  }

  await fetchApi<void>(`${USERS_API_URL}/equipes/${id}/`, {
    method: 'DELETE'
  });
}

export async function fetchEquipeMembres(equipeId: number): Promise<OperateurList[]> {
  if (API_MODE === 'mock') {
    await delay(100);
    return getOperateursByEquipe(equipeId);
  }

  return fetchApi<OperateurList[]>(
    `${USERS_API_URL}/equipes/${equipeId}/membres/`
  );
}

export async function affecterMembres(
  equipeId: number,
  data: AffecterMembres
): Promise<EquipeDetail> {
  if (API_MODE === 'mock') {
    await delay(200);
    // Mettre a jour les operateurs
    for (const operateurId of data.operateurs) {
      const idx = MOCK_OPERATEURS.findIndex(o => o.utilisateur === operateurId);
      if (idx !== -1) {
        MOCK_OPERATEURS[idx].equipe = equipeId;
        MOCK_OPERATEURS[idx].equipeNom = getEquipeById(equipeId)?.nomEquipe || null;
      }
    }
    // Mettre a jour le nombre de membres
    const equipeIdx = MOCK_EQUIPES.findIndex(e => e.id === equipeId);
    if (equipeIdx !== -1) {
      MOCK_EQUIPES[equipeIdx].nombreMembres = getOperateursByEquipe(equipeId).length;
    }
    return getEquipeDetail(equipeId)!;
  }

  return fetchApi<EquipeDetail>(
    `${USERS_API_URL}/equipes/${equipeId}/affecter_membres/`,
    {
      method: 'POST',
      body: JSON.stringify({ operateurs: data.operateurs })
    }
  );
}

export async function fetchEquipeStatut(equipeId: number): Promise<EquipeStatut> {
  if (API_MODE === 'mock') {
    await delay(150);
    const equipe = getEquipeById(equipeId);
    if (!equipe) {
      throw new ApiError(404, 'Equipe non trouvee');
    }
    const membres = getOperateursByEquipe(equipeId);
    const disponibles = membres.filter(m => m.estDisponible);
    const absents = membres.filter(m => !m.estDisponible);

    return {
      equipe,
      statutOperationnel: equipe.statutOperationnel,
      totalMembres: membres.length,
      disponiblesCount: disponibles.length,
      absentsCount: absents.length,
      disponibles,
      absents: absents.map(o => ({
        operateur: o,
        absence: MOCK_ABSENCES.find(a => a.operateur === o.utilisateur)!
      }))
    };
  }

  return fetchApi<EquipeStatut>(
    `${USERS_API_URL}/equipes/${equipeId}/statut/`
  );
}

export async function retirerMembre(
  equipeId: number,
  operateurId: number
): Promise<EquipeDetail> {
  if (API_MODE === 'mock') {
    await delay(200);
    const idx = MOCK_OPERATEURS.findIndex(o => o.utilisateur === operateurId);
    if (idx !== -1) {
      MOCK_OPERATEURS[idx].equipe = null;
      MOCK_OPERATEURS[idx].equipeNom = null;
    }
    const equipeIdx = MOCK_EQUIPES.findIndex(e => e.id === equipeId);
    if (equipeIdx !== -1) {
      MOCK_EQUIPES[equipeIdx].nombreMembres = getOperateursByEquipe(equipeId).length;
    }
    return getEquipeDetail(equipeId)!;
  }

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
  if (API_MODE === 'mock') {
    await delay(200);
    let results = [...MOCK_ABSENCES];

    if (filters.operateur) {
      results = results.filter(a => a.operateur === filters.operateur);
    }
    if (filters.typeAbsence) {
      results = results.filter(a => a.typeAbsence === filters.typeAbsence);
    }
    if (filters.statut) {
      results = results.filter(a => a.statut === filters.statut);
    }
    if (filters.enCours) {
      results = getAbsencesEnCours();
    }

    return {
      count: results.length,
      next: null,
      previous: null,
      results
    };
  }

  const queryString = buildQueryParams(filters as Record<string, unknown>);
  return fetchApi<PaginatedResponse<Absence>>(
    `${USERS_API_URL}/absences/?${queryString}`
  );
}

export async function fetchAbsenceById(id: number): Promise<Absence> {
  if (API_MODE === 'mock') {
    await delay(100);
    const absence = MOCK_ABSENCES.find(a => a.id === id);
    if (!absence) {
      throw new ApiError(404, 'Absence non trouvee');
    }
    return absence;
  }

  return fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/`);
}

export async function createAbsence(data: AbsenceCreate): Promise<Absence> {
  if (API_MODE === 'mock') {
    await delay(300);
    const operateur = getOperateurById(data.operateur);
    const newAbsence: Absence = {
      id: Math.max(...MOCK_ABSENCES.map(a => a.id)) + 1,
      operateur: data.operateur,
      operateurNom: operateur?.fullName || '',
      typeAbsence: data.typeAbsence,
      typeAbsenceDisplay: data.typeAbsence,
      dateDebut: data.dateDebut,
      dateFin: data.dateFin,
      dureeJours: Math.ceil(
        (new Date(data.dateFin).getTime() - new Date(data.dateDebut).getTime()) /
        (1000 * 60 * 60 * 24)
      ) + 1,
      statut: 'DEMANDEE',
      statutDisplay: 'Demandee',
      motif: data.motif || '',
      dateDemande: new Date().toISOString(),
      valideePar: null,
      valideeParNom: null,
      dateValidation: null,
      commentaire: '',
      equipeImpactee: operateur?.equipe
        ? { id: operateur.equipe, nom: operateur.equipeNom || '' }
        : null
    };
    MOCK_ABSENCES.push(newAbsence);
    return newAbsence;
  }

  return fetchApi<Absence>(`${USERS_API_URL}/absences/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function validerAbsence(
  id: number,
  commentaire?: string
): Promise<Absence> {
  if (API_MODE === 'mock') {
    await delay(200);
    const idx = MOCK_ABSENCES.findIndex(a => a.id === id);
    if (idx === -1) {
      throw new ApiError(404, 'Absence non trouvee');
    }
    MOCK_ABSENCES[idx].statut = 'VALIDEE';
    MOCK_ABSENCES[idx].statutDisplay = 'Validee';
    MOCK_ABSENCES[idx].dateValidation = new Date().toISOString();
    MOCK_ABSENCES[idx].valideePar = 1;
    MOCK_ABSENCES[idx].valideeParNom = 'Super Admin';
    if (commentaire) {
      MOCK_ABSENCES[idx].commentaire = commentaire;
    }
    return MOCK_ABSENCES[idx];
  }

  return fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/valider/`, {
    method: 'POST',
    body: JSON.stringify({ commentaire })
  });
}

export async function refuserAbsence(
  id: number,
  commentaire?: string
): Promise<Absence> {
  if (API_MODE === 'mock') {
    await delay(200);
    const idx = MOCK_ABSENCES.findIndex(a => a.id === id);
    if (idx === -1) {
      throw new ApiError(404, 'Absence non trouvee');
    }
    MOCK_ABSENCES[idx].statut = 'REFUSEE';
    MOCK_ABSENCES[idx].statutDisplay = 'Refusee';
    MOCK_ABSENCES[idx].dateValidation = new Date().toISOString();
    MOCK_ABSENCES[idx].valideePar = 1;
    MOCK_ABSENCES[idx].valideeParNom = 'Super Admin';
    if (commentaire) {
      MOCK_ABSENCES[idx].commentaire = commentaire;
    }
    return MOCK_ABSENCES[idx];
  }

  return fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/refuser/`, {
    method: 'POST',
    body: JSON.stringify({ commentaire })
  });
}

export async function fetchAbsencesEnCours(): Promise<Absence[]> {
  if (API_MODE === 'mock') {
    await delay(150);
    return getAbsencesEnCours();
  }

  return fetchApi<Absence[]>(`${USERS_API_URL}/absences/en_cours/`);
}

export async function fetchAbsencesAValider(): Promise<Absence[]> {
  if (API_MODE === 'mock') {
    await delay(150);
    return getAbsencesAValider();
  }

  return fetchApi<Absence[]>(`${USERS_API_URL}/absences/a_valider/`);
}

export async function updateAbsence(
  id: number,
  data: AbsenceUpdate
): Promise<Absence> {
  if (API_MODE === 'mock') {
    await delay(200);
    const idx = MOCK_ABSENCES.findIndex(a => a.id === id);
    if (idx === -1) {
      throw new ApiError(404, 'Absence non trouvee');
    }
    Object.assign(MOCK_ABSENCES[idx], data);
    // Recalculer la duree si les dates ont change
    if (data.dateDebut || data.dateFin) {
      const dateDebut = data.dateDebut || MOCK_ABSENCES[idx].dateDebut;
      const dateFin = data.dateFin || MOCK_ABSENCES[idx].dateFin;
      MOCK_ABSENCES[idx].dureeJours = Math.ceil(
        (new Date(dateFin).getTime() - new Date(dateDebut).getTime()) /
        (1000 * 60 * 60 * 24)
      ) + 1;
    }
    return MOCK_ABSENCES[idx];
  }

  return fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>))
  });
}

export async function annulerAbsence(id: number): Promise<Absence> {
  if (API_MODE === 'mock') {
    await delay(200);
    const idx = MOCK_ABSENCES.findIndex(a => a.id === id);
    if (idx === -1) {
      throw new ApiError(404, 'Absence non trouvee');
    }
    MOCK_ABSENCES[idx].statut = 'ANNULEE';
    MOCK_ABSENCES[idx].statutDisplay = 'Annulee';
    return MOCK_ABSENCES[idx];
  }

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
  if (API_MODE === 'mock') {
    await delay(200);
    let equipes = [...MOCK_HISTORIQUE_EQUIPES];
    let absences = [...MOCK_ABSENCES];
    let competences = [...MOCK_COMPETENCES_OPERATEURS];

    if (filters.operateurId) {
      equipes = equipes.filter(h => h.operateur === filters.operateurId);
      absences = absences.filter(a => a.operateur === filters.operateurId);
      competences = competences.filter(c => c.operateur === filters.operateurId);
    }
    if (filters.equipeId) {
      equipes = equipes.filter(h => h.equipe === filters.equipeId);
    }

    const result: HistoriqueRH = {};
    if (!filters.type || filters.type === 'all' || filters.type === 'equipes') {
      result.equipes = equipes;
    }
    if (!filters.type || filters.type === 'all' || filters.type === 'absences') {
      result.absences = absences;
    }
    if (!filters.type || filters.type === 'all' || filters.type === 'competences') {
      result.competences = competences;
    }

    return result;
  }

  const queryString = buildQueryParams(filters as Record<string, unknown>);
  return fetchApi<HistoriqueRH>(
    `${USERS_API_URL}/historique-rh/?${queryString}`
  );
}

// ============================================================================
// STATISTIQUES
// ============================================================================

export async function fetchStatistiquesUtilisateurs(): Promise<StatistiquesUtilisateurs> {
  if (API_MODE === 'mock') {
    await delay(200);
    return MOCK_STATISTIQUES;
  }

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

declare global {
  interface ImportMeta {
    env: {
      [key: string]: string;
    };
  }
}
