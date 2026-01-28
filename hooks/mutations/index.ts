// Mutation hooks barrel export

// Distribution mutations
export {
    useDemarrerDistribution,
    useTerminerDistribution,
    useReporterDistribution,
    useAnnulerDistribution,
    useRestaurerDistribution,
    useDistributionActions,
} from './useDistributionMutations';

// Task mutations
export {
    useUpdateTask,
    useDeleteTask,
    useValidateTask,
    useChangeTaskStatus,
    useAssignEquipe,
    useUploadPhoto,
    useDeletePhoto,
    useAddConsommation,
    useDeleteConsommation,
    useTaskActions,
} from './useTaskMutations';
