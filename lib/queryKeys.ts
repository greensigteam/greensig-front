import { PlanningFilters, DistributionFilters } from '../types/planning';

/**
 * Clés de requête centralisées pour React Query
 *
 * Structure hiérarchique pour permettre une invalidation fine:
 * - ['taches'] - Toutes les requêtes liées aux tâches
 * - ['taches', 'list'] - Liste des tâches
 * - ['taches', 'list', { filters }] - Liste filtrée
 * - ['tache', taskId] - Détail d'une tâche
 * - ['taskDetails', taskId] - Photos + consommations d'une tâche
 *
 * - ['distributions'] - Toutes les requêtes liées aux distributions
 * - ['distributions', 'par-jour', date] - Distributions d'une date
 * - ['distributions', 'list', { filters }] - Liste filtrée
 *
 * - ['referenceData'] - Données de référence (équipes, types, sites, structures)
 */
export const queryKeys = {
    // ============================================================================
    // TÂCHES
    // ============================================================================

    taches: {
        all: ['taches'] as const,
        lists: () => [...queryKeys.taches.all, 'list'] as const,
        list: (filters?: Partial<PlanningFilters>) =>
            filters
                ? [...queryKeys.taches.lists(), filters] as const
                : [...queryKeys.taches.lists()] as const,
        detail: (taskId: number) => [...queryKeys.taches.all, 'detail', taskId] as const,
    },

    // ============================================================================
    // DÉTAILS TÂCHE (photos, consommations)
    // ============================================================================

    taskDetails: {
        all: ['taskDetails'] as const,
        photos: (taskId: number) => [...queryKeys.taskDetails.all, 'photos', taskId] as const,
        consommations: (taskId: number) => [...queryKeys.taskDetails.all, 'consommations', taskId] as const,
        combined: (taskId: number) => [...queryKeys.taskDetails.all, 'combined', taskId] as const,
    },

    // ============================================================================
    // DISTRIBUTIONS
    // ============================================================================

    distributions: {
        all: ['distributions'] as const,
        lists: () => [...queryKeys.distributions.all, 'list'] as const,
        list: (filters?: DistributionFilters) =>
            filters
                ? [...queryKeys.distributions.lists(), filters] as const
                : [...queryKeys.distributions.lists()] as const,
        parJour: (date: string) => [...queryKeys.distributions.all, 'par-jour', date] as const,
        detail: (distributionId: number) => [...queryKeys.distributions.all, 'detail', distributionId] as const,
        historique: (distributionId: number) => [...queryKeys.distributions.all, 'historique', distributionId] as const,
    },

    // ============================================================================
    // RÉCLAMATIONS
    // ============================================================================

    reclamations: {
        all: ['reclamations'] as const,
        lists: () => [...queryKeys.reclamations.all, 'list'] as const,
        list: (filters?: Record<string, string | number | undefined>) =>
            filters
                ? [...queryKeys.reclamations.lists(), filters] as const
                : [...queryKeys.reclamations.lists()] as const,
        detail: (id: number) => [...queryKeys.reclamations.all, 'detail', id] as const,
        stats: (filters?: Record<string, string | undefined>) =>
            filters
                ? [...queryKeys.reclamations.all, 'stats', filters] as const
                : [...queryKeys.reclamations.all, 'stats'] as const,
    },

    // ============================================================================
    // DONNÉES DE RÉFÉRENCE
    // ============================================================================

    referenceData: {
        all: ['referenceData'] as const,
        typesTaches: () => [...queryKeys.referenceData.all, 'typesTaches'] as const,
        equipes: () => [...queryKeys.referenceData.all, 'equipes'] as const,
        sites: () => [...queryKeys.referenceData.all, 'sites'] as const,
        structures: () => [...queryKeys.referenceData.all, 'structures'] as const,
        produits: () => [...queryKeys.referenceData.all, 'produits'] as const,
        typesReclamations: () => [...queryKeys.referenceData.all, 'typesReclamations'] as const,
        urgences: () => [...queryKeys.referenceData.all, 'urgences'] as const,
    },

    // ============================================================================
    // KPIs
    // ============================================================================

    kpis: {
        all: ['kpis'] as const,
        current: (mois?: string, siteId?: number | null) =>
            [...queryKeys.kpis.all, 'current', mois, siteId] as const,
        historique: (siteId?: number | null, nbMois?: number) =>
            [...queryKeys.kpis.all, 'historique', siteId, nbMois] as const,
    },

    // ============================================================================
    // UTILISATEUR
    // ============================================================================

    user: {
        current: ['user', 'current'] as const,
    },
} as const;

// Types helpers pour les clés
export type TachesQueryKey = ReturnType<typeof queryKeys.taches.list>;
export type TacheDetailQueryKey = ReturnType<typeof queryKeys.taches.detail>;
export type DistributionsQueryKey = ReturnType<typeof queryKeys.distributions.list>;
export type DistributionsParJourQueryKey = ReturnType<typeof queryKeys.distributions.parJour>;
