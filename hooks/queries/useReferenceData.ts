import { useQuery } from '@tanstack/react-query';
import { planningService } from '../../services/planningService';
import { fetchAllSites, fetchCurrentUser, SiteFrontend } from '../../services/api';
import { fetchEquipes, fetchStructures } from '../../services/usersApi';
import { fetchProduitsActifs } from '../../services/suiviTachesApi';
import { queryKeys } from '../../lib/queryKeys';
import { TypeTache } from '../../types/planning';
import { EquipeList, StructureClient } from '../../types/users';
import { ProduitList } from '../../types/suiviTaches';

/**
 * Hook pour récupérer les types de tâches
 */
export function useTypesTaches() {
    return useQuery({
        queryKey: queryKeys.referenceData.typesTaches(),
        queryFn: async () => {
            const response = await planningService.getTypesTaches();
            return (Array.isArray(response) ? response : response) as TypeTache[];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes (données de référence, changent rarement)
        gcTime: 30 * 60 * 1000, // 30 minutes
    });
}

/**
 * Hook pour récupérer les équipes
 */
export function useEquipes() {
    return useQuery({
        queryKey: queryKeys.referenceData.equipes(),
        queryFn: async () => {
            const response = await fetchEquipes();
            return Array.isArray(response) ? response : (response.results || []) as EquipeList[];
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

/**
 * Hook pour récupérer les sites
 */
export function useSites() {
    return useQuery({
        queryKey: queryKeys.referenceData.sites(),
        queryFn: async () => {
            const sites = await fetchAllSites();
            return sites.filter((s: SiteFrontend) => s.actif);
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

/**
 * Hook pour récupérer les structures (clients)
 */
export function useStructures() {
    return useQuery({
        queryKey: queryKeys.referenceData.structures(),
        queryFn: async () => {
            const response = await fetchStructures();
            return Array.isArray(response) ? response : (response.results || []) as StructureClient[];
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

/**
 * Hook pour récupérer les produits actifs
 */
export function useProduits() {
    return useQuery({
        queryKey: queryKeys.referenceData.produits(),
        queryFn: async () => {
            return fetchProduitsActifs() as Promise<ProduitList[]>;
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

/**
 * Hook pour récupérer les informations de l'utilisateur courant
 */
export function useCurrentUser() {
    return useQuery({
        queryKey: queryKeys.user.current,
        queryFn: async () => {
            return fetchCurrentUser();
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
        gcTime: 60 * 60 * 1000, // 1 heure
    });
}

/**
 * Hook combiné pour charger toutes les données de référence nécessaires aux filtres
 */
export function useFilterReferenceData() {
    const structuresQuery = useStructures();
    const equipesQuery = useEquipes();
    const sitesQuery = useSites();

    return {
        structures: structuresQuery.data ?? [],
        equipes: equipesQuery.data ?? [],
        sites: sitesQuery.data ?? [],
        isLoading: structuresQuery.isLoading || equipesQuery.isLoading || sitesQuery.isLoading,
        isFetching: structuresQuery.isFetching || equipesQuery.isFetching || sitesQuery.isFetching,
        isError: structuresQuery.isError || equipesQuery.isError || sitesQuery.isError,
    };
}

/**
 * Hook pour déterminer le rôle de l'utilisateur
 */
export function useUserRole() {
    const { data: user, isLoading } = useCurrentUser();

    const roles = user?.roles || [];
    const isAdmin = roles.includes('ADMIN');
    const isSuperviseur = roles.includes('SUPERVISEUR');
    const isClient = roles.includes('CLIENT');

    return {
        isAdmin,
        isSuperviseur,
        isClient,
        isClientView: isClient && !isAdmin && !isSuperviseur,
        roles,
        isLoading,
    };
}
