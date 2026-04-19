import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, AlertCircle } from 'lucide-react';
import { InventoryToolbar, TypeFilterTabs } from '../components/inventory/InventoryToolbar';
import { DataTable } from '../components/DataTable';
import type { InventoryItem } from '../types/inventory';
import {
  fetchInventory,
  ApiError,
  type InventoryResponse,
  fetchAllSites,
  type SiteFrontend,
  fetchFilterOptions,
  fetchInventorySelectIds,
  bulkDeleteInventory,
} from '../services/api';
import { planningService } from '../services/planningService';
import TaskFormModal, { InventoryObjectOption } from '../components/planning/TaskFormModal';
import { useToast } from '../contexts/ToastContext';
import { useSearch } from '../contexts/SearchContext';
import { usePermissions } from '../hooks/usePermissions';
import { getColumnsForType } from '../config/inventoryColumns';
import { useDebounce } from '../hooks/useDebounce';
import { useInventoryExport } from '../hooks/useInventoryExport';
import { useInventoryTaskSubmit } from '../hooks/useInventoryTaskSubmit';
import { saveToSession, loadFromSession } from '../utils/sessionStorage';
import {
  InventoryFilters,
  type InventoryFilterValues,
} from '../components/inventory/InventoryFilters';
import { SelectionActionBar } from '../components/inventory/SelectionActionBar';
import LoadingScreen from '../components/LoadingScreen';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import { User } from '../types';

interface InventoryProps {
  user: User;
}

// Types de végétation et hydrologie pour les filtres
const VEGETATION_TYPES = ['Arbre', 'Palmier', 'Gazon', 'Arbuste', 'Vivace', 'Cactus', 'Graminee'];
const HYDROLOGY_TYPES = [
  'Puit',
  'Pompe',
  'Vanne',
  'Clapet',
  'Canalisation',
  'Aspersion',
  'Goutte',
  'Ballon',
];

// Interface for cached selected item data
interface SelectedItemData {
  id: string;
  type: string;
  name: string;
  siteId: string;
  zone?: string;
  code?: string;
  state: string;
  coordinates?: { lat: number; lng: number };
}

const STORAGE_KEYS = {
  FILTERS: 'inventory_filters',
  MAIN_TAB: 'inventory_main_tab',
  CURRENT_PAGE: 'inventory_current_page',
  SHOW_FILTERS: 'inventory_show_filters',
};

// Main Inventory Component
const Inventory: React.FC<InventoryProps> = ({ user }) => {
  const navigate = useNavigate();
  const permissions = usePermissions(user);
  const { showToast } = useToast();
  const { searchQuery, setSearchQuery, setPlaceholder } = useSearch();

  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // ✅ Restore main tab from sessionStorage
  const [mainTab, setMainTab] = useState<'tous' | 'vegetation' | 'hydraulique'>(
    loadFromSession(STORAGE_KEYS.MAIN_TAB, 'tous'),
  );

  // Selection state for creating tasks
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Cache for selected items data (persists across page changes)
  const [selectedItemsCache, setSelectedItemsCache] = useState<Map<string, SelectedItemData>>(
    new Map(),
  );

  // "Select all results across all pages" mode
  const [, setSelectAllResults] = useState(false);
  const [selectAllLoading, setSelectAllLoading] = useState(false);

  // Task type compatibility state
  const [isTaskCompatible, setIsTaskCompatible] = useState(true);
  const [compatibilityLoading, setCompatibilityLoading] = useState(false);
  const [applicableTasksCount, setApplicableTasksCount] = useState<number | null>(null);

  // Bulk delete state
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // ✅ Advanced Filters - Restore from sessionStorage
  const EMPTY_FILTERS: InventoryFilterValues = {
    type: 'all',
    state: 'all',
    site: 'all',
    intervention: 'all',
    family: 'all',
    dateCreationFrom: '',
    dateCreationTo: '',
  };
  const [filters, setFilters] = useState({
    ...EMPTY_FILTERS,
    ...loadFromSession(STORAGE_KEYS.FILTERS, EMPTY_FILTERS),
  });
  const [showFilters, setShowFilters] = useState(loadFromSession(STORAGE_KEYS.SHOW_FILTERS, false));
  const [families, setFamilies] = useState<string[]>([]); // État pour stocker la liste des familles

  // API State
  const [apiInventory, setApiInventory] = useState<InventoryResponse | null>(null);
  const [isLoadingAPI, setIsLoadingAPI] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Sites fetched from backend (replace MOCK_SITES)
  const [sites, setSites] = useState<SiteFrontend[]>([]);

  // Clear selection helper (shared with hooks)
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectedItemsCache(new Map());
    setSelectAllResults(false);
  }, []);

  // Task creation hook
  const {
    showTaskModal,
    setShowTaskModal,
    modalLoading,
    isSubmitting,
    modalEquipes,
    modalTypesTaches,
    handleOpenTaskModal,
    handleTaskSubmit,
  } = useInventoryTaskSubmit({ selectedItemsCache, onClearSelection: clearSelection });

  // Export hook
  const { handleExportExcel, handlePrint } = useInventoryExport({
    mainTab,
    filters,
    searchQuery,
    selectedItemsCache,
  });

  useEffect(() => {
    setPlaceholder("Rechercher dans l'inventaire...");
    return () => {
      setPlaceholder('Rechercher...');
      setSearchQuery('');
    };
  }, [setPlaceholder, setSearchQuery]);

  useEffect(() => {
    let mounted = true;

    // Charger les sites
    const loadSites = async () => {
      try {
        const s = await fetchAllSites();
        if (mounted) setSites(s);
      } catch (err) {
        if (mounted) showToast('Erreur lors du chargement des sites', 'error');
      }
    };

    // Charger les familles
    const loadFamilies = async () => {
      try {
        const options = await fetchFilterOptions();
        if (mounted && options.families) {
          setFamilies(options.families);
        }
      } catch (err) {
        if (mounted) showToast('Erreur lors du chargement des familles', 'error');
      }
    };

    loadSites();
    loadFamilies();
    return () => {
      mounted = false;
    };
  }, [showToast]);

  // ✅ Current page for pagination - Restore from sessionStorage
  const [currentPage, setCurrentPage] = useState(loadFromSession(STORAGE_KEYS.CURRENT_PAGE, 1));

  // ✅ Track first mount to avoid resetting restored state
  const isFirstMount = useRef(true);

  // ✅ Save state to sessionStorage when it changes
  useEffect(() => {
    saveToSession(STORAGE_KEYS.MAIN_TAB, mainTab);
  }, [mainTab]);

  useEffect(() => {
    saveToSession(STORAGE_KEYS.FILTERS, filters);
  }, [filters]);

  useEffect(() => {
    saveToSession(STORAGE_KEYS.CURRENT_PAGE, currentPage);
  }, [currentPage]);

  useEffect(() => {
    saveToSession(STORAGE_KEYS.SHOW_FILTERS, showFilters);
  }, [showFilters]);

  // Reset page when switching tabs (but not on first mount - to preserve restored state)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setCurrentPage(1);
    setFilters({
      type: 'all',
      state: 'all',
      site: 'all',
      intervention: 'all',
      family: 'all',
      dateCreationFrom: '',
      dateCreationTo: '',
    });
  }, [mainTab]);

  // Fetch inventory from API on mount and when filters change
  useEffect(() => {
    const controller = new AbortController();

    const loadInventory = async () => {
      setIsLoadingAPI(true);
      setApiError(null);
      try {
        const apiFilters: Record<string, string | number> = {
          page: currentPage,
          page_size: 20,
        };

        // Apply type filter based on active tab and selected filter
        // New logic: only add filter if not 'all'
        if (mainTab === 'vegetation') {
          if (filters.type !== 'all') {
            apiFilters.type = filters.type;
          } else {
            apiFilters.type = VEGETATION_TYPES.join(',');
          }
        } else if (mainTab === 'hydraulique') {
          if (filters.type !== 'all') {
            apiFilters.type = filters.type;
          } else {
            apiFilters.type = HYDROLOGY_TYPES.join(',');
          }
        } else if (mainTab === 'tous') {
          if (filters.type !== 'all') {
            apiFilters.type = filters.type;
          } else {
            // If 'tous' tab and no specific filter, send all types
            apiFilters.type = [...VEGETATION_TYPES, ...HYDROLOGY_TYPES].join(',');
          }
        }

        // Site filter
        if (filters.site !== 'all') {
          apiFilters.site = parseInt(filters.site as string);
        }

        // State filter
        if (filters.state !== 'all') {
          apiFilters.etat = filters.state;
        }

        // Maintenance filters
        if (filters.intervention !== 'all') {
          if (filters.intervention === 'urgent') {
            apiFilters.urgent_maintenance = 'true';
          } else if (filters.intervention === 'never') {
            apiFilters.never_intervened = 'true';
          } else if (filters.intervention === 'recent_30') {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            apiFilters.last_intervention_start = d.toISOString().split('T')[0] || '';
          }
        }

        // Family filter
        if (filters.family !== 'all') {
          apiFilters.famille = filters.family;
        }

        // Date création filters
        if (filters.dateCreationFrom) {
          apiFilters.date_creation__gte = filters.dateCreationFrom;
        }
        if (filters.dateCreationTo) {
          apiFilters.date_creation__lte = filters.dateCreationTo;
        }

        // Search filter
        if (debouncedSearchQuery.trim()) {
          apiFilters.search = debouncedSearchQuery.trim();
        }

        const data = await fetchInventory(apiFilters, controller.signal);
        setApiInventory(data);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setApiError(error instanceof ApiError ? error.message : 'Erreur de chargement');
        showToast("Erreur lors du chargement de l'inventaire", 'error');
      } finally {
        setIsLoadingAPI(false);
      }
    };

    loadInventory();
    return () => controller.abort();
  }, [mainTab, currentPage, filters, debouncedSearchQuery, refreshCounter, showToast]);

  // Transform API data to InventoryItem format
  const inventoryData = useMemo((): InventoryItem[] => {
    if (!apiInventory?.results) return [];

    return apiInventory.results.map((feature) => {
      const props = feature.properties;
      const coords = (feature.geometry.type === 'Point'
        ? (feature.geometry.coordinates as number[])
        : feature.geometry.type === 'Polygon'
          ? (feature.geometry.coordinates as number[][][])[0]?.[0]
          : [0, 0]) ?? [0, 0];

      // Map object_type to InventoryItem type
      const typeMapping: Record<string, InventoryItem['type']> = {
        Arbre: 'arbre',
        Palmier: 'palmier',
        Gazon: 'gazon',
        Arbuste: 'arbuste',
        Vivace: 'vivace',
        Cactus: 'cactus',
        Graminee: 'graminee', // ✅ Sans accent pour cohérence
        Puit: 'puit',
        Pompe: 'pompe',
        Vanne: 'vanne',
        Clapet: 'clapet',
        Canalisation: 'canalisation',
        Aspersion: 'aspersion',
        Goutte: 'goutte',
        Ballon: 'ballon',
      };

      const featureId = feature.id ?? props.id ?? 0;

      // Try to map returned site name to a known site id (if sites were loaded)
      const matchedSite = sites.find(
        (s) =>
          s.name && props.site_nom && s.name.toLowerCase() === String(props.site_nom).toLowerCase(),
      );

      return {
        id: featureId.toString(),
        type: typeMapping[props.object_type] || 'equipement',
        code: props.code || `${props.object_type}-${featureId}`,
        name: props.nom || props.marque || `${props.object_type} ${featureId}`,
        siteId: matchedSite ? matchedSite.id : props.site_nom || 'unknown',
        zone: props.sous_site_nom || props.site_nom || 'Non définie',
        state: (props.etat || 'bon') as 'bon' | 'moyen' | 'mauvais' | 'critique',
        species: props.famille || undefined,
        height: props.hauteur || props.taille || props.profondeur || undefined,
        diameter: props.diametre ?? props.densite ?? undefined,
        surface: props.superficie_calculee || undefined,
        coordinates: {
          lat: coords[1] || 0,
          lng: coords[0] || 0,
        },
        lastIntervention: props.last_intervention_date || undefined,
        photos: [],
      };
    });
  }, [apiInventory, sites]);

  // Get the set of IDs currently visible in inventoryData
  const visibleIds = useMemo(() => {
    return new Set(inventoryData.map((item) => item.id));
  }, [inventoryData]);

  // Detect when all items on current page are selected (to show "select all results" banner)
  const totalCount = apiInventory?.count ?? 0;
  const isAllCurrentPageSelected =
    visibleIds.size > 0 && [...visibleIds].every((id) => selectedIds.has(id));
  const showSelectAllBanner = isAllCurrentPageSelected && totalCount > visibleIds.size;

  // Custom selection handler that maintains the cache across filter changes
  const handleSelectionChange = useCallback(
    (newSelectedIds: Set<string>) => {
      // Exiting "select all results" mode: user is making an individual selection
      setSelectAllResults(false);

      // Update cache: only remove items that are VISIBLE and were unchecked
      setSelectedItemsCache((prevCache) => {
        const newCache = new Map(prevCache);

        // For items currently visible in inventoryData:
        // - If checked (in newSelectedIds), keep/add to cache
        // - If unchecked (not in newSelectedIds), remove from cache
        for (const id of visibleIds) {
          if (newSelectedIds.has(id)) {
            // Item is visible AND selected - add to cache if not present
            if (!newCache.has(id)) {
              const item = inventoryData.find((i) => i.id === id);
              if (item) {
                newCache.set(id, {
                  id: item.id,
                  type: item.type,
                  name: item.name,
                  siteId: typeof item.siteId === 'string' ? item.siteId : item.siteId,
                  zone: item.zone,
                  code: item.code,
                  state: item.state,
                  coordinates: item.coordinates,
                });
              }
            }
          } else {
            // Item is visible but NOT selected - remove from cache
            newCache.delete(id);
          }
        }

        return newCache;
      });

      // Merge: keep non-visible selected items + add visible selected items
      setSelectedIds((prevSelectedIds) => {
        const merged = new Set<string>();

        // Keep items that are NOT visible (from other filters)
        for (const id of prevSelectedIds) {
          if (!visibleIds.has(id)) {
            merged.add(id);
          }
        }

        // Add items that ARE visible and selected
        for (const id of newSelectedIds) {
          if (visibleIds.has(id)) {
            merged.add(id);
          }
        }

        return merged;
      });
    },
    [inventoryData, visibleIds],
  );

  // Fetch all matching IDs from backend and populate cache (no pagination)
  const handleSelectAllResults = useCallback(async () => {
    setSelectAllLoading(true);
    try {
      // Build filters matching the current view state
      const apiType =
        mainTab === 'vegetation' && filters.type !== 'all'
          ? filters.type
          : mainTab === 'hydraulique' && filters.type !== 'all'
            ? filters.type
            : filters.type !== 'all'
              ? filters.type
              : undefined;

      const result = await fetchInventorySelectIds({
        type: apiType,
        site: filters.site !== 'all' ? filters.site : undefined,
        etat: filters.state !== 'all' ? filters.state : undefined,
        famille: filters.family !== 'all' ? filters.family : undefined,
        search: searchQuery || undefined,
      });

      // Populate cache with all returned items
      setSelectedItemsCache((prevCache) => {
        const newCache = new Map(prevCache);
        for (const item of result.items) {
          const id = String(item.id);
          if (!newCache.has(id)) {
            newCache.set(id, {
              id,
              type: item.type_objet,
              name: item.display_name,
              siteId: String(item.site_id),
              zone: item.sous_site_nom ?? undefined,
              code: undefined,
              state: item.etat,
              coordinates: undefined,
            });
          }
        }
        return newCache;
      });

      setSelectedIds((prev) => {
        const merged = new Set(prev);
        result.items.forEach((item) => merged.add(String(item.id)));
        return merged;
      });

      // Back to normal selection mode — cache is now fully populated
      setSelectAllResults(false);

      if (result.truncated) {
        showToast(
          `Sélection limitée à ${result.items.length} éléments sur ${result.total}. Affinez vos filtres pour une sélection complète.`,
          'warning',
        );
      }
    } catch (err) {
      showToast('Erreur lors de la sélection globale', 'error');
    } finally {
      setSelectAllLoading(false);
    }
  }, [mainTab, filters, searchQuery, showToast]);

  // Check task type compatibility when selection changes (use cached data)
  useEffect(() => {
    if (selectedItemsCache.size === 0) {
      setIsTaskCompatible(true);
      setApplicableTasksCount(null);
      setApplicableTasksCount(null);
      return;
    }

    // Get unique types from cached selected items
    const uniqueTypes = [
      ...new Set(
        Array.from(selectedItemsCache.values()).map((item) => {
          // Capitalize first letter to match backend type names
          const type = item.type;
          return type.charAt(0).toUpperCase() + type.slice(1);
        }),
      ),
    ];

    // If only one type, always compatible
    if (uniqueTypes.length <= 1) {
      setIsTaskCompatible(true);
      setApplicableTasksCount(null);
      setApplicableTasksCount(null);
      return;
    }

    // Check compatibility with API
    setCompatibilityLoading(true);

    planningService
      .getApplicableTypesTaches(uniqueTypes)
      .then((result) => {
        setIsTaskCompatible(result.types_taches.length > 0);
        setApplicableTasksCount(result.types_taches.length);

        if (result.types_taches.length === 0) {
          // No common tasks
        }
      })
      .catch(() => {
        showToast('Erreur lors de la vérification de compatibilité des tâches', 'error');
        setIsTaskCompatible(true); // Assume compatible on error
      })
      .finally(() => setCompatibilityLoading(false));
  }, [selectedItemsCache, showToast]);

  // Convert cached items to InventoryObjectOption format for TaskFormModal
  const preSelectedObjects: InventoryObjectOption[] = useMemo(() => {
    return Array.from(selectedItemsCache.values()).map((item) => ({
      id: parseInt(item.id, 10),
      type: item.type.charAt(0).toUpperCase() + item.type.slice(1),
      nom: item.name,
      site: sites.find((s) => s.id === item.siteId)?.name || String(item.siteId),
      soussite: item.zone,
    }));
  }, [selectedItemsCache, sites]);

  // Bulk delete selected items
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedItemsCache.keys()).map((id) => Number(id));
    try {
      const result = await bulkDeleteInventory(ids);
      if (result.async) {
        showToast(result.message || `Suppression de ${ids.length} objets en cours…`, 'info');
      } else {
        showToast(
          `${result.deleted ?? ids.length} élément${ids.length > 1 ? 's' : ''} supprimé${ids.length > 1 ? 's' : ''}`,
          'success',
        );
      }
    } catch (err) {
      showToast('Erreur lors de la suppression', 'error');
    }

    setSelectedIds(new Set());
    setSelectedItemsCache(new Map());
    setSelectAllResults(false);
    setRefreshCounter((c) => c + 1);
  };

  const columns = getColumnsForType(filters.type, sites);

  // Reset filters
  const resetFilters = () => {
    setFilters({
      type: 'all',
      state: 'all',
      site: 'all',
      intervention: 'all',
      family: 'all',
      dateCreationFrom: '',
      dateCreationTo: '',
    });
    setCurrentPage(1);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filters.type,
    filters.state,
    filters.site,
    filters.intervention,
    filters.family,
    filters.dateCreationFrom,
    filters.dateCreationTo,
  ]);

  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.state !== 'all' ||
    filters.site !== 'all' ||
    filters.intervention !== 'all' ||
    filters.family !== 'all' ||
    !!filters.dateCreationFrom ||
    !!filters.dateCreationTo;

  // Get types for current tab
  const getTypesForTab = () => {
    switch (mainTab) {
      case 'vegetation':
        return VEGETATION_TYPES;
      case 'hydraulique':
        return HYDROLOGY_TYPES;
      default:
        return [...VEGETATION_TYPES, ...HYDROLOGY_TYPES];
    }
  };

  return (
    <div className="p-4 md:p-6 flex flex-col">
      {/* Styles pour l'impression */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <InventoryToolbar
        mainTab={mainTab}
        onMainTabChange={setMainTab}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        hasActiveFilters={hasActiveFilters}
        filters={filters}
        canExport={permissions.canExport}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
      />

      {showFilters && (
        <InventoryFilters
          filters={filters}
          setFilters={setFilters}
          mainTab={mainTab}
          sites={sites}
          families={families}
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
        />
      )}

      {/* Indicateur de vue polymorphe */}
      {filters.type !== 'all' && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex-shrink-0 no-print">
          <FileText className="w-4 h-4" />
          <span>
            Vue détaillée : <strong>{filters.type}</strong> - Colonnes spécifiques affichées
          </span>
        </div>
      )}

      <TypeFilterTabs
        currentType={filters.type}
        types={getTypesForTab()}
        onTypeChange={(type) => setFilters({ ...filters, type })}
      />

      {/* Data Table */}
      <div className="flex-1 overflow-auto min-h-0 print-content">
        {/* Loading State */}
        {isLoadingAPI && (
          <div className="fixed inset-0 z-50">
            <LoadingScreen isLoading={true} loop={true} minDuration={0} />
          </div>
        )}

        {/* Error State */}
        {apiError && !isLoadingAPI && (
          <div className="flex items-center justify-center h-64 no-print">
            <div className="text-center bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur de chargement</h3>
              <p className="text-red-600 mb-4">{apiError}</p>
              <p className="text-sm text-slate-600">Vérifiez que le serveur Django est démarré.</p>
            </div>
          </div>
        )}

        {/* Data Table */}
        {!isLoadingAPI && !apiError && (
          <>
            {/* "Select all results" banner — appears when all items on current page are selected */}
            {showSelectAllBanner && (
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center justify-center gap-3 text-sm">
                <span className="text-blue-700">
                  Les {visibleIds.size} éléments de cette page sont sélectionnés.
                </span>
                <button
                  onClick={handleSelectAllResults}
                  disabled={selectAllLoading}
                  className="text-blue-600 font-medium underline hover:text-blue-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {selectAllLoading && (
                    <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  Sélectionner les {totalCount} résultats correspondants
                </button>
              </div>
            )}

            <DataTable
              data={inventoryData}
              columns={columns}
              onRowClick={(item) => navigate(`/inventory/${item.type}/${item.id}`)}
              itemsPerPage={20}
              serverSide
              totalItems={apiInventory?.count || 0}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              selectable
              selectedIds={new Set([...selectedIds].filter((id) => visibleIds.has(id)))}
              onSelectionChange={handleSelectionChange}
              getItemId={(item) => item.id}
            />
          </>
        )}
      </div>

      <SelectionActionBar
        selectedItemsCache={selectedItemsCache}
        isTaskCompatible={isTaskCompatible}
        compatibilityLoading={compatibilityLoading}
        applicableTasksCount={applicableTasksCount}
        modalLoading={modalLoading}
        canCreateTask={permissions.canCreateTask}
        isAdmin={user.role === 'ADMIN'}
        onClearSelection={clearSelection}
        onOpenTaskModal={handleOpenTaskModal}
        onBulkDelete={() => setShowBulkDeleteModal(true)}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showBulkDeleteModal}
        title={`Supprimer ${selectedItemsCache.size} élément${selectedItemsCache.size > 1 ? 's' : ''} ?`}
        message="Cette action est irréversible. Tous les éléments sélectionnés seront définitivement supprimés."
        onConfirm={handleBulkDelete}
        onClose={() => setShowBulkDeleteModal(false)}
      />

      {/* Task Creation Modal */}
      {showTaskModal && (
        <TaskFormModal
          equipes={modalEquipes}
          typesTaches={modalTypesTaches}
          preSelectedObjects={preSelectedObjects}
          isSubmitting={isSubmitting}
          onClose={() => setShowTaskModal(false)}
          onSubmit={handleTaskSubmit}
        />
      )}
    </div>
  );
};

export default Inventory;
