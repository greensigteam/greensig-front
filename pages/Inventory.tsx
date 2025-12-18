import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, X, MapPin, Calendar, FileText, Leaf, Droplet, AlertCircle, ClipboardList, Trash2 } from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { MOCK_INVENTORY, InventoryItem } from '../services/mockData';
import { fetchInventory, ApiError, type InventoryResponse, type InventoryFilters, fetchAllSites, type SiteFrontend, fetchFilterOptions } from '../services/api';

// Inventory Detail Modal
const InventoryDetailModal: React.FC<{
  item: InventoryItem;
  site?: SiteFrontend | null;
  onClose: () => void;
}> = ({ item, site, onClose }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'photos' | 'location' | 'history'>('info');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{item.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {item.code} • {site?.name || item.siteId} • {item.zone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-6">
            {[
              { id: 'info', label: 'Informations' },
              { id: 'photos', label: 'Photos' },
              { id: 'location', label: 'Localisation' },
              { id: 'history', label: 'Historique' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Type</label>
                <p className="mt-1 text-gray-900 capitalize">{item.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">État</label>
                <div className="mt-1">
                  <StatusBadge status={item.state} type="state" />
                </div>
              </div>
              {item.species && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Espèce</label>
                  <p className="mt-1 text-gray-900">{item.species}</p>
                </div>
              )}
              {item.height && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Hauteur</label>
                  <p className="mt-1 text-gray-900">{item.height} m</p>
                </div>
              )}
              {item.diameter && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Diamètre</label>
                  <p className="mt-1 text-gray-900">{item.diameter} cm</p>
                </div>
              )}
              {item.surface && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Surface</label>
                  <p className="mt-1 text-gray-900">{item.surface} m²</p>
                </div>
              )}
              {item.lastIntervention && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Dernière intervention</label>
                  <p className="mt-1 text-gray-900">{new Date(item.lastIntervention).toLocaleDateString('fr-FR')}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {item.photos.length > 0 ? (
                item.photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`${item.name} ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-gray-500">
                  Aucune photo disponible
                </div>
              )}
            </div>
          )}

          {activeTab === 'location' && (
            <div className="space-y-4">
              <div className="bg-gray-100 rounded-lg p-4 h-64 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-2" />
                  <p>Mini-carte à implémenter</p>
                  <p className="text-sm mt-1">
                    Coordonnées: {item.coordinates.lat.toFixed(4)}, {item.coordinates.lng.toFixed(4)}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Adresse</label>
                <p className="mt-1 text-gray-900">{site?.adresse || site?.description || item.siteId}</p>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>Historique des interventions</span>
              </div>
              <div className="text-center py-12 text-gray-500">
                Historique à implémenter (lié au module Interventions)
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Fermer
          </button>
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Voir le rapport
          </button>
        </div>
      </div>
    </div>
  );
};

// Types de végétation et hydrologie pour les filtres
const VEGETATION_TYPES = ['Arbre', 'Palmier', 'Gazon', 'Arbuste', 'Vivace', 'Cactus', 'Graminee'];
const HYDROLOGY_TYPES = ['Puit', 'Pompe', 'Vanne', 'Clapet', 'Canalisation', 'Aspersion', 'Goutte', 'Ballon'];

// Main Inventory Component
const Inventory: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [mainTab, setMainTab] = useState<'tous' | 'vegetation' | 'hydrologie'>('tous');

  // Selection state for creating tasks
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Advanced Filters
  const [filters, setFilters] = useState({
    type: 'all',
    state: 'all',
    site: 'all',
    intervention: 'all',
    family: 'all' // Nouveau filtre famille
  });
  const [showFilters, setShowFilters] = useState(false);
  const [families, setFamilies] = useState<string[]>([]); // État pour stocker la liste des familles

  // Debounce search term (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // API State
  const [apiInventory, setApiInventory] = useState<InventoryResponse | null>(null);
  const [isLoadingAPI, setIsLoadingAPI] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Sites fetched from backend (replace MOCK_SITES)
  const [sites, setSites] = useState<SiteFrontend[]>([]);

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

  // Current page for pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when switching tabs
  useEffect(() => {
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
        } else if (mainTab === 'hydrologie') {
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
        if (debouncedSearchTerm.trim()) {
          apiFilters.search = debouncedSearchTerm.trim();
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
  }, [mainTab, currentPage, filters, debouncedSearchTerm]);

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
        'Graminée': 'graminee',
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
        surface: props.area_sqm || undefined,
        coordinates: {
          lat: coords[1] || 0,
          lng: coords[0] || 0,
        },
        lastIntervention: props.last_intervention_date || undefined,
        photos: [],
      };
    });
  }, [apiInventory, sites]);


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
      { key: 'diameter', label: 'Densité', render: (item) => item.diameter || '-' },
      { key: 'lastIntervention', label: 'Dernière intervention', render: (item) => item.lastIntervention ? new Date(item.lastIntervention).toLocaleDateString('fr-FR') : '-' }
    ],
    'Vivace': [
      { key: 'name', label: 'Nom' },
      { key: 'siteId', label: 'Site', render: (item) => sites.find(s => s.id === item.siteId)?.name || item.siteId || '-' },
      { key: 'type', label: 'Type', render: (item) => <span className="capitalize">{item.type}</span> },
      { key: 'state', label: 'État', render: (item) => <StatusBadge status={item.state} type="state" />, sortable: false },
      { key: 'species', label: 'Famille', render: (item) => item.species || '-' },
      { key: 'diameter', label: 'Densité', render: (item) => item.diameter || '-' },
      { key: 'lastIntervention', label: 'Dernière intervention', render: (item) => item.lastIntervention ? new Date(item.lastIntervention).toLocaleDateString('fr-FR') : '-' }
    ],
    'Cactus': [
      { key: 'name', label: 'Nom' },
      { key: 'siteId', label: 'Site', render: (item) => sites.find(s => s.id === item.siteId)?.name || item.siteId || '-' },
      { key: 'type', label: 'Type', render: (item) => <span className="capitalize">{item.type}</span> },
      { key: 'state', label: 'État', render: (item) => <StatusBadge status={item.state} type="state" />, sortable: false },
      { key: 'species', label: 'Famille', render: (item) => item.species || '-' },
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

  // Export function (adapté aux colonnes dynamiques)
  const handleExport = () => {
    const filename = `inventaire_${filters.type !== 'all' ? filters.type + '_' : ''}${new Date().toISOString().split('T')[0]}.csv`;

    // Générer les en-têtes basés sur les colonnes actuelles
    const headers = columns.map(col => col.label);

    // Générer les données basées sur les colonnes actuelles
    const dataToExport = inventoryData.map(item => {
      return columns.map(col => {
        if (col.render) {
          // Pour les colonnes avec render personnalisé, extraire la valeur
          if (col.key === 'siteId') {
            const site = sites.find(s => s.id === item.siteId);
            return site?.name || item.siteId || '-';
          } else if (col.key === 'type') {
            return item.type;
          } else if (col.key === 'state') {
            return item.state;
          } else if (col.key === 'species') {
            return item.species || '-';
          } else if (col.key === 'height') {
            return item.height ? `${item.height} m` : '-';
          } else if (col.key === 'diameter') {
            return item.diameter ? `${item.diameter} cm` : '-';
          } else if (col.key === 'surface') {
            return item.surface ? `${item.surface} m²` : '-';
          } else if (col.key === 'lastIntervention') {
            return item.lastIntervention ? new Date(item.lastIntervention).toLocaleDateString('fr-FR') : '-';
          }
        }
        // Pour les colonnes simples, retourner la valeur directement
        return (item as any)[col.key] || '-';
      });
    });

    if (dataToExport.length === 0) {
      alert("Aucune donnée à exporter.");
      return;
    }

    // Add BOM for Excel UTF-8 compatibility
    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...dataToExport.map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
      case 'hydrologie':
        return HYDROLOGY_TYPES;
      default:
        return [...VEGETATION_TYPES, ...HYDROLOGY_TYPES];
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventaire</h1>
        <p className="text-gray-500 mt-1">
          Consultation du patrimoine vert • {apiInventory?.count || 0} élément{(apiInventory?.count || 0) > 1 ? 's' : ''} au total
        </p>
      </div>

      {/* Main Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setMainTab('tous')}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${mainTab === 'tous'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <FileText className="w-4 h-4" />
            Tous
          </button>
          <button
            onClick={() => setMainTab('vegetation')}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${mainTab === 'vegetation'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <Leaf className="w-4 h-4" />
            Végétation
          </button>
          <button
            onClick={() => setMainTab('hydrologie')}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${mainTab === 'hydrologie'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <Droplet className="w-4 h-4" />
            Hydrologie
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, code, zone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilters || hasActiveFilters
              ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
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

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Exporter</span>
          </button>
        </div>

        {/* Indicateur de vue polymorphe */}
        {filters.type !== 'all' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <FileText className="w-4 h-4" />
            <span>
              Vue détaillée : <strong>{filters.type}</strong> - Colonnes spécifiques affichées
            </span>
          </div>
        )}

        {/* Type Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200">
          <button
            onClick={() => setFilters({ ...filters, type: 'all' })}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${filters.type === 'all'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
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
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Filters Panel */}
      {/* Filters Panel (Compact V2) */}
      {showFilters && (
        <div className="mb-6 pb-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Reset Button (Moved to start for better workflow) */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Réinitialiser les filtres"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Site Filter */}
            <div className="relative group">
              <select
                value={filters.site}
                onChange={(e) => setFilters({ ...filters, site: e.target.value })}
                className="appearance-none bg-white min-w-[160px] pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 hover:border-emerald-400 outline-none transition-all cursor-pointer"
              >
                <option value="all">📍 Site: Tous</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-emerald-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            {/* State Filter */}
            <div className="relative group">
              <select
                value={filters.state}
                onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                className="appearance-none bg-white min-w-[160px] pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 hover:border-emerald-400 outline-none transition-all cursor-pointer"
              >
                <option value="all">❤️ État: Tous</option>
                <option value="bon">✅ Bon</option>
                <option value="moyen">⚠️ Moyen</option>
                <option value="mauvais">🛑 Mauvais</option>
                <option value="critique">💀 Critique</option>
              </select>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-emerald-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            {/* Family Filter */}
            <div className="relative group">
              <select
                value={filters.family}
                onChange={(e) => setFilters({ ...filters, family: e.target.value })}
                className="appearance-none bg-white min-w-[160px] pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 hover:border-emerald-400 outline-none transition-all cursor-pointer"
              >
                <option value="all">🌿 Famille: Toutes</option>
                {families.map((fam) => (
                  <option key={fam} value={fam}>
                    {fam}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-emerald-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            {/* Maintenance Filter */}
            <div className="relative group flex-grow sm:flex-grow-0">
              <select
                value={filters.intervention}
                onChange={(e) => setFilters({ ...filters, intervention: e.target.value })}
                className="appearance-none w-full sm:w-auto bg-white min-w-[200px] pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 hover:border-emerald-400 outline-none transition-all cursor-pointer"
              >
                <option value="all">🛠️ Maintenance: Tout</option>
                <option value="urgent">⚠️ Urgente (&gt; 6 mois)</option>
                <option value="never">🆕 Jamais intervenu</option>
                <option value="recent_30">📅 Récente (&lt; 30j)</option>
              </select>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-emerald-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="flex-1 overflow-auto min-h-[400px]">
        {/* Loading State */}
        {isLoadingAPI && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-2"></div>
              <p className="text-gray-600">Chargement de l'inventaire...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {apiError && !isLoadingAPI && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur de chargement</h3>
              <p className="text-red-600 mb-4">{apiError}</p>
              <p className="text-sm text-gray-600">Vérifiez que le serveur Django est démarré.</p>
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
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              getItemId={(item) => item.id}
            />
          </>
        )}
      </div>

      {/* Floating Action Bar when items are selected */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 px-6 py-4 flex items-center gap-6">
            {/* Selection count */}
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded-full">
                {selectedIds.size}
              </span>
              <span className="text-gray-600">
                objet{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
              </span>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-200"></div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Clear selection */}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Effacer
              </button>

              {/* Create task */}
              <button
                onClick={() => {
                  // Get selected items data
                  const selectedItems = inventoryData.filter(item => selectedIds.has(item.id));
                  const objectsForPlanning = selectedItems.map(item => ({
                    id: parseInt(item.id, 10),
                    type: item.type,
                    nom: item.name,
                    site: typeof item.siteId === 'string' ? item.siteId : sites.find(s => s.id === item.siteId)?.name || '',
                    soussite: item.zone
                  }));

                  // Navigate to Planning page with pre-selected objects
                  navigate('/planning', {
                    state: {
                      createTaskFromSelection: true,
                      preSelectedObjects: objectsForPlanning,
                      objectCount: selectedItems.length
                    }
                  });
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium shadow-sm"
              >
                <ClipboardList className="w-4 h-4" />
                Créer une tâche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;