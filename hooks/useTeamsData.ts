import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  STATUT_ABSENCE_LABELS,
} from '../types/users';

import { fetchOperateurById, fetchEquipeById } from '../services/usersApi';

import { useCurrentUser } from './queries/useReferenceData';
import {
  useOperateursQuery,
  useChefsPotentielsQuery,
  useEquipesRHQuery,
  useAbsencesQuery,
  useAbsencesAValiderQuery,
  useCompetencesQuery,
  useStatsUtilisateursQuery,
} from './queries/useTeamsQueries';
import {
  useDeleteEquipe,
  useDeleteOperateur,
  useValiderAbsence,
  useRefuserAbsence,
  useAnnulerAbsence,
} from './mutations/useTeamsMutations';
import { queryKeys } from '../lib/queryKeys';

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
  loading: boolean;

  currentUser: Utilisateur | null;
  permissions: ReturnType<typeof usePermissions>;
  isReadOnly: boolean;

  stats: TeamsStats | null;

  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  debouncedSearchQuery: string;

  equipes: EquipeList[];
  filteredEquipes: EquipeList[];
  equipesPage: number;
  equipesTotal: number;
  setEquipesPage: (page: number) => void;
  chefsPotentiels: OperateurList[];
  operateursSansEquipe: OperateurList[];

  operateurs: OperateurList[];
  filteredOperateurs: OperateurList[];
  operateursPage: number;
  operateursTotal: number;
  setOperateursPage: (page: number) => void;
  operateurFilters: OperateurFilters;
  setOperateurFilters: (filters: OperateurFilters) => void;
  showOperateurFilters: boolean;
  setShowOperateurFilters: (show: boolean) => void;

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

  competences: Competence[];
  competenceCategories: string[];

  showCreateTeam: boolean;
  setShowCreateTeam: (show: boolean) => void;
  selectedEquipe: EquipeDetail | null;
  setSelectedEquipe: (equipe: EquipeDetail | null) => void;
  editEquipe: EquipeList | null;
  setEditEquipe: (equipe: EquipeList | null) => void;
  deleteEquipeId: number | null;
  setDeleteEquipeId: (id: number | null) => void;

  showCreateOperateur: boolean;
  setShowCreateOperateur: (show: boolean) => void;
  selectedOperateur: OperateurDetail | null;
  setSelectedOperateur: (op: OperateurDetail | null) => void;
  editingOperateur: OperateurList | null;
  setEditingOperateur: (op: OperateurList | null) => void;
  deleteOperateurId: number | null;
  setDeleteOperateurId: (id: number | null) => void;

  showCreateAbsence: boolean;
  setShowCreateAbsence: (show: boolean) => void;
  selectedAbsence: Absence | null;
  setSelectedAbsence: (absence: Absence | null) => void;
  editingAbsence: Absence | null;
  setEditingAbsence: (absence: Absence | null) => void;
  deleteAbsenceId: number | null;
  setDeleteAbsenceId: (id: number | null) => void;

  editingUser: Utilisateur | null;
  setEditingUser: (user: Utilisateur | null) => void;
  clients: Client[];

  matrixViewMode: 'cards' | 'table';
  setMatrixViewMode: (mode: 'cards' | 'table') => void;
  matrixEditMode: boolean;
  setMatrixEditMode: (edit: boolean) => void;
  matrixNiveauFilter: NiveauCompetence | '';
  setMatrixNiveauFilter: (niveau: NiveauCompetence | '') => void;
  matrixCategorieFilter: string;
  setMatrixCategorieFilter: (cat: string) => void;

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

const PAGE_SIZE = 50;

export function useTeamsData(): UseTeamsDataReturn {
  const { searchQuery, setSearchQuery, setPlaceholder } = useSearch();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Tab
  const [activeTab, setActiveTab] = useState<TabType>('equipes');

  // Pagination
  const [equipesPage, setEquipesPage] = useState(1);
  const [operateursPage, setOperateursPage] = useState(1);
  const [absencesPage, setAbsencesPage] = useState(1);

  // Filters
  const [operateurFilters, setOperateurFilters] = useState<OperateurFilters>({
    statut: '',
    equipe: '',
    estChef: '',
    disponible: '',
  });
  const [showOperateurFilters, setShowOperateurFilters] = useState(false);

  const [absenceFilters, setAbsenceFilters] = useState<AbsenceFilters>({
    statut: '',
    typeAbsence: '',
    dateDebut: '',
    dateFin: '',
  });
  const [showAbsenceFilters, setShowAbsenceFilters] = useState(false);

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
  const [clients] = useState<Client[]>([]);

  // Competences view
  const [matrixViewMode, setMatrixViewMode] = useState<'cards' | 'table'>('cards');
  const [matrixEditMode, setMatrixEditMode] = useState(false);
  const [matrixNiveauFilter, setMatrixNiveauFilter] = useState<NiveauCompetence | ''>('');
  const [matrixCategorieFilter, setMatrixCategorieFilter] = useState('');

  // ========================================================================
  // QUERIES (React Query)
  // ========================================================================

  const currentUserQuery = useCurrentUser();
  const currentUser = currentUserQuery.data ?? null;

  const statsQuery = useStatsUtilisateursQuery();

  const equipesQuery = useEquipesRHQuery(
    activeTab === 'equipes' ? { page: equipesPage, pageSize: PAGE_SIZE } : undefined,
  );
  const equipes = equipesQuery.data?.results ?? [];
  const equipesTotal = equipesQuery.data?.count ?? 0;

  const chefsPotentielsQuery = useChefsPotentielsQuery();
  const chefsPotentiels = chefsPotentielsQuery.data ?? [];

  // Construit les filtres pour l'API à partir des filtres UI.
  const operateurApiFilters = useMemo(() => {
    const apiFilters: Record<string, unknown> = { page: operateursPage, pageSize: PAGE_SIZE };
    if (operateurFilters.statut) apiFilters.statut = operateurFilters.statut;
    if (operateurFilters.equipe === 'sans_equipe') {
      apiFilters.sansEquipe = true;
    } else if (operateurFilters.equipe) {
      apiFilters.equipe = parseInt(operateurFilters.equipe);
    }
    if (operateurFilters.estChef === 'true') apiFilters.estChef = true;
    if (operateurFilters.estChef === 'false') apiFilters.estChef = false;
    if (operateurFilters.disponible === 'true') apiFilters.disponible = true;
    if (operateurFilters.disponible === 'false') apiFilters.disponible = false;
    return apiFilters;
  }, [operateursPage, operateurFilters]);

  const operateursQuery = useOperateursQuery(
    activeTab === 'operateurs' || activeTab === 'absences' || activeTab === 'competences'
      ? operateurApiFilters
      : undefined,
  );
  const operateurs = operateursQuery.data?.results ?? [];
  const operateursTotal = operateursQuery.data?.count ?? 0;

  const absencesQuery = useAbsencesQuery(
    activeTab === 'absences' ? { page: absencesPage, pageSize: PAGE_SIZE } : undefined,
  );
  const absences = absencesQuery.data?.results ?? [];
  const absencesTotal = absencesQuery.data?.count ?? 0;

  const absencesAValiderQuery = useAbsencesAValiderQuery();
  const absencesAValider = absencesAValiderQuery.data ?? [];

  const competencesQuery = useCompetencesQuery();
  const competences = competencesQuery.data ?? [];

  const stats: TeamsStats | null = statsQuery.data
    ? {
        totalOperateurs: statsQuery.data.operateurs.total,
        disponibles: statsQuery.data.operateurs.disponiblesAujourdhui,
        totalEquipes: statsQuery.data.equipes.total,
        absencesEnAttente: statsQuery.data.absences.enAttente,
      }
    : null;

  const loading =
    currentUserQuery.isLoading ||
    statsQuery.isLoading ||
    (activeTab === 'equipes' && equipesQuery.isLoading) ||
    (activeTab === 'operateurs' && operateursQuery.isLoading) ||
    (activeTab === 'absences' && (absencesQuery.isLoading || absencesAValiderQuery.isLoading)) ||
    (activeTab === 'competences' && competencesQuery.isLoading);

  // ========================================================================
  // MUTATIONS (React Query)
  // ========================================================================

  const deleteEquipeMutation = useDeleteEquipe();
  const deleteOperateurMutation = useDeleteOperateur();
  const validerAbsenceMutation = useValiderAbsence();
  const refuserAbsenceMutation = useRefuserAbsence();
  const annulerAbsenceMutation = useAnnulerAbsence();

  // ========================================================================
  // PERMISSIONS
  // ========================================================================

  const isReadOnly = !!currentUser?.roles?.includes('CLIENT');
  const tempUser: User | null = currentUser
    ? {
        id: String(currentUser.id),
        name: currentUser.nom || '',
        email: currentUser.email,
        role: (currentUser.roles?.[0] || 'CLIENT') as Role,
      }
    : null;
  const permissions = usePermissions(tempUser);

  // ========================================================================
  // EFFECTS — search debounce + placeholder synchronisés sur l'onglet
  // ========================================================================

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const placeholders: Record<TabType, string> = {
      equipes: 'Rechercher une équipe...',
      operateurs: 'Rechercher un opérateur (nom, matricule)...',
      competences: 'Voir la matrice de compétences...',
      absences: 'Rechercher une absence (opérateur, motif, type)...',
    };
    setPlaceholder(placeholders[activeTab]);
    return () => {
      setPlaceholder('Rechercher...');
      setSearchQuery('');
    };
  }, [activeTab, setPlaceholder, setSearchQuery]);

  // ========================================================================
  // ACTIONS — wrappers conservés pour rétro-compatibilité avec Teams.tsx
  // ========================================================================

  /**
   * loadData : force refresh des datasets visibles + stats.
   * En mode React Query, c'est une invalidation explicite des clés concernées.
   */
  const loadData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.statsUtilisateurs.current }),
      queryClient.invalidateQueries({ queryKey: queryKeys.equipesRH.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.operateurs.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.absences.all }),
    ]);
  }, [queryClient]);

  const loadEquipesData = useCallback(
    async (_page?: number, _forceRefresh?: boolean) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.equipesRH.all });
    },
    [queryClient],
  );

  const loadOperateursData = useCallback(
    async (_page?: number, _filters?: OperateurFilters) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.operateurs.all });
    },
    [queryClient],
  );

  const loadAbsencesData = useCallback(
    async (_page?: number) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.absences.all });
    },
    [queryClient],
  );

  const handleViewOperateur = useCallback(
    async (operateurId: number) => {
      try {
        const detail = await queryClient.fetchQuery({
          queryKey: queryKeys.operateurs.detail(operateurId),
          queryFn: () => fetchOperateurById(operateurId),
        });
        setSelectedOperateur(detail);
      } catch (error) {
        showToast("Erreur lors du chargement des détails de l'opérateur", 'error');
      }
    },
    [queryClient, showToast],
  );

  const handleViewEquipe = useCallback(
    async (equipeId: number) => {
      try {
        const detail = await queryClient.fetchQuery({
          queryKey: queryKeys.equipesRH.detail(equipeId),
          queryFn: () => fetchEquipeById(equipeId),
        });
        setSelectedEquipe(detail);
      } catch (error) {
        showToast("Erreur lors du chargement des détails de l'équipe", 'error');
      }
    },
    [queryClient],
  );

  const handleValiderAbsence = useCallback(
    async (absenceId: number) => {
      try {
        await validerAbsenceMutation.mutateAsync({ id: absenceId, motif: 'Approuve' });
      } catch (error) {
        showToast("Erreur lors de la validation de l'absence", 'error');
      }
    },
    [validerAbsenceMutation, showToast],
  );

  const handleRefuserAbsence = useCallback(
    async (absenceId: number) => {
      try {
        await refuserAbsenceMutation.mutateAsync({ id: absenceId, motif: 'Refuse' });
      } catch (error) {
        showToast("Erreur lors du refus de l'absence", 'error');
      }
    },
    [refuserAbsenceMutation, showToast],
  );

  /**
   * Charge les opérateurs si nécessaire avant d'ouvrir un modal qui en dépend.
   * Avec React Query, on utilise `ensureQueryData` plutôt qu'un fetch manuel —
   * il sert le cache si frais, refetch sinon.
   */
  const ensureOperateursLoaded = useCallback(async () => {
    try {
      await queryClient.ensureQueryData({
        queryKey: queryKeys.operateurs.list({ page: 1, pageSize: 200 }),
        queryFn: () =>
          import('../services/usersApi').then((m) => m.fetchOperateurs({ page: 1, pageSize: 200 })),
      });
    } catch (error) {
      showToast('Erreur lors du chargement des opérateurs', 'error');
      throw error;
    }
  }, [queryClient, showToast]);

  const handleOpenCreateAbsence = useCallback(async () => {
    try {
      await ensureOperateursLoaded();
      setShowCreateAbsence(true);
    } catch {
      // toast déjà émis
    }
  }, [ensureOperateursLoaded]);

  const handleOpenCreateTeam = useCallback(async () => {
    try {
      await ensureOperateursLoaded();
      setShowCreateTeam(true);
    } catch {
      // toast déjà émis
    }
  }, [ensureOperateursLoaded]);

  const handleDeleteEquipe = useCallback(
    async (id: number) => {
      try {
        await deleteEquipeMutation.mutateAsync(id);
        showToast('Équipe supprimée avec succès', 'success');
      } catch (error) {
        showToast("Erreur lors de la suppression de l'équipe", 'error');
      } finally {
        setDeleteEquipeId(null);
      }
    },
    [deleteEquipeMutation, showToast],
  );

  const handleDeleteOperateur = useCallback(
    async (id: number) => {
      try {
        await deleteOperateurMutation.mutateAsync(id);
        showToast('Opérateur supprimé avec succès', 'success');
      } catch (error) {
        showToast("Erreur lors de la suppression de l'opérateur", 'error');
      } finally {
        setDeleteOperateurId(null);
      }
    },
    [deleteOperateurMutation, showToast],
  );

  const handleAnnulerAbsence = useCallback(
    async (id: number) => {
      try {
        await annulerAbsenceMutation.mutateAsync(id);
        showToast('Absence annulée avec succès', 'success');
      } catch (error) {
        showToast("Erreur lors de l'annulation de l'absence", 'error');
      } finally {
        setDeleteAbsenceId(null);
      }
    },
    [annulerAbsenceMutation, showToast],
  );

  // ========================================================================
  // COMPUTED VALUES
  // ========================================================================

  const filteredEquipes = useMemo(
    () =>
      equipes
        .filter((e) => e.actif)
        .filter(
          (e) =>
            e.nomEquipe.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            (e.chefEquipeNom || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
        ),
    [equipes, debouncedSearchQuery],
  );

  const filteredOperateurs = useMemo(
    () =>
      operateurs.filter(
        (o) =>
          (o.fullName || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          (o.numeroImmatriculation || '')
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()),
      ),
    [operateurs, debouncedSearchQuery],
  );

  const filteredAbsences = useMemo(
    () =>
      absences.filter((a) => {
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
        if (absenceFilters.typeAbsence && a.typeAbsence !== absenceFilters.typeAbsence)
          return false;
        if (absenceFilters.dateDebut && new Date(a.dateDebut) < new Date(absenceFilters.dateDebut))
          return false;
        if (absenceFilters.dateFin && new Date(a.dateFin) > new Date(absenceFilters.dateFin))
          return false;
        return true;
      }),
    [absences, debouncedSearchQuery, absenceFilters],
  );

  const operateursSansEquipe = useMemo(
    () =>
      operateurs.filter((o) => {
        const estActif = o.actif === true || (o.actif === undefined && o.statut === 'ACTIF');
        return estActif;
      }),
    [operateurs],
  );

  const competenceCategories = useMemo(() => {
    const cats = new Set<string>();
    competences.forEach((c) => {
      if (c.categorieDisplay || c.categorie) {
        cats.add(c.categorieDisplay || c.categorie);
      }
    });
    return Array.from(cats);
  }, [competences]);

  return {
    loading,
    currentUser,
    permissions,
    isReadOnly,
    stats,
    activeTab,
    setActiveTab,
    debouncedSearchQuery,

    equipes,
    filteredEquipes,
    equipesPage,
    equipesTotal,
    setEquipesPage,
    chefsPotentiels,
    operateursSansEquipe,

    operateurs,
    filteredOperateurs,
    operateursPage,
    operateursTotal,
    setOperateursPage,
    operateurFilters,
    setOperateurFilters,
    showOperateurFilters,
    setShowOperateurFilters,

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

    competences,
    competenceCategories,

    showCreateTeam,
    setShowCreateTeam,
    selectedEquipe,
    setSelectedEquipe,
    editEquipe,
    setEditEquipe,
    deleteEquipeId,
    setDeleteEquipeId,

    showCreateOperateur,
    setShowCreateOperateur,
    selectedOperateur,
    setSelectedOperateur,
    editingOperateur,
    setEditingOperateur,
    deleteOperateurId,
    setDeleteOperateurId,

    showCreateAbsence,
    setShowCreateAbsence,
    selectedAbsence,
    setSelectedAbsence,
    editingAbsence,
    setEditingAbsence,
    deleteAbsenceId,
    setDeleteAbsenceId,

    editingUser,
    setEditingUser,
    clients,

    matrixViewMode,
    setMatrixViewMode,
    matrixEditMode,
    setMatrixEditMode,
    matrixNiveauFilter,
    setMatrixNiveauFilter,
    matrixCategorieFilter,
    setMatrixCategorieFilter,

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
