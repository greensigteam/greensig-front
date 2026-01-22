import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { planningService } from '../services/planningService';
import { fetchCurrentUser, fetchAllSites, SiteFrontend } from '../services/api';
import { fetchEquipes, fetchStructures } from '../services/usersApi';
import {
    fetchPhotosParTache, createPhoto, deletePhoto,
    fetchConsommationsParTache, createConsommation, deleteConsommation,
    fetchProduitsActifs
} from '../services/suiviTachesApi';
import { cloturerReclamation } from '../services/reclamationsApi';
import { Tache, TacheCreate, TypeTache, PlanningFilters, EMPTY_PLANNING_FILTERS, StatusDistribution } from '../types/planning';
import { PhotoList, ConsommationProduit, ProduitList } from '../types/suiviTaches';
import { StructureClient, EquipeList } from '../types/users';
import { useSearch } from '../contexts/SearchContext';
import { useToast } from '../contexts/ToastContext';

export interface UseSuiviTachesDataReturn {
    // Data
    taches: Tache[];
    selectedTache: Tache | null;
    photos: PhotoList[];
    consommations: ConsommationProduit[];
    produitsOptions: ProduitList[];
    typesTaches: TypeTache[];
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
    const { searchQuery, setSearchQuery, setPlaceholder } = useSearch();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    // State UI
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [taches, setTaches] = useState<Tache[]>([]);
    const [selectedTache, setSelectedTache] = useState<Tache | null>(null);
    const [detailKey, setDetailKey] = useState(0);
    const [pendingTaskId, setPendingTaskId] = useState<number | null>(null);

    // State Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    // State Filtres
    const [filters, setFilters] = useState<PlanningFilters>(EMPTY_PLANNING_FILTERS);
    const [structures, setStructures] = useState<StructureClient[]>([]);
    const [equipes, setEquipes] = useState<EquipeList[]>([]);
    const [sites, setSites] = useState<SiteFrontend[]>([]);
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    // State Detéil Tache
    const [photos, setPhotos] = useState<PhotoList[]>([]);
    const [consommations, setConsommations] = useState<ConsommationProduit[]>([]);
    const [produitsOptions, setProduitsOptions] = useState<ProduitList[]>([]);

    // Loading States
    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [loadingConsommations, setLoadingConsommations] = useState(false);
    const [changingStatut, setChangingStatut] = useState(false);
    const [validating, setValidating] = useState(false);
    const [processingCloture, setProcessingCloture] = useState(false);

    // Types taches
    const [typesTaches, setTypesTaches] = useState<TypeTache[]>([]);
    const [loadingTypesTaches, setLoadingTypesTaches] = useState(false);
    const [updatingTask, setUpdatingTask] = useState(false);
    const [assigningEquipe, setAssigningEquipe] = useState(false);

    // User role
    const [isAdmin, setIsAdmin] = useState(false);
    const [isClientView, setIsClientView] = useState(false);

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

    // Initial load
    useEffect(() => {
        const taskIdParam = searchParams.get('task_id');
        if (taskIdParam) {
            const taskId = parseInt(taskIdParam, 10);
            if (!isNaN(taskId)) {
                setPendingTaskId(taskId);
            }
            setSearchParams({}, { replace: true });
        }

        loadTaches();
        loadProduitsOptions();
        loadUserRole();
        loadFilterData();
    }, []);

    // Auto-select task from URL
    useEffect(() => {
        if (pendingTaskId && taches.length > 0 && !loadingTasks) {
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
    }, [pendingTaskId, taches, loadingTasks]);

    // Load task details when selected
    useEffect(() => {
        if (selectedTache) {
            loadTaskDetails(selectedTache.id);
        }
    }, [selectedTache?.id]);

    // --- LOAD FUNCTIONS ---
    const loadFilterData = async () => {
        setLoadingFilters(true);
        try {
            const [structuresRes, equipesRes, sitesArray] = await Promise.all([
                fetchStructures(),
                fetchEquipes(),
                fetchAllSites()
            ]);
            setStructures(Array.isArray(structuresRes) ? structuresRes : (structuresRes.results || []));
            setEquipes(Array.isArray(equipesRes) ? equipesRes : (equipesRes.results || []));
            setSites(sitesArray.filter(s => s.actif));
        } catch (error) {
            console.error("Erreur chargement données filtres", error);
        } finally {
            setLoadingFilters(false);
        }
    };

    const loadUserRole = async () => {
        try {
            const userData = await fetchCurrentUser();
            const roles = userData.roles || [];
            setIsAdmin(roles.includes('ADMIN'));
            setIsClientView(roles.includes('CLIENT'));
        } catch (error) {
            console.error("Erreur chargement rôle utilisateur", error);
        }
    };

    const loadTaches = useCallback(async () => {
        setLoadingTasks(true);
        try {
            try {
                const refreshResult = await planningService.refreshTaskStatuses();
                if (refreshResult.total_updated > 0) {
                    console.log(`[SuiviTaches] ${refreshResult.total_updated} tâche(s) mise(s) à jour`);
                }
            } catch (refreshError) {
                console.warn("Erreur lors du rafraîchissement des statuts", refreshError);
            }

            const response = await planningService.getTaches();
            const tachesData = Array.isArray(response) ? response : (response.results || []);
            setTaches(tachesData);
        } catch (error) {
            console.error("Erreur chargement tâches", error);
        } finally {
            setLoadingTasks(false);
        }
    }, []);

    const loadProduitsOptions = async () => {
        try {
            const data = await fetchProduitsActifs();
            setProduitsOptions(data);
        } catch (error) {
            console.error("Erreur chargement produits", error);
        }
    };

    const loadTypesTaches = useCallback(async () => {
        if (typesTaches.length > 0) return;
        setLoadingTypesTaches(true);
        try {
            const response = await planningService.getTypesTaches();
            setTypesTaches((response as any).results || response);
        } catch (error) {
            console.error("Erreur chargement types de tâches", error);
        } finally {
            setLoadingTypesTaches(false);
        }
    }, [typesTaches.length]);

    const loadTaskDetails = async (tacheId: number) => {
        setLoadingPhotos(true);
        setLoadingConsommations(true);
        try {
            const [photosData, consosData] = await Promise.all([
                fetchPhotosParTache(tacheId),
                fetchConsommationsParTache(tacheId)
            ]);
            setPhotos(photosData);
            setConsommations(consosData);
        } catch (error) {
            console.error("Erreur chargement détails tâche", error);
        } finally {
            setLoadingPhotos(false);
            setLoadingConsommations(false);
        }
    };

    const reloadSelectedTask = useCallback(async (tacheId: number) => {
        try {
            const response = await planningService.getTaches();
            const tachesData = Array.isArray(response) ? response : (response.results || []);
            const updatedTache = tachesData.find((t: Tache) => t.id === tacheId);
            if (updatedTache) {
                setSelectedTache(updatedTache);
                setTaches(prev => prev.map(t => t.id === tacheId ? updatedTache : t));
            }
        } catch (error) {
            console.error("Erreur rechargement tâche", error);
        }
    }, []);

    // --- TASK ACTIONS ---
    const handleTaskUpdate = useCallback(async (data: TacheCreate) => {
        if (!selectedTache) return;
        setUpdatingTask(true);
        try {
            await planningService.updateTache(selectedTache.id, data);
            await loadTaches();
            setTaches(prev => {
                const updatedTache = prev.find(t => t.id === selectedTache.id);
                if (updatedTache) {
                    setSelectedTache(updatedTache);
                }
                return prev;
            });
        } catch (error) {
            console.error("Erreur mise à jour tâche", error);
            throw error;
        } finally {
            setUpdatingTask(false);
        }
    }, [selectedTache, loadTaches]);

    const handleDeleteTache = useCallback(async (tacheId: number) => {
        try {
            await planningService.deleteTache(tacheId);
            setTaches(prev => prev.filter(t => t.id !== tacheId));
            setSelectedTache(null);
            showToast("Tâche supprimée avec succès", 'success');
        } catch (error) {
            console.error("Erreur suppression tâche", error);
            showToast("Erreur lors de la suppression de la tâche", 'error');
            throw error;
        }
    }, [showToast]);

    // --- ÉQUIPES ACTIONS ---
    const handleAssignEquipe = useCallback(async (equipeId: number) => {
        if (!selectedTache) return;
        setAssigningEquipe(true);
        try {
            // Récupérer les équipes actuelles
            const currentEquipeIds = selectedTache.equipes_detail?.map((e: any) => e.id) || [];
            // Ajouter la nouvelle équipe
            const newEquipeIds = [...currentEquipeIds, equipeId];

            await planningService.updateTache(selectedTache.id, {
                equipes: newEquipeIds,
            } as any);

            // Recharger la tâche pour avoir les données à jour
            const refreshedTache = await planningService.getTache(selectedTache.id);
            setSelectedTache(refreshedTache);
            setTaches(prev => prev.map(t => t.id === refreshedTache.id ? refreshedTache : t));
            showToast("Équipe assignée avec succès", 'success');
        } catch (error) {
            console.error("Erreur assignation équipe", error);
            showToast("Erreur lors de l'assignation de l'équipe", 'error');
        } finally {
            setAssigningEquipe(false);
        }
    }, [selectedTache, showToast]);

    const handleRemoveEquipe = useCallback(async (equipeId: number) => {
        if (!selectedTache) return;
        setAssigningEquipe(true);
        try {
            // Récupérer les équipes actuelles et retirer celle-ci
            const currentEquipeIds = selectedTache.equipes_detail?.map((e: any) => e.id) || [];
            const newEquipeIds = currentEquipeIds.filter((id: number) => id !== equipeId);

            await planningService.updateTache(selectedTache.id, {
                equipes: newEquipeIds,
            } as any);

            // Recharger la tâche pour avoir les données à jour
            const refreshedTache = await planningService.getTache(selectedTache.id);
            setSelectedTache(refreshedTache);
            setTaches(prev => prev.map(t => t.id === refreshedTache.id ? refreshedTache : t));
            showToast("Équipe retirée avec succès", 'success');
        } catch (error) {
            console.error("Erreur retrait équipe", error);
            showToast("Erreur lors du retrait de l'équipe", 'error');
        } finally {
            setAssigningEquipe(false);
        }
    }, [selectedTache, showToast]);

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
            await loadTaches();
            const refreshedTache = await planningService.getTache(tacheId);
            setSelectedTache(refreshedTache);
            await loadTaskDetails(tacheId);
        } catch (error) {
            console.error("Erreur changement statut", error);
            showToast("Erreur lors du changement de statut", 'error');
        } finally {
            setChangingStatut(false);
        }
    }, [selectedTache, loadTaches, showToast]);

    // --- VALIDATION ---
    const handleValidation = useCallback(async (type: 'VALIDEE' | 'REJETEE', comment: string) => {
        if (!selectedTache) return {};

        const tacheId = selectedTache.id;
        setValidating(true);
        try {
            const response = await planningService.validerTache(tacheId, type, comment);
            await loadTaches();
            const refreshedTache = await planningService.getTache(tacheId);
            setSelectedTache(refreshedTache);
            await loadTaskDetails(tacheId);
            return response;
        } catch (error) {
            console.error("Erreur validation", error);
            showToast("Erreur lors de la validation", 'error');
            throw error;
        } finally {
            setValidating(false);
        }
    }, [selectedTache, loadTaches, showToast]);

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

    // --- DISTRIBUTIONS ---
    const handleToggleDistribution = useCallback(async (distributionId: number, currentStatus: StatusDistribution) => {
        if (!selectedTache || isClientView) return;

        const tacheId = selectedTache.id;
        const newStatus: StatusDistribution = currentStatus === 'REALISEE' ? 'NON_REALISEE' : 'REALISEE';

        // Optimistic update
        const updatedDistributions = selectedTache.distributions_charge?.map(d =>
            d.id === distributionId ? { ...d, status: newStatus } : d
        );

        setSelectedTache({ ...selectedTache, distributions_charge: updatedDistributions });
        setTaches(prev => prev.map(t =>
            t.id === tacheId ? { ...t, distributions_charge: updatedDistributions } : t
        ));

        try {
            if (newStatus === 'REALISEE') {
                await planningService.marquerDistributionRealisee(distributionId);
            } else {
                await planningService.marquerDistributionNonRealisee(distributionId);
            }
            await reloadSelectedTask(tacheId);
            await loadTaskDetails(tacheId);
            setDetailKey(prev => prev + 1);
        } catch (err) {
            // Rollback
            setSelectedTache({ ...selectedTache, distributions_charge: selectedTache.distributions_charge });
            setTaches(prev => prev.map(t =>
                t.id === tacheId ? { ...t, distributions_charge: selectedTache.distributions_charge } : t
            ));
            showToast('Erreur lors de la mise à jour de la distribution', 'error');
        }
    }, [selectedTache, isClientView, reloadSelectedTask, showToast]);

    const handleDeleteDistribution = useCallback(async (distributionId: number) => {
        if (!selectedTache) return;

        try {
            await planningService.deleteDistribution(distributionId);
            await reloadSelectedTask(selectedTache.id);
            await loadTaskDetails(selectedTache.id);
            setDetailKey(prev => prev + 1);
            showToast('Distribution supprimée avec succès', 'success');
        } catch (err: any) {
            console.error("Erreur lors de la suppression de la distribution:", err);
            showToast(err.message || 'Erreur lors de la suppression de la distribution', 'error');
        }
    }, [selectedTache, reloadSelectedTask, showToast]);

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
            await loadTaskDetails(selectedTache.id);
            setDetailKey(prev => prev + 1);
            showToast(`${newDays.length} distribution(s) ajoutée(s)`, 'success');
        } catch (err: any) {
            console.error("Erreur lors de l'ajout des distributions:", err);
            showToast(err.message || "Erreur lors de l'ajout des distributions", 'error');
        }
    }, [selectedTache, reloadSelectedTask, showToast]);

    // --- PHOTOS ---
    const handlePhotoUpload = useCallback(async (files: FileList, photoType: 'AVANT' | 'APRES') => {
        if (!selectedTache) return;

        setUploadingPhoto(true);
        try {
            for (const file of Array.from(files)) {
                await createPhoto({
                    fichier: file,
                    type_photo: photoType,
                    tache: selectedTache.id,
                    legende: file.name
                });
            }
            const updatedPhotos = await fetchPhotosParTache(selectedTache.id);
            setPhotos(updatedPhotos);
        } catch (error) {
            console.error("Erreur upload photo", error);
            showToast("Erreur lors de l'upload des photos", 'error');
        } finally {
            setUploadingPhoto(false);
        }
    }, [selectedTache, showToast]);

    const handleDeletePhoto = useCallback(async (photoId: number) => {
        try {
            await deletePhoto(photoId);
            setPhotos(prev => prev.filter(p => p.id !== photoId));
        } catch (error) {
            console.error("Erreur suppression photo", error);
            throw error;
        }
    }, []);

    // --- CONSOMMATIONS ---
    const handleAddConsommation = useCallback(async (data: { produit: number; quantite: number; unite: string; commentaire: string }) => {
        if (!selectedTache) return;

        try {
            await createConsommation({
                tache: selectedTache.id,
                produit: data.produit,
                quantite_utilisee: data.quantite,
                unite: data.unite,
                commentaire: data.commentaire
            });
            const updatedConsos = await fetchConsommationsParTache(selectedTache.id);
            setConsommations(updatedConsos);
        } catch (error) {
            console.error("Erreur ajout consommation", error);
            showToast("Erreur lors de l'ajout de la consommation", 'error');
        }
    }, [selectedTache, showToast]);

    const handleDeleteConsommation = useCallback(async (consoId: number) => {
        try {
            await deleteConsommation(consoId);
            setConsommations(prev => prev.filter(c => c.id !== consoId));
        } catch (error) {
            console.error("Erreur suppression consommation", error);
            throw error;
        }
    }, []);

    // --- FILTERS & PAGINATION ---
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

            // Filtre par plage de dates (date_debut_planifiee)
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

        // Loading states
        loadingTasks,
        loadingFilters,
        loadingPhotos,
        loadingConsommations,
        loadingTypesTaches,
        uploadingPhoto,
        changingStatut,
        validating,
        processingCloture,
        updatingTask,
        assigningEquipe,

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
