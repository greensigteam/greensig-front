import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useExport } from '../contexts/ExportContext';
import { useToast } from '../contexts/ToastContext';
import {
  AlertCircle,
  RefreshCw,
  Loader2,
  MoreVertical,
  BarChart3,
  Filter,
  Download,
} from 'lucide-react';
import { useSearch } from '../contexts/SearchContext';
import { Reclamation, ReclamationCreate } from '../types/reclamations';
import { exportReclamationsExcel } from '../services/reclamationsApi';
import {
  useUpdateReclamation,
  useDeleteReclamation,
} from '../hooks/mutations/useReclamationMutations';
import { planningService } from '../services/planningService';
import { createTaskWithRecurrence, formatRecurrenceToast } from '../utils/taskRecurrence';
import { TacheCreate } from '../types/planning';
import TaskFormModal from '../components/planning/TaskFormModal';
import { ReclamationEditModal } from '../components/reclamations/ReclamationEditModal';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import ReclamationsStatsView from '../components/reclamations/ReclamationsStatsView';
import ReclamationsFiltersPanel from '../components/reclamations/ReclamationsFiltersPanel';
import {
  useReclamations,
  useReclamationStats,
  useTypesReclamations,
  useUrgences,
  ReclamationFilters,
} from '../hooks/queries/useReclamations';
import {
  useCurrentUser,
  useTypesTaches,
  useEquipes,
  useSites,
} from '../hooks/queries/useReferenceData';
import { invalidateAllReclamationQueries } from '../lib/queryClient';

import ConfirmModal from '../components/ConfirmModal';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import PaginationControls from '../components/PaginationControls';
import ReclamationsTachesTab from '../components/reclamations/ReclamationsTachesTab';
import ReclamationTableRow from '../components/reclamations/ReclamationTableRow';

const Reclamations: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchQuery, setSearchQuery, setPlaceholder } = useSearch();

  // ===== React Query hooks (remplace useState + useEffect + fetch) =====
  const { data: currentUser } = useCurrentUser();

  // Helpers rôles
  const isAdmin = !!currentUser?.roles?.includes('ADMIN');
  const isClient = !!currentUser?.roles?.includes('CLIENT');
  const isSupervisor = !!currentUser?.roles?.includes('SUPERVISEUR');

  // UI State
  const [activeTab, setActiveTab] = useState<'reclamations' | 'taches' | 'stats'>('reclamations');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const [rowMenuOpen, setRowMenuOpen] = useState<number | null>(null);

  // Notifications
  const { showToast } = useToast();

  // Export
  const { startExport, endExport, isExportRunning } = useExport();
  const exporting = isExportRunning('reclamations-excel');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskInitialValues, setTaskInitialValues] = useState<Partial<TacheCreate>>({});
  const [taskSiteFilter, setTaskSiteFilter] = useState<{ id: number; name: string } | undefined>(
    undefined,
  );
  const [reclamationTargetForTask, setReclamationTargetForTask] = useState<Reclamation | null>(
    null,
  );

  // Form state Reclamation
  const [formData, setFormData] = useState<Partial<ReclamationCreate>>({});
  const [, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
  const [preSelectedSiteName, setPreSelectedSiteName] = useState<string | null>(null);

  // Modal de confirmation/notification
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'info' | 'success' | 'danger' | 'warning';
    confirmLabel?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });

  // Delete confirmation state
  const [deletingReclamationId, setDeletingReclamationId] = useState<number | null>(null);

  // Mutations (Sprint 5 — cache coherence)
  const deleteReclamationMutation = useDeleteReclamation();
  const updateReclamationMutation = useUpdateReclamation();

  // Pagination Reclamations
  const [currentPageRec, setCurrentPageRec] = useState(1);
  const [itemsPerPageRec] = useState(10);

  // Pagination Taches
  const [currentPageTache, setCurrentPageTache] = useState(1);
  const [itemsPerPageTache] = useState(10);

  // Filtres
  const [filterStatut, setFilterStatut] = useState<string>('');
  const [filterSite, setFilterSite] = useState<string>('');
  const [filterDateDebut, setFilterDateDebut] = useState<string>('');
  const [filterDateFin, setFilterDateFin] = useState<string>('');
  const [filterAutoCloturee, setFilterAutoCloturee] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<string>('all');

  // ===== Données via React Query (polling 60s, keepPreviousData) =====
  const reclamationFilters = useMemo<ReclamationFilters>(() => {
    const f: ReclamationFilters = {};
    if (filterStatut) f.statut = filterStatut;
    if (filterSite) f.site = Number(filterSite);
    if (filterDateDebut) f.date_debut = filterDateDebut;
    if (filterDateFin) f.date_fin = filterDateFin;
    if (filterAutoCloturee) f.auto_cloturee = true;
    return f;
  }, [filterStatut, filterSite, filterDateDebut, filterDateFin, filterAutoCloturee]);

  const {
    data: reclamations = [],
    isLoading: reclamationsLoading,
    isFetching: reclamationsFetching,
  } = useReclamations(reclamationFilters);
  const { data: stats = null, isLoading: statsLoading } = useReclamationStats(
    {},
    { enabled: activeTab === 'stats' },
  );
  const { data: types = [] } = useTypesReclamations();
  const { data: urgences = [] } = useUrgences();
  const { data: typesTaches = [] } = useTypesTaches();
  const { data: equipes = [] } = useEquipes();
  const { data: sites = [] } = useSites();

  // Tâches liées aux réclamations — fenêtre -30/+90 j pour limiter la charge
  const { data: tachesLiees = [], isLoading: tachesLoading } = useQuery({
    queryKey: ['taches', 'reclamations-liees'],
    queryFn: async () => {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      const end = new Date();
      end.setDate(end.getDate() + 90);
      const response = await planningService.getTaches({
        has_reclamation: true,
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
      });
      return Array.isArray(response.results) ? response.results : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Loading combiné pour l'affichage initial
  const loading = reclamationsLoading;

  const handlePeriodChange = (value: string) => {
    setFilterPeriod(value);
    const today = new Date();

    switch (value) {
      case 'last_7':
        setFilterDateDebut(format(subDays(today, 7), 'yyyy-MM-dd'));
        setFilterDateFin(format(today, 'yyyy-MM-dd'));
        break;
      case 'last_30':
        setFilterDateDebut(format(subDays(today, 30), 'yyyy-MM-dd'));
        setFilterDateFin(format(today, 'yyyy-MM-dd'));
        break;
      case 'this_month':
        setFilterDateDebut(format(startOfMonth(today), 'yyyy-MM-dd'));
        setFilterDateFin(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
      case 'all':
        setFilterDateDebut('');
        setFilterDateFin('');
        break;
      default:
        // custom: do nothing to dates
        break;
    }
  };

  // Set search placeholder and cleanup on unmount
  useEffect(() => {
    setPlaceholder('Rechercher une réclamation par numéro, description...');
    return () => {
      setPlaceholder('Rechercher...');
      setSearchQuery('');
    };
  }, [setPlaceholder, setSearchQuery]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setActionsMenuOpen(false);
      }
      // Close row menu if clicking outside any row menu
      const target = event.target as HTMLElement;
      if (!target.closest('[data-row-menu]')) {
        setRowMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset pages on search or filter change
  useEffect(() => {
    setCurrentPageRec(1);
    setCurrentPageTache(1);
  }, [searchQuery, activeTab, reclamationFilters]);

  // Handle navigation from MapPage with site pre-selected
  useEffect(() => {
    const state = location.state as {
      createFromSite?: boolean;
      siteId?: number | string;
      siteName?: string;
      openReclamationId?: number | string;
      editReclamationId?: number;
      editReclamationData?: any;
    } | null;

    if (state?.createFromSite && state?.siteId) {
      // Pre-fill the form with the site
      setFormData({ site: Number(state.siteId) });
      setPreSelectedSiteName(state.siteName || null);
      setIsCreateModalOpen(true);
      // Clear the navigation state
      navigate(location.pathname, { replace: true, state: {} });
    }

    // Éditer une réclamation depuis la page de détails
    if (state?.editReclamationId) {
      // Ouvrir le modal - il chargera les données lui-même
      handleEdit(Number(state.editReclamationId));
      // Clear the navigation state
      navigate(location.pathname, { replace: true, state: {} });
    }

    // Ouvrir une réclamation spécifique depuis la carte - naviguer vers la page de détails
    if (state?.openReclamationId) {
      navigate(`/reclamations/${state.openReclamationId}`, { replace: true });
    }
  }, [location.state, navigate]);

  // Fonction de rafraîchissement (invalide le cache React Query → refetch)
  const refreshData = () => {
    invalidateAllReclamationQueries();
  };

  // ===================================
  // HANDLERS RECLAMATION
  // ===================================

  const handleDelete = (id: number) => {
    setDeletingReclamationId(id);
  };

  const confirmDeleteReclamation = async () => {
    if (!deletingReclamationId) return;
    try {
      await deleteReclamationMutation.mutateAsync(deletingReclamationId);
      setDeletingReclamationId(null);
      // Feedback différé
      setTimeout(() => {
        setModalConfig({
          isOpen: true,
          title: 'Succès',
          message: 'Réclamation supprimée.',
          variant: 'success',
          onConfirm: () => setModalConfig((p) => ({ ...p, isOpen: false })),
        });
      }, 300);
    } catch (error) {
      showToast('Erreur lors de la suppression de la réclamation.', 'error');
      throw error;
    }
  };

  const handleDetails = (id: number) => {
    navigate(`/reclamations/${id}`);
  };

  const handleEdit = (id: number) => {
    // Ouvrir la modale - le composant ReclamationEditModal chargera les données
    setEditingId(id);
    setFormData({}); // Reset pour que le modal charge les données fraîches
    setExistingPhotos([]);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setEditingId(null);
    setFormData({});
    setPhotos([]);
    setExistingPhotos([]);
    setPreSelectedSiteName(null);
  };

  // Export Excel
  const handleExportExcel = async () => {
    startExport('reclamations-excel', 'Export Excel réclamations');
    try {
      const blob = await exportReclamationsExcel({
        statut: filterStatut || undefined,
        site: filterSite ? parseInt(filterSite) : undefined,
        date_debut: filterDateDebut || undefined,
        date_fin: filterDateFin || undefined,
      });

      // Télécharger le fichier
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm');
      a.download = `reclamations_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setModalConfig({
        isOpen: true,
        title: 'Export réussi',
        message: 'Le fichier Excel a été téléchargé avec succès.',
        variant: 'success',
        onConfirm: () => setModalConfig((p) => ({ ...p, isOpen: false })),
      });
    } catch (error: any) {
      setModalConfig({
        isOpen: true,
        title: 'Erreur',
        message: error.message || "Erreur lors de l'export.",
        variant: 'danger',
        onConfirm: () => setModalConfig((p) => ({ ...p, isOpen: false })),
      });
    } finally {
      endExport('reclamations-excel');
      setActionsMenuOpen(false);
    }
  };

  // ===================================
  // HANDLERS TACHE
  // ===================================

  const handleOpenTaskModal = (reclamation: Reclamation) => {
    setReclamationTargetForTask(reclamation);

    // Initialiser les valeurs du formulaire
    setTaskInitialValues({
      priorite: 3,
      commentaires: `Tâche liée à la réclamation ${reclamation.numero_reclamation}`,
      date_debut_planifiee: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      date_fin_planifiee: format(new Date(Date.now() + 3600000), "yyyy-MM-dd'T'HH:mm"),
      reclamation: reclamation.id,
    });

    // Définir le filtre de site pour ne montrer que les objets de ce site
    if (reclamation.site) {
      setTaskSiteFilter({
        id: reclamation.site,
        name: reclamation.site_nom || `Site #${reclamation.site}`,
      });
    } else {
      setTaskSiteFilter(undefined);
    }

    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (data: TacheCreate) => {
    setIsSubmitting(true);
    try {
      const payload: TacheCreate = {
        ...data,
        reclamation: reclamationTargetForTask?.id,
      };

      const { recurrenceResult } = await createTaskWithRecurrence(payload);
      const msg = formatRecurrenceToast(
        recurrenceResult,
        reclamationTargetForTask?.numero_reclamation
          ? `Réclamation ${reclamationTargetForTask.numero_reclamation} :`
          : undefined,
      );
      setModalConfig({
        isOpen: true,
        title: 'Succès',
        message: msg,
        variant: 'success',
        onConfirm: () => setModalConfig((p) => ({ ...p, isOpen: false })),
      });

      setIsTaskModalOpen(false);
      setTaskInitialValues({});
      setTaskSiteFilter(undefined);
      setReclamationTargetForTask(null);
      invalidateAllReclamationQueries();
    } catch (error: any) {
      if (error.message?.includes('occurrences')) {
        setModalConfig({
          isOpen: true,
          title: 'Avertissement',
          message: error.message,
          variant: 'warning',
          onConfirm: () => setModalConfig((p) => ({ ...p, isOpen: false })),
        });
      } else {
        setModalConfig({
          isOpen: true,
          title: 'Erreur',
          message: 'Échec de la création de la tâche.',
          variant: 'danger',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setTaskInitialValues({});
    setTaskSiteFilter(undefined);
    setReclamationTargetForTask(null);
  };

  const handleToggleVisibility = async (rec: Reclamation) => {
    try {
      await updateReclamationMutation.mutateAsync({
        id: rec.id,
        data: { visible_client: !rec.visible_client } as Partial<ReclamationCreate>,
      });
      setModalConfig({
        isOpen: true,
        title: 'Succès',
        message: rec.visible_client
          ? 'Réclamation masquée au client.'
          : 'Réclamation rendue visible au client.',
        variant: 'success',
        onConfirm: () => setModalConfig((p) => ({ ...p, isOpen: false })),
      });
    } catch {
      setModalConfig({
        isOpen: true,
        title: 'Erreur',
        message: 'Erreur lors du changement de visibilité.',
        variant: 'danger',
        onConfirm: () => setModalConfig((p) => ({ ...p, isOpen: false })),
      });
    }
  };

  const filteredReclamations = useMemo(() => {
    if (!searchQuery) return reclamations;
    const query = searchQuery.toLowerCase();
    return reclamations.filter(
      (r) =>
        r.numero_reclamation?.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.site_nom?.toLowerCase().includes(query) ||
        r.type_reclamation_nom?.toLowerCase().includes(query),
    );
  }, [reclamations, searchQuery]);

  const filteredTaches = useMemo(() => {
    // ✅ FILTRAGE STRICT: On ne veut ici QUE les tâches qui possèdent un numéro de réclamation
    // Cela corrige le cas où l'API renvoie des tâches sans réclamation malgré le filtre has_reclamation=true
    const tachesAvecReclamation = tachesLiees.filter((t) => t.reclamation_numero);

    if (!searchQuery) return tachesAvecReclamation;
    const query = searchQuery.toLowerCase();
    return tachesAvecReclamation.filter(
      (t) =>
        t.type_tache_detail.nom_tache.toLowerCase().includes(query) ||
        (t.client_detail?.nomStructure || t.client_detail?.structure?.nom || '')
          .toLowerCase()
          .includes(query) ||
        t.description_travaux?.toLowerCase().includes(query) ||
        (t.reclamation_numero && t.reclamation_numero.toLowerCase().includes(query)),
    );
  }, [tachesLiees, searchQuery]);

  // Active filters check
  const hasActiveFilters = !!(
    filterStatut ||
    filterSite ||
    filterDateDebut ||
    filterDateFin ||
    filterAutoCloturee
  );
  const activeFiltersCount = [
    filterStatut,
    filterSite,
    filterDateDebut,
    filterDateFin,
    filterAutoCloturee ? 'x' : '',
  ].filter(Boolean).length;

  // Pagination calculations
  const totalPagesRec = Math.ceil(filteredReclamations.length / itemsPerPageRec);
  const startIndexRec = (currentPageRec - 1) * itemsPerPageRec;
  const paginatedReclamations = filteredReclamations.slice(
    startIndexRec,
    startIndexRec + itemsPerPageRec,
  );

  return (
    <div className="flex flex-col">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          {/* Left: Tab Filters */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('reclamations')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === 'reclamations'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Réclamations ({filteredReclamations.length})
            </button>
            {!isClient && (
              <button
                onClick={() => setActiveTab('taches')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'taches'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Tâches liées ({filteredTaches.length})
              </button>
            )}
            {!isClient && (
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'stats'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4" />
                  Statistiques
                </span>
              </button>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {activeTab !== 'stats' && (
              <span className="text-sm text-slate-500 hidden sm:inline-block">
                {activeTab === 'reclamations'
                  ? `${filteredReclamations.length} réclamation${filteredReclamations.length > 1 ? 's' : ''}`
                  : `${filteredTaches.length} tâche${filteredTaches.length > 1 ? 's' : ''}`}
              </span>
            )}

            {/* Filters Button (only for reclamations tab) */}
            {activeTab === 'reclamations' && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filtres</span>
                {hasActiveFilters && (
                  <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            )}

            {/* Export Button */}
            <button
              onClick={handleExportExcel}
              disabled={exporting || reclamationsLoading}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              title="Exporter en Excel"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Export</span>
            </button>

            {/* Actions Dropdown */}
            <div className="relative" ref={actionsMenuRef}>
              <button
                onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Plus d'actions"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {actionsMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => {
                      refreshData();
                      setActionsMenuOpen(false);
                    }}
                    disabled={reclamationsFetching || statsLoading}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 text-slate-400 ${reclamationsFetching ? 'animate-spin' : ''}`}
                    />
                    Actualiser
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && activeTab === 'reclamations' && (
          <ReclamationsFiltersPanel
            filterStatut={filterStatut}
            setFilterStatut={setFilterStatut}
            filterSite={filterSite}
            setFilterSite={setFilterSite}
            filterPeriod={filterPeriod}
            onPeriodChange={handlePeriodChange}
            filterDateDebut={filterDateDebut}
            setFilterDateDebut={setFilterDateDebut}
            filterDateFin={filterDateFin}
            setFilterDateFin={setFilterDateFin}
            filterAutoCloturee={filterAutoCloturee}
            setFilterAutoCloturee={setFilterAutoCloturee}
            sites={sites}
            hasActiveFilters={hasActiveFilters}
            onReset={() => {
              setFilterStatut('');
              setFilterSite('');
              setFilterDateDebut('');
              setFilterDateFin('');
              setFilterAutoCloturee(false);
            }}
          />
        )}

        {/* Table Reclamations */}
        {activeTab === 'reclamations' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-visible">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : filteredReclamations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <AlertCircle className="w-12 h-12 mb-4 text-slate-300" />
                <p className="text-lg font-medium">Aucune réclamation trouvée</p>
                <p className="text-sm">
                  {searchQuery
                    ? "Essayez avec d'autres termes de recherche"
                    : 'Aucune réclamation enregistrée'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto min-h-[400px]">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100 rounded-t-xl">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider first:rounded-tl-xl">
                          Numéro
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Urgence
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Site / Zone
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Créé par
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-tr-xl w-24">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedReclamations.map((rec) => (
                        <ReclamationTableRow
                          key={rec.id}
                          rec={rec}
                          currentUserId={currentUser?.id}
                          isAdmin={isAdmin}
                          isClient={isClient}
                          isSupervisor={isSupervisor}
                          rowMenuOpen={rowMenuOpen}
                          onRowMenuToggle={setRowMenuOpen}
                          onDetails={handleDetails}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onOpenTaskModal={handleOpenTaskModal}
                          onToggleVisibility={handleToggleVisibility}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <PaginationControls
                  currentPage={currentPageRec}
                  totalPages={totalPagesRec}
                  startIndex={startIndexRec}
                  itemsPerPage={itemsPerPageRec}
                  totalItems={filteredReclamations.length}
                  onPageChange={setCurrentPageRec}
                />
              </>
            )}
          </div>
        )}

        {/* Table TACHES LIEES */}
        {activeTab === 'taches' && (
          <ReclamationsTachesTab
            taches={filteredTaches}
            loading={tachesLoading}
            searchQuery={searchQuery}
            currentPage={currentPageTache}
            itemsPerPage={itemsPerPageTache}
            onPageChange={setCurrentPageTache}
          />
        )}

        {/* Stats Tab Content */}
        {activeTab === 'stats' && <ReclamationsStatsView stats={stats} isLoading={statsLoading} />}
      </div>

      {/* Modal Création Tâche (Intervention) - Utilise le même formulaire que Planning */}
      {isTaskModalOpen && (
        <TaskFormModal
          initialValues={taskInitialValues}
          equipes={equipes}
          typesTaches={typesTaches}
          siteFilter={taskSiteFilter}
          isSubmitting={isSubmitting}
          onClose={handleCloseTaskModal}
          onSubmit={handleTaskSubmit}
        />
      )}

      {/* Modal Création / Edition Réclamation */}
      <ReclamationEditModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onSuccess={() => {
          setModalConfig({
            isOpen: true,
            title: 'Succès',
            message: editingId
              ? 'Réclamation mise à jour avec succès.'
              : 'Réclamation créée avec succès.',
            variant: 'success',
            onConfirm: () => setModalConfig((prev) => ({ ...prev, isOpen: false })),
          });
          refreshData();
        }}
        types={types}
        urgences={urgences}
        editingId={editingId}
        initialData={formData}
        existingPhotos={existingPhotos}
        preSelectedSiteName={preSelectedSiteName}
        canSetVisibility={isAdmin || isSupervisor}
      />

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        variant={modalConfig.variant === 'success' ? 'info' : modalConfig.variant}
        confirmLabel={modalConfig.confirmLabel || 'OK'}
        onConfirm={() => {
          if (modalConfig.onConfirm) modalConfig.onConfirm();
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Delete Confirmation Modal */}
      {deletingReclamationId && (
        <ConfirmDeleteModal
          title="Supprimer la réclamation ?"
          message="Cette action est irréversible."
          onConfirm={confirmDeleteReclamation}
          onCancel={() => setDeletingReclamationId(null)}
        />
      )}
    </div>
  );
};

export default Reclamations;
