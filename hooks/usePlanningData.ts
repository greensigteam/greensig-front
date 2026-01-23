import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { useSearch } from '../contexts/SearchContext';
import { planningService } from '../services/planningService';
import { fetchEquipes, fetchStructures } from '../services/usersApi';
import { fetchCurrentUser, fetchAllSites, fetchInventory, SiteFrontend } from '../services/api';
import {
    Tache, TacheCreate, TacheUpdate, TypeTache,
    PlanningFilters, EMPTY_PLANNING_FILTERS,
    DistributionChargeEnriched,
    type StatusDistribution, type MotifDistribution,
    ALLOWED_DISTRIBUTION_TRANSITIONS
} from '../types/planning';
import { EquipeList, StructureClient } from '../types/users';
import { usePermissions } from './usePermissions';
import type { User, Role, SearchSuggestion } from '../types';
import type { InventoryObjectOption } from '../components/planning/TaskFormModal';

// ============================================================================
// TYPES
// ============================================================================

export interface PopoverInfo {
    tache: Tache;
    reference: any;
    eventStart?: Date;
    eventEnd?: Date;
    distributionStatus?: StatusDistribution;
    distributionId?: number;
}

export interface ToastState {
    message: string;
    visible: boolean;
    undoAction?: () => void;
}

export interface UsePlanningDataReturn {
    // Data
    taches: Tache[];
    filteredTaches: Tache[];
    equipes: EquipeList[];
    typesTaches: TypeTache[];
    sites: SiteFrontend[];
    structures: StructureClient[];

    // Loading states
    loading: boolean;
    error: string | null;

    // User & Permissions
    currentUser: User | null;
    isReadOnly: boolean;
    permissions: ReturnType<typeof usePermissions>;

    // Filters
    filters: PlanningFilters;
    setFilters: React.Dispatch<React.SetStateAction<PlanningFilters>>;
    showFilters: boolean;
    setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
    activeFiltersCount: number;

    // Popover
    popoverInfo: PopoverInfo | null;
    setPopoverInfo: React.Dispatch<React.SetStateAction<PopoverInfo | null>>;

    // Modals
    showCreateForm: boolean;
    setShowCreateForm: React.Dispatch<React.SetStateAction<boolean>>;
    tacheToDelete: number | null;
    setTacheToDelete: React.Dispatch<React.SetStateAction<number | null>>;
    distributionToDelete: number | null;
    setDistributionToDelete: React.Dispatch<React.SetStateAction<number | null>>;
    tacheToEdit: Tache | null;
    setTacheToEdit: React.Dispatch<React.SetStateAction<Tache | null>>;

    // Distribution action modals
    reporterModalDistribution: DistributionChargeEnriched | null;
    setReporterModalDistribution: React.Dispatch<React.SetStateAction<DistributionChargeEnriched | null>>;
    annulerModalDistribution: DistributionChargeEnriched | null;
    setAnnulerModalDistribution: React.Dispatch<React.SetStateAction<DistributionChargeEnriched | null>>;
    distributionActionLoading: boolean;

    // Quick Creator
    showQuickCreator: boolean;
    setShowQuickCreator: React.Dispatch<React.SetStateAction<boolean>>;
    quickCreatorDate: Date;
    setQuickCreatorDate: React.Dispatch<React.SetStateAction<Date>>;
    quickCreatorStartTime: string;
    setQuickCreatorStartTime: React.Dispatch<React.SetStateAction<string>>;
    quickCreatorEndTime: string;
    setQuickCreatorEndTime: React.Dispatch<React.SetStateAction<string>>;

    // Initial values for task form
    initialTaskValues: Partial<TacheCreate> | undefined;
    setInitialTaskValues: React.Dispatch<React.SetStateAction<Partial<TacheCreate> | undefined>>;
    preSelectedObjects: InventoryObjectOption[] | undefined;
    setPreSelectedObjects: React.Dispatch<React.SetStateAction<InventoryObjectOption[] | undefined>>;

    // Toast
    toast: ToastState;
    showToast: (message: string, undoAction?: () => void) => void;

    // Actions - CRUD
    loadTaches: () => Promise<void>;
    handleCreateTache: (data: TacheCreate) => Promise<void>;
    handleUpdateTache: (id: number, data: TacheUpdate) => Promise<void>;
    handleDeleteTache: () => Promise<void>;
    handleDeleteDistribution: () => Promise<void>;
    handleResetCharge: (tacheId: number) => Promise<void>;

    // Actions - Distribution Status (nouveau workflow)
    handleDistributionDemarrer: (distributionId: number) => Promise<void>;
    handleDistributionTerminer: (distributionId: number) => Promise<void>;
    handleDistributionReporter: (nouvelleDate: string, motif: MotifDistribution, commentaire: string) => Promise<void>;
    handleDistributionAnnuler: (motif: MotifDistribution, commentaire: string) => Promise<void>;
    handleDistributionRestaurer: (distributionId: number) => Promise<void>;
    canPerformDistributionAction: (currentStatus: StatusDistribution, targetStatus: StatusDistribution) => boolean;

    // Actions - Helpers
    handleLoadObjects: (siteId: number) => Promise<InventoryObjectOption[]>;
    handleCheckTaskTypeCompatibility: (objectTypes: string[]) => Promise<TypeTache[]>;

    // Calendar helpers
    tasksByDate: { [key: string]: Tache[] };
}

// ============================================================================
// HOOK
// ============================================================================

export function usePlanningData(): UsePlanningDataReturn {
    // Core data
    const [taches, setTaches] = useState<Tache[]>([]);
    const [equipes, setEquipes] = useState<EquipeList[]>([]);
    const [typesTaches, setTypesTaches] = useState<TypeTache[]>([]);
    const [sites, setSites] = useState<SiteFrontend[]>([]);
    const [structures, setStructures] = useState<StructureClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // User & Permissions
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const permissions = usePermissions(currentUser);

    // Filters
    const [filters, setFilters] = useState<PlanningFilters>(() => {
        const saved = localStorage.getItem('planning_filters');
        return saved ? JSON.parse(saved) : EMPTY_PLANNING_FILTERS;
    });
    const [showFilters, setShowFilters] = useState(false);

    // Popover
    const [popoverInfo, setPopoverInfo] = useState<PopoverInfo | null>(null);

    // Modals
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [tacheToDelete, setTacheToDelete] = useState<number | null>(null);
    const [distributionToDelete, setDistributionToDelete] = useState<number | null>(null);
    const [tacheToEdit, setTacheToEdit] = useState<Tache | null>(null);

    // Distribution action modals
    const [reporterModalDistribution, setReporterModalDistribution] = useState<DistributionChargeEnriched | null>(null);
    const [annulerModalDistribution, setAnnulerModalDistribution] = useState<DistributionChargeEnriched | null>(null);
    const [distributionActionLoading, setDistributionActionLoading] = useState(false);

    // Quick Creator
    const [showQuickCreator, setShowQuickCreator] = useState(false);
    const [quickCreatorDate, setQuickCreatorDate] = useState<Date>(new Date());
    const [quickCreatorStartTime, setQuickCreatorStartTime] = useState<string>('');
    const [quickCreatorEndTime, setQuickCreatorEndTime] = useState<string>('');

    // Initial values for task form
    const [initialTaskValues, setInitialTaskValues] = useState<Partial<TacheCreate> | undefined>(undefined);
    const [preSelectedObjects, setPreSelectedObjects] = useState<InventoryObjectOption[] | undefined>(undefined);

    // Toast
    const [toast, setToast] = useState<ToastState>({ message: '', visible: false });

    // Search context
    const { searchQuery, setPlaceholder, setSearchSuggestions } = useSearch();

    // ========================================================================
    // COMPUTED VALUES
    // ========================================================================

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.clientId !== null) count++;
        if (filters.siteId !== null) count++;
        if (filters.equipeId !== null) count++;
        if (filters.statuts.length > 0) count++;
        return count;
    }, [filters]);

    const filteredTaches = useMemo(() => {
        return taches.filter((t: Tache) => {
            const task = t as any;

            // 1. Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchesName = task.type_tache_detail.nom_tache.toLowerCase().includes(q);
                const matchesRef = task.reference?.toLowerCase().includes(q);
                const site_nom = task.site_nom || task.client_detail?.structure?.nom || task.client_detail?.nomStructure;
                const matchesSite = site_nom?.toLowerCase().includes(q);
                const matchesEquipes = task.equipes_detail?.some((e: any) =>
                    (e.nomEquipe || '').toLowerCase().includes(q)
                ) || task.equipe_detail?.nomEquipe?.toLowerCase().includes(q);

                if (!matchesName && !matchesRef && !matchesSite && !matchesEquipes) return false;
            }

            // 2. Client filter
            if (filters.clientId) {
                const tacheStructureId = task.structure_client_detail?.id;
                if (tacheStructureId !== filters.clientId) {
                    const siteIds = task.objets_detail?.map((obj: any) => obj.site_id || Number(obj.site)) || [];
                    if (task.site_id) siteIds.push(task.site_id);
                    const matchingSites = sites.filter(s =>
                        s.structure_client === filters.clientId && siteIds.includes(Number(s.id))
                    );
                    if (matchingSites.length === 0) return false;
                }
            }

            // 3. Site filter
            if (filters.siteId) {
                const hasSiteFromObjets = task.objets_detail?.some((obj: any) =>
                    (obj.site_id || Number(obj.site)) === Number(filters.siteId)
                );
                const hasSiteFromReclamation = task.site_id === Number(filters.siteId);
                if (!hasSiteFromObjets && !hasSiteFromReclamation) return false;
            }

            // 4. Equipe filter
            if (filters.equipeId) {
                const id_equipe = task.id_equipe;
                const inEquipes = task.equipes_detail?.some((e: any) => String(e.id) === String(filters.equipeId));
                if (!inEquipes && (!id_equipe || String(id_equipe) !== String(filters.equipeId))) return false;
            }

            // 5. Status filter
            if (filters.statuts.length > 0 && !filters.statuts.includes(task.statut)) return false;

            return true;
        });
    }, [taches, searchQuery, filters, sites]);

    // Group tasks by date for List View
    const tasksByDate = useMemo(() => {
        const groups: { [key: string]: Tache[] } = {};

        filteredTaches.forEach(t => {
            if (t.distributions_charge && t.distributions_charge.length > 0) {
                t.distributions_charge.forEach(dist => {
                    const dateKey = dist.date;
                    if (!groups[dateKey]) groups[dateKey] = [];
                    groups[dateKey].push(t);
                });
            } else {
                const dateKey = format(new Date(t.date_debut_planifiee), 'yyyy-MM-dd');
                if (!groups[dateKey]) groups[dateKey] = [];
                groups[dateKey].push(t);
            }
        });

        return groups;
    }, [filteredTaches]);

    // ========================================================================
    // EFFECTS
    // ========================================================================

    // Persist filters
    useEffect(() => {
        localStorage.setItem('planning_filters', JSON.stringify(filters));
    }, [filters]);

    // Update search placeholder
    useEffect(() => {
        setPlaceholder('Rechercher par nom, référence, équipe ou site...');
    }, [setPlaceholder]);

    // Auto-completion logic
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setSearchSuggestions([]);
            return;
        }

        const q = searchQuery.toLowerCase();
        const suggestions: SearchSuggestion[] = [];

        // Find matching tasks
        const matchingTaches = taches.filter(t =>
            t.type_tache_detail.nom_tache.toLowerCase().includes(q) ||
            t.reference?.toLowerCase().includes(q)
        ).slice(0, 5);

        matchingTaches.forEach(t => {
            suggestions.push({
                id: `task-${t.id}`,
                name: t.type_tache_detail.nom_tache,
                type: 'Tâche',
                subtitle: t.reference || undefined
            });
        });

        // Find matching sites
        const matchingSites = sites.filter(s => s.name.toLowerCase().includes(q)).slice(0, 3);
        matchingSites.forEach(s => {
            suggestions.push({
                id: `site-${s.id}`,
                name: s.name,
                type: 'Site'
            });
        });

        // Find matching teams
        const matchingEquipes = equipes.filter(e => e.nomEquipe.toLowerCase().includes(q)).slice(0, 3);
        matchingEquipes.forEach(e => {
            suggestions.push({
                id: `team-${e.id}`,
                name: e.nomEquipe,
                type: 'Équipe'
            });
        });

        setSearchSuggestions(suggestions);
    }, [searchQuery, taches, sites, equipes, setSearchSuggestions]);

    // Initial data load
    useEffect(() => {
        loadStableData();
        loadTaches();
    }, []);

    // ========================================================================
    // DATA LOADING
    // ========================================================================

    const loadStableData = async () => {
        try {
            setLoading(true);
            const [equipesData, typesData, userData, structuresRes] = await Promise.all([
                fetchEquipes().then(data => data.results || data),
                planningService.getTypesTaches(),
                fetchCurrentUser(),
                fetchStructures()
            ]);

            setEquipes(Array.isArray(equipesData) ? equipesData : []);
            setTypesTaches(typesData);

            const structuresArray = Array.isArray(structuresRes) ? structuresRes : (structuresRes.results || []);
            setStructures(structuresArray);

            const user: User = {
                id: String(userData.id),
                name: userData.nom || '',
                email: userData.email,
                role: (userData.roles?.[0] || 'CLIENT') as Role
            };
            setCurrentUser(user);

            const roles = userData.roles || [];
            setIsReadOnly(roles.includes('CLIENT'));

            // Load all sites
            fetchAllSites()
                .then(sitesArray => {
                    setSites(sitesArray.filter(s => s.actif));
                })
                .catch(err => {
                    console.error("Erreur chargement sites:", err);
                    setSites([]);
                });
        } catch (err) {
            console.error('Erreur chargement données:', err);
            setError('Erreur chargement données');
        } finally {
            setLoading(false);
        }
    };

    const loadTaches = useCallback(async () => {
        try {
            const tachesData = await planningService.getTaches();
            const tachesArray = tachesData.results || tachesData;
            setTaches(tachesArray);
        } catch (err) {
            console.error('Erreur chargement tâches:', err);
        }
    }, []);

    // ========================================================================
    // TOAST HELPER
    // ========================================================================

    const showToast = useCallback((message: string, undoAction?: () => void) => {
        setToast({ visible: true, message, undoAction });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
    }, []);

    // ========================================================================
    // CRUD OPERATIONS
    // ========================================================================

    const handleCreateTache = useCallback(async (data: TacheCreate) => {
        try {
            await planningService.createTache(data);
            await loadTaches();
            setShowCreateForm(false);
            showToast('Tâche créée avec succès');
        } catch (err) {
            console.error('Erreur création tâche:', err);
            throw err;
        }
    }, [loadTaches, showToast]);

    const handleUpdateTache = useCallback(async (id: number, data: TacheUpdate) => {
        try {
            await planningService.updateTache(id, data);
            await loadTaches();
            setTacheToEdit(null);
            setPopoverInfo(null);
            showToast('Tâche mise à jour avec succès');
        } catch (err) {
            console.error('Erreur mise à jour tâche:', err);
            throw err;
        }
    }, [loadTaches, showToast]);

    const handleDeleteTache = useCallback(async () => {
        if (!tacheToDelete) return;

        try {
            await planningService.deleteTache(tacheToDelete);
            await loadTaches();
            setTacheToDelete(null);
            setPopoverInfo(null);
            showToast('Tâche supprimée');
        } catch (err) {
            console.error('Erreur suppression tâche:', err);
            alert("Erreur lors de la suppression de la tâche");
        }
    }, [tacheToDelete, loadTaches, showToast]);

    const handleDeleteDistribution = useCallback(async () => {
        if (!distributionToDelete) return;

        try {
            await planningService.deleteDistribution(distributionToDelete);
            await loadTaches();
            setDistributionToDelete(null);
            showToast('Distribution supprimée avec succès');
        } catch (err) {
            console.error('Erreur suppression distribution:', err);
            alert("Erreur lors de la suppression de la distribution");
        }
    }, [distributionToDelete, loadTaches, showToast]);

    const handleResetCharge = useCallback(async (tacheId: number) => {
        try {
            await planningService.resetCharge(tacheId);
            await loadTaches();
        } catch (err) {
            alert('Erreur charge');
        }
    }, [loadTaches]);

    // ========================================================================
    // DISTRIBUTION STATUS OPERATIONS (Nouveau workflow complet)
    // ========================================================================

    const canPerformDistributionAction = useCallback((currentStatus: StatusDistribution, targetStatus: StatusDistribution): boolean => {
        return ALLOWED_DISTRIBUTION_TRANSITIONS[currentStatus]?.includes(targetStatus) || false;
    }, []);

    const handleDistributionDemarrer = useCallback(async (distributionId: number) => {
        setDistributionActionLoading(true);
        try {
            await planningService.demarrerDistribution(distributionId);
            await loadTaches();

            // Update popover if open
            if (popoverInfo && popoverInfo.distributionId === distributionId) {
                setPopoverInfo({ ...popoverInfo, distributionStatus: 'EN_COURS' });
            }

            showToast('Distribution démarrée');
        } catch (err: any) {
            console.error('Erreur démarrage distribution:', err);
            showToast(err.message || 'Erreur lors du démarrage');
        } finally {
            setDistributionActionLoading(false);
        }
    }, [popoverInfo, loadTaches, showToast]);

    const handleDistributionTerminer = useCallback(async (distributionId: number) => {
        setDistributionActionLoading(true);
        try {
            await planningService.terminerDistribution(distributionId);
            await loadTaches();

            // Update popover if open
            if (popoverInfo && popoverInfo.distributionId === distributionId) {
                setPopoverInfo({ ...popoverInfo, distributionStatus: 'REALISEE' });
            }

            showToast('Distribution terminée');
        } catch (err: any) {
            console.error('Erreur terminaison distribution:', err);
            showToast(err.message || 'Erreur lors de la terminaison');
        } finally {
            setDistributionActionLoading(false);
        }
    }, [popoverInfo, loadTaches, showToast]);

    const handleDistributionReporter = useCallback(async (nouvelleDate: string, motif: MotifDistribution, commentaire: string) => {
        if (!reporterModalDistribution) return;

        setDistributionActionLoading(true);
        try {
            await planningService.reporterDistribution(reporterModalDistribution.id, nouvelleDate, motif, commentaire);
            setReporterModalDistribution(null);
            setPopoverInfo(null);
            await loadTaches();
            showToast('Distribution reportée');
        } catch (err: any) {
            console.error('Erreur report distribution:', err);
            showToast(err.message || 'Erreur lors du report');
        } finally {
            setDistributionActionLoading(false);
        }
    }, [reporterModalDistribution, loadTaches, showToast]);

    const handleDistributionAnnuler = useCallback(async (motif: MotifDistribution, commentaire: string) => {
        if (!annulerModalDistribution) return;

        setDistributionActionLoading(true);
        try {
            await planningService.annulerDistribution(annulerModalDistribution.id, motif, commentaire);
            setAnnulerModalDistribution(null);
            setPopoverInfo(null);
            await loadTaches();
            showToast('Distribution annulée');
        } catch (err: any) {
            console.error('Erreur annulation distribution:', err);
            showToast(err.message || 'Erreur lors de l\'annulation');
        } finally {
            setDistributionActionLoading(false);
        }
    }, [annulerModalDistribution, loadTaches, showToast]);

    const handleDistributionRestaurer = useCallback(async (distributionId: number) => {
        setDistributionActionLoading(true);
        try {
            await planningService.restaurerDistribution(distributionId);
            await loadTaches();

            // Update popover if open
            if (popoverInfo && popoverInfo.distributionId === distributionId) {
                setPopoverInfo({ ...popoverInfo, distributionStatus: 'NON_REALISEE' });
            }

            showToast('Distribution restaurée');
        } catch (err: any) {
            console.error('Erreur restauration distribution:', err);
            showToast(err.message || 'Erreur lors de la restauration');
        } finally {
            setDistributionActionLoading(false);
        }
    }, [popoverInfo, loadTaches, showToast]);

    // ========================================================================
    // HELPERS
    // ========================================================================

    const handleLoadObjects = useCallback(async (siteId: number): Promise<InventoryObjectOption[]> => {
        try {
            const response = await fetchInventory({ page_size: 200, site: siteId });
            return response.results.map((item: any) => ({
                id: item.id ?? item.properties?.id,
                type: item.properties.object_type,
                nom: item.properties.nom || item.properties.famille || `${item.properties.object_type} #${item.id}`,
                site: item.properties.site_nom,
                soussite: item.properties.sous_site_nom,
                superficie: item.properties.superficie_calculee,
                etat: item.properties.etat,
                famille: item.properties.famille
            }));
        } catch (err) {
            console.error('Erreur chargement objets:', err);
            return [];
        }
    }, []);

    const handleCheckTaskTypeCompatibility = useCallback(async (objectTypes: string[]): Promise<TypeTache[]> => {
        try {
            const result = await planningService.getApplicableTypesTaches(objectTypes);
            return result.types_taches;
        } catch (err) {
            console.error('Erreur vérification compatibilité:', err);
            return typesTaches;
        }
    }, [typesTaches]);

    // ========================================================================
    // RETURN
    // ========================================================================

    return {
        // Data
        taches,
        filteredTaches,
        equipes,
        typesTaches,
        sites,
        structures,

        // Loading states
        loading,
        error,

        // User & Permissions
        currentUser,
        isReadOnly,
        permissions,

        // Filters
        filters,
        setFilters,
        showFilters,
        setShowFilters,
        activeFiltersCount,

        // Popover
        popoverInfo,
        setPopoverInfo,

        // Modals
        showCreateForm,
        setShowCreateForm,
        tacheToDelete,
        setTacheToDelete,
        distributionToDelete,
        setDistributionToDelete,
        tacheToEdit,
        setTacheToEdit,

        // Distribution action modals
        reporterModalDistribution,
        setReporterModalDistribution,
        annulerModalDistribution,
        setAnnulerModalDistribution,
        distributionActionLoading,

        // Quick Creator
        showQuickCreator,
        setShowQuickCreator,
        quickCreatorDate,
        setQuickCreatorDate,
        quickCreatorStartTime,
        setQuickCreatorStartTime,
        quickCreatorEndTime,
        setQuickCreatorEndTime,

        // Initial values for task form
        initialTaskValues,
        setInitialTaskValues,
        preSelectedObjects,
        setPreSelectedObjects,

        // Toast
        toast,
        showToast,

        // Actions - CRUD
        loadTaches,
        handleCreateTache,
        handleUpdateTache,
        handleDeleteTache,
        handleDeleteDistribution,
        handleResetCharge,

        // Actions - Distribution Status (nouveau workflow)
        handleDistributionDemarrer,
        handleDistributionTerminer,
        handleDistributionReporter,
        handleDistributionAnnuler,
        handleDistributionRestaurer,
        canPerformDistributionAction,

        // Actions - Helpers
        handleLoadObjects,
        handleCheckTaskTypeCompatibility,

        // Calendar helpers
        tasksByDate,
    };
}

export default usePlanningData;
