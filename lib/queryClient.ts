import { QueryClient } from '@tanstack/react-query';

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
