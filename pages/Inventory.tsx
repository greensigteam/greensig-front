import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, X, MapPin, Calendar, FileText, Leaf, Droplet, AlertCircle, ClipboardList, Trash2, Map as MapIcon, Ban, Plus, RefreshCw, Activity, Sprout, Wrench, ChevronDown, Check, Printer, Download } from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { MOCK_INVENTORY, InventoryItem } from '../services/mockData';
import { fetchInventory, ApiError, type InventoryResponse, type InventoryFilters, fetchAllSites, type SiteFrontend, fetchFilterOptions, exportData, exportInventoryExcel, exportInventoryPDF, downloadBlob } from '../services/api';
import { planningService } from '../services/planningService';
import { fetchEquipes } from '../services/usersApi';
import TaskFormModal, { InventoryObjectOption } from '../components/planning/TaskFormModal';
import { TypeTache, TacheCreate } from '../types/planning';
import { EquipeList } from '../types/users';
import { useToast } from '../contexts/ToastContext';
import { useSearch } from '../contexts/SearchContext';
import LoadingScreen from '../components/LoadingScreen';

// Types de végétation et hydrologie pour les filtres
const VEGETATION_TYPES = ['Arbre', 'Palmier', 'Gazon', 'Arbuste', 'Vivace', 'Cactus', 'Graminee'];
const HYDROLOGY_TYPES = ['Puit', 'Pompe', 'Vanne', 'Clapet', 'Canalisation', 'Aspersion', 'Goutte', 'Ballon'];

// Interface for cached selected item data
interface SelectedItemData {
  id: string;
  type: string;
  name: string;
  siteId: string;
  zone: string;
  code: string;
  state: string;
  coordinates: { lat: number; lng: number };
}

// ✅ SessionStorage keys for state persistence
const STORAGE_KEYS = {
  FILTERS: 'inventory_filters',
  MAIN_TAB: 'inventory_main_tab',
  CURRENT_PAGE: 'inventory_current_page',
  SHOW_FILTERS: 'inventory_show_filters'
};

// ✅ Helper functions for sessionStorage
const saveToSession = (key: string, value: any) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to sessionStorage:', e);
  }
};

const loadFromSession = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error('Failed to load from sessionStorage:', e);
    return defaultValue;
  }
};

// Composant CustomSelect pour des dropdowns modernes
interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
  placeholder?: string;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, icon, placeholder, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder || 'Sélectionner';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm hover:border-slate-400 ${isOpen ? 'ring-2 ring-emerald-500/20 border-emerald-500' : ''}`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-slate-500 flex-shrink-0">{icon}</span>}
          <span className={`truncate ${value === 'all' ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>
            {selectedLabel}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-100">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${value === option.value ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-700'}`}
              >
                <span className="truncate">{option.label}</span>
                {value === option.value && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Composant ExportDropdown
const ExportDropdown = ({ onExportCSV, onExportExcel, onPrint }: { onExportCSV: () => void, onExportExcel: () => void, onPrint: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
      >
        <Download className="w-4 h-4" />
        <span>Exporter</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={() => { onExportCSV(); setIsOpen(false); }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            CSV
          </button>
          <button
            onClick={() => { onExportExcel(); setIsOpen(false); }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-green-600" />
            Excel (XLSX)
          </button>
          <div className="border-t border-slate-100 my-1"></div>
          <button
            onClick={() => { onPrint(); setIsOpen(false); }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            Imprimer
          </button>
        </div>
      )}
    </div>
  );
};

// Main Inventory Component
const Inventory: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { searchQuery, setPlaceholder } = useSearch();

  // ✅ Restore main tab from sessionStorage
  const [mainTab, setMainTab] = useState<'tous' | 'vegetation' | 'hydraulique'>(
    loadFromSession(STORAGE_KEYS.MAIN_TAB, 'tous')
  );

  // Selection state for creating tasks
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Cache for selected items data (persists across page changes)
  const [selectedItemsCache, setSelectedItemsCache] = useState<Map<string, SelectedItemData>>(new Map());

  // Task type compatibility state
  const [isTaskCompatible, setIsTaskCompatible] = useState(true);
  const [compatibilityLoading, setCompatibilityLoading] = useState(false);
  const [applicableTasksCount, setApplicableTasksCount] = useState<number | null>(null);
  const [incompatibleTypesMessage, setIncompatibleTypesMessage] = useState<string | null>(null);

  // Task modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalEquipes, setModalEquipes] = useState<EquipeList[]>([]);
  const [modalTypesTaches, setModalTypesTaches] = useState<TypeTache[]>([]);
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // ✅ Advanced Filters - Restore from sessionStorage
  const [filters, setFilters] = useState(
    loadFromSession(STORAGE_KEYS.FILTERS, {
      type: 'all',
      state: 'all',
      site: 'all',
      intervention: 'all',
      family: 'all'
    })
  );
  const [showFilters, setShowFilters] = useState(
    loadFromSession(STORAGE_KEYS.SHOW_FILTERS, false)
  );
  const [families, setFamilies] = useState<string[]>([]); // État pour stocker la liste des familles

  // API State
  const [apiInventory, setApiInventory] = useState<InventoryResponse | null>(null);
  const [isLoadingAPI, setIsLoadingAPI] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Sites fetched from backend (replace MOCK_SITES)
  const [sites, setSites] = useState<SiteFrontend[]>([]);

  useEffect(() => {
    setPlaceholder('Rechercher dans l\'inventaire...');
  }, [setPlaceholder]);

  useEffect(() => {
    let mounted = true;

    // Charger les sites
    const loadSites = async () => {
      try {
        const s = await fetchAllSites();
        if (mounted) setSites(s);
      } catch (err) {
        console.error('Erreur chargement sites:', err);
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
        console.error('Erreur chargement familles:', err);
      }
    };

    loadSites();
    loadFamilies();
    return () => { mounted = false };
  }, []);

  // ✅ Current page for pagination - Restore from sessionStorage
  const [currentPage, setCurrentPage] = useState(
    loadFromSession(STORAGE_KEYS.CURRENT_PAGE, 1)
  );

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
    setFilters({ type: 'all', state: 'all', site: 'all', intervention: 'all', family: 'all' });
  }, [mainTab]);

  // Fetch inventory from API on mount and when filters change
  useEffect(() => {
    const loadInventory = async () => {
      setIsLoadingAPI(true);
      setApiError(null);
      try {
        const apiFilters: Record<string, string | number> = {
          page: currentPage,
          page_size: 20
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

        // Search filter
        if (searchQuery.trim()) {
          apiFilters.search = searchQuery.trim();
        }

        const data = await fetchInventory(apiFilters);
        setApiInventory(data);
      } catch (error) {
        console.error('Erreur chargement inventaire:', error);
        setApiError(error instanceof ApiError ? error.message : 'Erreur de chargement');
      } finally {
        setIsLoadingAPI(false);
      }
    };

    loadInventory();
  }, [mainTab, currentPage, filters, searchQuery]);

  // Transform API data to InventoryItem format
  const inventoryData = useMemo((): InventoryItem[] => {
    if (!apiInventory?.results) return MOCK_INVENTORY;

    return apiInventory.results.map((feature) => {
      const props = feature.properties;
      const coords = (feature.geometry.type === 'Point'
        ? feature.geometry.coordinates as number[]
        : feature.geometry.type === 'Polygon'
          ? (feature.geometry.coordinates as number[][][])[0]?.[0]
          : [0, 0]) ?? [0, 0];

      // Map object_type to InventoryItem type
      const typeMapping: Record<string, InventoryItem['type']> = {
        'Arbre': 'arbre',
        'Palmier': 'palmier',
        'Gazon': 'gazon',
        'Arbuste': 'arbuste',
        'Vivace': 'vivace',
        'Cactus': 'cactus',
        'Graminee': 'graminee',  // ✅ Sans accent pour cohérence
        'Puit': 'puit',
        'Pompe': 'pompe',
        'Vanne': 'vanne',
        'Clapet': 'clapet',
        'Canalisation': 'canalisation',
        'Aspersion': 'aspersion',
        'Goutte': 'goutte',
        'Ballon': 'ballon',
      };

      const featureId = feature.id ?? props.id ?? 0;

      // Try to map returned site name to a known site id (if sites were loaded)
      const matchedSite = sites.find(s => s.name && props.site_nom && s.name.toLowerCase() === String(props.site_nom).toLowerCase());

      return {
        id: featureId.toString(),
        type: typeMapping[props.object_type] || 'equipement',
        code: props.code || `${props.object_type}-${featureId}`,
        name: props.nom || props.marque || `${props.object_type} ${featureId}`,
        siteId: matchedSite ? matchedSite.id : (props.site_nom || 'unknown'),
        zone: props.sous_site_nom || props.site_nom || 'Non définie',
        state: (props.etat || 'bon') as 'bon' | 'moyen' | 'mauvais' | 'critique',
        species: props.famille || undefined,
        height: props.hauteur || props.taille || props.profondeur || undefined,
        diameter: props.diametre || props.densite || undefined,
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
    return new Set(inventoryData.map(item => item.id));
  }, [inventoryData]);

  // Custom selection handler that maintains the cache across filter changes
  const handleSelectionChange = useCallback((newSelectedIds: Set<string>) => {
    // Update cache: only remove items that are VISIBLE and were unchecked
    setSelectedItemsCache(prevCache => {
      const newCache = new Map(prevCache);

      // For items currently visible in inventoryData:
      // - If checked (in newSelectedIds), keep/add to cache
      // - If unchecked (not in newSelectedIds), remove from cache
      for (const id of visibleIds) {
        if (newSelectedIds.has(id)) {
          // Item is visible AND selected - add to cache if not present
          if (!newCache.has(id)) {
            const item = inventoryData.find(i => i.id === id);
            if (item) {
              newCache.set(id, {
                id: item.id,
                type: item.type,
                name: item.name,
                siteId: typeof item.siteId === 'string' ? item.siteId : item.siteId,
                zone: item.zone,
                code: item.code,
                state: item.state,
                coordinates: item.coordinates
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
    setSelectedIds(prevSelectedIds => {
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
  }, [inventoryData, visibleIds]);

  // Check task type compatibility when selection changes (use cached data)
  useEffect(() => {
    if (selectedItemsCache.size === 0) {
      setIsTaskCompatible(true);
      setApplicableTasksCount(null);
      setIncompatibleTypesMessage(null);
      return;
    }

    // Get unique types from cached selected items
    const uniqueTypes = [...new Set(
      Array.from(selectedItemsCache.values()).map(item => {
        // Capitalize first letter to match backend type names
        const type = item.type;
        return type.charAt(0).toUpperCase() + type.slice(1);
      })
    )];

    // If only one type, always compatible
    if (uniqueTypes.length <= 1) {
      setIsTaskCompatible(true);
      setApplicableTasksCount(null);
      setIncompatibleTypesMessage(null);
      return;
    }

    // Check compatibility with API
    setCompatibilityLoading(true);
    setIncompatibleTypesMessage(null);

    planningService.getApplicableTypesTaches(uniqueTypes)
      .then(result => {
        setIsTaskCompatible(result.types_taches.length > 0);
        setApplicableTasksCount(result.types_taches.length);

        if (result.types_taches.length === 0) {
          setIncompatibleTypesMessage(
            `Les types sélectionnés (${uniqueTypes.join(', ')}) n'ont aucune tâche en commun.`
          );
        }
      })
      .catch(err => {
        console.error('Erreur vérification compatibilité:', err);
        setIsTaskCompatible(true); // Assume compatible on error
      })
      .finally(() => setCompatibilityLoading(false));
  }, [selectedItemsCache]);

  // Convert cached items to InventoryObjectOption format for TaskFormModal
  const preSelectedObjects: InventoryObjectOption[] = useMemo(() => {
    return Array.from(selectedItemsCache.values()).map(item => ({
      id: parseInt(item.id, 10),
      type: item.type.charAt(0).toUpperCase() + item.type.slice(1),
      nom: item.name,
      site: item.siteId,
      soussite: item.zone
    }));
  }, [selectedItemsCache]);

  // Open task creation modal - fetch required data first
  const handleOpenTaskModal = async () => {
    setModalLoading(true);
    try {
      // Get unique types from selection
      const uniqueTypes = [...new Set(
        Array.from(selectedItemsCache.values()).map(item =>
          item.type.charAt(0).toUpperCase() + item.type.slice(1)
        )
      )];

      // Fetch equipes and applicable task types in parallel
      const [equipesData, typesTachesResult] = await Promise.all([
        fetchEquipes(),
        planningService.getApplicableTypesTaches(uniqueTypes)
      ]);

      setModalEquipes(equipesData.results || []);
      setModalTypesTaches(typesTachesResult.types_taches);
      setShowTaskModal(true);
    } catch (error) {
      console.error('Erreur chargement données modale:', error);
      showToast('Erreur lors du chargement des données', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle task creation from modal
  const handleTaskSubmit = async (data: TacheCreate) => {
    setTaskSubmitting(true);
    try {
      await planningService.createTache(data);
      showToast('Tâche créée avec succès', 'success');

      // Clear selection
      setSelectedIds(new Set());
      setSelectedItemsCache(new Map());
      setShowTaskModal(false);

      // Navigate to planning page
      navigate('/planning');
    } catch (error) {
      console.error('Erreur création tâche:', error);
      showToast('Erreur lors de la création de la tâche', 'error');
    } finally {
      setTaskSubmitting(false);
    }
  };


  // ============================================================================
  // COLONNES DYNAMIQUES (Polymorphisme)
  // ============================================================================

  // Colonnes communes à tous les objets (vue "Tous")
  const commonColumns: Column<InventoryItem>[] = [
    {
      key: 'name',
      label: 'Nom'
    },
    {
      key: 'siteId',
      label: 'Site',
      render: (item) => {
        const site = sites.find(s => s.id === item.siteId);
        return site?.name || item.siteId || '-';
      }
    },
    {
      key: 'type',
      label: 'Type',
      render: (item) => <span className="capitalize">{item.type}</span>
    },
    {
      key: 'state',
      label: 'État',
      render: (item) => <StatusBadge status={item.state} type="state" />,
      sortable: false
    }
  ];

  // Colonnes spécifiques par type (basées sur le modèle de données réel)
  const typeSpecificColumns: Record<string, Column<InventoryItem>[]> = {
    // Végétation - Arbres et Palmiers (ont: nom, famille, taille, observation, last_intervention_date)
    'Arbre': [
      { key: 'name', label: 'Nom' },
      { key: 'siteId', label: 'Site', render: (item) => sites.find(s => s.id === item.siteId)?.name || item.siteId || '-' },
      { key: 'type', label: 'Type', render: (item) => <span className="capitalize">{item.type}</span> },
      { key: 'state', label: 'État', render: (item) => <StatusBadge status={item.state} type="state" />, sortable: false },
      { key: 'species', label: 'Famille', render: (item) => item.species || '-' },
      { key: 'height', label: 'Taille', render: (item) => item.height || '-' },
      { key: 'lastIntervention', label: 'Dernière intervention', render: (item) => item.lastIntervention ? new Date(item.lastIntervention).toLocaleDateString('fr-FR') : '-' }
    ],
    'Palmier': [
      { key: 'name', label: 'Nom' },
      { key: 'siteId', label: 'Site', render: (item) => sites.find(s => s.id === item.siteId)?.name || item.siteId || '-' },
      { key: 'type', label: 'Type', render: (item) => <span className="capitalize">{item.type}</span> },
      { key: 'state', label: 'État', render: (item) => <StatusBadge status={item.state} type="state" />, sortable: false },
      { key: 'species', label: 'Famille', render: (item) => item.species || '-' },
      { key: 'height', label: 'Taille', render: (item) => item.height || '-' },
      { key: 'lastIntervention', label: 'Dernière intervention', render: (item) => item.lastIntervention ? new Date(item.lastIntervention).toLocaleDateString('fr-FR') : '-' }
    ],

    // Végétation - Gazon (a: nom, famille, area_sqm, observation, last_intervention_date)
    'Gazon': [
      { key: 'name', label: 'Nom' },
      { key: 'siteId', label: 'Site', render: (item) => sites.find(s => s.id === item.siteId)?.name || item.siteId || '-' },
      { key: 'type', label: 'Type', render: (item) => <span className="capitalize">{item.type}</span> },
      { key: 'state', label: 'État', render: (item) => <StatusBadge status={item.state} type="state" />, sortable: false },
      { key: 'species', label: 'Famille', render: (item) => item.species || '-' },
      { key: 'surface', label: 'Surface (m²)', render: (item) => item.surface ? `${item.surface}` : '-' },
      { key: 'lastIntervention', label: 'Dernière intervention', render: (item) => item.lastIntervention ? new Date(item.lastIntervention).toLocaleDateString('fr-FR') : '-' }
    ],

    // Végétation - Arbuste, Vivace, Cactus (ont: nom, famille, densite, observation, last_intervention_date)
    'Arbuste': [
      { key: 'name', label: 'Nom' },
      { key: 'siteId', label: 'Site', render: (item) => sites.find(s => s.id === item.siteId)?.name || item.siteId || '-' },
      { key: 'type', label: 'Type', render: (item) => <span className="capitalize">{item.type}</span> },
      { key: 'state', label: 'État', render: (item) => <StatusBadge status={item.state} type="state" />, sortable: false },
      { key: 'species', label: 'Famille', render: (item) => item.species || '-' },
      { key: 'surface', label: 'Surface (m²)', render: (item) => item.surface ? `${item.surface}` : '-' },  // ✅ Surface ajoutée
      { key: 'diameter', label: 'Densité', render: (item) => item.diameter || '-' },
      { key: 'lastIntervention', label: 'Dernière intervention', render: (item) => item.lastIntervention ? new Date(item.lastIntervention).toLocaleDateString('fr-FR') : '-' }
    ],
    'Vivace': [
      { key: 'name', label: 'Nom' },
      { key: 'siteId', label: 'Site', render: (item) => sites.find(s => s.id === item.siteId)?.name || item.siteId || '-' },
      { key: 'type', label: 'Type', render: (item) => <span className="capitalize">{item.type}</span> },
      { key: 'state', label: 'État', render: (item) => <StatusBadge status={item.state} type="state" />, sortable: false },
      { key: 'species', label: 'Famille', render: (item) => item.species || '-' },
      { key: 'surface', label: 'Surface (m²)', render: (item) => item.surface ? `${item.surface}` : '-' },  // ✅ Surface ajoutée
      { key: 'diameter', label: 'Densité', render: (item) => item.diameter || '-' },
      { key: 'lastIntervention', label: 'Dernière intervention', render: (item) => item.lastIntervention ? new Date(item.lastIntervention).toLocaleDateString('fr-FR') : '-' }
    ],
    'Cactus': [
      { key: 'name', label: 'Nom' },
      { key: 'siteId', label: 'Site', render: (item) => sites.find(s => s.id === item.siteId)?.name || item.siteId || '-' },
      { key: 'type', label: 'Type', render: (item) => <span className="capitalize">{item.type}</span> },
      { key: 'state', label: 'État', render: (item) => <StatusBadge status={item.state} type="state" />, sortable: false },
      { key: 'species', label: 'Famille', render: (item) => item.species || '-' },
      { key: 'surface', label: 'Surface (m²)', render: (item) => item.surface ? `${item.surface}` : '-' },  // ✅ Surface ajoutée
      { key: 'diameter', label: 'Densité', render: (item) => item.diameter || '-' },
      { key: 'lastIntervention', label: 'Dernière intervention', render: (item) => item.lastIntervention ? new Date(item.lastIntervention).toLocaleDateString('fr-FR') : '-' }
    ],

    // Végétation - Graminee (a: nom, famille, densite, symbole, observation, last_intervention_date)
    'Graminee': [
      { key: 'name', label: 'Nom' },
      { key: 'siteId', label: 'Site', render: (item) => sites.find(s => s.id === item.siteId)?.name || item.siteId || '-' },
      { key: 'type', label: 'Type', render: (item) => <span className="capitalize">{item.type}</span> },
      { key: 'state', label: 'État', render: (item) => <StatusBadge status={item.state} type="state" />, sortable: false },
      { key: 'species', label: 'Famille', render: (item) => item.species || '-' },
      { key: 'surface', label: 'Surface (m²)', render: (item) => item.surface ? `${item.surface}` : '-' },  // ✅ Surface ajoutée
      { key: 'diameter', label: 'Densité', render: (item) => item.diameter || '-' },
      { key: 'lastIntervention', label: 'Dernière intervention', render: (item) => item.lastIntervention ? new Date(item.lastIntervention).toLocaleDateString('fr-FR') : '-' }
    ],

    // Hydrologie - Puit (a: nom, profondeur, diametre, niveau_statique, niveau_dynamique, observation, last_intervention_date)
    'Puit': [
      { key: 'name', label: 'Nom' },
      { key: 'siteId', label: 'Site', render: (item) => sites.find(s => s.id === item.siteId)?.name || item.siteId || '-' },
      { key: 'type', label: 'Type', render: (item) => <span className="capitalize">{item.type}</span> },
      { key: 'state', label: 'État', render: (item) => <StatusBadge status={item.state} type="state" />, sortable: false },
      { key: 'height', label: 'Profondeur (m)', render: (item) => item.height || '-' },
      { key: 'diameter', label: 'Diamètre (cm)', render: (item) => item.diameter || '-' },
      { key: 'lastIntervention', label: 'Dernière intervention', render: (item) => item.lastIntervention ? new Date(item.lastIntervention).toLocaleDateString('fr-FR') : '-' }
    ],

    // Hydrologie - Pompe (a: nom, type, diametre, puissance, debit, observation, last_intervention_date)
    'Pompe': [
      { key: 'name', label: 'Nom' },
      { key: 'siteId', label: 'Site', render: (item) => sites.find(s => s.id === item.siteId)?.name || item.siteId || '-' },
      { key: 'type', label: 'Type', render: (item) => <span className="capitalize">{item.type}</span> },
      { key: 'state', label: 'État', render: (item) => <StatusBadge status={item.state} type="state" />, sortable: false },
      { key: 'diameter', label: 'Diamètre (cm)', render: (item) => item.diameter || '-' },
      { key: 'lastIntervention', label: 'Dernière intervention', render: (item) => item.lastIntervention ? new Date(item.lastIntervention).toLocaleDateString('fr-FR') : '-' }
    ],

    // Hydrologie - Vanne, Clapet (ont: marque, type, diametre, materiau, pression, observation)
    'Vanne': [
      { key: 'name', label: 'Marque' },
      { key: 'siteId', label: 'Site', render: (item) => sites.find(s => s.id === item.siteId)?.name || item.siteId || '-' },
      { key: 'type', label: 'Type', render: (item) => <span className="capitalize">{item.type}</span> },
      { key: 'state', label: 'État', render: (item) => <StatusBadge status={item.state} type="state" />, sortable: false },
      { key: 'diameter', label: 'Diamètre (cm)', render: (item) => item.diameter || '-' }
    ],
    'Clapet': [
      { key: 'name', label: 'Marque' },
      { key: 'siteId', label: 'Site', render: (item) => sites.find(s => s.id === item.siteId)?.name || item.siteId || '-' },
      { key: 'type', label: 'Type', render: (item) => <span className="capitalize">{item.type}</span> },
      { key: 'state', label: 'État', render: (item) => <StatusBadge status={item.state} type="state" />, sortable: false },
      { key: 'diameter', label: 'Diamètre (cm)', render: (item) => item.diameter || '-' }
    ],

    // Hydrologie - Ballon (a: marque, pression, volume, materiau, observation)
    'Ballon': [
      { key: 'name', label: 'Marque' },
      { key: 'siteId', label: 'Site', render: (item) => sites.find(s => s.id === item.siteId)?.name || item.siteId || '-' },
      { key: 'type', label: 'Type', render: (item) => <span className="capitalize">{item.type}</span> },
      { key: 'state', label: 'État', render: (item) => <StatusBadge status={item.state} type="state" />, sortable: false }
    ],

    // Hydrologie - Canalisation, Aspersion (ont: marque, type, diametre, materiau, pression, observation)
    'Canalisation': [
      { key: 'name', label: 'Marque' },
      { key: 'siteId', label: 'Site', render: (item) => sites.find(s => s.id === item.siteId)?.name || item.siteId || '-' },
      { key: 'type', label: 'Type', render: (item) => <span className="capitalize">{item.type}</span> },
      { key: 'state', label: 'État', render: (item) => <StatusBadge status={item.state} type="state" />, sortable: false },
      { key: 'diameter', label: 'Diamètre (cm)', render: (item) => item.diameter || '-' }
    ],
    'Aspersion': [
      { key: 'name', label: 'Marque' },
      { key: 'siteId', label: 'Site', render: (item) => sites.find(s => s.id === item.siteId)?.name || item.siteId || '-' },
      { key: 'type', label: 'Type', render: (item) => <span className="capitalize">{item.type}</span> },
      { key: 'state', label: 'État', render: (item) => <StatusBadge status={item.state} type="state" />, sortable: false },
      { key: 'diameter', label: 'Diamètre (cm)', render: (item) => item.diameter || '-' }
    ],

    // Hydrologie - Goutte (a: type, diametre, materiau, pression, observation - PAS de marque ni nom)
    'Goutte': [
      { key: 'name', label: 'Type' },
      { key: 'siteId', label: 'Site', render: (item) => sites.find(s => s.id === item.siteId)?.name || item.siteId || '-' },
      { key: 'type', label: 'Catégorie', render: (item) => <span className="capitalize">{item.type}</span> },
      { key: 'state', label: 'État', render: (item) => <StatusBadge status={item.state} type="state" />, sortable: false },
      { key: 'diameter', label: 'Diamètre (cm)', render: (item) => item.diameter || '-' }
    ]
  };

  // Fonction pour obtenir les colonnes appropriées selon le filtre actif
  const getColumns = (): Column<InventoryItem>[] => {
    // Si un type spécifique est sélectionné, retourner ses colonnes
    if (filters.type !== 'all') {
      const specificCols = typeSpecificColumns[filters.type];
      if (specificCols) {
        return specificCols;
      }
    }
    // Sinon, retourner les colonnes communes
    return commonColumns;
  };

  const columns = getColumns();

  // Export CSV
  const handleExportCSV = () => {
    const filename = `inventaire_${filters.type !== 'all' ? filters.type + '_' : ''}${new Date().toISOString().split('T')[0]}.csv`;
    const headers = columns.map(col => col.label);
    const dataToExport = inventoryData.map(item => {
      return columns.map(col => {
        if (col.render) {
          if (col.key === 'siteId') {
            const site = sites.find(s => s.id === item.siteId);
            return site?.name || item.siteId || '-';
          } else if (col.key === 'type') return item.type;
          else if (col.key === 'state') return item.state;
          else if (col.key === 'species') return item.species || '-';
          else if (col.key === 'height') return item.height ? `${item.height} m` : '-';
          else if (col.key === 'diameter') return item.diameter ? `${item.diameter} cm` : '-';
          else if (col.key === 'surface') return item.surface ? `${item.surface} m²` : '-';
          else if (col.key === 'lastIntervention') return item.lastIntervention ? new Date(item.lastIntervention).toLocaleDateString('fr-FR') : '-';
        }
        return (item as any)[col.key] || '-';
      });
    });

    if (dataToExport.length === 0) {
      alert("Aucune donnée à exporter.");
      return;
    }

    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...dataToExport.map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
  };

  // Export Excel amélioré
  const handleExportExcel = async () => {
    try {
      // Déterminer les types à exporter selon le tab actif et le filtre type
      let typesToExport: string[] = [];

      if (mainTab === 'vegetation') {
        if (filters.type !== 'all') {
          typesToExport = [filters.type];
        } else {
          typesToExport = VEGETATION_TYPES;
        }
      } else if (mainTab === 'hydraulique') {
        if (filters.type !== 'all') {
          typesToExport = [filters.type];
        } else {
          typesToExport = HYDROLOGY_TYPES;
        }
      } else {
        // Tab 'tous'
        if (filters.type !== 'all') {
          typesToExport = [filters.type];
        } else {
          typesToExport = [...VEGETATION_TYPES, ...HYDROLOGY_TYPES];
        }
      }

      // Appeler la nouvelle API avec tous les filtres
      const blob = await exportInventoryExcel({
        types: typesToExport,
        site: filters.site,
        etat: filters.state,
        famille: filters.family,
        search: searchQuery
      });

      const filename = `inventaire_${new Date().toISOString().split('T')[0]}.xlsx`;
      downloadBlob(blob, filename);
      showToast("Export Excel réussi", "success");
    } catch (error: any) {
      console.error("Erreur export Excel:", error);
      // 404 = pas de données à exporter
      if (error?.status === 404) {
        showToast("Aucune donnée à exporter", "info");
      } else {
        showToast("Erreur lors de l'export Excel", "error");
      }
    }
  };

  // Export PDF
  const handlePrint = async () => {
    try {
      // Déterminer les types à exporter selon le tab actif et le filtre type
      let typesToExport: string[] = [];

      if (mainTab === 'vegetation') {
        if (filters.type !== 'all') {
          typesToExport = [filters.type];
        } else {
          typesToExport = VEGETATION_TYPES;
        }
      } else if (mainTab === 'hydraulique') {
        if (filters.type !== 'all') {
          typesToExport = [filters.type];
        } else {
          typesToExport = HYDROLOGY_TYPES;
        }
      } else {
        // Tab 'tous'
        if (filters.type !== 'all') {
          typesToExport = [filters.type];
        } else {
          typesToExport = [...VEGETATION_TYPES, ...HYDROLOGY_TYPES];
        }
      }

      // Appeler la nouvelle API avec tous les filtres
      const blob = await exportInventoryPDF({
        types: typesToExport,
        site: filters.site,
        etat: filters.state,
        famille: filters.family,
        search: searchQuery
      });

      const filename = `inventaire_${new Date().toISOString().split('T')[0]}.pdf`;
      downloadBlob(blob, filename);
      showToast("Export PDF réussi", "success");
    } catch (error: any) {
      console.error("Erreur export PDF:", error);
      // 404 = pas de données à exporter
      if (error?.status === 404) {
        showToast("Aucune donnée à exporter", "info");
      } else {
        showToast("Erreur lors de l'export PDF", "error");
      }
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      type: 'all',
      state: 'all',
      site: 'all',
      intervention: 'all',
      family: 'all'
    });
    setCurrentPage(1);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.type, filters.state, filters.site, filters.intervention, filters.family]);

  const hasActiveFilters = filters.type !== 'all' || filters.state !== 'all' || filters.site !== 'all' || filters.intervention !== 'all' || filters.family !== 'all';

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
    <div className="p-6 h-full flex flex-col">
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

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-shrink-0 no-print">
        {/* Left: Main Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setMainTab('tous')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${mainTab === 'tous'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <FileText className="w-4 h-4" />
            Tous
          </button>
          <button
            onClick={() => setMainTab('vegetation')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${mainTab === 'vegetation'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <Leaf className="w-4 h-4" />
            Végétation
          </button>
          <button
            onClick={() => setMainTab('hydraulique')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${mainTab === 'hydraulique'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <Droplet className="w-4 h-4" />
            Hydraulique
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilters || hasActiveFilters
              ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filtres</span>
            {hasActiveFilters && (
              <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">
                {[filters.type, filters.state, filters.site, filters.intervention, filters.family].filter(v => v !== 'all').length}
              </span>
            )}
          </button>

          {/* Export Dropdown */}
          <ExportDropdown
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
            onPrint={handlePrint}
          />
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 pb-4 border-b border-slate-200 bg-slate-50 p-4 rounded-lg flex-shrink-0 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Site Filter */}
            <CustomSelect
              value={filters.site}
              onChange={(val) => setFilters({ ...filters, site: val })}
              options={[
                { value: 'all', label: 'Site: Tous' },
                ...sites.map(s => ({ value: s.id, label: s.name }))
              ]}
              icon={<MapPin className="w-4 h-4" />}
            />

            {/* State Filter */}
            <CustomSelect
              value={filters.state}
              onChange={(val) => setFilters({ ...filters, state: val })}
              options={[
                { value: 'all', label: 'État: Tous' },
                { value: 'bon', label: 'Bon' },
                { value: 'moyen', label: 'Moyen' },
                { value: 'mauvais', label: 'Mauvais' },
                { value: 'critique', label: 'Critique' }
              ]}
              icon={<Activity className="w-4 h-4" />}
            />

            {/* Family Filter - Only for vegetation */}
            {mainTab !== 'hydraulique' && (
              <CustomSelect
                value={filters.family}
                onChange={(val) => setFilters({ ...filters, family: val })}
                options={[
                  { value: 'all', label: 'Famille: Toutes' },
                  ...families.map(f => ({ value: f, label: f }))
                ]}
                icon={<Sprout className="w-4 h-4" />}
              />
            )}

            {/* Maintenance Filter */}
            <CustomSelect
              value={filters.intervention}
              onChange={(val) => setFilters({ ...filters, intervention: val })}
              options={[
                { value: 'all', label: 'Maintenance: Tout' },
                { value: 'urgent', label: 'Urgente (> 6 mois)' },
                { value: 'never', label: 'Jamais intervenu' },
                { value: 'recent_30', label: 'Récente (< 30j)' }
              ]}
              icon={<Wrench className="w-4 h-4" />}
            />
          </div>
          
          {/* Reset Button */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
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

      {/* Type Filter Tabs (Secondary) */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 flex-shrink-0 no-print">
        <button
          onClick={() => setFilters({ ...filters, type: 'all' })}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${filters.type === 'all'
            ? 'bg-emerald-600 text-white shadow-md'
            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
        >
          Tous
        </button>
        {getTypesForTab().map(type => (
          <button
            key={type}
            onClick={() => setFilters({ ...filters, type })}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${filters.type === type
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            {type}
          </button>
        ))}
      </div>

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
              selectedIds={new Set([...selectedIds].filter(id => visibleIds.has(id)))}
              onSelectionChange={handleSelectionChange}
              getItemId={(item) => item.id}
            />
          </>
        )}
      </div>

      {/* Floating Action Bar when items are selected */}
      {selectedItemsCache.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[95vw] no-print">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 px-4 py-3 flex items-center gap-4">
            {/* Selection count */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="bg-emerald-100 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full text-sm">
                {selectedItemsCache.size}
              </span>
              <span className="text-slate-600 text-sm whitespace-nowrap">
                sélectionné{selectedItemsCache.size > 1 ? 's' : ''}
              </span>
              {/* Show selected types - compact */}
              <div className="flex gap-1">
                {[...new Set(Array.from(selectedItemsCache.values()).map(item => item.type))].map(type => (
                  <span
                    key={type}
                    className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded capitalize"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-slate-200 flex-shrink-0"></div>

            {/* Incompatibility warning - compact */}
            {!isTaskCompatible && !compatibilityLoading && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-lg flex-shrink-0">
                <Ban className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs text-red-700 whitespace-nowrap">Types incompatibles</span>
              </div>
            )}

            {/* Compatibility info - compact */}
            {isTaskCompatible && applicableTasksCount !== null && !compatibilityLoading && (
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg flex-shrink-0">
                <span className="text-xs text-emerald-700 whitespace-nowrap">
                  ✓ {applicableTasksCount} tâche{applicableTasksCount > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Actions - compact buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Clear selection */}
              <button
                onClick={() => {
                  setSelectedIds(new Set());
                  setSelectedItemsCache(new Map());
                }}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Effacer la sélection"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Show on map */}
              <button
                onClick={() => {
                  const cachedItems = Array.from(selectedItemsCache.values());
                  const objectsForMap = cachedItems.map(item => ({
                    id: item.id,
                    type: item.type,
                    title: item.name,
                    subtitle: item.siteId,
                    coordinates: item.coordinates,
                    attributes: {
                      code: item.code,
                      state: item.state,
                      zone: item.zone
                    }
                  }));
                  navigate('/map', {
                    state: {
                      highlightFromInventory: true,
                      selectedObjects: objectsForMap
                    }
                  });
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium shadow-sm whitespace-nowrap"
              >
                <MapIcon className="w-4 h-4" />
                Carte
              </button>

              {/* Create task */}
              <button
                onClick={handleOpenTaskModal}
                disabled={!isTaskCompatible || compatibilityLoading || modalLoading}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium shadow-sm whitespace-nowrap ${
                  !isTaskCompatible || compatibilityLoading || modalLoading
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {compatibilityLoading || modalLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ClipboardList className="w-4 h-4" />
                    Tâche
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      {showTaskModal && (
        <TaskFormModal
          equipes={modalEquipes}
          typesTaches={modalTypesTaches}
          preSelectedObjects={preSelectedObjects}
          onClose={() => setShowTaskModal(false)}
          onSubmit={handleTaskSubmit}
        />
      )}

    </div>
  );
};

export default Inventory;
