import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Users,
  UserCheck,
  Calendar,
  Award,
  Search,
  Check,
  Clock,
  Edit2,
  Trash2,
  Eye,
  X,
  RefreshCw,
  Edit3,
  LayoutGrid,
  Table,
  Filter,
  BarChart3,
  Ban,
  Star,
  TrendingUp,
  CheckCircle,
  FolderOpen,
  ChevronDown,
  Umbrella,
  HeartPulse,
  GraduationCap,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  CalendarClock,
  CalendarCheck
} from 'lucide-react';
import { Listbox, Transition } from '@headlessui/react';
import { DataTable, Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { useSearch } from '../contexts/SearchContext';
import { useToast } from '../contexts/ToastContext';

import EditEquipeModal from './EditEquipeModal';
import CreateAbsenceModal from './CreateAbsenceModal';
import AbsenceDetailModal from './AbsenceDetailModal';
import EditAbsenceModal from './EditAbsenceModal';
import CompetenceMatrix, { ViewMode } from '../components/CompetenceMatrix';

// Modales extraites
import CreateTeamModal from '../components/modals/CreateTeamModal';
import EquipeDetailModal from '../components/modals/EquipeDetailModal';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import { useNavigate } from 'react-router-dom';

// Types
import {
  OperateurList,
  EquipeList,
  EquipeDetail,
  Absence,
  Competence,
  StatutOperateur,
  StatutEquipe,
  StatutAbsence,
  STATUT_ABSENCE_LABELS,
  TYPE_ABSENCE_LABELS,
  NOM_ROLE_LABELS,
  Utilisateur,
  Client,
  NiveauCompetence
} from '../types/users';

import EditUserModal from '../components/EditUserModal';

// API
import {
  fetchOperateurs,
  fetchEquipes,
  fetchEquipeById,
  fetchAbsences,
  fetchAbsencesAValider,
  fetchCompetences,
  fetchChefsPotentiels,
  validerAbsence,
  refuserAbsence,
  annulerAbsence,
  fetchStatistiquesUtilisateurs,
  fetchUtilisateurs,
  fetchClients,
  deleteOperateur,
  deleteEquipe,
  fetchCurrentUser
} from '../services/usersApi';

// ============================================================================
// COMPOSANT - Carte Statistiques Moderne
// ============================================================================

interface StatCardCompactProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}

const StatCardCompact: React.FC<StatCardCompactProps> = ({ icon, label, value, color }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
    <div className="text-sm font-medium text-slate-500 mb-1">{label}</div>
    <div className="flex items-end justify-between relative z-10">
      <div className="text-3xl font-bold text-slate-800">{value}</div>
    </div>
    <div className="absolute top-4 right-4 p-2 bg-slate-50 rounded-lg">
      {icon}
    </div>
  </div>
);

// ============================================================================
// COMPOSANT PRINCIPAL - Teams
// ============================================================================

type TabType = 'equipes' | 'operateurs' | 'absences' | 'competences';

const Teams: React.FC = () => {
  // Search context from Header
  const { searchQuery, setPlaceholder } = useSearch();
  const { showToast } = useToast();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('equipes');
  const [loading, setLoading] = useState(true);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Data
  const [equipes, setEquipes] = useState<EquipeList[]>([]);
  const [operateurs, setOperateurs] = useState<OperateurList[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [absencesAValider, setAbsencesAValider] = useState<Absence[]>([]);
  const [chefsPotentiels, setChefsPotentiels] = useState<OperateurList[]>([]);
  const [competences, setCompetences] = useState<Competence[]>([]);

  // Pagination states
  const [equipesPage, setEquipesPage] = useState(1);
  const [equipesTotal, setEquipesTotal] = useState(0);
  const [operateursPage, setOperateursPage] = useState(1);
  const [operateursTotal, setOperateursTotal] = useState(0);
  const [absencesPage, setAbsencesPage] = useState(1);
  const [absencesTotal, setAbsencesTotal] = useState(0);

  // Stats (pour barre KPI compacte)
  const [stats, setStats] = useState<{
    totalOperateurs: number;
    disponibles: number;
    totalEquipes: number;
    absencesEnAttente: number;
  } | null>(null);

  const navigate = useNavigate();

  // Modals
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [selectedEquipe, setSelectedEquipe] = useState<EquipeDetail | null>(null);
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null);
  const [showCreateAbsence, setShowCreateAbsence] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);
  const [deleteAbsenceId, setDeleteAbsenceId] = useState<number | null>(null);

  // Filtres absences
  const [absenceFilters, setAbsenceFilters] = useState<{
    statut: string;
    typeAbsence: string;
    dateDebut: string;
    dateFin: string;
  }>({
    statut: '',
    typeAbsence: '',
    dateDebut: '',
    dateFin: ''
  });

  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);

  // Matrice compétences states
  const [matrixViewMode, setMatrixViewMode] = useState<ViewMode>('cards');
  const [matrixEditMode, setMatrixEditMode] = useState(false);
  const [matrixNiveauFilter, setMatrixNiveauFilter] = useState<NiveauCompetence | ''>('');
  const [matrixCategorieFilter, setMatrixCategorieFilter] = useState('');
  const [matrixShowFilters, setMatrixShowFilters] = useState(false);

  // Absences filters toggle
  const [showAbsenceFilters, setShowAbsenceFilters] = useState(false);

  // Helpers rôles
  const isAdmin = !!currentUser?.roles?.includes('ADMIN');
  const isChefEquipe = !!currentUser?.roles?.includes('SUPERVISEUR');
  const isChefEquipeOnly = isChefEquipe && !isAdmin;

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update search placeholder based on active tab
  useEffect(() => {
    const placeholders: Record<TabType, string> = {
      equipes: 'Rechercher une équipe...',
      operateurs: 'Rechercher un opérateur (nom, matricule)...',
      competences: 'Voir la matrice de compétences...',
      absences: 'Rechercher une absence (opérateur, motif, type)...'
    };
    setPlaceholder(placeholders[activeTab]);
  }, [activeTab, setPlaceholder]);

  // Load stable data once (currentUser + stats - doesn't change during session)
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        // Load stable data first
        await loadStableData();
        // Then load initial tab data
        await loadTabData(activeTab);
      } catch (error) {
        console.error('Erreur initialisation:', error);
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, []);

  // Lazy load data when tab changes
  useEffect(() => {
    if (stats) { // Only load if already initialized
      loadTabData(activeTab);
    }
  }, [activeTab]);

  const loadStableData = async () => {
    try {
      const [currentUserRes, statsRes] = await Promise.all([
        fetchCurrentUser(),
        fetchStatistiquesUtilisateurs()
      ]);
      setCurrentUser(currentUserRes);
      setStats({
        totalOperateurs: statsRes.operateurs.total,
        disponibles: statsRes.operateurs.disponiblesAujourdhui,
        totalEquipes: statsRes.equipes.total,
        absencesEnAttente: statsRes.absences.enAttente
      });
    } catch (error) {
      console.error('Erreur chargement données stables:', error);
    }
  };

  const loadTabData = async (tab: TabType) => {
    try {
      switch (tab) {
        case 'equipes':
          await loadEquipesData();
          break;
        case 'operateurs':
          await loadOperateursData();
          break;
        case 'competences':
          await loadCompetencesData();
          break;
        case 'absences':
          await loadAbsencesData();
          break;
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      showToast('Erreur lors du chargement des données', 'error');
    }
  };

  const loadEquipesData = async (page: number = equipesPage) => {
    const [equipesRes, chefsPotentielsRes] = await Promise.all([
      fetchEquipes({ page, pageSize: 50 }),
      chefsPotentiels.length === 0 ? fetchChefsPotentiels() : Promise.resolve(chefsPotentiels)
    ]);
    setEquipes(equipesRes.results);
    setEquipesTotal(equipesRes.count || 0);
    if (chefsPotentiels.length === 0) {
      setChefsPotentiels(chefsPotentielsRes);
    }
  };

  const loadOperateursData = async (page: number = operateursPage) => {
    // Only load what's needed - removed heavy utilisateurs and clients loading
    const operateursRes = await fetchOperateurs({ page, pageSize: 50 });
    setOperateurs(operateursRes.results);
    setOperateursTotal(operateursRes.count || 0);
  };

  const loadCompetencesData = async () => {
    if (competences.length > 0 && operateurs.length > 0) return; // Already loaded
    const [competencesRes, operateursRes] = await Promise.all([
      competences.length === 0 ? fetchCompetences() : Promise.resolve(competences),
      // Reduced from 1000 to 200 - only load what's needed for competence matrix
      operateurs.length === 0 ? fetchOperateurs({ pageSize: 200 }) : Promise.resolve({ results: operateurs })
    ]);
    if (competences.length === 0) {
      setCompetences(competencesRes);
    }
    if (operateurs.length === 0) {
      setOperateurs(operateursRes.results);
    }
  };

  const loadAbsencesData = async (page: number = absencesPage) => {
    const [absencesRes, absencesAValiderRes, operateursRes] = await Promise.all([
      fetchAbsences({ page, pageSize: 50 }),
      fetchAbsencesAValider(),
      // Reduced from 1000 to 100 - only load what's visible
      operateurs.length === 0 ? fetchOperateurs({ page: 1, pageSize: 100 }) : Promise.resolve({ results: operateurs })
    ]);
    setAbsences(absencesRes.results);
    setAbsencesTotal(absencesRes.count || 0);
    setAbsencesAValider(absencesAValiderRes);
    if (operateurs.length === 0) {
      setOperateurs(operateursRes.results);
    }
  };

  // Refresh all data (called after create/update/delete)
  const loadData = async () => {
    await loadTabData(activeTab);
    // Refresh stats bar
    try {
      const statsRes = await fetchStatistiquesUtilisateurs();
      setStats({
        totalOperateurs: statsRes.operateurs.total,
        disponibles: statsRes.operateurs.disponiblesAujourdhui,
        totalEquipes: statsRes.equipes.total,
        absencesEnAttente: statsRes.absences.enAttente
      });
    } catch (error) {
      console.error('Erreur refresh stats:', error);
    }
  };

  // Handlers
  const handleViewOperateur = async (operateurId: number) => {
    // Navigate to operateur detail page instead of opening modal
    navigate(`/operateurs/${operateurId}`);
  };

  const handleViewEquipe = async (equipeId: number) => {
    try {
      const detail = await fetchEquipeById(equipeId);
      setSelectedEquipe(detail);
    } catch (error) {
      console.error('Erreur chargement equipe:', error);
    }
  };

  const handleValiderAbsence = async (absenceId: number) => {
    try {
      await validerAbsence(absenceId, 'Approuve');
      loadData();
    } catch (error) {
      console.error('Erreur validation absence:', error);
    }
  };

  const handleRefuserAbsence = async (absenceId: number) => {
    try {
      await refuserAbsence(absenceId, 'Refuse');
      loadData();
    } catch (error) {
      console.error('Erreur refus absence:', error);
    }
  };

  // Filter data (using debounced search for performance)
  const filteredEquipes = useMemo(() => equipes
    .filter(e => e.actif)
    .filter(e =>
      e.nomEquipe.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      (e.chefEquipeNom || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    ), [equipes, debouncedSearchQuery]);

  const filteredOperateurs = useMemo(() => operateurs.filter(o =>
    (o.fullName || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    (o.numeroImmatriculation || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  ), [operateurs, debouncedSearchQuery]);

  const filteredAbsences = useMemo(() => absences.filter(a => {
    // Filtre par recherche (operateur, motif, type)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      const matchOperateur = a.operateurNom.toLowerCase().includes(query);
      const matchMotif = a.motif?.toLowerCase().includes(query);
      const matchType = TYPE_ABSENCE_LABELS[a.typeAbsence]?.toLowerCase().includes(query);
      const matchStatut = STATUT_ABSENCE_LABELS[a.statut]?.toLowerCase().includes(query);
      if (!matchOperateur && !matchMotif && !matchType && !matchStatut) {
        return false;
      }
    }
    // Filtre par statut
    if (absenceFilters.statut && a.statut !== absenceFilters.statut) {
      return false;
    }
    // Filtre par type
    if (absenceFilters.typeAbsence && a.typeAbsence !== absenceFilters.typeAbsence) {
      return false;
    }
    // Filtre par date debut
    if (absenceFilters.dateDebut && new Date(a.dateDebut) < new Date(absenceFilters.dateDebut)) {
      return false;
    }
    // Filtre par date fin
    if (absenceFilters.dateFin && new Date(a.dateFin) > new Date(absenceFilters.dateFin)) {
      return false;
    }
    return true;
  }), [absences, debouncedSearchQuery, absenceFilters]);

  const operateursSansEquipe = operateurs.filter(o => o.equipe === null && o.actif);

  // Get unique categories from competences
  const competenceCategories = useMemo(() => {
    const cats = new Set<string>();
    competences.forEach(c => {
      if (c.categorieDisplay || c.categorie) {
        cats.add(c.categorieDisplay || c.categorie);
      }
    });
    return Array.from(cats);
  }, [competences]);

  // Columns
  const [editEquipe, setEditEquipe] = useState<EquipeList | null>(null);
  const [deleteEquipeId, setDeleteEquipeId] = useState<number | null>(null);
  const [deleteOperateurId, setDeleteOperateurId] = useState<number | null>(null);

  const equipesColumns: Column<EquipeList>[] = [
    { key: 'nomEquipe', label: 'Nom' },
    { key: 'chefEquipeNom', label: "Chef d'équipe", render: (e) => e.chefEquipeNom || '-' },
    { key: 'superviseurNom', label: 'Superviseur', render: (e) => e.superviseurNom || '-' },
    {
      key: 'nombreMembres',
      label: 'Membres',
      render: (e) => `${e.nombreMembres} membre${e.nombreMembres > 1 ? 's' : ''}`
    },
    {
      key: 'statutOperationnel',
      label: 'Statut',
      render: (e) => <StatusBadge variant="status" type="equipe" value={e.statutOperationnel || ''} />,
      sortable: false
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (e) => (
        <div className="flex gap-1">
          {!isChefEquipeOnly && (
            <>
              <button
                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                title="Modifier"
                onClick={(ev) => { ev.stopPropagation(); setEditEquipe(e); }}
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                className="p-1 text-red-600 hover:bg-red-100 rounded"
                title="Supprimer"
                onClick={(ev) => { ev.stopPropagation(); setDeleteEquipeId(e.id); }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {isChefEquipeOnly && (
            <button
              className="p-1 text-gray-600 hover:bg-gray-100 rounded"
              title="Voir détails"
              onClick={(ev) => { ev.stopPropagation(); handleViewEquipe(e.id); }}
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
      sortable: false
    }
  ];

  const operateursColumns: Column<OperateurList>[] = [
    { key: 'numeroImmatriculation', label: 'Matricule' },
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
    { key: 'equipeNom', label: 'Équipe', render: (o) => o.equipeNom || '-' },
    {
      key: 'statut',
      label: 'Statut',
      render: (o) => <StatusBadge variant="status" type="operateur" value={o.statut || ''} />,
      sortable: false
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (o) => (
        <div className="flex gap-1">
          {!isChefEquipeOnly && (
            <>
              <button
                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                title="Modifier"
                onClick={(ev) => { ev.stopPropagation(); const u = utilisateurs.find(us => us.id === o.id); if (u) setEditingUser(u); }}
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                className="p-1 text-red-600 hover:bg-red-100 rounded"
                title="Supprimer"
                onClick={(ev) => { ev.stopPropagation(); setDeleteOperateurId(o.id); }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {isChefEquipeOnly && (
            <button
              className="p-1 text-gray-600 hover:bg-gray-100 rounded"
              title="Voir détails"
              onClick={(ev) => { ev.stopPropagation(); handleViewOperateur(o.id); }}
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
      sortable: false
    }
  ];

  const absencesColumns: Column<Absence>[] = [
    {
      key: 'operateurNom',
      label: 'Opérateur',
      render: (a) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {a.operateurNom?.split(' ').map(n => n[0]).join('').substring(0, 2) || '??'}
          </div>
          <span className="font-semibold text-gray-900">{a.operateurNom}</span>
        </div>
      )
    },
    {
      key: 'typeAbsence',
      label: 'Type',
      render: (a) => {
        const typeIcons = {
          CONGE: <Umbrella className="w-4 h-4" />,
          MALADIE: <HeartPulse className="w-4 h-4" />,
          FORMATION: <GraduationCap className="w-4 h-4" />,
          AUTRE: <MoreHorizontal className="w-4 h-4" />
        };
        const typeColors = {
          CONGE: 'bg-blue-100 text-blue-700 border-blue-300',
          MALADIE: 'bg-red-100 text-red-700 border-red-300',
          FORMATION: 'bg-purple-100 text-purple-700 border-purple-300',
          AUTRE: 'bg-gray-100 text-gray-700 border-gray-300'
        };
        const type = a.typeAbsence as keyof typeof typeIcons;
        return (
          <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg font-semibold border-2 ${typeColors[type] || typeColors.AUTRE}`}>
            {typeIcons[type] || typeIcons.AUTRE}
            <span>{TYPE_ABSENCE_LABELS[type]}</span>
          </span>
        );
      },
      sortable: false
    },
    {
      key: 'dateDebut',
      label: 'Début',
      render: (a) => (
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">
            {new Date(a.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      )
    },
    {
      key: 'dateFin',
      label: 'Fin',
      render: (a) => (
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">
            {new Date(a.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      )
    },
    {
      key: 'dureeJours',
      label: 'Durée',
      render: (a) => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-semibold border border-emerald-200">
          <Clock className="w-3.5 h-3.5" />
          {a.dureeJours} jour{a.dureeJours > 1 ? 's' : ''}
        </span>
      )
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (a) => {
        const statutIcons = {
          DEMANDEE: <Clock className="w-4 h-4" />,
          VALIDEE: <CheckCircle2 className="w-4 h-4" />,
          REFUSEE: <XCircle className="w-4 h-4" />,
          ANNULEE: <Ban className="w-4 h-4" />
        };
        const statutColors = {
          DEMANDEE: 'bg-orange-100 text-orange-700 border-orange-300',
          VALIDEE: 'bg-green-100 text-green-700 border-green-300',
          REFUSEE: 'bg-red-100 text-red-700 border-red-300',
          ANNULEE: 'bg-gray-100 text-gray-700 border-gray-300'
        };
        const statut = a.statut as keyof typeof statutIcons;
        return (
          <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg font-semibold border-2 ${statutColors[statut] || statutColors.DEMANDEE}`}>
            {statutIcons[statut] || statutIcons.DEMANDEE}
            <span>{STATUT_ABSENCE_LABELS[statut]}</span>
          </span>
        );
      },
      sortable: false
    },
    {
      key: 'id',
      label: 'Actions',
      render: (a) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedAbsence(a); }}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shadow-sm border border-gray-200"
            title="Voir détails"
          >
            <Eye className="w-4 h-4" />
          </button>

          {!isChefEquipeOnly && (
            <>
              {(a.statut === 'DEMANDEE' || a.statut === 'VALIDEE') && (
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingAbsence(a); }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shadow-sm border border-blue-200"
                  title="Modifier"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {a.statut === 'DEMANDEE' && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleValiderAbsence(a.id); }}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors shadow-sm border border-green-200"
                    title="Valider"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRefuserAbsence(a.id); }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors shadow-sm border border-red-200"
                    title="Refuser"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
              {(a.statut === 'DEMANDEE' || a.statut === 'VALIDEE') && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteAbsenceId(a.id); }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors shadow-sm border border-red-200"
                  title="Supprimer (annuler)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      ),
      sortable: false
    }
  ];

  if (loading && !stats) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
        <p className="text-sm text-slate-500">Chargement des données...</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col gap-6">
      {/* Barre KPI Moderne - Toujours visible */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
          <StatCardCompact
            icon={<Users className="w-5 h-5 text-blue-500" />}
            label="Total Opérateurs"
            value={stats.totalOperateurs}
            color="bg-blue-500"
          />
          <StatCardCompact
            icon={<UserCheck className="w-5 h-5 text-emerald-500" />}
            label="Disponibles"
            value={stats.disponibles}
            color="bg-emerald-500"
          />
          <StatCardCompact
            icon={<Users className="w-5 h-5 text-purple-500" />}
            label="Équipes"
            value={stats.totalEquipes}
            color="bg-purple-500"
          />
          <StatCardCompact
            icon={<Clock className="w-5 h-5 text-orange-500" />}
            label="Absences en attente"
            value={stats.absencesEnAttente}
            color="bg-orange-500"
          />
        </div>
      )}

      {/* Toolbar - Tabs et Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-shrink-0">
        {/* Left: Main Tabs */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('equipes')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'equipes'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Users className="w-4 h-4" />
            Équipes
          </button>
          <button
            onClick={() => setActiveTab('operateurs')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'operateurs'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <UserCheck className="w-4 h-4" />
            Opérateurs
          </button>
          <button
            onClick={() => setActiveTab('absences')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'absences'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Absences</span>
            {stats && stats.absencesEnAttente > 0 && (
              <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full font-bold">
                {stats.absencesEnAttente}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('competences')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'competences'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Award className="w-4 h-4" />
            Compétences
          </button>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Competences Tab Controls */}
          {activeTab === 'competences' && (
            <>
              {/* Edit Mode Toggle - Icon only */}
              <button
                onClick={() => setMatrixEditMode(!matrixEditMode)}
                className={`p-2.5 rounded-lg transition-all duration-200 ${
                  matrixEditMode
                    ? 'bg-orange-500 text-white shadow-md hover:bg-orange-600'
                    : 'bg-blue-500 text-white shadow-md hover:bg-blue-600'
                }`}
                title={matrixEditMode ? 'Mode consultation' : 'Mode édition'}
              >
                {matrixEditMode ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <Edit3 className="w-4 h-4" />
                )}
              </button>

              {/* Separator */}
              <div className="h-8 w-px bg-gray-300"></div>

              {/* View Mode Toggle - Icons only */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setMatrixViewMode('cards')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    matrixViewMode === 'cards'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                  }`}
                  title="Vue cartes"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setMatrixViewMode('table')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    matrixViewMode === 'table'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                  }`}
                  title="Vue tableau"
                >
                  <Table className="w-4 h-4" />
                </button>
              </div>

              {/* Separator */}
              <div className="h-8 w-px bg-gray-300"></div>

              {/* Filters Toggle - Icon only */}
              <button
                onClick={() => setMatrixShowFilters(!matrixShowFilters)}
                className={`relative p-2.5 rounded-lg transition-all duration-200 ${
                  matrixShowFilters || matrixNiveauFilter || matrixCategorieFilter
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400 shadow-sm'
                }`}
                title="Filtres"
              >
                <Filter className="w-4 h-4" />
                {(matrixNiveauFilter || matrixCategorieFilter) && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow">
                    {(matrixNiveauFilter ? 1 : 0) + (matrixCategorieFilter ? 1 : 0)}
                  </span>
                )}
              </button>

              {/* Inline Filters - Custom selects with icons */}
              {matrixShowFilters && (
                <>
                  {/* Niveau Filter */}
                  <Listbox value={matrixNiveauFilter} onChange={setMatrixNiveauFilter}>
                    <div className="relative">
                      <Listbox.Button className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]">
                        <BarChart3 className="w-4 h-4 text-gray-500" />
                        <span className="flex-1 text-left">
                          {matrixNiveauFilter === '' && 'Niveau'}
                          {matrixNiveauFilter === 'NON' && 'Aucune'}
                          {matrixNiveauFilter === 'DEBUTANT' && 'Débutant'}
                          {matrixNiveauFilter === 'INTERMEDIAIRE' && 'Intermédiaire'}
                          {matrixNiveauFilter === 'EXPERT' && 'Expert'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </Listbox.Button>
                      <Transition
                        as={React.Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <Listbox.Option
                            value=""
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-gray-500" />
                                <span className={selected ? 'font-semibold' : 'font-normal'}>
                                  Niveau
                                </span>
                              </div>
                            )}
                          </Listbox.Option>
                          <Listbox.Option
                            value="NON"
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className="flex items-center gap-2">
                                <Ban className="w-4 h-4 text-red-500" />
                                <span className={selected ? 'font-semibold' : 'font-normal'}>
                                  Aucune
                                </span>
                              </div>
                            )}
                          </Listbox.Option>
                          <Listbox.Option
                            value="DEBUTANT"
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-orange-500" />
                                <span className={selected ? 'font-semibold' : 'font-normal'}>
                                  Débutant
                                </span>
                              </div>
                            )}
                          </Listbox.Option>
                          <Listbox.Option
                            value="INTERMEDIAIRE"
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-blue-500" />
                                <span className={selected ? 'font-semibold' : 'font-normal'}>
                                  Intermédiaire
                                </span>
                              </div>
                            )}
                          </Listbox.Option>
                          <Listbox.Option
                            value="EXPERT"
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className={selected ? 'font-semibold' : 'font-normal'}>
                                  Expert
                                </span>
                              </div>
                            )}
                          </Listbox.Option>
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </Listbox>

                  {/* Categorie Filter */}
                  <Listbox value={matrixCategorieFilter} onChange={setMatrixCategorieFilter}>
                    <div className="relative">
                      <Listbox.Button className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]">
                        <FolderOpen className="w-4 h-4 text-gray-500" />
                        <span className="flex-1 text-left truncate">
                          {matrixCategorieFilter || 'Catégorie'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </Listbox.Button>
                      <Transition
                        as={React.Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <Listbox.Option
                            value=""
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className="flex items-center gap-2">
                                <FolderOpen className="w-4 h-4 text-gray-500" />
                                <span className={selected ? 'font-semibold' : 'font-normal'}>
                                  Catégorie
                                </span>
                              </div>
                            )}
                          </Listbox.Option>
                          {competenceCategories.map(cat => (
                            <Listbox.Option
                              key={cat}
                              value={cat}
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-2 px-3 ${
                                  active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'
                                }`
                              }
                            >
                              {({ selected }) => (
                                <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                                  {cat}
                                </span>
                              )}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </Listbox>

                  {(matrixNiveauFilter || matrixCategorieFilter) && (
                    <button
                      onClick={() => {
                        setMatrixNiveauFilter('');
                        setMatrixCategorieFilter('');
                      }}
                      className="p-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 border border-red-200 hover:border-red-300 shadow-sm"
                      title="Réinitialiser les filtres"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}

              {/* Separator */}
              <div className="h-8 w-px bg-gray-300"></div>

              {/* Refresh Button - Icon only */}
              <button
                onClick={loadData}
                className="p-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                title="Rafraîchir"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Absences Tab Controls */}
          {activeTab === 'absences' && (
            <>
              {/* Filters Toggle - Icon only */}
              <button
                onClick={() => setShowAbsenceFilters(!showAbsenceFilters)}
                className={`relative p-2.5 rounded-lg transition-all duration-200 ${
                  showAbsenceFilters || absenceFilters.statut || absenceFilters.typeAbsence || absenceFilters.dateDebut || absenceFilters.dateFin
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400 shadow-sm'
                }`}
                title="Filtres"
              >
                <Filter className="w-4 h-4" />
                {(absenceFilters.statut || absenceFilters.typeAbsence || absenceFilters.dateDebut || absenceFilters.dateFin) && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow">
                    {(absenceFilters.statut ? 1 : 0) + (absenceFilters.typeAbsence ? 1 : 0) + (absenceFilters.dateDebut ? 1 : 0) + (absenceFilters.dateFin ? 1 : 0)}
                  </span>
                )}
              </button>

              {/* Inline Filters - Custom selects with icons */}
              {showAbsenceFilters && (
                <>
                  {/* Statut Filter */}
                  <Listbox value={absenceFilters.statut} onChange={(val) => setAbsenceFilters({ ...absenceFilters, statut: val })}>
                    <div className="relative">
                      <Listbox.Button className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]">
                        <CalendarCheck className="w-4 h-4 text-gray-500" />
                        <span className="flex-1 text-left">
                          {absenceFilters.statut === '' && 'Statut'}
                          {absenceFilters.statut === 'DEMANDEE' && 'Demandée'}
                          {absenceFilters.statut === 'VALIDEE' && 'Validée'}
                          {absenceFilters.statut === 'REFUSEE' && 'Refusée'}
                          {absenceFilters.statut === 'ANNULEE' && 'Annulée'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </Listbox.Button>
                      <Transition
                        as={React.Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <Listbox.Option
                            value=""
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className="flex items-center gap-2">
                                <CalendarCheck className="w-4 h-4 text-gray-500" />
                                <span className={selected ? 'font-semibold' : 'font-normal'}>
                                  Tous statuts
                                </span>
                              </div>
                            )}
                          </Listbox.Option>
                          <Listbox.Option
                            value="DEMANDEE"
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-orange-500" />
                                <span className={selected ? 'font-semibold' : 'font-normal'}>
                                  Demandée
                                </span>
                              </div>
                            )}
                          </Listbox.Option>
                          <Listbox.Option
                            value="VALIDEE"
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className={selected ? 'font-semibold' : 'font-normal'}>
                                  Validée
                                </span>
                              </div>
                            )}
                          </Listbox.Option>
                          <Listbox.Option
                            value="REFUSEE"
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span className={selected ? 'font-semibold' : 'font-normal'}>
                                  Refusée
                                </span>
                              </div>
                            )}
                          </Listbox.Option>
                          <Listbox.Option
                            value="ANNULEE"
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className="flex items-center gap-2">
                                <Ban className="w-4 h-4 text-gray-500" />
                                <span className={selected ? 'font-semibold' : 'font-normal'}>
                                  Annulée
                                </span>
                              </div>
                            )}
                          </Listbox.Option>
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </Listbox>

                  {/* Type Filter */}
                  <Listbox value={absenceFilters.typeAbsence} onChange={(val) => setAbsenceFilters({ ...absenceFilters, typeAbsence: val })}>
                    <div className="relative">
                      <Listbox.Button className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]">
                        <CalendarClock className="w-4 h-4 text-gray-500" />
                        <span className="flex-1 text-left truncate">
                          {absenceFilters.typeAbsence === '' && 'Type'}
                          {absenceFilters.typeAbsence === 'CONGE' && 'Congé'}
                          {absenceFilters.typeAbsence === 'MALADIE' && 'Maladie'}
                          {absenceFilters.typeAbsence === 'FORMATION' && 'Formation'}
                          {absenceFilters.typeAbsence === 'AUTRE' && 'Autre'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </Listbox.Button>
                      <Transition
                        as={React.Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <Listbox.Option
                            value=""
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className="flex items-center gap-2">
                                <CalendarClock className="w-4 h-4 text-gray-500" />
                                <span className={selected ? 'font-semibold' : 'font-normal'}>
                                  Tous types
                                </span>
                              </div>
                            )}
                          </Listbox.Option>
                          <Listbox.Option
                            value="CONGE"
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className="flex items-center gap-2">
                                <Umbrella className="w-4 h-4 text-blue-500" />
                                <span className={selected ? 'font-semibold' : 'font-normal'}>
                                  Congé
                                </span>
                              </div>
                            )}
                          </Listbox.Option>
                          <Listbox.Option
                            value="MALADIE"
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className="flex items-center gap-2">
                                <HeartPulse className="w-4 h-4 text-red-500" />
                                <span className={selected ? 'font-semibold' : 'font-normal'}>
                                  Maladie
                                </span>
                              </div>
                            )}
                          </Listbox.Option>
                          <Listbox.Option
                            value="FORMATION"
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-purple-500" />
                                <span className={selected ? 'font-semibold' : 'font-normal'}>
                                  Formation
                                </span>
                              </div>
                            )}
                          </Listbox.Option>
                          <Listbox.Option
                            value="AUTRE"
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className="flex items-center gap-2">
                                <MoreHorizontal className="w-4 h-4 text-gray-500" />
                                <span className={selected ? 'font-semibold' : 'font-normal'}>
                                  Autre
                                </span>
                              </div>
                            )}
                          </Listbox.Option>
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </Listbox>

                  {/* Date Filters */}
                  <input
                    type="date"
                    value={absenceFilters.dateDebut}
                    onChange={(e) => setAbsenceFilters({ ...absenceFilters, dateDebut: e.target.value })}
                    placeholder="Date début"
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all hover:border-gray-300 shadow-sm cursor-pointer"
                  />
                  <input
                    type="date"
                    value={absenceFilters.dateFin}
                    onChange={(e) => setAbsenceFilters({ ...absenceFilters, dateFin: e.target.value })}
                    placeholder="Date fin"
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all hover:border-gray-300 shadow-sm cursor-pointer"
                  />

                  {/* Reset Filters */}
                  {(absenceFilters.statut || absenceFilters.typeAbsence || absenceFilters.dateDebut || absenceFilters.dateFin) && (
                    <button
                      onClick={() => {
                        setAbsenceFilters({ statut: '', typeAbsence: '', dateDebut: '', dateFin: '' });
                      }}
                      className="p-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 border border-red-200 hover:border-red-300 shadow-sm"
                      title="Réinitialiser les filtres"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}

              {/* Separator */}
              <div className="h-8 w-px bg-gray-300"></div>

              {/* Refresh Button */}
              <button
                onClick={loadData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors font-medium shadow-sm"
                title="Rafraîchir"
              >
                <RefreshCw className="w-4 h-4" />
                Rafraîchir
              </button>

              {/* Create Button */}
              {!isChefEquipeOnly && (
                <button
                  onClick={() => setShowCreateAbsence(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Absence
                </button>
              )}
            </>
          )}

          {/* Equipes and Operateurs tabs controls */}
          {(activeTab === 'equipes' || activeTab === 'operateurs') && (
            <>
              {/* Refresh Button */}
              <button
                onClick={loadData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors font-medium shadow-sm"
                title="Rafraîchir"
              >
                <RefreshCw className="w-4 h-4" />
                Rafraîchir
              </button>

              {/* Create Button - Conditional based on tab */}
              {activeTab === 'equipes' && !isChefEquipeOnly && (
                <button
                  onClick={() => setShowCreateTeam(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Équipe
                </button>
              )}
              {activeTab === 'operateurs' && !isChefEquipeOnly && (
                <button
                  onClick={() => {
                    // TODO: Ouvrir modal de création d'opérateur
                    showToast('Fonctionnalité à venir : Créer un nouvel opérateur', 'info');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Opérateur
                </button>
              )}
            </>
          )}
        </div>
      </div>


      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0">
        {activeTab === 'equipes' && (
          <DataTable
            data={filteredEquipes}
            columns={equipesColumns}
            serverSide={true}
            totalItems={equipesTotal}
            currentPage={equipesPage}
            onPageChange={async (page) => {
              setEquipesPage(page);
              await loadEquipesData(page);
            }}
            itemsPerPage={50}
            onRowClick={(equipe) => handleViewEquipe(equipe.id)}
          />
        )}

        {activeTab === 'operateurs' && (
          <DataTable
            data={filteredOperateurs}
            columns={operateursColumns}
            serverSide={true}
            totalItems={operateursTotal}
            currentPage={operateursPage}
            onPageChange={async (page) => {
              setOperateursPage(page);
              await loadOperateursData(page);
            }}
            itemsPerPage={50}
            onRowClick={(op) => handleViewOperateur(op.id)}
          />
        )}

        {activeTab === 'absences' && (
          <DataTable
            data={filteredAbsences}
            columns={absencesColumns}
            serverSide={true}
            totalItems={absencesTotal}
            currentPage={absencesPage}
            onPageChange={async (page) => {
              setAbsencesPage(page);
              await loadAbsencesData(page);
            }}
            itemsPerPage={50}
          />
        )}

        {activeTab === 'competences' && (
          <CompetenceMatrix
            operateurs={operateurs}
            competences={competences}
            searchQuery={debouncedSearchQuery}
            viewMode={matrixViewMode}
            isEditMode={matrixEditMode}
            niveauFilter={matrixNiveauFilter}
            categorieFilter={matrixCategorieFilter}
            onViewModeChange={setMatrixViewMode}
            onEditModeChange={setMatrixEditMode}
            onNiveauFilterChange={setMatrixNiveauFilter}
            onCategorieFilterChange={setMatrixCategorieFilter}
          />
        )}
      </div>

      {/* Modals */}
      {showCreateTeam && (
        <CreateTeamModal
          onClose={() => setShowCreateTeam(false)}
          onCreated={loadData}
          chefsPotentiels={chefsPotentiels}
          operateursSansEquipe={operateursSansEquipe}
        />
      )}


      {selectedEquipe && (
        <EquipeDetailModal
          equipe={selectedEquipe}
          onClose={() => setSelectedEquipe(null)}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          clients={clients}
          operateurs={operateurs}
          onClose={() => setEditingUser(null)}
          onUpdated={loadData}
        />
      )}

      {editEquipe && (
        <EditEquipeModal
          equipe={editEquipe}
          onClose={() => setEditEquipe(null)}
          onSaved={loadData}
        />
      )}

      {deleteEquipeId !== null && (
        <ConfirmDeleteModal
          title="Supprimer l'équipe ?"
          message="Cette action est irréversible."
          onConfirm={async () => {
            await deleteEquipe(deleteEquipeId);
            showToast('Équipe supprimée avec succès', 'success');
            loadData();
          }}
          onCancel={() => setDeleteEquipeId(null)}
        />
      )}

      {deleteOperateurId !== null && (
        <ConfirmDeleteModal
          title="Supprimer l'opérateur ?"
          message="Cette action est irréversible."
          onConfirm={async () => {
            await deleteOperateur(deleteOperateurId);
            showToast('Opérateur supprimé avec succès', 'success');
            loadData();
          }}
          onCancel={() => setDeleteOperateurId(null)}
        />
      )}

      {showCreateAbsence && (
        <CreateAbsenceModal
          operateurs={operateurs}
          onClose={() => setShowCreateAbsence(false)}
          onCreated={loadData}
        />
      )}

      {selectedAbsence && (
        <AbsenceDetailModal
          absence={selectedAbsence}
          onClose={() => setSelectedAbsence(null)}
        />
      )}

      {editingAbsence && (
        <EditAbsenceModal
          absence={editingAbsence}
          onClose={() => setEditingAbsence(null)}
          onUpdated={loadData}
        />
      )}

      {deleteAbsenceId !== null && (
        <ConfirmDeleteModal
          title="Annuler l'absence ?"
          message="L'absence sera marquée comme annulée. Cette action ne peut pas être annulée."
          onConfirm={async () => {
            await annulerAbsence(deleteAbsenceId);
            showToast('Absence annulée avec succès', 'success');
            loadData();
          }}
          onCancel={() => setDeleteAbsenceId(null)}
          confirmText="Annuler l'absence"
        />
      )}
    </div >
  );
};

export default Teams;
