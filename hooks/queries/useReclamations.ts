import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchReclamations, fetchReclamationById, fetchTypesReclamations, fetchUrgences, fetchReclamationStats } from '../../services/reclamationsApi';
import { queryKeys } from '../../lib/queryKeys';
import { Reclamation, TypeReclamation, Urgence, ReclamationStats } from '../../types/reclamations';

export interface ReclamationFilters {
    statut?: string;
    site?: number;
    date_debut?: string;
    date_fin?: string;
    search?: string;
    ordering?: string;
}

/**
 * Hook pour récupérer la liste des réclamations
 */
export function useReclamations(filters?: ReclamationFilters, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: queryKeys.reclamations.list(filters),
        queryFn: () => fetchReclamations(filters),
        enabled: options?.enabled !== false,
        staleTime: 2 * 60 * 1000,
        refetchInterval: 60 * 1000,
        refetchIntervalInBackground: false,
        placeholderData: keepPreviousData,
    });
}

/**
 * Hook pour récupérer le détail d'une réclamation
 */
export function useReclamation(id: number | null, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: id ? queryKeys.reclamations.detail(id) : ['reclamations', 'none'],
        queryFn: () => {
            if (!id) throw new Error('Reclamation ID is required');
            return fetchReclamationById(id);
        },
        enabled: options?.enabled !== false && id !== null,
        staleTime: 2 * 60 * 1000,
    });
}

export interface ReclamationStatsFilters {
    date_debut?: string;
    date_fin?: string;
    site?: number;
    zone?: number;
    type_reclamation?: number;
}

/**
 * Hook pour récupérer les stats des réclamations
 */
export function useReclamationStats(filters?: ReclamationStatsFilters, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: queryKeys.reclamations.stats(filters as any),
        queryFn: () => fetchReclamationStats(filters),
        enabled: options?.enabled !== false,
        staleTime: 2 * 60 * 1000,
        refetchInterval: 60 * 1000,
        refetchIntervalInBackground: false,
        placeholderData: keepPreviousData,
    });
}

/**
 * Hook pour récupérer les types de réclamations
 */
export function useTypesReclamations() {
    return useQuery({
        queryKey: queryKeys.referenceData.typesReclamations(),
        queryFn: fetchTypesReclamations,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

/**
 * Hook pour récupérer les urgences
 */
export function useUrgences() {
    return useQuery({
        queryKey: queryKeys.referenceData.urgences(),
        queryFn: fetchUrgences,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}
