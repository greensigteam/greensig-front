import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { planningService } from '../services/planningService';
import { fetchAllSites } from '../services/api';
import { fetchEquipes, fetchStructures } from '../services/usersApi';
import { fetchReclamations, fetchTypesReclamations, fetchUrgences } from '../services/reclamationsApi';

/**
 * Configuration du QueryClient pour React Query
 *
 * Stratégie de cache:
 * - staleTime: 30s - Les données sont considérées fraîches pendant 30 secondes
 * - gcTime: 5min - Les données inactives sont gardées en cache 5 minutes
 * - retry: 2 - Réessaie 2 fois en cas d'erreur réseau
 * - refetchOnWindowFocus: true - Rafraîchit quand l'utilisateur revient sur l'onglet
 * - refetchOnReconnect: true - Rafraîchit après reconnexion réseau
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30 * 1000,        // 30 secondes
            gcTime: 5 * 60 * 1000,       // 5 minutes (anciennement cacheTime)
            retry: 2,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            // Ne pas refetch automatiquement au mount si les données sont fraîches
            refetchOnMount: true,
        },
        mutations: {
            retry: 1,
            // Callback global pour les erreurs de mutation (optionnel)
            onError: (error) => {
                console.error('[React Query] Mutation error:', error);
            },
        },
    },
});

/**
 * Helper pour invalider toutes les requêtes liées aux tâches
 */
export function invalidateAllTaskQueries() {
    queryClient.invalidateQueries({ queryKey: ['taches'] });
    queryClient.invalidateQueries({ queryKey: ['distributions'] });
}

/**
 * Helper pour invalider les données d'une tâche spécifique
 */
export function invalidateTaskData(taskId: number) {
    queryClient.invalidateQueries({ queryKey: ['tache', taskId] });
    queryClient.invalidateQueries({ queryKey: ['taskDetails', taskId] });
    queryClient.invalidateQueries({ queryKey: ['taches'] });
}

/**
 * Helper pour invalider les distributions d'une date
 */
export function invalidateDistributionsForDate(date: string) {
    queryClient.invalidateQueries({ queryKey: ['distributions', 'par-jour', date] });
    queryClient.invalidateQueries({ queryKey: ['distributions'] });
}

/**
 * Helper pour invalider toutes les requêtes liées aux réclamations
 */
export function invalidateAllReclamationQueries() {
    queryClient.invalidateQueries({ queryKey: ['reclamations'] });
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
        queryFn: () => fetchEquipes().then(r => Array.isArray(r) ? r : r.results || []),
        staleTime: REF_STALE,
    });
    queryClient.prefetchQuery({
        queryKey: queryKeys.referenceData.sites(),
        queryFn: () => fetchAllSites().then(sites => sites.filter((s: any) => s.actif)),
        staleTime: REF_STALE,
    });
    queryClient.prefetchQuery({
        queryKey: queryKeys.referenceData.structures(),
        queryFn: () => fetchStructures().then(r => Array.isArray(r) ? r : r.results || []),
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

    // Liste des tâches (sans filtre — la vue par défaut)
    queryClient.prefetchQuery({
        queryKey: queryKeys.taches.lists(),
        queryFn: async () => {
            const response = await planningService.getTaches({});
            return Array.isArray(response) ? response : (response.results || []);
        },
        staleTime: TASK_STALE,
    });

    // Liste des réclamations (sans filtre)
    queryClient.prefetchQuery({
        queryKey: queryKeys.reclamations.lists(),
        queryFn: () => fetchReclamations(),
        staleTime: TASK_STALE,
    });
}
