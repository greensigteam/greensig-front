import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { planningService } from '../services/planningService';
import { fetchAllSites } from '../services/api';
import { fetchEquipes, fetchStructures } from '../services/usersApi';
import {
  fetchReclamations,
  fetchTypesReclamations,
  fetchUrgences,
} from '../services/reclamationsApi';

/**
 * Configuration du QueryClient pour React Query
 *
 * Stratégie de cache:
 * - staleTime: 2min - Les données sont considérées fraîches pendant 2 minutes
 * - gcTime: 5min - Les données inactives sont gardées en cache 5 minutes
 * - retry: 2 - Réessaie 2 fois en cas d'erreur réseau
 * - refetchOnWindowFocus: true - Rafraîchit quand l'utilisateur revient sur l'onglet
 * - refetchOnReconnect: true - Rafraîchit après reconnexion réseau
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes (était 30s — réduit les refetch sur focus)
      gcTime: 5 * 60 * 1000, // 5 minutes (anciennement cacheTime)
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        console.error('[React Query] Mutation error:', error);
      },
    },
  },
});

// Helper interne pour la fenêtre de dates par défaut (-30 / +90 j)
function defaultDateWindow() {
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const end = new Date();
  end.setDate(end.getDate() + 90);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  };
}

/**
 * Helper pour invalider les listes de tâches (pas les détails individuels)
 */
export function invalidateAllTaskQueries() {
  queryClient.invalidateQueries({ queryKey: queryKeys.taches.lists(), exact: false });
  queryClient.invalidateQueries({ queryKey: queryKeys.distributions.all, exact: false });
}

/**
 * Helper pour invalider les données d'une tâche spécifique
 */
export function invalidateTaskData(taskId: number) {
  queryClient.invalidateQueries({ queryKey: queryKeys.taches.detail(taskId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.taches.lists(), exact: false });
}

/**
 * Helper pour invalider les distributions d'une date
 */
export function invalidateDistributionsForDate(date: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.distributions.parJour(date) });
}

/**
 * Helper pour invalider toutes les requêtes liées aux réclamations
 */
export function invalidateAllReclamationQueries() {
  queryClient.invalidateQueries({ queryKey: queryKeys.reclamations.lists(), exact: false });
}

/**
 * Précharge les données critiques en arrière-plan après le login.
 * Lancé en fire-and-forget pour que l'utilisateur n'attende pas.
 */
export function prefetchCriticalData() {
  const REF_STALE = 5 * 60 * 1000; // 5 min (même staleTime que les hooks)
  const TASK_STALE = 2 * 60 * 1000; // 2 min

  // Données de référence (changent rarement)
  queryClient.prefetchQuery({
    queryKey: queryKeys.referenceData.typesTaches(),
    queryFn: () => planningService.getTypesTaches(),
    staleTime: REF_STALE,
  });
  queryClient.prefetchQuery({
    queryKey: queryKeys.referenceData.equipes(),
    queryFn: () => fetchEquipes().then((r) => (Array.isArray(r) ? r : r.results || [])),
    staleTime: REF_STALE,
  });
  queryClient.prefetchQuery({
    queryKey: queryKeys.referenceData.sites(),
    queryFn: () => fetchAllSites().then((sites) => sites.filter((s: any) => s.actif)),
    staleTime: REF_STALE,
  });
  queryClient.prefetchQuery({
    queryKey: queryKeys.referenceData.structures(),
    queryFn: () => fetchStructures().then((r) => (Array.isArray(r) ? r : r.results || [])),
    staleTime: REF_STALE,
  });

  queryClient.prefetchQuery({
    queryKey: queryKeys.referenceData.typesReclamations(),
    queryFn: fetchTypesReclamations,
    staleTime: REF_STALE,
  });
  queryClient.prefetchQuery({
    queryKey: queryKeys.referenceData.urgences(),
    queryFn: fetchUrgences,
    staleTime: REF_STALE,
  });

  // Liste des tâches — même fenêtre par défaut que useTaches (-30 / +90 j)
  const { start_date, end_date } = defaultDateWindow();
  queryClient.prefetchQuery({
    queryKey: queryKeys.taches.lists(),
    queryFn: async () => {
      const response = await planningService.getTaches({ start_date, end_date });
      return Array.isArray(response) ? response : response.results || [];
    },
    staleTime: TASK_STALE,
  });

  // Liste des réclamations — 90 derniers jours pour le prefetch
  const reclaStart = new Date();
  reclaStart.setDate(reclaStart.getDate() - 90);
  queryClient.prefetchQuery({
    queryKey: queryKeys.reclamations.lists(),
    queryFn: () => fetchReclamations({ date_debut: reclaStart.toISOString().slice(0, 10) }),
    staleTime: TASK_STALE,
  });
}
