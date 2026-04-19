import { useMutation, useQueryClient } from '@tanstack/react-query';
import { planningService } from '../../services/planningService';
import { queryKeys } from '../../lib/queryKeys';
import {
  DistributionChargeEnriched,
  StatusDistribution,
  MotifDistribution,
} from '../../types/planning';

// Types pour les contextes d'optimistic update
interface OptimisticContext {
  previousDistributions?: {
    date: string;
    distributions: DistributionChargeEnriched[];
    statistiques: any;
  };
}

/**
 * Helper pour mettre à jour une distribution dans le cache
 */
function updateDistributionInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  date: string,
  distributionId: number,
  updates: Partial<DistributionChargeEnriched>,
) {
  const queryKey = queryKeys.distributions.parJour(date);

  queryClient.setQueryData<{
    date: string;
    distributions: DistributionChargeEnriched[];
    statistiques: any;
  }>(queryKey, (old) => {
    if (!old) return old;

    return {
      ...old,
      distributions: old.distributions.map((d) =>
        d.id === distributionId ? { ...d, ...updates } : d,
      ),
    };
  });
}

// ============================================================================
// DÉMARRER DISTRIBUTION
// ============================================================================

interface DemarrerVariables {
  distributionId: number;
  date: string;
  data?: {
    heure_debut_reelle?: string;
    date_debut_reelle?: string;
  };
}

export function useDemarrerDistribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ distributionId, data }: DemarrerVariables) => {
      return planningService.demarrerDistribution(distributionId, data);
    },

    onMutate: async ({ distributionId, date }) => {
      // Annuler les requêtes en cours
      await queryClient.cancelQueries({
        queryKey: queryKeys.distributions.parJour(date),
      });

      // Snapshot des données actuelles
      const previousDistributions = queryClient.getQueryData<{
        date: string;
        distributions: DistributionChargeEnriched[];
        statistiques: any;
      }>(queryKeys.distributions.parJour(date));

      // Optimistic update
      updateDistributionInCache(queryClient, date, distributionId, {
        status: 'EN_COURS' as StatusDistribution,
        date_demarrage: new Date().toISOString(),
      });

      return { previousDistributions } as OptimisticContext;
    },

    onError: (_error, { date }, context) => {
      // Rollback en cas d'erreur
      if (context?.previousDistributions) {
        queryClient.setQueryData(
          queryKeys.distributions.parJour(date),
          context.previousDistributions,
        );
      }
    },

    onSettled: (_data, _error, { date }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.distributions.parJour(date),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.taches.all });
    },
  });
}

// ============================================================================
// TERMINER DISTRIBUTION
// ============================================================================

interface TerminerVariables {
  distributionId: number;
  date: string;
  data?: {
    heure_debut_reelle?: string;
    heure_fin_reelle?: string;
    heures_reelles?: number;
  };
}

export function useTerminerDistribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ distributionId, data }: TerminerVariables) => {
      return planningService.terminerDistribution(distributionId, data);
    },

    onMutate: async ({ distributionId, date }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.distributions.parJour(date),
      });

      const previousDistributions = queryClient.getQueryData<{
        date: string;
        distributions: DistributionChargeEnriched[];
        statistiques: any;
      }>(queryKeys.distributions.parJour(date));

      // Optimistic update
      updateDistributionInCache(queryClient, date, distributionId, {
        status: 'REALISEE' as StatusDistribution,
        date_completion: new Date().toISOString(),
      });

      return { previousDistributions } as OptimisticContext;
    },

    onError: (_error, { date }, context) => {
      if (context?.previousDistributions) {
        queryClient.setQueryData(
          queryKeys.distributions.parJour(date),
          context.previousDistributions,
        );
      }
    },

    onSettled: (_data, _error, { date }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.distributions.parJour(date),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.taches.all });
    },
  });
}

// ============================================================================
// REPORTER DISTRIBUTION
// ============================================================================

interface ReporterVariables {
  distributionId: number;
  oldDate: string;
  newDate: string;
  motif: MotifDistribution;
  commentaire?: string;
}

export function useReporterDistribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ distributionId, newDate, motif, commentaire }: ReporterVariables) => {
      return planningService.reporterDistribution(distributionId, newDate, motif, commentaire);
    },

    onMutate: async ({ distributionId, oldDate }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.distributions.parJour(oldDate),
      });

      const previousDistributions = queryClient.getQueryData<{
        date: string;
        distributions: DistributionChargeEnriched[];
        statistiques: any;
      }>(queryKeys.distributions.parJour(oldDate));

      // Optimistic update - marquer comme reportée
      updateDistributionInCache(queryClient, oldDate, distributionId, {
        status: 'REPORTEE' as StatusDistribution,
      });

      return { previousDistributions } as OptimisticContext;
    },

    onError: (_error, { oldDate }, context) => {
      if (context?.previousDistributions) {
        queryClient.setQueryData(
          queryKeys.distributions.parJour(oldDate),
          context.previousDistributions,
        );
      }
    },

    onSettled: (_data, _error, { oldDate, newDate }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.distributions.parJour(oldDate),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.distributions.parJour(newDate),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.taches.all });
    },
  });
}

// ============================================================================
// ANNULER DISTRIBUTION
// ============================================================================

interface AnnulerVariables {
  distributionId: number;
  date: string;
  motif: MotifDistribution;
  commentaire?: string;
}

export function useAnnulerDistribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ distributionId, motif, commentaire }: AnnulerVariables) => {
      return planningService.annulerDistribution(distributionId, motif, commentaire);
    },

    onMutate: async ({ distributionId, date }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.distributions.parJour(date),
      });

      const previousDistributions = queryClient.getQueryData<{
        date: string;
        distributions: DistributionChargeEnriched[];
        statistiques: any;
      }>(queryKeys.distributions.parJour(date));

      // Optimistic update
      updateDistributionInCache(queryClient, date, distributionId, {
        status: 'ANNULEE' as StatusDistribution,
      });

      return { previousDistributions } as OptimisticContext;
    },

    onError: (_error, { date }, context) => {
      if (context?.previousDistributions) {
        queryClient.setQueryData(
          queryKeys.distributions.parJour(date),
          context.previousDistributions,
        );
      }
    },

    onSettled: (_data, _error, { date }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.distributions.parJour(date),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.taches.all });
    },
  });
}

// ============================================================================
// RESTAURER DISTRIBUTION
// ============================================================================

interface RestaurerVariables {
  distributionId: number;
  date: string;
}

export function useRestaurerDistribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ distributionId }: RestaurerVariables) => {
      return planningService.restaurerDistribution(distributionId);
    },

    onMutate: async ({ distributionId, date }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.distributions.parJour(date),
      });

      const previousDistributions = queryClient.getQueryData<{
        date: string;
        distributions: DistributionChargeEnriched[];
        statistiques: any;
      }>(queryKeys.distributions.parJour(date));

      // Optimistic update - revenir à NON_REALISEE
      updateDistributionInCache(queryClient, date, distributionId, {
        status: 'NON_REALISEE' as StatusDistribution,
      });

      return { previousDistributions } as OptimisticContext;
    },

    onError: (_error, { date }, context) => {
      if (context?.previousDistributions) {
        queryClient.setQueryData(
          queryKeys.distributions.parJour(date),
          context.previousDistributions,
        );
      }
    },

    onSettled: (_data, _error, { date }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.distributions.parJour(date),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.taches.all });
    },
  });
}

// ============================================================================
// HOOK COMBINÉ POUR TOUTES LES ACTIONS
// ============================================================================

/**
 * Hook combiné qui expose toutes les mutations de distribution
 * avec gestion d'état de chargement globale
 */
export function useDistributionActions() {
  const demarrer = useDemarrerDistribution();
  const terminer = useTerminerDistribution();
  const reporter = useReporterDistribution();
  const annuler = useAnnulerDistribution();
  const restaurer = useRestaurerDistribution();

  // État de chargement global
  const isLoading =
    demarrer.isPending ||
    terminer.isPending ||
    reporter.isPending ||
    annuler.isPending ||
    restaurer.isPending;

  return {
    demarrer,
    terminer,
    reporter,
    annuler,
    restaurer,
    isLoading,
  };
}
