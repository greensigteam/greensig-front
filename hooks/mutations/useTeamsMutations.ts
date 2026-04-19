import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteEquipe,
  deleteOperateur,
  validerAbsence,
  refuserAbsence,
  annulerAbsence,
} from '../../services/usersApi';
import { queryKeys } from '../../lib/queryKeys';
import type { QueryClient } from '@tanstack/react-query';

function invalidateTeamResources(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.equipesRH.all });
  qc.invalidateQueries({ queryKey: queryKeys.operateurs.all });
  qc.invalidateQueries({ queryKey: queryKeys.statsUtilisateurs.current });
  qc.invalidateQueries({ queryKey: queryKeys.referenceData.equipes() });
}

function invalidateAbsenceResources(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.absences.all });
  qc.invalidateQueries({ queryKey: queryKeys.statsUtilisateurs.current });
}

export function useDeleteEquipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteEquipe(id),
    onSuccess: () => invalidateTeamResources(qc),
  });
}

export function useDeleteOperateur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteOperateur(id),
    onSuccess: () => invalidateTeamResources(qc),
  });
}

export function useValiderAbsence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motif }: { id: number; motif?: string }) =>
      validerAbsence(id, motif ?? 'Approuve'),
    onSuccess: () => invalidateAbsenceResources(qc),
  });
}

export function useRefuserAbsence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motif }: { id: number; motif?: string }) =>
      refuserAbsence(id, motif ?? 'Refuse'),
    onSuccess: () => invalidateAbsenceResources(qc),
  });
}

export function useAnnulerAbsence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => annulerAbsence(id),
    onSuccess: () => invalidateAbsenceResources(qc),
  });
}
