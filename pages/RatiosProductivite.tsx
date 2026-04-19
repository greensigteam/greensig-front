import React, { useState, useEffect, useMemo } from 'react';
import { Edit2, Trash2, Eye, RefreshCw, Download, Search, Gauge, X } from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';
import { planningService } from '../services/planningService';
import LoadingScreen from '../components/LoadingScreen';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import RatioFormModal from '../components/modals/RatioFormModal';
import { useSearch } from '../contexts/SearchContext';
import { useToast } from '../contexts/ToastContext';
import {
  RatioProductivite,
  RatioProductiviteCreate,
  TypeTache,
  UNITE_MESURE_LABELS,
} from '../types/planning';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface RatiosProductiviteProps {
  triggerCreate?: number;
}

const RatiosProductivite: React.FC<RatiosProductiviteProps> = ({ triggerCreate }) => {
  const { showToast } = useToast();
  const { searchQuery, setSearchQuery, setPlaceholder } = useSearch();

  // Data
  const [, setRatios] = useState<RatioProductivite[]>([]);
  const [allRatios, setAllRatios] = useState<RatioProductivite[]>([]);
  const [typesTaches, setTypesTaches] = useState<TypeTache[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterTypeTache, setFilterTypeTache] = useState<number | 'all'>('all');
  const [filterTypeObjet, setFilterTypeObjet] = useState<string>('all');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState<RatioProductivite | null>(null);
  const [ratioToDelete, setRatioToDelete] = useState<number | null>(null);
  const [ratioDetails, setRatioDetails] = useState<RatioProductivite | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Set search placeholder
  useEffect(() => {
    setPlaceholder('Rechercher dans les ratios...');
    return () => {
      setPlaceholder('Rechercher...');
      setSearchQuery('');
    };
  }, [setPlaceholder, setSearchQuery]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Handle external trigger to open create modal
  useEffect(() => {
    if (triggerCreate && triggerCreate > 0) {
      setSelectedRatio(null);
      setShowForm(true);
    }
  }, [triggerCreate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ratiosData, typesData] = await Promise.all([
        planningService.getRatios(),
        planningService.getTypesTaches(),
      ]);
      setAllRatios(ratiosData);
      setRatios(ratiosData);
      setTypesTaches(typesData);
    } catch (err) {
      showToast('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter ratios
  const filteredRatios = useMemo(() => {
    return allRatios.filter((r) => {
      // Search filter
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const matchTypeTache = r.type_tache_nom?.toLowerCase().includes(query);
        const matchTypeObjet = r.type_objet?.toLowerCase().includes(query);
        const matchDescription = r.description?.toLowerCase().includes(query);
        if (!matchTypeTache && !matchTypeObjet && !matchDescription) {
          return false;
        }
      }
      // Type tache filter
      if (filterTypeTache !== 'all' && r.id_type_tache !== filterTypeTache) {
        return false;
      }
      // Type objet filter
      if (filterTypeObjet !== 'all' && r.type_objet !== filterTypeObjet) {
        return false;
      }
      return true;
    });
  }, [allRatios, debouncedSearchQuery, filterTypeTache, filterTypeObjet]);

  // Get unique type_objet values
  const uniqueTypeObjets = useMemo(() => {
    return [...new Set(allRatios.map((r) => r.type_objet))].sort();
  }, [allRatios]);

  // Count by type tache
  const countByTypeTache = useMemo(() => {
    const counts: Record<string, number> = { all: allRatios.length };
    for (const r of allRatios) {
      const key = String(r.id_type_tache);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [allRatios]);

  const handleCreate = async (data: RatioProductiviteCreate) => {
    await planningService.createRatio(data);
    await loadData();
  };

  const handleUpdate = async (data: RatioProductiviteCreate) => {
    if (!selectedRatio) return;
    await planningService.updateRatio(selectedRatio.id, data);
    await loadData();
  };

  const handleDelete = async () => {
    if (!ratioToDelete) return;
    try {
      await planningService.deleteRatio(ratioToDelete);
      showToast('Ratio supprimé avec succès', 'success');
      await loadData();
      setRatioToDelete(null);
    } catch (err) {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Type de tâche', "Type d'objet", 'Ratio', 'Unité', 'Statut', 'Description'].join(','),
      ...filteredRatios.map((r) =>
        [
          `"${r.type_tache_nom || ''}"`,
          `"${r.type_objet}"`,
          r.ratio,
          `"${UNITE_MESURE_LABELS[r.unite_mesure] || r.unite_mesure}"`,
          r.actif ? 'Actif' : 'Inactif',
          `"${r.description || ''}"`,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ratios_productivite_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast('Export CSV réussi', 'success');
  };

  // Columns for DataTable
  const columns: Column<RatioProductivite>[] = [
    {
      key: 'type_tache_nom',
      label: 'Type de tâche',
      render: (r) => <span className="font-medium text-slate-900">{r.type_tache_nom}</span>,
    },
    {
      key: 'type_objet',
      label: "Type d'objet",
      render: (r) => <span className="bg-slate-100 px-2 py-1 rounded text-sm">{r.type_objet}</span>,
    },
    {
      key: 'ratio',
      label: 'Ratio',
      render: (r) => (
        <span>
          <span className="font-mono font-bold text-emerald-600">{r.ratio}</span>
          <span className="text-slate-400 text-sm ml-1">/h</span>
        </span>
      ),
    },
    {
      key: 'unite_mesure',
      label: 'Unité',
      render: (r) => (
        <span className="text-slate-600 text-sm">
          {r.unite_mesure === 'm2' ? 'm²' : r.unite_mesure === 'ml' ? 'ml' : 'unités'}
        </span>
      ),
    },
    {
      key: 'actif',
      label: 'Statut',
      render: (r) =>
        r.actif ? (
          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">Actif</span>
        ) : (
          <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-full">
            Inactif
          </span>
        ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRatioDetails(r);
            }}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Voir les détails"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRatio(r);
              setShowForm(true);
            }}
            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
            title="Modifier"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRatioToDelete(r.id);
            }}
            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 z-50">
        <LoadingScreen isLoading={true} loop={true} minDuration={0} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Tache Filter */}
          <div className="flex items-center gap-2">
            <select
              value={filterTypeTache}
              onChange={(e) =>
                setFilterTypeTache(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="all">Tous les types ({countByTypeTache['all'] || 0})</option>
              {typesTaches.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom_tache} ({countByTypeTache[String(t.id)] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Type Objet Filter */}
          <div className="flex items-center gap-2">
            <select
              value={filterTypeObjet}
              onChange={(e) => setFilterTypeObjet(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="all">Tous les objets</option>
              {uniqueTypeObjets.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Results count */}
          <span className="text-sm text-slate-500">
            {filteredRatios.length} résultat{filteredRatios.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search indicator */}
      {debouncedSearchQuery && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-200">
          <Search className="w-4 h-4" />
          Recherche : <span className="font-medium">"{debouncedSearchQuery}"</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredRatios.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Gauge className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-lg font-medium">Aucun ratio trouvé</p>
            {(debouncedSearchQuery || filterTypeTache !== 'all' || filterTypeObjet !== 'all') && (
              <p className="text-sm mt-1">Essayez d'ajuster votre recherche ou vos filtres</p>
            )}
          </div>
        ) : (
          <DataTable data={filteredRatios} columns={columns} itemsPerPage={15} showExport={false} />
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <RatioFormModal
          ratio={selectedRatio || undefined}
          typesTaches={typesTaches}
          onClose={() => {
            setShowForm(false);
            setSelectedRatio(null);
          }}
          onSubmit={selectedRatio ? handleUpdate : handleCreate}
        />
      )}

      {/* Delete Confirmation Modal */}
      {ratioToDelete && (
        <ConfirmDeleteModal
          title="Supprimer ce ratio ?"
          message="Les calculs de charge utilisant ce ratio ne fonctionneront plus. Cette action est irréversible."
          onConfirm={handleDelete}
          onCancel={() => setRatioToDelete(null)}
        />
      )}

      {/* Details Modal */}
      {ratioDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <Gauge className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Détails du ratio</h2>
              </div>
              <button
                onClick={() => setRatioDetails(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Type de tâche</p>
                  <p className="font-medium text-slate-900">{ratioDetails.type_tache_nom}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Type d'objet</p>
                  <p className="font-medium text-slate-900">{ratioDetails.type_objet}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Ratio</p>
                  <p className="font-mono font-bold text-2xl text-emerald-600">
                    {ratioDetails.ratio}
                    <span className="text-slate-400 text-sm font-normal">/h</span>
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Unité</p>
                  <p className="font-medium text-slate-900">
                    {UNITE_MESURE_LABELS[ratioDetails.unite_mesure]}
                  </p>
                </div>
              </div>

              {/* Interpretation */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm text-emerald-800">
                  <strong>Interprétation :</strong> Un opérateur peut traiter{' '}
                  <span className="font-bold">{ratioDetails.ratio}</span>{' '}
                  {ratioDetails.unite_mesure === 'm2'
                    ? 'm²'
                    : ratioDetails.unite_mesure === 'ml'
                      ? 'mètres linéaires'
                      : 'unités'}{' '}
                  par heure pour "{ratioDetails.type_tache_nom}" sur "{ratioDetails.type_objet}".
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-500">Statut</span>
                {ratioDetails.actif ? (
                  <span className="bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                    Actif
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-500 text-sm font-medium px-3 py-1 rounded-full">
                    Inactif
                  </span>
                )}
              </div>

              {/* Description */}
              {ratioDetails.description && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Description</p>
                  <p className="text-slate-700">{ratioDetails.description}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setRatioDetails(null)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setSelectedRatio(ratioDetails);
                  setRatioDetails(null);
                  setShowForm(true);
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Modifier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RatiosProductivite;
