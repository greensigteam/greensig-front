import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Award, X } from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';
import { useSearch } from '../contexts/SearchContext';
import { useToast } from '../contexts/ToastContext';
import CompetenceModal from '../components/modals/CompetenceModal';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';

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
const CompetencesConfig: React.FC = () => {
  const { searchQuery, setPlaceholder } = useSearch();
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

  // Update search placeholder
  useEffect(() => {
    setPlaceholder('Rechercher une compétence (nom, catégorie, description)...');
  }, [setPlaceholder]);

  // Load data on mount
  useEffect(() => {
    loadData();
    loadCurrentUser();
  }, []);

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
      key: 'ordreAffichage',
      label: 'Ordre',
      render: (c: Competence) => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
          {c.ordreAffichage || 0}
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

  if (loading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Award className="w-7 h-7 text-emerald-600" />
              Configuration des Compétences
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Gérez les compétences disponibles dans le système
            </p>
          </div>
          <button
            onClick={() => {
              setEditingCompetence(null);
              setShowCompetenceModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Nouvelle compétence
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-4 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Catégorie :</label>
          <select
            value={competenceFilter}
            onChange={(e) => setCompetenceFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
          >
            <option value="">Toutes les catégories</option>
            {Object.entries(CATEGORIE_COMPETENCE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {competenceFilter && (
            <button
              onClick={() => setCompetenceFilter('')}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Effacer le filtre"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1"></div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">{filteredCompetences.length}</span>
          <span>compétence{filteredCompetences.length > 1 ? 's' : ''}</span>
          {(debouncedSearchQuery || competenceFilter) && (
            <span className="text-emerald-600">(filtrées)</span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <DataTable
          data={filteredCompetences}
          columns={competencesColumns}
          itemsPerPage={15}
          showExport={true}
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
