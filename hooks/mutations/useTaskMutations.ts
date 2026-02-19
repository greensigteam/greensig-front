import { useMutation, useQueryClient } from '@tanstack/react-query';
import { planningService } from '../../services/planningService';
import { queryKeys } from '../../lib/queryKeys';
import {
    createPhoto,
    deletePhoto,
    createConsommation,
    deleteConsommation,
} from '../../services/suiviTachesApi';
import { Tache, TacheUpdate } from '../../types/planning';

// ============================================================================
// MISE À JOUR TÂCHE
// ============================================================================

interface UpdateTaskVariables {
    taskId: number;
    data: TacheUpdate;
}

export function useUpdateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, data }: UpdateTaskVariables) => {
            return planningService.updateTache(taskId, data);
        },

        onMutate: async ({ taskId, data }) => {
            await queryClient.cancelQueries({
                queryKey: queryKeys.taches.detail(taskId),
            });

            const previousTache = queryClient.getQueryData<Tache>(
                queryKeys.taches.detail(taskId)
            );

            // Optimistic update
            if (previousTache) {
                queryClient.setQueryData<Tache>(
                    queryKeys.taches.detail(taskId),
                    { ...previousTache, ...data }
                );
            }

            return { previousTache };
        },

        onError: (_error, { taskId }, context) => {
            if (context?.previousTache) {
                queryClient.setQueryData(
                    queryKeys.taches.detail(taskId),
                    context.previousTache
                );
            }
        },

        onSettled: (_data, _error, { taskId }) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.taches.detail(taskId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.taches.lists(),
            });
        },
    });
}

// ============================================================================
// SUPPRESSION TÂCHE
// ============================================================================

interface DeleteTaskVariables {
    taskId: number;
}

export function useDeleteTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId }: DeleteTaskVariables) => {
            return planningService.deleteTache(taskId);
        },

        onSettled: (_data, _error, { taskId }) => {
            // Invalider toutes les listes pour refetch avec données fraîches du serveur
            queryClient.invalidateQueries({
                queryKey: queryKeys.taches.all,
            });
            // Nettoyer le cache détail de la tâche supprimée
            queryClient.removeQueries({
                queryKey: queryKeys.taches.detail(taskId),
            });
        },
    });
}

// ============================================================================
// VALIDATION TÂCHE
// ============================================================================

interface ValidateTaskVariables {
    taskId: number;
    etat: 'VALIDEE' | 'REJETEE';
    commentaire?: string;
}

export function useValidateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, etat, commentaire }: ValidateTaskVariables) => {
            return planningService.validerTache(taskId, etat, commentaire);
        },

        onSettled: (_data, _error, { taskId }) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.taches.detail(taskId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.taches.lists(),
            });
        },
    });
}

// ============================================================================
// CHANGEMENT STATUT TÂCHE
// ============================================================================

interface ChangeStatusVariables {
    taskId: number;
    nouveauStatut: 'EN_COURS' | 'TERMINEE' | 'ANNULEE' | 'PLANIFIEE';
}

export function useChangeTaskStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, nouveauStatut }: ChangeStatusVariables) => {
            return planningService.changeStatut(taskId, nouveauStatut);
        },

        onMutate: async ({ taskId, nouveauStatut }) => {
            await queryClient.cancelQueries({
                queryKey: queryKeys.taches.detail(taskId),
            });

            const previousTache = queryClient.getQueryData<Tache>(
                queryKeys.taches.detail(taskId)
            );

            // Optimistic update
            if (previousTache) {
                queryClient.setQueryData<Tache>(
                    queryKeys.taches.detail(taskId),
                    { ...previousTache, statut: nouveauStatut }
                );
            }

            return { previousTache };
        },

        onError: (_error, { taskId }, context) => {
            if (context?.previousTache) {
                queryClient.setQueryData(
                    queryKeys.taches.detail(taskId),
                    context.previousTache
                );
            }
        },

        onSettled: (_data, _error, { taskId }) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.taches.detail(taskId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.taches.lists(),
            });
        },
    });
}

// ============================================================================
// ASSIGNATION ÉQUIPE
// ============================================================================

interface AssignEquipeVariables {
    taskId: number;
    equipeIds: number[];
}

export function useAssignEquipe() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, equipeIds }: AssignEquipeVariables) => {
            return planningService.updateTache(taskId, {
                equipes_ids: equipeIds,
            } as any);
        },

        onSettled: (_data, _error, { taskId }) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.taches.detail(taskId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.taches.lists(),
            });
        },
    });
}

// ============================================================================
// PHOTOS
// ============================================================================

interface UploadPhotoVariables {
    taskId: number;
    file: File;
    type_photo: 'AVANT' | 'APRES';
}

export function useUploadPhoto() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, file, type_photo }: UploadPhotoVariables) => {
            return createPhoto({
                fichier: file,
                type_photo,
                tache: taskId,
                legende: file.name,
            });
        },

        onSettled: (_data, _error, { taskId }) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.taskDetails.photos(taskId),
            });
        },
    });
}

interface DeletePhotoVariables {
    photoId: number;
    taskId: number;
}

export function useDeletePhoto() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ photoId }: DeletePhotoVariables) => {
            return deletePhoto(photoId);
        },

        onSettled: (_data, _error, { taskId }) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.taskDetails.photos(taskId),
            });
        },
    });
}

// ============================================================================
// CONSOMMATIONS
// ============================================================================

interface AddConsommationVariables {
    taskId: number;
    data: {
        produit: number;
        quantite: number;
        unite: string;
        commentaire: string;
    };
}

export function useAddConsommation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, data }: AddConsommationVariables) => {
            return createConsommation({
                tache: taskId,
                produit: data.produit,
                quantite_utilisee: data.quantite,
                unite: data.unite,
                commentaire: data.commentaire,
            });
        },

        onSettled: (_data, _error, { taskId }) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.taskDetails.consommations(taskId),
            });
        },
    });
}

interface DeleteConsommationVariables {
    consommationId: number;
    taskId: number;
}

export function useDeleteConsommation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ consommationId }: DeleteConsommationVariables) => {
            return deleteConsommation(consommationId);
        },

        onSettled: (_data, _error, { taskId }) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.taskDetails.consommations(taskId),
            });
        },
    });
}

// ============================================================================
// HOOK COMBINÉ
// ============================================================================

export function useTaskActions() {
    const updateTask = useUpdateTask();
    const deleteTask = useDeleteTask();
    const validateTask = useValidateTask();
    const changeStatus = useChangeTaskStatus();
    const assignEquipe = useAssignEquipe();
    const uploadPhoto = useUploadPhoto();
    const deletePhotoMutation = useDeletePhoto();
    const addConsommation = useAddConsommation();
    const deleteConsommationMutation = useDeleteConsommation();

    const isLoading =
        updateTask.isPending ||
        deleteTask.isPending ||
        validateTask.isPending ||
        changeStatus.isPending ||
        assignEquipe.isPending ||
        uploadPhoto.isPending ||
        deletePhotoMutation.isPending ||
        addConsommation.isPending ||
        deleteConsommationMutation.isPending;

    return {
        updateTask,
        deleteTask,
        validateTask,
        changeStatus,
        assignEquipe,
        uploadPhoto,
        deletePhoto: deletePhotoMutation,
        addConsommation,
        deleteConsommation: deleteConsommationMutation,
        isLoading,
    };
}
