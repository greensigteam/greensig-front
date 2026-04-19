// Query hooks barrel export

// Tâches
export { useTaches, useTache, usePrefetchTache, useGetTacheFromCache } from './useTaches';

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

// Réclamations
export {
  useReclamations,
  useReclamation,
  useReclamationStats,
  useTypesReclamations,
  useUrgences,
} from './useReclamations';

// KPIs
export { useKPIs, useKPIHistorique } from './useKPIData';

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

// RH (Teams page : opérateurs, équipes, absences, compétences, stats)
export {
  useOperateursQuery,
  useOperateurDetailQuery,
  useChefsPotentielsQuery,
  useEquipesRHQuery,
  useEquipeDetailQuery,
  useAbsencesQuery,
  useAbsencesAValiderQuery,
  useCompetencesQuery,
  useStatsUtilisateursQuery,
} from './useTeamsQueries';

// Utilisateurs / clients (Users page)
export { useUtilisateursQuery, useClientsQuery } from './useUsersQueries';
