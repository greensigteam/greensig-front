import { useQuery } from '@tanstack/react-query';
import {
  fetchOperateurs,
  fetchOperateurById,
  fetchEquipes,
  fetchEquipeById,
  fetchAbsences,
  fetchAbsencesAValider,
  fetchCompetences,
  fetchChefsPotentiels,
  fetchStatistiquesUtilisateurs,
} from '../../services/usersApi';
import { queryKeys } from '../../lib/queryKeys';
import type {
  OperateurFilters,
  EquipeFilters,
  AbsenceFilters,
  CompetenceFilters,
} from '../../types/users';

const FIVE_MIN = 5 * 60 * 1000;
const THIRTY_MIN = 30 * 60 * 1000;

export function useOperateursQuery(
  filters?: OperateurFilters & { page?: number; pageSize?: number },
) {
  return useQuery({
    queryKey: queryKeys.operateurs.list(filters),
    queryFn: () => fetchOperateurs(filters),
    staleTime: 2 * 60 * 1000,
    gcTime: THIRTY_MIN,
    placeholderData: (previousData) => previousData,
  });
}

export function useOperateurDetailQuery(id: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.operateurs.detail(id as number),
    queryFn: () => fetchOperateurById(id as number),
    enabled: !!id,
    staleTime: FIVE_MIN,
  });
}

export function useChefsPotentielsQuery() {
  return useQuery({
    queryKey: queryKeys.operateurs.chefsPotentiels(),
    queryFn: fetchChefsPotentiels,
    staleTime: FIVE_MIN,
    gcTime: THIRTY_MIN,
  });
}

export function useEquipesRHQuery(filters?: EquipeFilters & { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: queryKeys.equipesRH.list(filters),
    queryFn: () => fetchEquipes(filters),
    staleTime: 2 * 60 * 1000,
    gcTime: THIRTY_MIN,
    placeholderData: (previousData) => previousData,
  });
}

export function useEquipeDetailQuery(id: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.equipesRH.detail(id as number),
    queryFn: () => fetchEquipeById(id as number),
    enabled: !!id,
    staleTime: FIVE_MIN,
  });
}

export function useAbsencesQuery(filters?: AbsenceFilters & { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: queryKeys.absences.list(filters),
    queryFn: () => fetchAbsences(filters),
    staleTime: 60 * 1000,
    gcTime: THIRTY_MIN,
    placeholderData: (previousData) => previousData,
  });
}

export function useAbsencesAValiderQuery() {
  return useQuery({
    queryKey: queryKeys.absences.aValider(),
    queryFn: fetchAbsencesAValider,
    staleTime: 60 * 1000,
  });
}

export function useCompetencesQuery(filters?: CompetenceFilters) {
  return useQuery({
    queryKey: filters
      ? ([...queryKeys.competences.list(), filters] as const)
      : queryKeys.competences.list(),
    queryFn: () => fetchCompetences(filters),
    staleTime: THIRTY_MIN,
    gcTime: 60 * 60 * 1000,
  });
}

export function useStatsUtilisateursQuery() {
  return useQuery({
    queryKey: queryKeys.statsUtilisateurs.current,
    queryFn: fetchStatistiquesUtilisateurs,
    staleTime: 2 * 60 * 1000,
    gcTime: THIRTY_MIN,
  });
}
