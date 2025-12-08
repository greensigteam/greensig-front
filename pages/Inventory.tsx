import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, X, MapPin, Calendar, FileText, Leaf, Droplet, AlertCircle } from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { MOCK_INVENTORY, InventoryItem } from '../services/mockData';
import { fetchInventory, ApiError, type InventoryResponse, type InventoryFilters, fetchAllSites, type SiteFrontend } from '../services/api';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [mainTab, setMainTab] = useState<'tous' | 'vegetation' | 'hydrologie'>('tous');

  // Advanced Filters
  const [filters, setFilters] = useState({
    type: 'all',
    state: 'all',
    site: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

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
    const loadSites = async () => {
      try {
        const s = await fetchAllSites();
        if (mounted) setSites(s);
      } catch (err) {
        console.error('Erreur chargement sites:', err);
      }
    };
    loadSites();
    return () => { mounted = false };
  }, []);

  // Current page for pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when switching tabs
  useEffect(() => {
    setCurrentPage(1);
    setFilters({ type: 'all', state: 'all', site: 'all' });
  }, [mainTab]);

  // Fetch inventory from API on mount and when filters change
  useEffect(() => {
    const loadInventory = async () => {
      setIsLoadingAPI(true);
      setApiError(null);
      try {
        // Build filters object
        const apiFilters: InventoryFilters = {
          page: currentPage,
          page_size: 20
        };

        // Apply type filter based on active tab and selected filter
        if (mainTab === 'vegetation' && filters.type !== 'all') {
          apiFilters.type = filters.type; // Arbre, Palmier, etc.
        } else if (mainTab === 'hydrologie' && filters.type !== 'all') {
          apiFilters.type = filters.type; // Puit, Pompe, etc.
        } else if (mainTab === 'tous' && filters.type !== 'all') {
          apiFilters.type = filters.type;
        }

        // Site filter
        if (filters.site !== 'all') {
          apiFilters.site = parseInt(filters.site);
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
      const coords = feature.geometry.type === 'Point'
        ? feature.geometry.coordinates as number[]
        : feature.geometry.type === 'Polygon'
        ? (feature.geometry.coordinates as number[][][])[0][0]
        : [0, 0];

      // Map object_type to InventoryItem type
      const typeMapping: Record<string, InventoryItem['type']> = {
        'Arbre': 'arbre',
        'Palmier': 'arbre',
        'Gazon': 'gazon',
        'Arbuste': 'gazon',
        'Vivace': 'gazon',
        'Cactus': 'gazon',
        'Graminée': 'gazon',
        'Puit': 'equipement',
        'Pompe': 'equipement',
        'Vanne': 'equipement',
        'Clapet': 'equipement',
        'Canalisation': 'reseau',
        'Aspersion': 'reseau',
        'Goutte': 'reseau',
        'Ballon': 'equipement',
      };

      const featureId = feature.id ?? props.id ?? 0;

      // Try to map returned site name to a known site id (if sites were loaded)
      const matchedSite = sites.find(s => s.name && props.site_nom && s.name.toLowerCase() === String(props.site_nom).toLowerCase());

      return {
        id: featureId.toString(),
        type: typeMapping[props.object_type] || 'equipement',
        code: props.code || `${props.object_type}-${featureId}`,
        name: props.nom || `${props.object_type} ${featureId}`,
        siteId: matchedSite ? matchedSite.id : (props.site_nom || 'unknown'),
        zone: props.sous_site_nom || props.site_nom || 'Non définie',
        state: 'bon' as const,
        species: props.famille || undefined,
        height: props.hauteur || undefined,
        diameter: props.diametre || undefined,
        surface: props.surface || undefined,
        coordinates: {
          lat: coords[1] || 0,
          lng: coords[0] || 0,
        },
        lastIntervention: props.last_intervention_date || undefined,
        photos: [],
      };
    });
  }, [apiInventory, sites]);


  // Table columns
  const columns: Column<InventoryItem>[] = [
    {
      key: 'type',
      label: 'Type',
      render: (item) => <span className="capitalize">{item.type}</span>
    },
    {
      key: 'code',
      label: 'Code',
      render: (item) => <span className="font-mono text-sm">{item.code}</span>
    },
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
      key: 'zone',
      label: 'Zone'
    },
    {
      key: 'state',
      label: 'État',
      render: (item) => <StatusBadge status={item.state} type="state" />,
      sortable: false
    },
    {
      key: 'surface',
      label: 'Surface',
      render: (item) => item.surface ? `${item.surface} m²` : '-'
    },
    {
      key: 'lastIntervention',
      label: 'Dernière intervention',
      render: (item) =>
        item.lastIntervention
          ? new Date(item.lastIntervention).toLocaleDateString('fr-FR')
          : '-'
    }
  ];

  // Export function
  const handleExport = () => {
    const filename = `inventaire_${new Date().toISOString().split('T')[0]}.csv`;
    const headers = ['Type', 'Code', 'Nom', 'Site', 'Zone', 'État', 'Surface (m²)', 'Dernière Intervention'];
    const dataToExport = inventoryData.map(item => {
      const site = sites.find(s => s.id === item.siteId);
      return [
        item.type,
        item.code,
        item.name,
        site?.name || item.siteId || '-',
        item.zone,
        item.state,
        item.surface || '',
        item.lastIntervention ? new Date(item.lastIntervention).toLocaleDateString('fr-FR') : ''
      ];
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
      site: 'all'
    });
    setCurrentPage(1);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.type, filters.state, filters.site]);

  const hasActiveFilters = filters.type !== 'all' || filters.state !== 'all' || filters.site !== 'all';

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
                {[filters.type, filters.state, filters.site].filter(v => v !== 'all').length}
              </span>
            )}
          </button>
        </div>

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
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Site Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site</label>
              <select
                value={filters.site}
                onChange={(e) => setFilters({ ...filters, site: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="all">Tous</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={resetFilters}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
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
              onRowClick={setSelectedItem}
              itemsPerPage={10}
              showExport
              onExport={handleExport}
            />
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <InventoryDetailModal
          item={selectedItem}
          site={sites.find(s => s.id === selectedItem.siteId) || undefined}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
};

export default Inventory;
