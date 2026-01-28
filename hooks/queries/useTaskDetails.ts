import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import {
    fetchPhotosParTache,
    fetchConsommationsParTache,
} from '../../services/suiviTachesApi';

/**
 * Hook pour récupérer les photos d'une tâche
 *
 * @param taskId - ID de la tâche
 * @param options - Options (enabled pour contrôler l'exécution)
 * @returns Query result avec les photos
 */
export function useTaskPhotos(taskId: number | null, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: taskId ? queryKeys.taskDetails.photos(taskId) : ['taskDetails', 'photos', 'none'],
        queryFn: async () => {
            if (!taskId) throw new Error('Task ID is required');
            return fetchPhotosParTache(taskId);
        },
        enabled: options?.enabled !== false && taskId !== null,
        staleTime: 60 * 1000, // 1 minute (les photos changent moins souvent)
    });
}

/**
 * Hook pour récupérer les consommations d'une tâche
 *
 * @param taskId - ID de la tâche
 * @param options - Options (enabled pour contrôler l'exécution)
 * @returns Query result avec les consommations
 */
export function useTaskConsommations(taskId: number | null, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: taskId ? queryKeys.taskDetails.consommations(taskId) : ['taskDetails', 'consommations', 'none'],
        queryFn: async () => {
            if (!taskId) throw new Error('Task ID is required');
            return fetchConsommationsParTache(taskId);
        },
        enabled: options?.enabled !== false && taskId !== null,
        staleTime: 60 * 1000,
    });
}

/**
 * Hook combiné pour récupérer photos et consommations en parallèle
 *
 * @param taskId - ID de la tâche
 * @param options - Options (enabled pour contrôler l'exécution)
 * @returns Query result avec photos et consommations
 */
export function useTaskDetails(taskId: number | null, options?: { enabled?: boolean }) {
    const photosQuery = useTaskPhotos(taskId, options);
    const consommationsQuery = useTaskConsommations(taskId, options);

    return {
        photos: photosQuery.data ?? [],
        consommations: consommationsQuery.data ?? [],
        isLoadingPhotos: photosQuery.isLoading,
        isLoadingConsommations: consommationsQuery.isLoading,
        isLoading: photosQuery.isLoading || consommationsQuery.isLoading,
        isFetching: photosQuery.isFetching || consommationsQuery.isFetching,
        isError: photosQuery.isError || consommationsQuery.isError,
        error: photosQuery.error || consommationsQuery.error,
        refetch: async () => {
            await Promise.all([
                photosQuery.refetch(),
                consommationsQuery.refetch(),
            ]);
        },
    };
}

/**
 * Hook pour invalider les détails d'une tâche
 */
export function useInvalidateTaskDetails() {
    const queryClient = useQueryClient();

    return (taskId: number) => {
        queryClient.invalidateQueries({
            queryKey: queryKeys.taskDetails.photos(taskId),
        });
        queryClient.invalidateQueries({
            queryKey: queryKeys.taskDetails.consommations(taskId),
        });
    };
}
