import React, { useState, useEffect, useMemo } from 'react';
import { Search, Edit2, Trash2, Award, X, Filter, RotateCcw, Download, FileDown, Layers, CheckCircle2 } from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';
import { useSearch } from '../contexts/SearchContext';
import { useToast } from '../contexts/ToastContext';
import CompetenceModal from '../components/modals/CompetenceModal';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import LoadingScreen from '../components/LoadingScreen';

// Types
import {
  Competence,
  CategorieCompetence,
  CATEGORIE_COMPETENCE_LABELS,
  Utilisateur
} from '../types/users';

// API
import {
  fetchCompetences,
  createCompetence,
  updateCompetence,
  deleteCompetence,
  fetchCurrentUser
} from '../services/usersApi';

/**
 * Page de configuration des compétences (Admin only)
 * Gère le CRUD complet des compétences : création, édition, suppression, ordre d'affichage
 */
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
  const [competenceFilter, setCompetenceFilter] = useState<string>('');

  // Modals
  const [showCompetenceModal, setShowCompetenceModal] = useState(false);
  const [editingCompetence, setEditingCompetence] = useState<Competence | null>(null);
  const [deleteCompetenceId, setDeleteCompetenceId] = useState<number | null>(null);

  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);

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
    loadCurrentUser();
  }, []);

  // Handle external trigger to open create modal
  useEffect(() => {
    if (triggerCreate && triggerCreate > 0) {
      setEditingCompetence(null);
      setShowCompetenceModal(true);
    }
  }, [triggerCreate]);

  const loadCurrentUser = async () => {
    try {
      const user = await fetchCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const competencesRes = await fetchCompetences();
      setCompetences(competencesRes);
    } catch (error) {
      console.error('Erreur chargement compétences:', error);
      showToast('Erreur lors du chargement des compétences', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter competences
  const filteredCompetences = useMemo(() => {
    return competences.filter(c => {
      // Filtre par recherche
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const matchNom = c.nomCompetence.toLowerCase().includes(query);
        const matchDescription = c.description?.toLowerCase().includes(query);
        const matchCategorie = CATEGORIE_COMPETENCE_LABELS[c.categorie]?.toLowerCase().includes(query);
        if (!matchNom && !matchDescription && !matchCategorie) {
          return false;
        }
      }
      // Filtre par categorie
      if (competenceFilter && c.categorie !== competenceFilter) {
        return false;
      }
      return true;
    }).sort((a, b) => (a.ordreAffichage || 0) - (b.ordreAffichage || 0));
  }, [competences, debouncedSearchQuery, competenceFilter]);

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
      )
    },
    {
      key: 'description',
      label: 'Description',
      render: (c: Competence) => (
        <span className="text-sm text-gray-600">
          {c.description || '-'}
        </span>
      )
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
      sortable: false
    }
  ];

  const handleDeleteCompetence = async () => {
    if (!deleteCompetenceId) return;
    try {
      await deleteCompetence(deleteCompetenceId);
      showToast('Compétence supprimée avec succès', 'success');
      setDeleteCompetenceId(null);
      loadData();
    } catch (error) {
      console.error('Erreur suppression compétence:', error);
      showToast('Erreur lors de la suppression de la compétence', 'error');
    }
  };

  const handleResetFilters = () => {
    setCompetenceFilter('');
  };

  const hasActiveFilters = competenceFilter !== '' || (debouncedSearchQuery && debouncedSearchQuery.trim());

  const handleExportCSV = () => {
    const csvContent = [
      ['Compétence', 'Catégorie', 'Description'].join(','),
      ...filteredCompetences.map(c => [
        `"${c.nomCompetence}"`,
        `"${c.categorieDisplay || c.categorie}"`,
        `"${c.description || ''}"`
      ].join(','))
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
    <div className="p-4 sm:p-6 h-full flex flex-col overflow-hidden">
      {/* Modern Filters & Actions Bar */}
      <div className="mb-6 flex-shrink-0">
        {/* Search Badge */}
        {debouncedSearchQuery && debouncedSearchQuery.trim() && (
          <div className="mb-3 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm border border-blue-200 inline-flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
            <Search className="w-4 h-4" />
            Recherche : <span className="font-bold">"{debouncedSearchQuery}"</span>
          </div>
        )}

        {/* Filters Card */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 bg-white/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-700">Filtres et Actions</h3>
              {hasActiveFilters && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Actifs
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all duration-200 hover:shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Réinitialiser
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Filter */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                  <Layers className="w-3.5 h-3.5" />
                  Catégorie
                </label>
                <div className="relative">
                  <select
                    value={competenceFilter}
                    onChange={(e) => setCompetenceFilter(e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200 appearance-none cursor-pointer hover:border-slate-400"
                  >
                    <option value="">Toutes les catégories</option>
                    {Object.entries(CATEGORIE_COMPETENCE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Export Button */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                  <FileDown className="w-3.5 h-3.5" />
                  Export
                </label>
                <button
                  onClick={handleExportCSV}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Exporter en CSV
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm text-slate-600">
                    <span className="font-bold text-slate-800">{filteredCompetences.length}</span> compétence{filteredCompetences.length > 1 ? 's' : ''}
                  </span>
                </div>
                {(debouncedSearchQuery || competenceFilter) && (
                  <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                    <Filter className="w-3 h-3" />
                    Filtré{filteredCompetences.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-500">
                Total : <span className="font-semibold text-slate-700">{competences.length}</span> compétences
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <DataTable
          data={filteredCompetences}
          columns={competencesColumns}
          itemsPerPage={15}
          showExport={false}
        />
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
