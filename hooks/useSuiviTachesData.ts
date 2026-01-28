import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

// React Query hooks
import {
    useTaches,
    useTaskDetails,
    useFilterReferenceData,
    useTypesTaches,
    useProduits,
    useUserRole,
} from './queries';
import {
    useUpdateTask,
    useDeleteTask,
    useValidateTask,
    useAssignEquipe,
    useUploadPhoto,
    useDeletePhoto,
    useAddConsommation,
    useDeleteConsommation,
} from './mutations';

// Services
import { planningService } from '../services/planningService';
import { SiteFrontend } from '../services/api';
import { cloturerReclamation } from '../services/reclamationsApi';
import { queryKeys } from '../lib/queryKeys';

// Types
import { Tache, TacheCreate, PlanningFilters, EMPTY_PLANNING_FILTERS, StatusDistribution } from '../types/planning';
import { PhotoList, ConsommationProduit, ProduitList } from '../types/suiviTaches';
import { StructureClient, EquipeList } from '../types/users';

// Contexts
import { useSearch } from '../contexts/SearchContext';
import { useToast } from '../contexts/ToastContext';

export interface UseSuiviTachesDataReturn {
    // Data
    taches: Tache[];
    selectedTache: Tache | null;
    photos: PhotoList[];
    consommations: ConsommationProduit[];
    produitsOptions: ProduitList[];
    typesTaches: import('../types/planning').TypeTache[];
    structures: StructureClient[];
    equipes: EquipeList[];
    sites: SiteFrontend[];
    filteredSites: SiteFrontend[];
    filteredTaches: Tache[];
    paginatedTaches: Tache[];

    // Pagination
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    setCurrentPage: (page: number) => void;

    // Filters
    filters: PlanningFilters;
    setFilters: (filters: PlanningFilters) => void;
    activeFiltersCount: number;
    clearFilters: () => void;
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;

    // Loading states
    loadingTasks: boolean;
    loadingFilters: boolean;
    loadingPhotos: boolean;
    loadingConsommations: boolean;
    loadingTypesTaches: boolean;
    uploadingPhoto: boolean;
    changingStatut: boolean;
    validating: boolean;
    processingCloture: boolean;
    updatingTask: boolean;
    assigningEquipe: boolean;

    // User info
    isAdmin: boolean;
    isClientView: boolean;

    // Selection
    setSelectedTache: (tache: Tache | null) => void;
    detailKey: number;

    // Actions - Tasks
    loadTaches: () => Promise<void>;
    loadTypesTaches: () => Promise<void>;
    handleTaskUpdate: (data: TacheCreate) => Promise<void>;
    handleDeleteTache: (tacheId: number) => Promise<void>;
    reloadSelectedTask: (tacheId: number) => Promise<void>;

    // Actions - Équipes
    handleAssignEquipe: (equipeId: number) => Promise<void>;
    handleRemoveEquipe: (equipeId: number) => Promise<void>;

    // Actions - Status
    handleChangeStatut: (type: 'start' | 'complete' | 'cancel') => Promise<void>;

    // Actions - Validation
    handleValidation: (type: 'VALIDEE' | 'REJETEE', comment: string) => Promise<{
        proposition_cloture_possible?: boolean;
        reclamation_id?: number;
        reclamation_numero?: string;
        nombre_taches_validees?: number;
    }>;
    handleProposerCloture: (reclamationId: number) => Promise<void>;

    // Actions - Distributions
    handleToggleDistribution: (distributionId: number, currentStatus: StatusDistribution) => Promise<void>;
    handleDeleteDistribution: (distributionId: number) => Promise<void>;
    handleAddDistributions: (selectedDays: any[]) => Promise<void>;

    // Actions - Photos
    handlePhotoUpload: (files: FileList, photoType: 'AVANT' | 'APRES') => Promise<void>;
    handleDeletePhoto: (photoId: number) => Promise<void>;

    // Actions - Consommations
    handleAddConsommation: (data: { produit: number; quantite: number; unite: string; commentaire: string }) => Promise<void>;
    handleDeleteConsommation: (consoId: number) => Promise<void>;

    // Search
    searchQuery: string;
}

export function useSuiviTachesData(): UseSuiviTachesDataReturn {
    const queryClient = useQueryClient();
    const { searchQuery, setSearchQuery, setPlaceholder } = useSearch();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    // ========================================================================
    // LOCAL STATE (UI state that doesn't need to be cached)
    // ========================================================================

    const [selectedTache, setSelectedTache] = useState<Tache | null>(null);
    const [detailKey, setDetailKey] = useState(0);
    const [pendingTaskId, setPendingTaskId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const [filters, setFilters] = useState<PlanningFilters>(EMPTY_PLANNING_FILTERS);
    const [showFilters, setShowFilters] = useState(false);
    const [changingStatut, setChangingStatut] = useState(false);
    const [processingCloture, setProcessingCloture] = useState(false);

    // ========================================================================
    // REACT QUERY HOOKS
    // ========================================================================

    // Tâches list
    const tachesQuery = useTaches();

    // Selected task details (photos + consommations)
    const taskDetailsQuery = useTaskDetails(selectedTache?.id ?? null, {
        enabled: selectedTache !== null,
    });

    // Reference data for filters
    const filterDataQuery = useFilterReferenceData();

    // Types de tâches (loaded on demand)
    const typesTachesQuery = useTypesTaches();

    // Produits actifs
    const produitsQuery = useProduits();

    // User role
    const { isAdmin, isClientView } = useUserRole();

    // ========================================================================
    // MUTATIONS
    // ========================================================================

    const updateTaskMutation = useUpdateTask();
    const deleteTaskMutation = useDeleteTask();
    const validateTaskMutation = useValidateTask();
    const assignEquipeMutation = useAssignEquipe();
    const uploadPhotoMutation = useUploadPhoto();
    const deletePhotoMutation = useDeletePhoto();
    const addConsommationMutation = useAddConsommation();
    const deleteConsommationMutation = useDeleteConsommation();

    // ========================================================================
    // DERIVED DATA
    // ========================================================================

    const taches = tachesQuery.data ?? [];
    const photos = taskDetailsQuery.photos;
    const consommations = taskDetailsQuery.consommations;
    const produitsOptions = produitsQuery.data ?? [];
    const typesTaches = typesTachesQuery.data ?? [];
    const structures = filterDataQuery.structures;
    const equipes = filterDataQuery.equipes;
    const sites = filterDataQuery.sites;

    // ========================================================================
    // EFFECTS
    // ========================================================================

    // Set search placeholder
    useEffect(() => {
        setPlaceholder('Rechercher par nom, équipe ou référence...');
        return () => {
            setPlaceholder('Rechercher...');
            setSearchQuery('');
        };
    }, [setPlaceholder, setSearchQuery]);

    // Reset pagination on filter/search change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filters]);

    // Handle task_id URL param
    useEffect(() => {
        const taskIdParam = searchParams.get('task_id');
        if (taskIdParam) {
            const taskId = parseInt(taskIdParam, 10);
            if (!isNaN(taskId)) {
                setPendingTaskId(taskId);
            }
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    // Auto-select task from URL
    useEffect(() => {
        if (pendingTaskId && taches.length > 0 && !tachesQuery.isLoading) {
            const taskToSelect = taches.find(t => t.id === pendingTaskId);
            if (taskToSelect) {
                setSelectedTache(taskToSelect);
                showToast(`Tâche #${pendingTaskId} sélectionnée`, 'info');
            } else {
                planningService.getTache(pendingTaskId).then(task => {
                    if (task) {
                        setSelectedTache(task);
                        showToast(`Tâche #${pendingTaskId} chargée`, 'info');
                    } else {
                        showToast(`Tâche #${pendingTaskId} introuvable`, 'error');
                    }
                }).catch(() => {
                    showToast(`Tâche #${pendingTaskId} introuvable`, 'error');
                });
            }
            setPendingTaskId(null);
        }
    }, [pendingTaskId, taches, tachesQuery.isLoading, showToast]);

    // ========================================================================
    // HANDLERS
    // ========================================================================

    // Load tâches (force refetch)
    const loadTaches = useCallback(async () => {
        await tachesQuery.refetch();
    }, [tachesQuery]);

    // Load types de tâches
    const loadTypesTaches = useCallback(async () => {
        if (typesTaches.length === 0) {
            await typesTachesQuery.refetch();
        }
    }, [typesTaches.length, typesTachesQuery]);

    // Reload selected task with fresh data
    const reloadSelectedTask = useCallback(async (tacheId: number) => {
        try {
            // Invalidate queries
            await queryClient.invalidateQueries({ queryKey: queryKeys.taches.detail(tacheId) });
            await queryClient.invalidateQueries({ queryKey: queryKeys.taches.lists() });

            // ALWAYS fetch the task detail directly to get fresh distribution data
            // The list endpoint may not include updated distributions after a task update
            const task = await planningService.getTache(tacheId);
            setSelectedTache(task);

            // Also refetch the list in background (don't await to avoid blocking)
            tachesQuery.refetch();
        } catch (error) {
            console.error("Erreur rechargement tâche", error);
        }
    }, [queryClient, tachesQuery]);

    // Task update
    const handleTaskUpdate = useCallback(async (data: TacheCreate) => {
        if (!selectedTache) return;
        try {
            await updateTaskMutation.mutateAsync({
                taskId: selectedTache.id,
                data: data as any,
            });
            await reloadSelectedTask(selectedTache.id);
        } catch (error) {
            console.error("Erreur mise à jour tâche", error);
            throw error;
        }
    }, [selectedTache, updateTaskMutation, reloadSelectedTask]);

    // Task delete
    const handleDeleteTache = useCallback(async (tacheId: number) => {
        try {
            await deleteTaskMutation.mutateAsync({ taskId: tacheId });
            setSelectedTache(null);
            showToast("Tâche supprimée avec succès", 'success');
        } catch (error) {
            console.error("Erreur suppression tâche", error);
            showToast("Erreur lors de la suppression de la tâche", 'error');
            throw error;
        }
    }, [deleteTaskMutation, showToast]);

    // Assign équipe
    const handleAssignEquipe = useCallback(async (equipeId: number) => {
        if (!selectedTache) return;
        try {
            const currentEquipeIds = selectedTache.equipes_detail?.map((e: any) => e.id) || [];
            const newEquipeIds = [...currentEquipeIds, equipeId];

            await assignEquipeMutation.mutateAsync({
                taskId: selectedTache.id,
                equipeIds: newEquipeIds,
            });
            await reloadSelectedTask(selectedTache.id);
            showToast("Équipe assignée avec succès", 'success');
        } catch (error) {
            console.error("Erreur assignation équipe", error);
            showToast("Erreur lors de l'assignation de l'équipe", 'error');
        }
    }, [selectedTache, assignEquipeMutation, reloadSelectedTask, showToast]);

    // Remove équipe
    const handleRemoveEquipe = useCallback(async (equipeId: number) => {
        if (!selectedTache) return;
        try {
            const currentEquipeIds = selectedTache.equipes_detail?.map((e: any) => e.id) || [];
            const newEquipeIds = currentEquipeIds.filter((id: number) => id !== equipeId);

            await assignEquipeMutation.mutateAsync({
                taskId: selectedTache.id,
                equipeIds: newEquipeIds,
            });
            await reloadSelectedTask(selectedTache.id);
            showToast("Équipe retirée avec succès", 'success');
        } catch (error) {
            console.error("Erreur retrait équipe", error);
            showToast("Erreur lors du retrait de l'équipe", 'error');
        }
    }, [selectedTache, assignEquipeMutation, reloadSelectedTask, showToast]);

    // Change status
    const handleChangeStatut = useCallback(async (type: 'start' | 'complete' | 'cancel') => {
        if (!selectedTache) return;

        const tacheId = selectedTache.id;
        setChangingStatut(true);

        try {
            let nouveauStatut: 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
            switch (type) {
                case 'start': nouveauStatut = 'EN_COURS'; break;
                case 'complete': nouveauStatut = 'TERMINEE'; break;
                case 'cancel': nouveauStatut = 'ANNULEE'; break;
            }

            await planningService.changeStatut(tacheId, nouveauStatut);

            // Invalidate and refetch
            await queryClient.invalidateQueries({ queryKey: queryKeys.taches.all });
            await tachesQuery.refetch();
            await reloadSelectedTask(tacheId);
        } catch (error) {
            console.error("Erreur changement statut", error);
            showToast("Erreur lors du changement de statut", 'error');
        } finally {
            setChangingStatut(false);
        }
    }, [selectedTache, queryClient, tachesQuery, reloadSelectedTask, showToast]);

    // Validation
    const handleValidation = useCallback(async (type: 'VALIDEE' | 'REJETEE', comment: string) => {
        if (!selectedTache) return {};

        const tacheId = selectedTache.id;
        try {
            const response = await validateTaskMutation.mutateAsync({
                taskId: tacheId,
                etat: type,
                commentaire: comment,
            });
            await reloadSelectedTask(tacheId);
            return response;
        } catch (error) {
            console.error("Erreur validation", error);
            showToast("Erreur lors de la validation", 'error');
            throw error;
        }
    }, [selectedTache, validateTaskMutation, reloadSelectedTask, showToast]);

    // Proposer clôture réclamation
    const handleProposerCloture = useCallback(async (reclamationId: number) => {
        setProcessingCloture(true);
        try {
            await cloturerReclamation(reclamationId);
            showToast("Clôture proposée avec succès", 'success');
        } catch (error: any) {
            console.error("Erreur proposition clôture", error);
            showToast(error?.message || "Erreur lors de la proposition de clôture", 'error');
            throw error;
        } finally {
            setProcessingCloture(false);
        }
    }, [showToast]);

    // Toggle distribution status
    const handleToggleDistribution = useCallback(async (distributionId: number, currentStatus: StatusDistribution) => {
        if (!selectedTache || isClientView) return;

        const tacheId = selectedTache.id;
        const newStatus: StatusDistribution = currentStatus === 'REALISEE' ? 'NON_REALISEE' : 'REALISEE';

        // Optimistic update
        const updatedDistributions = selectedTache.distributions_charge?.map(d =>
            d.id === distributionId ? { ...d, status: newStatus } : d
        );
        setSelectedTache({ ...selectedTache, distributions_charge: updatedDistributions });

        try {
            if (newStatus === 'REALISEE') {
                await planningService.marquerDistributionRealisee(distributionId);
            } else {
                await planningService.marquerDistributionNonRealisee(distributionId);
            }

            await reloadSelectedTask(tacheId);
            setDetailKey(prev => prev + 1);
        } catch (err) {
            // Rollback
            setSelectedTache(selectedTache);
            showToast('Erreur lors de la mise à jour de la distribution', 'error');
        }
    }, [selectedTache, isClientView, reloadSelectedTask, showToast]);

    // Delete distribution
    const handleDeleteDistribution = useCallback(async (distributionId: number) => {
        if (!selectedTache) return;

        try {
            await planningService.deleteDistribution(distributionId);
            await reloadSelectedTask(selectedTache.id);
            setDetailKey(prev => prev + 1);
            showToast('Distribution supprimée avec succès', 'success');
        } catch (err: any) {
            console.error("Erreur lors de la suppression de la distribution:", err);
            showToast(err.message || 'Erreur lors de la suppression de la distribution', 'error');
        }
    }, [selectedTache, reloadSelectedTask, showToast]);

    // Add distributions
    const handleAddDistributions = useCallback(async (selectedDays: any[]) => {
        if (!selectedTache) return;

        try {
            const existingDates = selectedTache.distributions_charge?.map(d => d.date) || [];
            const newDays = selectedDays.filter(day => day.selected && !existingDates.includes(day.date));

            if (newDays.length === 0) {
                showToast('Aucune nouvelle distribution à ajouter', 'info');
                return;
            }

            const promises = newDays.map(day =>
                planningService.createDistribution({
                    tache: selectedTache.id,
                    date: day.date,
                    heure_debut: day.heure_debut,
                    heure_fin: day.heure_fin,
                    commentaire: ''
                })
            );

            await Promise.all(promises);
            await reloadSelectedTask(selectedTache.id);
            setDetailKey(prev => prev + 1);
            showToast(`${newDays.length} distribution(s) ajoutée(s)`, 'success');
        } catch (err: any) {
            console.error("Erreur lors de l'ajout des distributions:", err);
            showToast(err.message || "Erreur lors de l'ajout des distributions", 'error');
        }
    }, [selectedTache, reloadSelectedTask, showToast]);

    // Photo upload
    const handlePhotoUpload = useCallback(async (files: FileList, photoType: 'AVANT' | 'APRES') => {
        if (!selectedTache) return;

        try {
            for (const file of Array.from(files)) {
                await uploadPhotoMutation.mutateAsync({
                    taskId: selectedTache.id,
                    file,
                    type_photo: photoType,
                });
            }
        } catch (error) {
            console.error("Erreur upload photo", error);
            showToast("Erreur lors de l'upload des photos", 'error');
        }
    }, [selectedTache, uploadPhotoMutation, showToast]);

    // Delete photo
    const handleDeletePhoto = useCallback(async (photoId: number) => {
        if (!selectedTache) return;
        try {
            await deletePhotoMutation.mutateAsync({
                photoId,
                taskId: selectedTache.id,
            });
        } catch (error) {
            console.error("Erreur suppression photo", error);
            throw error;
        }
    }, [selectedTache, deletePhotoMutation]);

    // Add consommation
    const handleAddConsommation = useCallback(async (data: { produit: number; quantite: number; unite: string; commentaire: string }) => {
        if (!selectedTache) return;

        try {
            await addConsommationMutation.mutateAsync({
                taskId: selectedTache.id,
                data,
            });
        } catch (error) {
            console.error("Erreur ajout consommation", error);
            showToast("Erreur lors de l'ajout de la consommation", 'error');
        }
    }, [selectedTache, addConsommationMutation, showToast]);

    // Delete consommation
    const handleDeleteConsommation = useCallback(async (consoId: number) => {
        if (!selectedTache) return;
        try {
            await deleteConsommationMutation.mutateAsync({
                consommationId: consoId,
                taskId: selectedTache.id,
            });
        } catch (error) {
            console.error("Erreur suppression consommation", error);
            throw error;
        }
    }, [selectedTache, deleteConsommationMutation]);

    // ========================================================================
    // FILTERING & PAGINATION (using useMemo)
    // ========================================================================

    const filteredSites = useMemo(() => {
        if (filters.clientId === null) return sites;
        return sites.filter(s => s.structure_client === filters.clientId);
    }, [sites, filters.clientId]);

    const filteredTaches = useMemo(() => {
        return taches.filter(t => {
            const teamNames = t.equipes_detail?.length > 0
                ? t.equipes_detail.map((e: any) => e.nomEquipe).join(' ')
                : t.equipe_detail?.nomEquipe || '';

            const matchesSearch = !searchQuery ||
                t.type_tache_detail?.nom_tache.toLowerCase().includes(searchQuery.toLowerCase()) ||
                teamNames.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.reference && t.reference.toLowerCase().includes(searchQuery.toLowerCase()));

            if (!matchesSearch) return false;

            if (filters.clientId !== null) {
                const tacheStructureId = t.structure_client_detail?.id;
                if (tacheStructureId !== filters.clientId) {
                    const siteIds = t.objets_detail?.map(obj => obj.site_id || Number(obj.site)) || [];
                    const matchingSites = sites.filter(s =>
                        s.structure_client === filters.clientId && siteIds.includes(Number(s.id))
                    );
                    if (matchingSites.length === 0) return false;
                }
            }

            if (filters.siteId !== null) {
                const hasSiteFromObjets = t.objets_detail?.some(obj => (obj.site_id || Number(obj.site)) === filters.siteId);
                const hasSiteFromReclamation = t.site_id === filters.siteId;
                if (!hasSiteFromObjets && !hasSiteFromReclamation) return false;
            }

            if (filters.equipeId !== null) {
                const tacheEquipeIds = t.equipes_detail?.map((e: any) => e.id) || [];
                if (!tacheEquipeIds.includes(filters.equipeId)) return false;
            }

            if (filters.statuts.length > 0) {
                if (!filters.statuts.includes(t.statut)) return false;
            }

            if (filters.dateDebut !== null || filters.dateFin !== null) {
                const tacheDate = t.date_debut_planifiee;
                if (filters.dateDebut !== null && tacheDate < filters.dateDebut) return false;
                if (filters.dateFin !== null && tacheDate > filters.dateFin) return false;
            }

            return true;
        });
    }, [taches, searchQuery, filters, sites]);

    const totalPages = Math.ceil(filteredTaches.length / itemsPerPage);

    const paginatedTaches = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredTaches.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredTaches, currentPage, itemsPerPage]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.clientId !== null) count++;
        if (filters.siteId !== null) count++;
        if (filters.equipeId !== null) count++;
        if (filters.statuts.length > 0) count++;
        if (filters.dateDebut !== null || filters.dateFin !== null) count++;
        return count;
    }, [filters]);

    const clearFilters = useCallback(() => {
        setFilters(EMPTY_PLANNING_FILTERS);
    }, []);

    // ========================================================================
    // RETURN
    // ========================================================================

    return {
        // Data
        taches,
        selectedTache,
        photos,
        consommations,
        produitsOptions,
        typesTaches,
        structures,
        equipes,
        sites,
        filteredSites,
        filteredTaches,
        paginatedTaches,

        // Pagination
        currentPage,
        totalPages,
        itemsPerPage,
        setCurrentPage,

        // Filters
        filters,
        setFilters,
        activeFiltersCount,
        clearFilters,
        showFilters,
        setShowFilters,

        // Loading states - using React Query states
        loadingTasks: tachesQuery.isLoading || tachesQuery.isFetching,
        loadingFilters: filterDataQuery.isLoading,
        loadingPhotos: taskDetailsQuery.isLoadingPhotos,
        loadingConsommations: taskDetailsQuery.isLoadingConsommations,
        loadingTypesTaches: typesTachesQuery.isLoading,
        uploadingPhoto: uploadPhotoMutation.isPending,
        changingStatut,
        validating: validateTaskMutation.isPending,
        processingCloture,
        updatingTask: updateTaskMutation.isPending,
        assigningEquipe: assignEquipeMutation.isPending,

        // User info
        isAdmin,
        isClientView,

        // Selection
        setSelectedTache,
        detailKey,

        // Actions
        loadTaches,
        loadTypesTaches,
        handleTaskUpdate,
        handleDeleteTache,
        reloadSelectedTask,
        handleAssignEquipe,
        handleRemoveEquipe,
        handleChangeStatut,
        handleValidation,
        handleProposerCloture,
        handleToggleDistribution,
        handleDeleteDistribution,
        handleAddDistributions,
        handlePhotoUpload,
        handleDeletePhoto,
        handleAddConsommation,
        handleDeleteConsommation,

        // Search
        searchQuery,
    };
}
