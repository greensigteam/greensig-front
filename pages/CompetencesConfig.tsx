import React, { useState, useEffect, useMemo } from 'react';
import { Search, Edit2, Trash2, Award, RefreshCw, Download } from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';
import { useSearch } from '../contexts/SearchContext';
import { useToast } from '../contexts/ToastContext';
import CompetenceModal from '../components/modals/CompetenceModal';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import LoadingScreen from '../components/LoadingScreen';

// Types
import { Competence, CATEGORIE_COMPETENCE_LABELS } from '../types/users';

// API
import { fetchCompetences, deleteCompetence } from '../services/usersApi';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CompetencesConfigProps {
  triggerCreate?: number;
}

const CompetencesConfig: React.FC<CompetencesConfigProps> = ({ triggerCreate }) => {
  const { searchQuery, setSearchQuery, setPlaceholder } = useSearch();
  const { showToast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modals
  const [showCompetenceModal, setShowCompetenceModal] = useState(false);
  const [editingCompetence, setEditingCompetence] = useState<Competence | null>(null);
  const [deleteCompetenceId, setDeleteCompetenceId] = useState<number | null>(null);

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update search placeholder and cleanup on unmount
  useEffect(() => {
    setPlaceholder('Rechercher une compétence (nom, catégorie, description)...');
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
      setEditingCompetence(null);
      setShowCompetenceModal(true);
    }
  }, [triggerCreate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const competencesRes = await fetchCompetences();
      setCompetences(competencesRes);
    } catch (error) {
      showToast('Erreur lors du chargement des compétences', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter competences
  const filteredCompetences = useMemo(() => {
    return competences
      .filter((c) => {
        // Filtre par recherche
        if (debouncedSearchQuery) {
          const query = debouncedSearchQuery.toLowerCase();
          const matchNom = c.nomCompetence.toLowerCase().includes(query);
          const matchDescription = c.description?.toLowerCase().includes(query);
          const matchCategorie = CATEGORIE_COMPETENCE_LABELS[c.categorie]
            ?.toLowerCase()
            .includes(query);
          if (!matchNom && !matchDescription && !matchCategorie) {
            return false;
          }
        }
        // Filtre par categorie
        if (categoryFilter !== 'all' && c.categorie !== categoryFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.ordreAffichage || 0) - (b.ordreAffichage || 0));
  }, [competences, debouncedSearchQuery, categoryFilter]);

  // Count by category
  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = { all: competences.length };
    for (const c of competences) {
      counts[c.categorie] = (counts[c.categorie] || 0) + 1;
    }
    return counts;
  }, [competences]);

  // Columns
  const competencesColumns: Column<Competence>[] = [
    { key: 'nomCompetence', label: 'Compétence' },
    {
      key: 'categorieDisplay',
      label: 'Catégorie',
      render: (c: Competence) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {c.categorieDisplay || c.categorie}
        </span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (c: Competence) => (
        <span className="text-sm text-gray-600 truncate max-w-xs block">
          {c.description || '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (c: Competence) => (
        <div className="flex items-center gap-2">
          <button
            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setEditingCompetence(c);
              setShowCompetenceModal(true);
            }}
            title="Modifier"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteCompetenceId(c.id);
            }}
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      sortable: false,
    },
  ];

  const handleDeleteCompetence = async () => {
    if (!deleteCompetenceId) return;
    try {
      await deleteCompetence(deleteCompetenceId);
      showToast('Compétence supprimée avec succès', 'success');
      setDeleteCompetenceId(null);
      loadData();
    } catch (error) {
      showToast('Erreur lors de la suppression de la compétence', 'error');
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Compétence', 'Catégorie', 'Description'].join(','),
      ...filteredCompetences.map((c) =>
        [
          `"${c.nomCompetence}"`,
          `"${c.categorieDisplay || c.categorie}"`,
          `"${c.description || ''}"`,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `competences_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast('Export CSV réussi', 'success');
  };

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
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          {/* Category Filter Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-white shadow-sm text-slate-900 font-medium'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Toutes ({countByCategory['all'] || 0})
            </button>
            {Object.entries(CATEGORIE_COMPETENCE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setCategoryFilter(key)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  categoryFilter === key
                    ? 'bg-white shadow-sm text-slate-900 font-medium'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label} ({countByCategory[key] || 0})
              </button>
            ))}
          </div>

          {/* Results count */}
          <span className="text-sm text-slate-500">
            {filteredCompetences.length} résultat{filteredCompetences.length > 1 ? 's' : ''}
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
        {filteredCompetences.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Award className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-lg font-medium">Aucune compétence trouvée</p>
            {(debouncedSearchQuery || categoryFilter !== 'all') && (
              <p className="text-sm mt-1">Essayez d'ajuster votre recherche ou vos filtres</p>
            )}
          </div>
        ) : (
          <DataTable
            data={filteredCompetences}
            columns={competencesColumns}
            itemsPerPage={15}
            showExport={false}
          />
        )}
      </div>

      {/* Modals */}
      {showCompetenceModal && (
        <CompetenceModal
          initial={editingCompetence || undefined}
          onClose={() => {
            setShowCompetenceModal(false);
            setEditingCompetence(null);
          }}
          onSaved={loadData}
        />
      )}

      {deleteCompetenceId !== null && (
        <ConfirmDeleteModal
          title="Supprimer la compétence ?"
          message="Cette action est irréversible. La compétence sera retirée de tous les opérateurs qui la possèdent."
          onConfirm={handleDeleteCompetence}
          onCancel={() => setDeleteCompetenceId(null)}
        />
      )}
    </div>
  );
};

export default CompetencesConfig;
