import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { planningService } from '../../services/planningService';
import { queryKeys } from '../../lib/queryKeys';
import { DistributionChargeEnriched, DistributionFilters } from '../../types/planning';

/**
 * Hook pour récupérer les distributions par jour
 * Optimisé pour la vue "Distributions par jour" avec statistiques
 *
 * @param date - Date au format YYYY-MM-DD
 * @param options - Options (enabled pour contrôler l'exécution)
 * @returns Query result avec les distributions enrichies
 */
export function useDistributionsParJour(date: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.distributions.parJour(date),
    queryFn: async () => {
      const response = await planningService.getDistributionsParJour(date);
      return response;
    },
    enabled: options?.enabled !== false && !!date,
    staleTime: 60 * 1000, // 1 minute
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook pour récupérer les distributions avec filtres avancés
 *
 * @param filters - Filtres (status, date, equipe, site, etc.)
 * @param options - Options (enabled pour contrôler l'exécution)
 * @returns Query result avec les distributions
 */
export function useDistributions(filters?: DistributionFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.distributions.list(filters),
    queryFn: async () => {
      const distributions = await planningService.getDistributions(filters || {});
      return distributions as DistributionChargeEnriched[];
    },
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000, // 1 minute
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook pour récupérer l'historique d'une distribution (chaîne de reports)
 *
 * @param distributionId - ID de la distribution
 * @param options - Options (enabled pour contrôler l'exécution)
 * @returns Query result avec l'historique
 */
export function useDistributionHistorique(
  distributionId: number | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: distributionId
      ? queryKeys.distributions.historique(distributionId)
      : ['distributions', 'historique', 'none'],
    queryFn: async () => {
      if (!distributionId) throw new Error('Distribution ID is required');
      return planningService.getHistoriqueDistribution(distributionId);
    },
    enabled: options?.enabled !== false && distributionId !== null,
    staleTime: 60 * 1000, // 1 minute (l'historique change moins souvent)
  });
}

/**
 * Hook pour précharger les distributions d'une date
 */
export function usePrefetchDistributionsParJour() {
  const queryClient = useQueryClient();

  return (date: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.distributions.parJour(date),
      queryFn: () => planningService.getDistributionsParJour(date),
      staleTime: 30 * 1000,
    });
  };
}

/**
 * Hook pour obtenir des distributions depuis le cache
 */
export function useGetDistributionsFromCache() {
  const queryClient = useQueryClient();

  return {
    // Obtenir les distributions d'une date depuis le cache
    getForDate: (date: string): DistributionChargeEnriched[] | undefined => {
      const cached = queryClient.getQueryData<{
        distributions: DistributionChargeEnriched[];
      }>(queryKeys.distributions.parJour(date));
      return cached?.distributions;
    },

    // Obtenir une distribution spécifique depuis le cache
    getById: (distributionId: number, date?: string): DistributionChargeEnriched | undefined => {
      if (date) {
        const distributions = queryClient.getQueryData<{
          distributions: DistributionChargeEnriched[];
        }>(queryKeys.distributions.parJour(date));
        return distributions?.distributions.find((d) => d.id === distributionId);
      }
      return undefined;
    },
  };
}
