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
import { fetchPhotosParTache } from '../services/suiviTachesApi';
import { queryKeys } from '../lib/queryKeys';

// Types
import {
  Tache,
  TacheCreate,
  TacheUpdate,
  PlanningFilters,
  EMPTY_PLANNING_FILTERS,
  StatusDistribution,
} from '../types/planning';
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

  // Actions - Status (annulation avec justification obligatoire)
  handleChangeStatut: (
    type: 'start' | 'complete' | 'cancel',
    options?: {
      motif_annulation?:
        | 'METEO'
        | 'ABSENCE'
        | 'EQUIPEMENT'
        | 'CLIENT'
        | 'URGENCE'
        | 'DOUBLON'
        | 'ERREUR'
        | 'AUTRE';
      commentaire_annulation?: string;
    },
  ) => Promise<void>;

  // Actions - Validation
  handleValidation: (
    type: 'VALIDEE' | 'REJETEE',
    comment: string,
  ) => Promise<{
    proposition_cloture_possible?: boolean;
    reclamation_id?: number;
    reclamation_numero?: string;
    nombre_taches_validees?: number;
  }>;
  handleProposerCloture: (reclamationId: number) => Promise<void>;

  // Actions - Distributions
  handleToggleDistribution: (
    distributionId: number,
    currentStatus: StatusDistribution,
  ) => Promise<void>;
  handleDeleteDistribution: (distributionId: number) => Promise<void>;
  handleAddDistributions: (selectedDays: any[]) => Promise<void>;

  // Actions - Photos
  handlePhotoUpload: (files: FileList, photoType: 'AVANT' | 'APRES') => Promise<void>;
  handleDeletePhoto: (photoId: number) => Promise<void>;

  // Actions - Consommations
  handleAddConsommation: (data: {
    produit: number;
    quantite: number;
    unite: string;
    commentaire: string;
  }) => Promise<void>;
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

  // Tâches list — les dates de filtre pilotent la fenêtre serveur ; sans dates → -30/+90j par défaut
  const tachesQuery = useTaches({
    dateDebut: filters.dateDebut ?? undefined,
    dateFin: filters.dateFin ?? undefined,
  });

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

  // ⚡ OPTIMISATION: Prefetch photos dès la sélection d'une tâche
  // Cela réduit le délai lors du clic sur l'onglet "Photos"
  useEffect(() => {
    if (selectedTache?.id) {
      queryClient.prefetchQuery({
        queryKey: queryKeys.taskDetails.photos(selectedTache.id),
        queryFn: () => fetchPhotosParTache(selectedTache.id),
        staleTime: 60 * 1000, // 1 minute
      });
    }
  }, [selectedTache?.id, queryClient]);

  // Auto-select task from URL
  useEffect(() => {
    if (pendingTaskId && taches.length > 0 && !tachesQuery.isLoading) {
      const taskToSelect = taches.find((t) => t.id === pendingTaskId);
      if (taskToSelect) {
        setSelectedTache(taskToSelect);
        showToast(`Tâche #${pendingTaskId} sélectionnée`, 'info');
      } else {
        planningService
          .getTache(pendingTaskId)
          .then((task) => {
            if (task) {
              setSelectedTache(task);
              showToast(`Tâche #${pendingTaskId} chargée`, 'info');
            } else {
              showToast(`Tâche #${pendingTaskId} introuvable`, 'error');
            }
          })
          .catch(() => {
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

  // Reload selected task with fresh data (patch de cache — aucun refetch de la liste)
  const reloadSelectedTask = useCallback(
    async (tacheId: number) => {
      try {
        const task = await planningService.getTache(tacheId);
        setSelectedTache(task);
        queryClient.setQueryData(queryKeys.taches.detail(tacheId), task);
        // @ok-partial-update: on vient de fetch la tâche à jour via planningService.getTache —
        // la réponse serveur fait foi. Patcher la liste évite un second refetch de la liste
        // complète (>20MB). Le détail est aussi mis à jour ci-dessus pour cohérence.
        queryClient.setQueriesData<Tache[]>(
          { queryKey: queryKeys.taches.lists(), exact: false },
          (old) => (old ? old.map((t) => (t.id === task.id ? task : t)) : old),
        );
      } catch (error) {
        showToast('Erreur lors du rechargement de la tâche', 'error');
      }
    },
    [queryClient, showToast],
  );

  // Task update
  const handleTaskUpdate = useCallback(
    async (data: TacheCreate) => {
      if (!selectedTache) return;
      try {
        // `TacheCreate` a des champs (`id_type_tache`, `reclamation`, `recurrence_config`)
        // qui n'ont pas de sens sur un PATCH. On ne propage que le sous-ensemble
        // accepté par `TacheUpdate`.
        const updatePayload: TacheUpdate = {
          equipes_ids: data.equipes_ids,
          date_debut_planifiee: data.date_debut_planifiee,
          date_fin_planifiee: data.date_fin_planifiee,
          priorite: data.priorite,
          commentaires: data.commentaires,
          objets: data.objets,
          charge_estimee_heures: data.charge_estimee_heures,
          distributions_charge_data: data.distributions_charge_data,
        };
        const updatedTache = await updateTaskMutation.mutateAsync({
          taskId: selectedTache.id,
          data: updatePayload,
        });
        // La mutation patche déjà le cache ; on met juste à jour la sélection locale
        setSelectedTache(updatedTache);
      } catch (error) {
        showToast('Erreur lors de la mise à jour de la tâche', 'error');
        throw error;
      }
    },
    [selectedTache, updateTaskMutation, showToast],
  );

  // Task delete
  const handleDeleteTache = useCallback(
    async (tacheId: number) => {
      try {
        await deleteTaskMutation.mutateAsync({ taskId: tacheId });
        setSelectedTache(null);
        showToast('Tâche supprimée avec succès', 'success');
      } catch (error) {
        showToast('Erreur lors de la suppression de la tâche', 'error');
        throw error;
      }
    },
    [deleteTaskMutation, showToast],
  );

  // Assign équipe
  const handleAssignEquipe = useCallback(
    async (equipeId: number) => {
      if (!selectedTache) return;
      try {
        const currentEquipeIds = selectedTache.equipes_detail?.map((e: any) => e.id) || [];
        const newEquipeIds = [...currentEquipeIds, equipeId];

        const updatedTache = await assignEquipeMutation.mutateAsync({
          taskId: selectedTache.id,
          equipeIds: newEquipeIds,
        });
        setSelectedTache(updatedTache);
        showToast('Équipe assignée avec succès', 'success');
      } catch (error) {
        showToast("Erreur lors de l'assignation de l'équipe", 'error');
      }
    },
    [selectedTache, assignEquipeMutation, showToast],
  );

  // Remove équipe
  const handleRemoveEquipe = useCallback(
    async (equipeId: number) => {
      if (!selectedTache) return;
      try {
        const currentEquipeIds = selectedTache.equipes_detail?.map((e: any) => e.id) || [];
        const newEquipeIds = currentEquipeIds.filter((id: number) => id !== equipeId);

        const updatedTache = await assignEquipeMutation.mutateAsync({
          taskId: selectedTache.id,
          equipeIds: newEquipeIds,
        });
        setSelectedTache(updatedTache);
        showToast('Équipe retirée avec succès', 'success');
      } catch (error) {
        showToast("Erreur lors du retrait de l'équipe", 'error');
      }
    },
    [selectedTache, assignEquipeMutation, showToast],
  );

  // Change status
  const handleChangeStatut = useCallback(
    async (
      type: 'start' | 'complete' | 'cancel',
      options?: {
        motif_annulation?:
          | 'METEO'
          | 'ABSENCE'
          | 'EQUIPEMENT'
          | 'CLIENT'
          | 'URGENCE'
          | 'DOUBLON'
          | 'ERREUR'
          | 'AUTRE';
        commentaire_annulation?: string;
      },
    ) => {
      if (!selectedTache) return;

      const tacheId = selectedTache.id;
      setChangingStatut(true);

      try {
        let nouveauStatut: 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
        switch (type) {
          case 'start':
            nouveauStatut = 'EN_COURS';
            break;
          case 'complete':
            nouveauStatut = 'TERMINEE';
            break;
          case 'cancel':
            nouveauStatut = 'ANNULEE';
            break;
        }

        const updatedTache = await planningService.changeStatut(
          tacheId,
          nouveauStatut,
          type === 'cancel' ? options : undefined,
        );

        queryClient.setQueryData(queryKeys.taches.detail(tacheId), updatedTache);
        // @ok-partial-update: la mutation retourne la tâche à jour ; patcher la liste évite
        // un refetch de >20MB. Le détail vient d'être synchronisé ligne précédente.
        queryClient.setQueriesData<Tache[]>(
          { queryKey: queryKeys.taches.lists(), exact: false },
          (old) => (old ? old.map((t) => (t.id === updatedTache.id ? updatedTache : t)) : old),
        );
        setSelectedTache(updatedTache);
      } catch (error: any) {
        showToast(error.message || 'Erreur lors du changement de statut', 'error');
        throw error;
      } finally {
        setChangingStatut(false);
      }
    },
    [selectedTache, queryClient, showToast],
  );

  // Validation
  const handleValidation = useCallback(
    async (type: 'VALIDEE' | 'REJETEE', comment: string) => {
      if (!selectedTache) return {};

      const tacheId = selectedTache.id;
      try {
        const response = await validateTaskMutation.mutateAsync({
          taskId: tacheId,
          etat: type,
          commentaire: comment,
        });
        // La mutation patche déjà le cache via onSuccess ; on met à jour la sélection locale
        if (response?.tache) setSelectedTache(response.tache);
        return response;
      } catch (error) {
        showToast('Erreur lors de la validation', 'error');
        throw error;
      }
    },
    [selectedTache, validateTaskMutation, showToast],
  );

  // Proposer clôture réclamation
  const handleProposerCloture = useCallback(
    async (reclamationId: number) => {
      setProcessingCloture(true);
      try {
        await cloturerReclamation(reclamationId);
        showToast('Clôture proposée avec succès', 'success');
      } catch (error: any) {
        showToast(error?.message || 'Erreur lors de la proposition de clôture', 'error');
        throw error;
      } finally {
        setProcessingCloture(false);
      }
    },
    [showToast],
  );

  // Toggle distribution status
  const handleToggleDistribution = useCallback(
    async (distributionId: number, currentStatus: StatusDistribution) => {
      if (!selectedTache || isClientView) return;

      const tacheId = selectedTache.id;
      const newStatus: StatusDistribution =
        currentStatus === 'REALISEE' ? 'NON_REALISEE' : 'REALISEE';

      // Optimistic update
      const updatedDistributions = selectedTache.distributions_charge?.map((d) =>
        d.id === distributionId ? { ...d, status: newStatus } : d,
      );
      setSelectedTache({ ...selectedTache, distributions_charge: updatedDistributions });

      try {
        if (newStatus === 'REALISEE') {
          await planningService.marquerDistributionRealisee(distributionId);
        } else {
          await planningService.marquerDistributionNonRealisee(distributionId);
        }

        await reloadSelectedTask(tacheId);
        setDetailKey((prev) => prev + 1);
      } catch (err) {
        // Rollback
        setSelectedTache(selectedTache);
        showToast('Erreur lors de la mise à jour de la distribution', 'error');
      }
    },
    [selectedTache, isClientView, reloadSelectedTask, showToast],
  );

  // Delete distribution
  const handleDeleteDistribution = useCallback(
    async (distributionId: number) => {
      if (!selectedTache) return;

      try {
        await planningService.deleteDistribution(distributionId);
        await reloadSelectedTask(selectedTache.id);
        setDetailKey((prev) => prev + 1);
        showToast('Distribution supprimée avec succès', 'success');
      } catch (err: any) {
        showToast(err.message || 'Erreur lors de la suppression de la distribution', 'error');
      }
    },
    [selectedTache, reloadSelectedTask, showToast],
  );

  // Add distributions
  const handleAddDistributions = useCallback(
    async (selectedDays: any[]) => {
      if (!selectedTache) return;

      try {
        const existingDates = selectedTache.distributions_charge?.map((d) => d.date) || [];
        const newDays = selectedDays.filter(
          (day) => day.selected && !existingDates.includes(day.date),
        );

        if (newDays.length === 0) {
          showToast('Aucune nouvelle distribution à ajouter', 'info');
          return;
        }

        const promises = newDays.map((day) =>
          planningService.createDistribution({
            tache: selectedTache.id,
            date: day.date,
            heure_debut: day.heure_debut,
            heure_fin: day.heure_fin,
            commentaire: '',
          }),
        );

        await Promise.all(promises);
        await reloadSelectedTask(selectedTache.id);
        setDetailKey((prev) => prev + 1);
        showToast(`${newDays.length} distribution(s) ajoutée(s)`, 'success');
      } catch (err: any) {
        showToast(err.message || "Erreur lors de l'ajout des distributions", 'error');
      }
    },
    [selectedTache, reloadSelectedTask, showToast],
  );

  // Photo upload
  const handlePhotoUpload = useCallback(
    async (files: FileList, photoType: 'AVANT' | 'APRES') => {
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
        showToast("Erreur lors de l'upload des photos", 'error');
      }
    },
    [selectedTache, uploadPhotoMutation, showToast],
  );

  // Delete photo
  const handleDeletePhoto = useCallback(
    async (photoId: number) => {
      if (!selectedTache) return;
      try {
        await deletePhotoMutation.mutateAsync({
          photoId,
          taskId: selectedTache.id,
        });
      } catch (error) {
        showToast('Erreur lors de la suppression de la photo', 'error');
        throw error;
      }
    },
    [selectedTache, deletePhotoMutation, showToast],
  );

  // Add consommation
  const handleAddConsommation = useCallback(
    async (data: { produit: number; quantite: number; unite: string; commentaire: string }) => {
      if (!selectedTache) return;

      try {
        await addConsommationMutation.mutateAsync({
          taskId: selectedTache.id,
          data,
        });
      } catch (error) {
        showToast("Erreur lors de l'ajout de la consommation", 'error');
      }
    },
    [selectedTache, addConsommationMutation, showToast],
  );

  // Delete consommation
  const handleDeleteConsommation = useCallback(
    async (consoId: number) => {
      if (!selectedTache) return;
      try {
        await deleteConsommationMutation.mutateAsync({
          consommationId: consoId,
          taskId: selectedTache.id,
        });
      } catch (error) {
        showToast('Erreur lors de la suppression de la consommation', 'error');
        throw error;
      }
    },
    [selectedTache, deleteConsommationMutation, showToast],
  );

  // ========================================================================
  // FILTERING & PAGINATION (using useMemo)
  // ========================================================================

  const filteredSites = useMemo(() => {
    if (filters.clientId === null) return sites;
    return sites.filter((s) => s.structure_client === filters.clientId);
  }, [sites, filters.clientId]);

  const STATUS_ORDER: Record<string, number> = {
    EN_COURS: 0,
    PLANIFIEE: 1,
    TERMINEE: 2,
    ANNULEE: 3,
  };

  const filteredTaches = useMemo(() => {
    const filtered = taches.filter((t) => {
      const teamNames =
        t.equipes_detail?.length > 0
          ? t.equipes_detail.map((e: any) => e.nomEquipe).join(' ')
          : t.equipe_detail?.nomEquipe || '';

      const matchesSearch =
        !searchQuery ||
        t.type_tache_detail?.nom_tache.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teamNames.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.reference && t.reference.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filters.clientId !== null) {
        const tacheStructureId = t.structure_client_detail?.id;
        if (tacheStructureId !== filters.clientId) {
          const siteIds = t.objets_detail?.map((obj) => obj.site_id || Number(obj.site)) || [];
          const matchingSites = sites.filter(
            (s) => s.structure_client === filters.clientId && siteIds.includes(Number(s.id)),
          );
          if (matchingSites.length === 0) return false;
        }
      }

      if (filters.siteId !== null) {
        const hasSiteFromObjets = t.objets_detail?.some(
          (obj) => (obj.site_id || Number(obj.site)) === filters.siteId,
        );
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

    return filtered.sort((a, b) => {
      // 1. Statut : EN_COURS → PLANIFIEE → TERMINEE → ANNULEE
      const sA = STATUS_ORDER[a.statut] ?? 99;
      const sB = STATUS_ORDER[b.statut] ?? 99;
      if (sA !== sB) return sA - sB;

      // 2. Priorité décroissante (5 urgent en tête)
      const pDiff = (b.priorite ?? 0) - (a.priorite ?? 0);
      if (pDiff !== 0) return pDiff;

      // 3. Date de début planifiée croissante (ISO YYYY-MM-DD → comparaison lexicale correcte)
      return (a.date_debut_planifiee ?? '').localeCompare(b.date_debut_planifiee ?? '');
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
