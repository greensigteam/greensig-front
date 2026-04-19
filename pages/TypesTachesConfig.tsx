import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Edit2, Trash2, FileText, Search, RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';
import { planningService } from '../services/planningService';
import LoadingScreen from '../components/LoadingScreen';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import TypeTacheFormModal from '../components/modals/TypeTacheFormModal';
import { useSearch } from '../contexts/SearchContext';
import { useToast } from '../contexts/ToastContext';
import { TypeTache, TypeTacheCreate, RatioProductivite } from '../types/planning';

// ============================================================================
// TYPES
// ============================================================================

interface TypeTacheWithRatiosCount extends TypeTache {
  ratios: RatioProductivite[];
  activeRatiosCount: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface TypesTachesConfigProps {
  triggerCreate?: number;
}

const TypesTachesConfig: React.FC<TypesTachesConfigProps> = ({ triggerCreate }) => {
  const { showToast } = useToast();
  const { searchQuery, setSearchQuery, setPlaceholder } = useSearch();

  // Data state
  const [typesTaches, setTypesTaches] = useState<TypeTache[]>([]);
  const [ratiosByTypeTache, setRatiosByTypeTache] = useState<Record<number, RatioProductivite[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [selectedTypeTache, setSelectedTypeTache] = useState<TypeTache | null>(null);
  const [selectedCompatibleObjects, setSelectedCompatibleObjects] = useState<string[]>([]);
  const [typeTacheToDelete, setTypeTacheToDelete] = useState<TypeTache | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Set search placeholder
  useEffect(() => {
    setPlaceholder('Rechercher un type de tâche (nom, symbole, description)...');
    return () => {
      setPlaceholder('Rechercher...');
      setSearchQuery('');
    };
  }, [setPlaceholder, setSearchQuery]);

  useEffect(() => {
    loadData();
  }, []);

  // Handle external trigger to open create modal
  useEffect(() => {
    if (triggerCreate && triggerCreate > 0) {
      setSelectedTypeTache(null);
      setSelectedCompatibleObjects([]);
      setShowForm(true);
    }
  }, [triggerCreate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [types, allRatios] = await Promise.all([
        planningService.getTypesTaches(),
        planningService.getRatios(),
      ]);

      setTypesTaches(types);

      // Group ratios by task type
      const grouped: Record<number, RatioProductivite[]> = {};
      for (const ratio of allRatios) {
        if (!grouped[ratio.id_type_tache]) {
          grouped[ratio.id_type_tache] = [];
        }
        grouped[ratio.id_type_tache]!.push(ratio);
      }
      setRatiosByTypeTache(grouped);
    } catch (err) {
      showToast('Erreur lors du chargement des types de tâches', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter by search
  const filteredTypes = useMemo((): TypeTacheWithRatiosCount[] => {
    let filtered = typesTaches;

    if (debouncedSearchQuery && debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.nom_tache.toLowerCase().includes(query) ||
          t.symbole?.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query),
      );
    }

    // Add ratios and counter
    return filtered.map((t) => {
      const ratios = ratiosByTypeTache[t.id] || [];
      const activeRatios = ratios.filter((r) => r.actif);
      return {
        ...t,
        ratios,
        activeRatiosCount: activeRatios.length,
      };
    });
  }, [typesTaches, debouncedSearchQuery, ratiosByTypeTache]);

  const handleEdit = useCallback(
    (typeTache: TypeTacheWithRatiosCount) => {
      const ratios = ratiosByTypeTache[typeTache.id] || [];
      const compatibleObjects = ratios.filter((r) => r.actif).map((r) => r.type_objet);
      setSelectedTypeTache(typeTache);
      setSelectedCompatibleObjects(compatibleObjects);
      setShowForm(true);
    },
    [ratiosByTypeTache],
  );

  const handleSave = async (data: TypeTacheCreate, compatibleObjects: string[]) => {
    const ratiosToCreate = compatibleObjects.map((type_objet) => ({
      type_objet,
      ratio: 1,
      unite_mesure: 'm2' as const,
      actif: true,
    }));

    await planningService.saveTypeTacheWithRatios(data, ratiosToCreate, selectedTypeTache?.id);

    await loadData();
  };

  const handleDelete = async () => {
    if (!typeTacheToDelete) return;
    try {
      // Delete all associated ratios first
      const ratios = ratiosByTypeTache[typeTacheToDelete.id] || [];
      for (const ratio of ratios) {
        await planningService.deleteRatio(ratio.id);
      }
      // Then delete the task type
      await planningService.deleteTypeTache(typeTacheToDelete.id);
      showToast('Type de tâche supprimé', 'success');
      await loadData();
      setTypeTacheToDelete(null);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la suppression', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    let successCount = 0;
    let errorCount = 0;

    for (const idStr of selectedIds) {
      const id = parseInt(idStr, 10);
      try {
        const ratios = ratiosByTypeTache[id] || [];
        for (const ratio of ratios) {
          await planningService.deleteRatio(ratio.id);
        }
        await planningService.deleteTypeTache(id);
        successCount++;
      } catch (err) {
        errorCount++;
      }
    }

    if (successCount > 0) {
      showToast(`${successCount} type(s) de tâche supprimé(s)`, 'success');
    }
    if (errorCount > 0) {
      showToast(`${errorCount} erreur(s) lors de la suppression`, 'error');
    }

    setSelectedIds(new Set());
    setShowBulkDeleteModal(false);
    await loadData();
  };

  const handleExportCSV = useCallback(() => {
    const csvContent = [
      ['Nom', 'Symbole', 'Description', 'Objets compatibles'].join(','),
      ...filteredTypes.map((t) => {
        const activeRatios = t.ratios.filter((r) => r.actif);
        return [
          `"${t.nom_tache}"`,
          `"${t.symbole || ''}"`,
          `"${t.description || ''}"`,
          `"${activeRatios.map((r) => r.type_objet).join(', ')}"`,
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `types_taches_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast('Export CSV réussi', 'success');
  }, [filteredTypes, showToast]);

  // Columns for DataTable
  const columns: Column<TypeTacheWithRatiosCount>[] = useMemo(
    () => [
      {
        key: 'nom_tache',
        label: 'Nom',
        render: (t) => (
          <div>
            <div className="font-medium text-slate-900">{t.nom_tache}</div>
            {t.description && (
              <div className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{t.description}</div>
            )}
          </div>
        ),
      },
      {
        key: 'symbole',
        label: 'Symbole',
        render: (t) =>
          t.symbole ? (
            <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">{t.symbole}</span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        key: 'activeRatiosCount',
        label: 'Objets compatibles',
        render: (t) => {
          const activeRatios = t.ratios.filter((r) => r.actif);
          if (activeRatios.length === 0) {
            return (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Aucun objet
              </span>
            );
          }
          return (
            <div className="flex flex-wrap gap-1">
              {activeRatios.slice(0, 4).map((r) => (
                <span
                  key={r.id}
                  className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded"
                >
                  {r.type_objet}
                </span>
              ))}
              {activeRatios.length > 4 && (
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                  +{activeRatios.length - 4}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        render: (t) => (
          <div className="flex items-center gap-2">
            <button
              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(t);
              }}
              title="Modifier"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setTypeTacheToDelete(t);
              }}
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    [handleEdit],
  );

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
          {/* Selection info */}
          {selectedIds.size > 0 ? (
            <>
              <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-800 text-sm rounded-lg hover:bg-slate-100 transition-colors"
              >
                Désélectionner
              </button>
            </>
          ) : (
            <span className="text-sm text-slate-500">
              {filteredTypes.length} type{filteredTypes.length > 1 ? 's' : ''} de tâche
            </span>
          )}
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
        {filteredTypes.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-lg font-medium">Aucun type de tâche trouvé</p>
            {debouncedSearchQuery && (
              <p className="text-sm mt-1">Essayez d'ajuster votre recherche</p>
            )}
          </div>
        ) : (
          <DataTable
            data={filteredTypes}
            columns={columns}
            itemsPerPage={15}
            showExport={false}
            selectable={true}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            getItemId={(item) => String(item.id)}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <TypeTacheFormModal
          initial={selectedTypeTache}
          existingCompatibleObjects={selectedCompatibleObjects}
          onClose={() => {
            setShowForm(false);
            setSelectedTypeTache(null);
            setSelectedCompatibleObjects([]);
          }}
          onSaved={handleSave}
        />
      )}

      {/* Delete Confirmation Modal (single) */}
      {typeTacheToDelete && (
        <ConfirmDeleteModal
          title="Supprimer ce type de tâche ?"
          message={`Le type "${typeTacheToDelete.nom_tache}" et tous ses ratios de productivité associés seront supprimés. Les tâches existantes utilisant ce type ne seront pas affectées mais vous ne pourrez plus créer de nouvelles tâches de ce type.`}
          onConfirm={handleDelete}
          onCancel={() => setTypeTacheToDelete(null)}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <ConfirmDeleteModal
          title={`Supprimer ${selectedIds.size} type${selectedIds.size > 1 ? 's' : ''} de tâche ?`}
          message={`Cette action supprimera ${selectedIds.size} type${selectedIds.size > 1 ? 's' : ''} de tâche et tous leurs ratios de productivité associés. Les tâches existantes utilisant ces types ne seront pas affectées.`}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteModal(false)}
        />
      )}
    </div>
  );
};

export default TypesTachesConfig;
