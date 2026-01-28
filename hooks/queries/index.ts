// Query hooks barrel export

// Tâches
export {
    useTaches,
    useTache,
    usePrefetchTache,
    useGetTacheFromCache,
} from './useTaches';

// Distributions
export {
    useDistributionsParJour,
    useDistributions,
    useDistributionHistorique,
    usePrefetchDistributionsParJour,
    useGetDistributionsFromCache,
} from './useDistributions';

// Détails tâche (photos, consommations)
export {
    useTaskPhotos,
    useTaskConsommations,
    useTaskDetails,
    useInvalidateTaskDetails,
} from './useTaskDetails';

// Données de référence
export {
    useTypesTaches,
    useEquipes,
    useSites,
    useStructures,
    useProduits,
    useCurrentUser,
    useFilterReferenceData,
    useUserRole,
} from './useReferenceData';
