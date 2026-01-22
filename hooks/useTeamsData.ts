import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearch } from '../contexts/SearchContext';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from './usePermissions';
import type { User, Role } from '../types';

import {
  OperateurList,
  OperateurDetail,
  EquipeList,
  EquipeDetail,
  Absence,
  Competence,
  Utilisateur,
  Client,
  NiveauCompetence,
  TYPE_ABSENCE_LABELS,
  STATUT_ABSENCE_LABELS
} from '../types/users';

import {
  fetchOperateurs,
  fetchOperateurById,
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
  deleteOperateur,
  deleteEquipe,
  fetchCurrentUser
} from '../services/usersApi';

// ============================================================================
// TYPES
// ============================================================================

export type TabType = 'equipes' | 'operateurs' | 'absences' | 'competences';

export interface TeamsStats {
  totalOperateurs: number;
  disponibles: number;
  totalEquipes: number;
  absencesEnAttente: number;
}

export interface AbsenceFilters {
  statut: string;
  typeAbsence: string;
  dateDebut: string;
  dateFin: string;
}

export interface OperateurFilters {
  statut: string;
  equipe: string;
  estChef: string;
  disponible: string;
}

export interface UseTeamsDataReturn {
  // Loading & Error
  loading: boolean;

  // Current user & permissions
  currentUser: Utilisateur | null;
  permissions: ReturnType<typeof usePermissions>;
  isReadOnly: boolean;

  // Stats
  stats: TeamsStats | null;

  // Tab management
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Search
  debouncedSearchQuery: string;

  // Data - Equipes
  equipes: EquipeList[];
  filteredEquipes: EquipeList[];
  equipesPage: number;
  equipesTotal: number;
  setEquipesPage: (page: number) => void;
  chefsPotentiels: OperateurList[];
  operateursSansEquipe: OperateurList[];

  // Data - Operateurs
  operateurs: OperateurList[];
  filteredOperateurs: OperateurList[];
  operateursPage: number;
  operateursTotal: number;
  setOperateursPage: (page: number) => void;
  operateurFilters: OperateurFilters;
  setOperateurFilters: (filters: OperateurFilters) => void;
  showOperateurFilters: boolean;
  setShowOperateurFilters: (show: boolean) => void;

  // Data - Absences
  absences: Absence[];
  filteredAbsences: Absence[];
  absencesPage: number;
  absencesTotal: number;
  setAbsencesPage: (page: number) => void;
  absencesAValider: Absence[];
  absenceFilters: AbsenceFilters;
  setAbsenceFilters: (filters: AbsenceFilters) => void;
  showAbsenceFilters: boolean;
  setShowAbsenceFilters: (show: boolean) => void;

  // Data - Competences
  competences: Competence[];
  competenceCategories: string[];

  // Modals - Equipes
  showCreateTeam: boolean;
  setShowCreateTeam: (show: boolean) => void;
  selectedEquipe: EquipeDetail | null;
  setSelectedEquipe: (equipe: EquipeDetail | null) => void;
  editEquipe: EquipeList | null;
  setEditEquipe: (equipe: EquipeList | null) => void;
  deleteEquipeId: number | null;
  setDeleteEquipeId: (id: number | null) => void;

  // Modals - Operateurs
  showCreateOperateur: boolean;
  setShowCreateOperateur: (show: boolean) => void;
  selectedOperateur: OperateurDetail | null;
  setSelectedOperateur: (op: OperateurDetail | null) => void;
  editingOperateur: OperateurList | null;
  setEditingOperateur: (op: OperateurList | null) => void;
  deleteOperateurId: number | null;
  setDeleteOperateurId: (id: number | null) => void;

  // Modals - Absences
  showCreateAbsence: boolean;
  setShowCreateAbsence: (show: boolean) => void;
  selectedAbsence: Absence | null;
  setSelectedAbsence: (absence: Absence | null) => void;
  editingAbsence: Absence | null;
  setEditingAbsence: (absence: Absence | null) => void;
  deleteAbsenceId: number | null;
  setDeleteAbsenceId: (id: number | null) => void;

  // Modals - Users
  editingUser: Utilisateur | null;
  setEditingUser: (user: Utilisateur | null) => void;
  clients: Client[];

  // Competences view state
  matrixViewMode: 'cards' | 'table';
  setMatrixViewMode: (mode: 'cards' | 'table') => void;
  matrixEditMode: boolean;
  setMatrixEditMode: (edit: boolean) => void;
  matrixNiveauFilter: NiveauCompetence | '';
  setMatrixNiveauFilter: (niveau: NiveauCompetence | '') => void;
  matrixCategorieFilter: string;
  setMatrixCategorieFilter: (cat: string) => void;

  // Actions
  loadData: () => Promise<void>;
  loadEquipesData: (page?: number, forceRefresh?: boolean) => Promise<void>;
  loadOperateursData: (page?: number, filters?: OperateurFilters) => Promise<void>;
  loadAbsencesData: (page?: number) => Promise<void>;
  handleViewEquipe: (equipeId: number) => Promise<void>;
  handleViewOperateur: (operateurId: number) => Promise<void>;
  handleValiderAbsence: (absenceId: number) => Promise<void>;
  handleRefuserAbsence: (absenceId: number) => Promise<void>;
  handleOpenCreateAbsence: () => Promise<void>;
  handleOpenCreateTeam: () => Promise<void>;
  handleDeleteEquipe: (id: number) => Promise<void>;
  handleDeleteOperateur: (id: number) => Promise<void>;
  handleAnnulerAbsence: (id: number) => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useTeamsData(): UseTeamsDataReturn {
  const { searchQuery, setSearchQuery, setPlaceholder } = useSearch();
  const { showToast } = useToast();

  // Loading
  const [loading, setLoading] = useState(true);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Current user
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);

  // Stats
  const [stats, setStats] = useState<TeamsStats | null>(null);

  // Tab
  const [activeTab, setActiveTab] = useState<TabType>('equipes');

  // Data - Equipes
  const [equipes, setEquipes] = useState<EquipeList[]>([]);
  const [equipesPage, setEquipesPage] = useState(1);
  const [equipesTotal, setEquipesTotal] = useState(0);
  const [chefsPotentiels, setChefsPotentiels] = useState<OperateurList[]>([]);

  // Data - Operateurs
  const [operateurs, setOperateurs] = useState<OperateurList[]>([]);
  const [operateursPage, setOperateursPage] = useState(1);
  const [operateursTotal, setOperateursTotal] = useState(0);
  const [operateurFilters, setOperateurFilters] = useState<OperateurFilters>({
    statut: '',
    equipe: '',
    estChef: '',
    disponible: ''
  });
  const [showOperateurFilters, setShowOperateurFilters] = useState(false);

  // Data - Absences
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [absencesPage, setAbsencesPage] = useState(1);
  const [absencesTotal, setAbsencesTotal] = useState(0);
  const [absencesAValider, setAbsencesAValider] = useState<Absence[]>([]);
  const [absenceFilters, setAbsenceFilters] = useState<AbsenceFilters>({
    statut: '',
    typeAbsence: '',
    dateDebut: '',
    dateFin: ''
  });
  const [showAbsenceFilters, setShowAbsenceFilters] = useState(false);

  // Data - Competences
  const [competences, setCompetences] = useState<Competence[]>([]);

  // Data - Clients (for user editing)
  const [clients, setClients] = useState<Client[]>([]);

  // Modals - Equipes
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [selectedEquipe, setSelectedEquipe] = useState<EquipeDetail | null>(null);
  const [editEquipe, setEditEquipe] = useState<EquipeList | null>(null);
  const [deleteEquipeId, setDeleteEquipeId] = useState<number | null>(null);

  // Modals - Operateurs
  const [showCreateOperateur, setShowCreateOperateur] = useState(false);
  const [selectedOperateur, setSelectedOperateur] = useState<OperateurDetail | null>(null);
  const [editingOperateur, setEditingOperateur] = useState<OperateurList | null>(null);
  const [deleteOperateurId, setDeleteOperateurId] = useState<number | null>(null);

  // Modals - Absences
  const [showCreateAbsence, setShowCreateAbsence] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);
  const [deleteAbsenceId, setDeleteAbsenceId] = useState<number | null>(null);

  // Modals - Users
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null);

  // Competences view state
  const [matrixViewMode, setMatrixViewMode] = useState<'cards' | 'table'>('cards');
  const [matrixEditMode, setMatrixEditMode] = useState(false);
  const [matrixNiveauFilter, setMatrixNiveauFilter] = useState<NiveauCompetence | ''>('');
  const [matrixCategorieFilter, setMatrixCategorieFilter] = useState('');

  // Permissions
  const isReadOnly = !!currentUser?.roles?.includes('CLIENT');
  const tempUser: User | null = currentUser ? {
    id: String(currentUser.id),
    name: currentUser.nom || '',
    email: currentUser.email,
    role: (currentUser.roles?.[0] || 'CLIENT') as Role
  } : null;
  const permissions = usePermissions(tempUser);

  // ========================================================================
  // EFFECTS
  // ========================================================================

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update search placeholder based on tab
  useEffect(() => {
    const placeholders: Record<TabType, string> = {
      equipes: 'Rechercher une équipe...',
      operateurs: 'Rechercher un opérateur (nom, matricule)...',
      competences: 'Voir la matrice de compétences...',
      absences: 'Rechercher une absence (opérateur, motif, type)...'
    };
    setPlaceholder(placeholders[activeTab]);
    return () => {
      setPlaceholder('Rechercher...');
      setSearchQuery('');
    };
  }, [activeTab, setPlaceholder, setSearchQuery]);

  // Initial data load
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await loadStableData();
        await loadTabData(activeTab);
      } catch (error) {
        console.error('Erreur initialisation:', error);
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (stats) {
      loadTabData(activeTab);
    }
  }, [activeTab]);

  // ========================================================================
  // DATA LOADING
  // ========================================================================

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
    setLoading(true);
    try {
      switch (tab) {
        case 'equipes':
          await loadEquipesData(equipesPage, true);
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
    } finally {
      setLoading(false);
    }
  };

  const loadEquipesData = useCallback(async (page: number = equipesPage, forceRefresh: boolean = false) => {
    try {
      const [equipesRes, chefsPotentielsRes] = await Promise.all([
        fetchEquipes({ page, pageSize: 50 }),
        chefsPotentiels.length === 0 ? fetchChefsPotentiels() : Promise.resolve(chefsPotentiels)
      ]);
      setEquipes(equipesRes.results);
      setEquipesTotal(equipesRes.count || 0);
      if (chefsPotentiels.length === 0) {
        setChefsPotentiels(chefsPotentielsRes);
      }
    } catch (error) {
      console.error('Erreur chargement équipes:', error);
      showToast('Erreur lors du chargement des équipes', 'error');
    }
  }, [equipesPage, chefsPotentiels, showToast]);

  const loadOperateursData = useCallback(async (page: number = operateursPage, filters = operateurFilters) => {
    try {
      const apiFilters: Record<string, unknown> = { page, pageSize: 50 };
      if (filters.statut) apiFilters.statut = filters.statut;
      if (filters.equipe === 'sans_equipe') {
        apiFilters.sansEquipe = true;
      } else if (filters.equipe) {
        apiFilters.equipe = parseInt(filters.equipe);
      }
      if (filters.estChef === 'true') apiFilters.estChef = true;
      if (filters.estChef === 'false') apiFilters.estChef = false;
      if (filters.disponible === 'true') apiFilters.disponible = true;
      if (filters.disponible === 'false') apiFilters.disponible = false;

      const [operateursRes] = await Promise.all([
        fetchOperateurs(apiFilters),
        equipes.length === 0 ? fetchEquipes({ pageSize: 100 }).then(res => setEquipes(res.results)) : Promise.resolve()
      ]);
      setOperateurs(operateursRes.results);
      setOperateursTotal(operateursRes.count || 0);
    } catch (error) {
      console.error('Erreur chargement opérateurs:', error);
      showToast('Erreur lors du chargement des opérateurs', 'error');
    }
  }, [operateursPage, operateurFilters, equipes, showToast]);

  const loadCompetencesData = useCallback(async () => {
    if (competences.length > 0 && operateurs.length > 0) return;
    const [competencesRes, operateursRes] = await Promise.all([
      competences.length === 0 ? fetchCompetences() : Promise.resolve(competences),
      operateurs.length === 0 ? fetchOperateurs({ pageSize: 200 }) : Promise.resolve({ results: operateurs })
    ]);
    if (competences.length === 0) {
      setCompetences(competencesRes);
    }
    if (operateurs.length === 0) {
      setOperateurs(operateursRes.results);
    }
  }, [competences, operateurs]);

  const loadAbsencesData = useCallback(async (page: number = absencesPage) => {
    const [absencesRes, absencesAValiderRes, operateursRes] = await Promise.all([
      fetchAbsences({ page, pageSize: 50 }),
      fetchAbsencesAValider(),
      operateurs.length === 0 ? fetchOperateurs({ page: 1, pageSize: 100 }) : Promise.resolve({ results: operateurs })
    ]);
    setAbsences(absencesRes.results);
    setAbsencesTotal(absencesRes.count || 0);
    setAbsencesAValider(absencesAValiderRes);
    if (operateurs.length === 0) {
      setOperateurs(operateursRes.results);
    }
  }, [absencesPage, operateurs]);

  const loadData = useCallback(async () => {
    await loadTabData(activeTab);
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
  }, [activeTab]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleViewOperateur = useCallback(async (operateurId: number) => {
    try {
      const detail = await fetchOperateurById(operateurId);
      setSelectedOperateur(detail);
    } catch (error) {
      console.error('Erreur chargement opérateur:', error);
      showToast('Erreur lors du chargement des détails de l\'opérateur', 'error');
    }
  }, [showToast]);

  const handleViewEquipe = useCallback(async (equipeId: number) => {
    try {
      const detail = await fetchEquipeById(equipeId);
      setSelectedEquipe(detail);
    } catch (error) {
      console.error('Erreur chargement equipe:', error);
    }
  }, []);

  const handleValiderAbsence = useCallback(async (absenceId: number) => {
    try {
      await validerAbsence(absenceId, 'Approuve');
      loadData();
    } catch (error) {
      console.error('Erreur validation absence:', error);
    }
  }, [loadData]);

  const handleRefuserAbsence = useCallback(async (absenceId: number) => {
    try {
      await refuserAbsence(absenceId, 'Refuse');
      loadData();
    } catch (error) {
      console.error('Erreur refus absence:', error);
    }
  }, [loadData]);

  const handleOpenCreateAbsence = useCallback(async () => {
    if (operateurs.length === 0) {
      try {
        const operateursRes = await fetchOperateurs({ page: 1, pageSize: 200 });
        setOperateurs(operateursRes.results);
      } catch (error) {
        console.error('Erreur chargement opérateurs:', error);
        showToast('Erreur lors du chargement des opérateurs', 'error');
        return;
      }
    }
    setShowCreateAbsence(true);
  }, [operateurs, showToast]);

  const handleOpenCreateTeam = useCallback(async () => {
    if (operateurs.length === 0) {
      try {
        const operateursRes = await fetchOperateurs({ page: 1, pageSize: 200 });
        setOperateurs(operateursRes.results);
      } catch (error) {
        console.error('Erreur chargement opérateurs:', error);
        showToast('Erreur lors du chargement des opérateurs', 'error');
        return;
      }
    }
    setShowCreateTeam(true);
  }, [operateurs, showToast]);

  const handleDeleteEquipe = useCallback(async (id: number) => {
    await deleteEquipe(id);
    showToast('Équipe supprimée avec succès', 'success');
    loadData();
    setDeleteEquipeId(null);
  }, [loadData, showToast]);

  const handleDeleteOperateur = useCallback(async (id: number) => {
    await deleteOperateur(id);
    showToast('Opérateur supprimé avec succès', 'success');
    loadData();
    setDeleteOperateurId(null);
  }, [loadData, showToast]);

  const handleAnnulerAbsence = useCallback(async (id: number) => {
    await annulerAbsence(id);
    showToast('Absence annulée avec succès', 'success');
    loadData();
    setDeleteAbsenceId(null);
  }, [loadData, showToast]);

  // ========================================================================
  // COMPUTED VALUES
  // ========================================================================

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
    if (absenceFilters.statut && a.statut !== absenceFilters.statut) return false;
    if (absenceFilters.typeAbsence && a.typeAbsence !== absenceFilters.typeAbsence) return false;
    if (absenceFilters.dateDebut && new Date(a.dateDebut) < new Date(absenceFilters.dateDebut)) return false;
    if (absenceFilters.dateFin && new Date(a.dateFin) > new Date(absenceFilters.dateFin)) return false;
    return true;
  }), [absences, debouncedSearchQuery, absenceFilters]);

  const operateursSansEquipe = useMemo(() => operateurs.filter(o => {
    const estActif = o.actif === true || (o.actif === undefined && o.statut === 'ACTIF');
    return estActif;
  }), [operateurs]);

  const competenceCategories = useMemo(() => {
    const cats = new Set<string>();
    competences.forEach(c => {
      if (c.categorieDisplay || c.categorie) {
        cats.add(c.categorieDisplay || c.categorie);
      }
    });
    return Array.from(cats);
  }, [competences]);

  // ========================================================================
  // RETURN
  // ========================================================================

  return {
    loading,
    currentUser,
    permissions,
    isReadOnly,
    stats,
    activeTab,
    setActiveTab,
    debouncedSearchQuery,

    // Equipes
    equipes,
    filteredEquipes,
    equipesPage,
    equipesTotal,
    setEquipesPage,
    chefsPotentiels,
    operateursSansEquipe,

    // Operateurs
    operateurs,
    filteredOperateurs,
    operateursPage,
    operateursTotal,
    setOperateursPage,
    operateurFilters,
    setOperateurFilters,
    showOperateurFilters,
    setShowOperateurFilters,

    // Absences
    absences,
    filteredAbsences,
    absencesPage,
    absencesTotal,
    setAbsencesPage,
    absencesAValider,
    absenceFilters,
    setAbsenceFilters,
    showAbsenceFilters,
    setShowAbsenceFilters,

    // Competences
    competences,
    competenceCategories,

    // Modals - Equipes
    showCreateTeam,
    setShowCreateTeam,
    selectedEquipe,
    setSelectedEquipe,
    editEquipe,
    setEditEquipe,
    deleteEquipeId,
    setDeleteEquipeId,

    // Modals - Operateurs
    showCreateOperateur,
    setShowCreateOperateur,
    selectedOperateur,
    setSelectedOperateur,
    editingOperateur,
    setEditingOperateur,
    deleteOperateurId,
    setDeleteOperateurId,

    // Modals - Absences
    showCreateAbsence,
    setShowCreateAbsence,
    selectedAbsence,
    setSelectedAbsence,
    editingAbsence,
    setEditingAbsence,
    deleteAbsenceId,
    setDeleteAbsenceId,

    // Modals - Users
    editingUser,
    setEditingUser,
    clients,

    // Competences view
    matrixViewMode,
    setMatrixViewMode,
    matrixEditMode,
    setMatrixEditMode,
    matrixNiveauFilter,
    setMatrixNiveauFilter,
    matrixCategorieFilter,
    setMatrixCategorieFilter,

    // Actions
    loadData,
    loadEquipesData,
    loadOperateursData,
    loadAbsencesData,
    handleViewEquipe,
    handleViewOperateur,
    handleValiderAbsence,
    handleRefuserAbsence,
    handleOpenCreateAbsence,
    handleOpenCreateTeam,
    handleDeleteEquipe,
    handleDeleteOperateur,
    handleAnnulerAbsence,
  };
}
