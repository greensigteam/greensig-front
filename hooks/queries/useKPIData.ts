import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { fetchKPIs, fetchKPIHistorique } from '../../services/kpiApi';

/**
 * Hook pour récupérer les KPIs du mois
 */
export function useKPIs(mois?: string, siteId?: number | null) {
  return useQuery({
    queryKey: queryKeys.kpis.current(mois, siteId),
    queryFn: () => fetchKPIs(mois, siteId),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook pour récupérer l'historique KPI (graphiques d'évolution)
 */
export function useKPIHistorique(
  siteId?: number | null,
  nbMois?: number,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.kpis.historique(siteId, nbMois),
    queryFn: () => fetchKPIHistorique(siteId, nbMois),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}
