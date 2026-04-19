import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useSearch } from '../contexts/SearchContext';
import { useToast } from '../contexts/ToastContext';
import { planningService } from '../services/planningService';
import { fetchInventory, SiteFrontend } from '../services/api';
import {
  Tache,
  TacheCreate,
  TacheUpdate,
  TypeTache,
  PlanningFilters,
  EMPTY_PLANNING_FILTERS,
  DistributionChargeEnriched,
  type StatusDistribution,
  type MotifDistribution,
} from '../types/planning';
import { EquipeList, StructureClient } from '../types/users';
import { usePermissions } from './usePermissions';
import {
  useTaches,
  useTypesTaches,
  useEquipes,
  useSites,
  useStructures,
  useCurrentUser,
} from './queries';
import { queryKeys, invalidateResource } from '../lib/queryKeys';
import { getEquipeName } from '../utils/equipeHelpers';
import { usePlanningDistributionActions } from './usePlanningDistributionActions';
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
  setReporterModalDistribution: React.Dispatch<
    React.SetStateAction<DistributionChargeEnriched | null>
  >;
  annulerModalDistribution: DistributionChargeEnriched | null;
  setAnnulerModalDistribution: React.Dispatch<
    React.SetStateAction<DistributionChargeEnriched | null>
  >;
  terminerModalDistribution: DistributionChargeEnriched | null;
  setTerminerModalDistribution: React.Dispatch<
    React.SetStateAction<DistributionChargeEnriched | null>
  >;
  demarrerModalDistribution: DistributionChargeEnriched | null;
  setDemarrerModalDistribution: React.Dispatch<
    React.SetStateAction<DistributionChargeEnriched | null>
  >;
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

  // Toast (global ToastContext)
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;

  // Actions - CRUD
  loadTaches: () => Promise<void>;
  handleCreateTache: (data: TacheCreate) => Promise<void>;
  handleUpdateTache: (id: number, data: TacheUpdate) => Promise<void>;
  handleDeleteTache: () => Promise<void>;
  handleDeleteDistribution: () => Promise<void>;
  handleResetCharge: (tacheId: number) => Promise<void>;

  // Actions - Distribution Status (nouveau workflow)
  handleDistributionDemarrer: (distributionId: number) => void;
  handleDistributionDemarrerConfirm: (data: { heure_debut_reelle?: string }) => Promise<void>;
  handleDistributionTerminer: (distributionId: number) => void;
  handleDistributionTerminerConfirm: (data: {
    heure_debut_reelle?: string;
    heure_fin_reelle?: string;
    heures_reelles?: number;
  }) => Promise<void>;
  handleDistributionReporter: (
    nouvelleDate: string,
    motif: MotifDistribution,
    commentaire: string,
  ) => Promise<void>;
  handleDistributionAnnuler: (motif: MotifDistribution, commentaire: string) => Promise<void>;
  handleDistributionRestaurer: (distributionId: number) => Promise<void>;
  restorePopover: () => void;
  canPerformDistributionAction: (
    currentStatus: StatusDistribution,
    targetStatus: StatusDistribution,
  ) => boolean;

  // Actions - Helpers
  handleLoadObjects: (siteId: number) => Promise<InventoryObjectOption[]>;
  handleCheckTaskTypeCompatibility: (objectTypes: string[]) => Promise<TypeTache[]>;

  // Calendar helpers
  tasksByDate: { [key: string]: Tache[] };

  // Fenêtre de navigation Gantt (pilote la requête serveur quand aucun filtre de date n'est actif)
  setCalendarWindow: (window: { start: string; end: string } | null) => void;
}

// ============================================================================
// STABLE EMPTY ARRAYS (module-level constants)
// Prevent useEffect infinite loops: `data = []` in destructuring creates a new
// array reference every render when data is undefined (loading state).
// Object.is([], []) === false → React never bails out → infinite loop.
// Using module-level constants ensures a stable reference during loading.
// ============================================================================

const EMPTY_TACHES: Tache[] = [];
const EMPTY_EQUIPES: EquipeList[] = [];
const EMPTY_SITES: SiteFrontend[] = [];

// ============================================================================
// HOOK
// ============================================================================

const PLANNING_FILTERS_STORAGE_PREFIX = 'planning_filters';

function getPlanningFiltersKey(userId: string | null): string {
  return userId ? `${PLANNING_FILTERS_STORAGE_PREFIX}_${userId}` : PLANNING_FILTERS_STORAGE_PREFIX;
}

export function usePlanningData(): UsePlanningDataReturn {
  const queryClient = useQueryClient();

  // Filters — initialisés en premier pour piloter la fenêtre de dates de useTaches.
  // Clé localStorage anonyme à l'init, re-synchronisée avec l'user id dès que disponible.
  const [filters, setFilters] = useState<PlanningFilters>(() => {
    const saved = localStorage.getItem(PLANNING_FILTERS_STORAGE_PREFIX);
    return saved ? { ...EMPTY_PLANNING_FILTERS, ...JSON.parse(saved) } : EMPTY_PLANNING_FILTERS;
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fenêtre de navigation Gantt (mise à jour par Planning.tsx quand l'utilisateur change de mois)
  const [calendarWindow, setCalendarWindow] = useState<{ start: string; end: string } | null>(null);

  // React Query hooks for data
  // Priorité : filtre utilisateur > fenêtre Gantt > fenêtre par défaut (-30/+90j)
  const {
    data: tachesData,
    isLoading: tachesLoading,
    error: tachesError,
  } = useTaches({
    dateDebut: filters.dateDebut ?? calendarWindow?.start ?? undefined,
    dateFin: filters.dateFin ?? calendarWindow?.end ?? undefined,
  });
  const { data: typesTaches = [], isLoading: refLoading } = useTypesTaches();
  const { data: equipesData } = useEquipes();
  const { data: sitesData } = useSites();
  const { data: structures = [] } = useStructures();

  // Use stable references during loading to avoid useEffect dependency churn
  const taches = tachesData ?? EMPTY_TACHES;
  const equipes = equipesData ?? EMPTY_EQUIPES;
  const sites = sitesData ?? EMPTY_SITES;
  const { data: userData } = useCurrentUser();

  // Derive currentUser and isReadOnly from userData
  const currentUser: User | null = useMemo(() => {
    if (!userData) return null;
    return {
      id: String(userData.id),
      name: userData.nom || '',
      email: userData.email,
      role: (userData.roles?.[0] || 'CLIENT') as Role,
    };
  }, [userData]);

  const isReadOnly = userData?.roles?.includes('CLIENT') ?? false;

  // Derived loading and error states
  const loading = tachesLoading || refLoading;
  const error = tachesError ? (tachesError as Error).message : null;

  // Permissions
  const permissions = usePermissions(currentUser);

  // Popover
  const [popoverInfo, setPopoverInfo] = useState<PopoverInfo | null>(null);

  // Toast (global)
  const { showToast } = useToast();

  // Modals
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tacheToDelete, setTacheToDelete] = useState<number | null>(null);
  const [distributionToDelete, setDistributionToDelete] = useState<number | null>(null);
  const [tacheToEdit, setTacheToEdit] = useState<Tache | null>(null);

  // Distribution action modals + handlers (extracted hook)
  const distributionActions = usePlanningDistributionActions({
    popoverInfo,
    setPopoverInfo,
    showToast,
  });

  // Quick Creator
  const [showQuickCreator, setShowQuickCreator] = useState(false);
  const [quickCreatorDate, setQuickCreatorDate] = useState<Date>(new Date());
  const [quickCreatorStartTime, setQuickCreatorStartTime] = useState<string>('');
  const [quickCreatorEndTime, setQuickCreatorEndTime] = useState<string>('');

  // Initial values for task form
  const [initialTaskValues, setInitialTaskValues] = useState<Partial<TacheCreate> | undefined>(
    undefined,
  );
  const [preSelectedObjects, setPreSelectedObjects] = useState<InventoryObjectOption[] | undefined>(
    undefined,
  );

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
    if (filters.dateDebut !== null || filters.dateFin !== null) count++;
    return count;
  }, [filters]);

  const STATUS_ORDER: Record<string, number> = {
    EN_COURS: 0,
    PLANIFIEE: 1,
    TERMINEE: 2,
    ANNULEE: 3,
  };

  const filteredTaches = useMemo(() => {
    const result = taches.filter((task: Tache) => {
      // Champs côté API non encore typés dans `Tache` mais utilisés ici.
      const taskExtras = task as Tache & {
        reference?: string;
        client_detail?: { structure?: { nom?: string }; nomStructure?: string } | null;
        id_type_tache?: number;
      };

      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = task.type_tache_detail.nom_tache.toLowerCase().includes(q);
        const matchesRef = taskExtras.reference?.toLowerCase().includes(q);
        const site_nom =
          task.site_nom ||
          taskExtras.client_detail?.structure?.nom ||
          taskExtras.client_detail?.nomStructure;
        const matchesSite = site_nom?.toLowerCase().includes(q);
        const matchesEquipes =
          task.equipes_detail?.some((e) => getEquipeName(e, '').toLowerCase().includes(q)) ||
          (task.equipe_detail && getEquipeName(task.equipe_detail, '').toLowerCase().includes(q));

        if (!matchesName && !matchesRef && !matchesSite && !matchesEquipes) return false;
      }

      // 2. Client filter
      if (filters.clientId) {
        const tacheStructureId = task.structure_client_detail?.id;
        if (tacheStructureId !== filters.clientId) {
          const siteIds = task.objets_detail?.map((obj) => Number(obj.site_id ?? obj.site)) || [];
          if (task.site_id) siteIds.push(task.site_id);
          const matchingSites = sites.filter(
            (s) => s.structure_client === filters.clientId && siteIds.includes(Number(s.id)),
          );
          if (matchingSites.length === 0) return false;
        }
      }

      // 3. Site filter
      if (filters.siteId) {
        const hasSiteFromObjets = task.objets_detail?.some(
          (obj) => Number(obj.site_id ?? obj.site) === Number(filters.siteId),
        );
        const hasSiteFromReclamation = task.site_id === Number(filters.siteId);
        if (!hasSiteFromObjets && !hasSiteFromReclamation) return false;
      }

      // 4. Equipe filter
      if (filters.equipeId) {
        const inEquipes = task.equipes_detail?.some(
          (e) => String(e.id) === String(filters.equipeId),
        );
        if (!inEquipes) return false;
      }

      // 5. Status filter
      if (filters.statuts.length > 0 && !filters.statuts.includes(task.statut)) return false;

      // 6. Type de tâche filter (== null couvre null ET undefined pour robustesse)
      if (filters.typeTacheId != null && taskExtras.id_type_tache !== filters.typeTacheId)
        return false;

      return true;
    });

    return result.sort((a, b) => {
      // 1. Statut : EN_COURS → PLANIFIEE → TERMINEE → ANNULEE
      const sA = STATUS_ORDER[a.statut] ?? 99;
      const sB = STATUS_ORDER[b.statut] ?? 99;
      if (sA !== sB) return sA - sB;

      // 2. Priorité décroissante
      const pDiff = (b.priorite ?? 0) - (a.priorite ?? 0);
      if (pDiff !== 0) return pDiff;

      // 3. Date de début planifiée croissante
      return (a.date_debut_planifiee ?? '').localeCompare(b.date_debut_planifiee ?? '');
    });
  }, [taches, searchQuery, filters, sites]);

  // Group tasks by date for List View
  const tasksByDate = useMemo(() => {
    const groups: { [key: string]: Tache[] } = {};

    filteredTaches.forEach((t) => {
      if (t.distributions_charge && t.distributions_charge.length > 0) {
        t.distributions_charge.forEach((dist) => {
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

  // Persist filters — scopé par user pour éviter qu'un client hérite des filtres d'un admin
  // sur un poste partagé. Nettoie aussi la clé globale legacy au premier login.
  useEffect(() => {
    const key = getPlanningFiltersKey(currentUser?.id ?? null);
    localStorage.setItem(key, JSON.stringify(filters));
    if (currentUser?.id && localStorage.getItem(PLANNING_FILTERS_STORAGE_PREFIX)) {
      localStorage.removeItem(PLANNING_FILTERS_STORAGE_PREFIX);
    }
  }, [filters, currentUser?.id]);

  // Charger les filtres spécifiques à l'user une fois connecté (override la valeur d'init anonyme)
  useEffect(() => {
    if (!currentUser?.id) return;
    const saved = localStorage.getItem(getPlanningFiltersKey(currentUser.id));
    if (saved) {
      try {
        setFilters({ ...EMPTY_PLANNING_FILTERS, ...JSON.parse(saved) });
      } catch {
        // JSON corrompu — on garde les filtres courants
      }
    }
  }, [currentUser?.id]);

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
    const matchingTaches = taches
      .filter(
        (t) =>
          t.type_tache_detail.nom_tache.toLowerCase().includes(q) ||
          t.reference?.toLowerCase().includes(q),
      )
      .slice(0, 5);

    matchingTaches.forEach((t) => {
      suggestions.push({
        id: `task-${t.id}`,
        name: t.type_tache_detail.nom_tache,
        type: 'Tâche',
        subtitle: t.reference || undefined,
      });
    });

    // Find matching sites
    const matchingSites = sites.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 3);
    matchingSites.forEach((s) => {
      suggestions.push({
        id: `site-${s.id}`,
        name: s.name,
        type: 'Site',
      });
    });

    // Find matching teams
    const matchingEquipes = equipes
      .filter((e) => e.nomEquipe.toLowerCase().includes(q))
      .slice(0, 3);
    matchingEquipes.forEach((e) => {
      suggestions.push({
        id: `team-${e.id}`,
        name: e.nomEquipe,
        type: 'Équipe',
      });
    });

    setSearchSuggestions(suggestions);
  }, [searchQuery, taches, sites, equipes, setSearchSuggestions]);

  // React Query loads data automatically on mount — no useEffect needed

  // Invalidation function (replaces loadTaches, same signature for compatibility)
  const loadTaches = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.taches.lists() });
  }, [queryClient]);

  // ========================================================================
  // CRUD OPERATIONS
  // ========================================================================

  const handleCreateTache = useCallback(
    async (data: TacheCreate) => {
      try {
        await planningService.createTache(data);
        queryClient.invalidateQueries({ queryKey: queryKeys.taches.lists() });
        setShowCreateForm(false);
        showToast('Tâche créée avec succès', 'success');
      } catch (err: any) {
        showToast(err.message || 'Erreur lors de la création de la tâche', 'error');
        throw err;
      }
    },
    [queryClient, showToast],
  );

  const handleUpdateTache = useCallback(
    async (id: number, data: TacheUpdate) => {
      try {
        const updatedTache = await planningService.updateTache(id, data);
        queryClient.setQueryData(queryKeys.taches.detail(id), updatedTache);
        invalidateResource(queryClient, 'taches', id);
        setTacheToEdit(null);
        setPopoverInfo(null);
        showToast('Tâche mise à jour avec succès', 'success');
      } catch (err: any) {
        showToast(err.message || 'Erreur lors de la mise à jour de la tâche', 'error');
        throw err;
      }
    },
    [queryClient, showToast],
  );

  const handleDeleteTache = useCallback(async () => {
    if (!tacheToDelete) return;

    try {
      await planningService.deleteTache(tacheToDelete);
      queryClient.removeQueries({ queryKey: queryKeys.taches.detail(tacheToDelete) });
      queryClient.invalidateQueries({ queryKey: queryKeys.taches.lists() });
      setTacheToDelete(null);
      setPopoverInfo(null);
      showToast('Tâche supprimée', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la suppression de la tâche', 'error');
    }
  }, [tacheToDelete, queryClient, showToast]);

  const handleDeleteDistribution = useCallback(async () => {
    if (!distributionToDelete) return;

    try {
      await planningService.deleteDistribution(distributionToDelete);
      queryClient.invalidateQueries({ queryKey: queryKeys.taches.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.distributions.all });
      setDistributionToDelete(null);
      showToast('Distribution supprimée avec succès', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la suppression de la distribution', 'error');
    }
  }, [distributionToDelete, queryClient, showToast]);

  const handleResetCharge = useCallback(
    async (tacheId: number) => {
      try {
        await planningService.resetCharge(tacheId);
        await queryClient.invalidateQueries({ queryKey: queryKeys.taches.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.taches.detail(tacheId) });
        showToast('Charge recalculée', 'success');
      } catch (err: any) {
        showToast(err.message || 'Erreur lors du recalcul de la charge', 'error');
      }
    },
    [queryClient, showToast],
  );

  // Distribution status operations are in usePlanningDistributionActions hook (see above)

  // ========================================================================
  // HELPERS
  // ========================================================================

  const handleLoadObjects = useCallback(
    async (siteId: number): Promise<InventoryObjectOption[]> => {
      const MAX_PAGES = 50;
      const PAGE_SIZE = 500;
      try {
        const allObjects: InventoryObjectOption[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const response = await fetchInventory({ page_size: PAGE_SIZE, page, site: siteId });

          const pageObjects = response.results.map((item: any) => ({
            id: item.id ?? item.properties?.id,
            type: item.properties.object_type,
            nom:
              item.properties.nom ||
              item.properties.famille ||
              `${item.properties.object_type} #${item.id}`,
            site: item.properties.site_nom,
            soussite: item.properties.sous_site_nom,
            superficie: item.properties.superficie_calculee,
            etat: item.properties.etat,
            famille: item.properties.famille,
          }));

          allObjects.push(...pageObjects);

          hasMore = response.next !== null;
          page++;

          // Garde-fou : si on atteint la limite, on prévient l'utilisateur au lieu d'ignorer silencieusement
          // les objets suivants (bug historique : inventaires tronqués sans feedback).
          if (page > MAX_PAGES) {
            console.warn(
              `[handleLoadObjects] Reached page limit (${MAX_PAGES}), stopping pagination`,
            );
            showToast(
              `Ce site contient plus de ${MAX_PAGES * PAGE_SIZE} objets. Seuls les ${allObjects.length} premiers sont affichés. Affinez les filtres pour voir le reste.`,
              'warning',
            );
            break;
          }
        }

        return allObjects;
      } catch (err) {
        showToast('Erreur lors du chargement des objets du site', 'error');
        return [];
      }
    },
    [showToast],
  );

  const handleCheckTaskTypeCompatibility = useCallback(
    async (objectTypes: string[]): Promise<TypeTache[]> => {
      try {
        const result = await planningService.getApplicableTypesTaches(objectTypes);
        return result.types_taches;
      } catch (err) {
        showToast('Erreur lors de la vérification de compatibilité', 'error');
        return typesTaches;
      }
    },
    [typesTaches],
  );

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

    // Distribution action modals (from extracted hook)
    ...distributionActions,

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

    // Toast (global ToastContext)
    showToast,

    // Actions - CRUD
    loadTaches,
    handleCreateTache,
    handleUpdateTache,
    handleDeleteTache,
    handleDeleteDistribution,
    handleResetCharge,

    // Actions - Distribution Status (from extracted hook, already spread above)

    // Actions - Helpers
    handleLoadObjects,
    handleCheckTaskTypeCompatibility,

    // Calendar helpers
    tasksByDate,
    setCalendarWindow,
  };
}

export default usePlanningData;
