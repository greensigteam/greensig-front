import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { planningService } from '../../services/planningService';
import { queryKeys } from '../../lib/queryKeys';
import { Tache, PlanningFilters } from '../../types/planning';

/**
 * Hook pour récupérer la liste des tâches
 *
 * @param filters - Filtres optionnels (clientId, siteId, equipeId, statuts, dates)
 * @returns Query result avec les tâches
 */
export function useTaches(filters?: Partial<PlanningFilters>) {
  return useQuery({
    queryKey: queryKeys.taches.list(filters),
    queryFn: async () => {
      const params: {
        client_id?: number;
        structure_client_id?: number;
        equipe_id?: number;
        start_date?: string;
        end_date?: string;
      } = {};

      if (filters?.clientId !== null && filters?.clientId !== undefined) {
        params.structure_client_id = filters.clientId;
      }
      if (filters?.equipeId !== null && filters?.equipeId !== undefined) {
        params.equipe_id = filters.equipeId;
      }
      // Fenêtre de dates : filtres explicites en priorité, sinon fenêtre par défaut
      // (-30 j / +90 j) pour éviter de charger toutes les tâches depuis l'origine.
      if (filters?.dateDebut) {
        params.start_date = filters.dateDebut;
      } else {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.start_date = d.toISOString().slice(0, 10);
      }
      if (filters?.dateFin) {
        params.end_date = filters.dateFin;
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 90);
        params.end_date = d.toISOString().slice(0, 10);
      }

      const response = await planningService.getTaches(params);
      const tachesData = Array.isArray(response) ? response : response.results || [];
      return tachesData as Tache[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — les actions patchent le cache directement
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook pour récupérer le détail d'une tâche
 *
 * @param taskId - ID de la tâche
 * @param options - Options (enabled pour contrôler l'exécution)
 * @returns Query result avec la tâche
 */
export function useTache(taskId: number | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: taskId ? queryKeys.taches.detail(taskId) : ['tache', 'none'],
    queryFn: async () => {
      if (!taskId) throw new Error('Task ID is required');
      return planningService.getTache(taskId);
    },
    enabled: options?.enabled !== false && taskId !== null,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook pour précharger une tâche dans le cache
 */
export function usePrefetchTache() {
  const queryClient = useQueryClient();

  return (taskId: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.taches.detail(taskId),
      queryFn: () => planningService.getTache(taskId),
      staleTime: 2 * 60 * 1000,
    });
  };
}

/**
 * Hook pour obtenir une tâche depuis le cache ou la charger
 */
export function useGetTacheFromCache() {
  const queryClient = useQueryClient();

  return (taskId: number): Tache | undefined => {
    // Essayer d'abord le cache de détail
    const cached = queryClient.getQueryData<Tache>(queryKeys.taches.detail(taskId));
    if (cached) return cached;

    // Sinon, chercher dans la liste des tâches
    const allTaches = queryClient.getQueryData<Tache[]>(queryKeys.taches.lists());
    return allTaches?.find((t) => t.id === taskId);
  };
}
