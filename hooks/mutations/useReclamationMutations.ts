import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateResource } from '../../lib/queryKeys';
import {
  updateReclamation,
  deleteReclamation,
  assignReclamation,
  cloturerReclamation,
  validerCloture,
  refuserCloture,
  rejeterReclamation,
  refuserIntervention,
  reprendreIntervention,
  createSatisfaction,
  fetchReclamationById,
} from '../../services/reclamationsApi';
import { Reclamation, ReclamationCreate, SatisfactionCreate } from '../../types/reclamations';

/**
 * Convention Sprint 2/5 :
 *   1. Après la mutation, on met à jour le cache `detail(id)` avec la réponse
 *      pour éviter le flicker sur la page ouverte.
 *   2. On appelle `invalidateResource` pour refetch les listes (statut filtré,
 *      stats, etc.) — c'est ce qui casse la boucle "détail à jour mais liste
 *      qui montre l'ancien statut".
 *   3. On dispatch l'event legacy `refresh-reclamations` pour que la couche
 *      carte (OLMap) rafraîchisse aussi ses features. À retirer quand OLMap
 *      sera migré vers React Query.
 */
function dispatchLegacyRefresh() {
  window.dispatchEvent(new Event('refresh-reclamations'));
}

function syncCacheAndInvalidate(
  queryClient: ReturnType<typeof useQueryClient>,
  updated: Reclamation,
) {
  queryClient.setQueryData(queryKeys.reclamations.detail(updated.id), updated);
  invalidateResource(queryClient, 'reclamations', updated.id);
  dispatchLegacyRefresh();
}

// ============================================================================
// UPDATE / DELETE
// ============================================================================

export function useUpdateReclamation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ReclamationCreate> }) =>
      updateReclamation(id, data),
    onSuccess: (updated: Reclamation) => {
      syncCacheAndInvalidate(queryClient, updated);
    },
  });
}

export function useDeleteReclamation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteReclamation(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.reclamations.detail(id) });
      invalidateResource(queryClient, 'reclamations');
      dispatchLegacyRefresh();
    },
  });
}

// ============================================================================
// ASSIGNATION
// ============================================================================

export function useAssignReclamation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, equipeId }: { id: number; equipeId: number }) =>
      assignReclamation(id, equipeId),
    onSuccess: (updated: Reclamation) => {
      syncCacheAndInvalidate(queryClient, updated);
    },
  });
}

// ============================================================================
// TRANSITIONS DE STATUT (clôture, validation, refus, rejet)
// ============================================================================

export function useCloturerReclamation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cloturerReclamation(id),
    onSuccess: (updated: Reclamation) => {
      syncCacheAndInvalidate(queryClient, updated);
    },
  });
}

export function useValiderCloture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => validerCloture(id),
    onSuccess: (updated: Reclamation) => {
      syncCacheAndInvalidate(queryClient, updated);
    },
  });
}

export function useRefuserCloture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, commentaire }: { id: number; commentaire: string }) =>
      refuserCloture(id, commentaire),
    onSuccess: (updated: Reclamation) => {
      syncCacheAndInvalidate(queryClient, updated);
    },
  });
}

export function useRejeterReclamation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, justification }: { id: number; justification: string }) =>
      rejeterReclamation(id, justification),
    onSuccess: (updated: Reclamation) => {
      syncCacheAndInvalidate(queryClient, updated);
    },
  });
}

export function useRefuserIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, motif }: { id: number; motif: string }) => refuserIntervention(id, motif),
    onSuccess: (updated: Reclamation) => {
      syncCacheAndInvalidate(queryClient, updated);
    },
  });
}

export function useReprendreIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => reprendreIntervention(id),
    onSuccess: (updated: Reclamation) => {
      syncCacheAndInvalidate(queryClient, updated);
    },
  });
}

// ============================================================================
// SATISFACTION
// ============================================================================

export function useCreateSatisfaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SatisfactionCreate) => createSatisfaction(data),
    onSuccess: async (_satisfaction, data) => {
      const refreshed = await fetchReclamationById(data.reclamation);
      syncCacheAndInvalidate(queryClient, refreshed);
    },
  });
}
