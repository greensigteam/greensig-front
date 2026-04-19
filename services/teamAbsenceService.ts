import { PaginatedResponse } from '../types/users';
import type {
  EquipeList,
  EquipeDetail,
  EquipeCreate,
  EquipeUpdate,
  EquipeStatut,
  EquipeFilters,
  AffecterMembres,
  OperateurList,
  Absence,
  AbsenceCreate,
  AbsenceUpdate,
  AbsenceFilters,
} from '../types/users';
import { fetchApi, camelToSnake, buildQueryParams, USERS_API_URL } from './usersApiUtils';

// ============================================================================
// EQUIPES
// ============================================================================

export async function fetchEquipes(
  filters: EquipeFilters = {},
): Promise<PaginatedResponse<EquipeList>> {
  const queryString = buildQueryParams(filters as Record<string, unknown>);
  return fetchApi<PaginatedResponse<EquipeList>>(`${USERS_API_URL}/equipes/?${queryString}`);
}

export async function fetchEquipeById(id: number): Promise<EquipeDetail> {
  return fetchApi<EquipeDetail>(`${USERS_API_URL}/equipes/${id}/`);
}

export async function createEquipe(data: EquipeCreate): Promise<EquipeList> {
  return fetchApi<EquipeList>(`${USERS_API_URL}/equipes/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>)),
  });
}

export async function updateEquipe(id: number, data: EquipeUpdate): Promise<EquipeList> {
  const snakeData = camelToSnake(data as unknown as Record<string, unknown>);
  return fetchApi<EquipeList>(`${USERS_API_URL}/equipes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(snakeData),
  });
}

export async function deleteEquipe(id: number): Promise<void> {
  await fetchApi<void>(`${USERS_API_URL}/equipes/${id}/`, {
    method: 'DELETE',
  });
}

export async function fetchEquipeMembres(equipeId: number): Promise<OperateurList[]> {
  return fetchApi<OperateurList[]>(`${USERS_API_URL}/equipes/${equipeId}/membres/`);
}

export async function affecterMembres(
  equipeId: number,
  data: AffecterMembres,
): Promise<EquipeDetail> {
  return fetchApi<EquipeDetail>(`${USERS_API_URL}/equipes/${equipeId}/affecter_membres/`, {
    method: 'POST',
    body: JSON.stringify({ operateurs: data.operateurs }),
  });
}

export async function fetchEquipeStatut(equipeId: number): Promise<EquipeStatut> {
  return fetchApi<EquipeStatut>(`${USERS_API_URL}/equipes/${equipeId}/statut/`);
}

export async function retirerMembre(equipeId: number, operateurId: number): Promise<EquipeDetail> {
  return fetchApi<EquipeDetail>(`${USERS_API_URL}/equipes/${equipeId}/retirer_membre/`, {
    method: 'POST',
    body: JSON.stringify({ operateur_id: operateurId }),
  });
}

// ============================================================================
// ABSENCES
// ============================================================================

export async function fetchAbsences(
  filters: AbsenceFilters = {},
): Promise<PaginatedResponse<Absence>> {
  const queryString = buildQueryParams(filters as Record<string, unknown>);
  return fetchApi<PaginatedResponse<Absence>>(`${USERS_API_URL}/absences/?${queryString}`);
}

export async function fetchAbsenceById(id: number): Promise<Absence> {
  return fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/`);
}

export async function createAbsence(data: AbsenceCreate): Promise<Absence> {
  return fetchApi<Absence>(`${USERS_API_URL}/absences/`, {
    method: 'POST',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>)),
  });
}

export async function validerAbsence(id: number, commentaire?: string): Promise<Absence> {
  return fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/valider/`, {
    method: 'POST',
    body: JSON.stringify({ commentaire }),
  });
}

export async function refuserAbsence(id: number, commentaire?: string): Promise<Absence> {
  return fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/refuser/`, {
    method: 'POST',
    body: JSON.stringify({ commentaire }),
  });
}

export async function fetchAbsencesEnCours(): Promise<Absence[]> {
  return fetchApi<Absence[]>(`${USERS_API_URL}/absences/en_cours/`);
}

export async function fetchAbsencesAValider(): Promise<Absence[]> {
  return fetchApi<Absence[]>(`${USERS_API_URL}/absences/a_valider/`);
}

export async function updateAbsence(id: number, data: AbsenceUpdate): Promise<Absence> {
  return fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(camelToSnake(data as unknown as Record<string, unknown>)),
  });
}

export async function annulerAbsence(id: number): Promise<Absence> {
  return fetchApi<Absence>(`${USERS_API_URL}/absences/${id}/annuler/`, {
    method: 'POST',
  });
}
