import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllSites,
  SiteFrontend,
  deleteSite,
  updateSite,
  apiFetch,
  fetchCurrentUser,
} from '../services/api';
import {
  fetchEquipes,
  fetchSuperviseurs,
  updateEquipe,
  fetchStructures,
} from '../services/usersApi';
import { queryKeys } from '../lib/queryKeys';
import type { StructureClient, EquipeList, SuperviseurList } from '../types/users';
import { useToast } from '../contexts/ToastContext';
import SiteEditModal from '../components/sites/SiteEditModal';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import CreateSuperviseurModal from '../components/users/CreateSuperviseurModal';
import AssignmentModal from '../components/sites/AssignmentModal';
import LoadingScreen from '../components/LoadingScreen';
import { useUrlModal } from '../hooks/useUrlModal';
import {
  ChevronLeft,
  Info,
  Edit,
  Trash2,
  Building2,
  BarChart3,
  UsersRound,
  Plus,
  Loader2,
  UserMinus,
  History,
} from 'lucide-react';
import { fetchKPIs, fetchKPIHistorique } from '../services/kpiApi';
import type { KPIHistoriqueEntry, KPITempsRealisationEntry } from '../types/kpi';
import { StatusBadge } from '../components/StatusBadge';
import SiteStatisticsTab from '../components/sites/SiteStatisticsTab';
import SiteInfoTab from '../components/sites/SiteInfoTab';
import SiteHistoriqueTab from '../components/sites/SiteHistoriqueTab';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const LoadingSpinner: React.FC = () => (
  <div className="fixed inset-0 z-50">
    <LoadingScreen isLoading={true} loop={true} minDuration={0} />
  </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
      <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur</h3>
      <p className="text-red-600">{message}</p>
      <Link
        to="/sites"
        className="mt-4 inline-block text-emerald-600 hover:text-emerald-700 font-medium"
      >
        Retour à la liste
      </Link>
    </div>
  </div>
);

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}> = ({ active, onClick, icon, label, badge }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
      active
        ? 'border-emerald-600 text-emerald-600'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
    }`}
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
        {badge}
      </span>
    )}
  </button>
);

const SiteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Onglet actif persisté dans l'URL → survit aux navigations
  const activeTab =
    (searchParams.get('tab') as 'info' | 'equipes' | 'stats' | 'historique') || 'info';
  const setActiveTab = (tab: 'info' | 'equipes' | 'stats' | 'historique') => {
    setSearchParams(
      (prev) => {
        prev.set('tab', tab);
        return prev;
      },
      { replace: true },
    );
  };

  const editModal = useUrlModal('edit');
  const deleteModal = useUrlModal('delete');
  const [statistics, setStatistics] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Historique tab state
  const [historiqueData, setHistoriqueData] = useState<KPIHistoriqueEntry[]>([]);
  const [isLoadingHistorique, setIsLoadingHistorique] = useState(false);
  const [selectedMois, setSelectedMois] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [kpiDetailRows, setKpiDetailRows] = useState<KPITempsRealisationEntry[]>([]);
  const [isLoadingKpiDetail, setIsLoadingKpiDetail] = useState(false);

  // Client assignment modal
  const [showAssignClientModal, setShowAssignClientModal] = useState(false);
  const [clients, setClients] = useState<StructureClient[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // Superviseur assignment modal
  const [showAssignSuperviseurModal, setShowAssignSuperviseurModal] = useState(false);
  const [superviseurs, setSuperviseurs] = useState<SuperviseurList[]>([]);
  const [isLoadingSuperviseurs, setIsLoadingSuperviseurs] = useState(false);
  const [showCreateSuperviseurModal, setShowCreateSuperviseurModal] = useState(false);

  // Équipe assignment modal
  const [showAssignEquipeModal, setShowAssignEquipeModal] = useState(false);
  const [availableEquipes, setAvailableEquipes] = useState<EquipeList[]>([]);
  const [isLoadingAvailableEquipes, setIsLoadingAvailableEquipes] = useState(false);

  // Équipes affectées au site
  const [equipes, setEquipes] = useState<EquipeList[]>([]);
  const [isLoadingEquipes, setIsLoadingEquipes] = useState(false);

  // Données via React Query — cache partagé avec Sites.tsx, 0 refetch inutile
  const { data: currentUser } = useQuery({
    queryKey: queryKeys.user.current,
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: site,
    isLoading,
    error: siteError,
  } = useQuery({
    queryKey: queryKeys.sites.list(),
    queryFn: fetchAllSites,
    select: (sites) => sites.find((s) => String(s.id) === String(id)) ?? null,
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
  const error = siteError
    ? (siteError as Error).message || 'Erreur de chargement'
    : !isLoading && !site
      ? 'Site non trouvé.'
      : null;

  // Load équipes affectées au site
  useEffect(() => {
    const loadEquipes = async () => {
      if (!id) return;

      const siteId = parseInt(id);
      if (isNaN(siteId)) {
        showToast('Identifiant de site invalide', 'error');
        return;
      }

      setIsLoadingEquipes(true);
      try {
        // Force refresh to bypass cache when filtering by site
        const response = await fetchEquipes({ site: siteId });
        setEquipes(response.results);
      } catch (error) {
        showToast('Erreur lors du chargement des équipes du site', 'error');
      } finally {
        setIsLoadingEquipes(false);
      }
    };
    loadEquipes();
  }, [id, showToast]);

  // Load statistics when stats tab is active
  useEffect(() => {
    if (activeTab === 'stats' && id && !statistics) {
      loadStatistics();
    }
  }, [activeTab, id]);

  // Load historique when historique tab first opens
  useEffect(() => {
    if (activeTab === 'historique' && id && historiqueData.length === 0) {
      loadHistorique();
    }
  }, [activeTab, id]);

  // Reload KPI detail when selected month changes (or tab opens)
  useEffect(() => {
    if (activeTab === 'historique' && id) {
      loadKpiDetail();
    }
  }, [activeTab, selectedMois, id]);

  const loadHistorique = async () => {
    if (!id) return;
    setIsLoadingHistorique(true);
    try {
      const data = await fetchKPIHistorique(parseInt(id), 12);
      setHistoriqueData(data.historique);
    } catch {
      showToast("Erreur lors du chargement de l'historique", 'error');
    } finally {
      setIsLoadingHistorique(false);
    }
  };

  const loadKpiDetail = async () => {
    if (!id) return;
    setIsLoadingKpiDetail(true);
    try {
      const data = await fetchKPIs(selectedMois, parseInt(id));
      setKpiDetailRows(data.kpis.temps_realisation_tache);
    } catch {
      showToast('Erreur lors du chargement du détail mensuel', 'error');
    } finally {
      setIsLoadingKpiDetail(false);
    }
  };

  const loadStatistics = async () => {
    if (!id) return;

    setIsLoadingStats(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/sites/${id}/statistics/`);
      const data = await response.json();
      setStatistics(data);
    } catch (error: any) {
      showToast('Erreur lors du chargement des statistiques', 'error');
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleDelete = async () => {
    if (!site) return;

    try {
      await deleteSite(parseInt(site.id));
      showToast('Site supprimé avec succès', 'success');
      navigate('/sites');
    } catch (error: any) {
      showToast(error.message || 'Erreur lors de la suppression', 'error');
    }
  };

  const handleEditSuccess = (_updatedSite: SiteFrontend) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.sites.list() });
    editModal.close();
    showToast('Site mis à jour avec succès', 'success');
  };

  // Load clients when modal opens
  useEffect(() => {
    if (showAssignClientModal && clients.length === 0) {
      loadClients();
    }
  }, [showAssignClientModal]);

  const loadClients = async () => {
    setIsLoadingClients(true);
    try {
      const data = await fetchStructures();
      setClients(data.results || []);
    } catch (error: any) {
      showToast('Erreur lors du chargement des clients', 'error');
    } finally {
      setIsLoadingClients(false);
    }
  };

  const handleAssignClient = async (structureId: number) => {
    if (!site) return;
    try {
      await updateSite(Number(site.id), { structure_client: structureId });
      showToast('Client assigné avec succès', 'success');
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.list() });
      setShowAssignClientModal(false);
    } catch (error: any) {
      showToast("Erreur lors de l'assignation du client", 'error');
    }
  };

  // Load superviseurs when modal opens
  useEffect(() => {
    if (showAssignSuperviseurModal && superviseurs.length === 0) {
      loadSuperviseurs();
    }
  }, [showAssignSuperviseurModal]);

  const loadSuperviseurs = async () => {
    setIsLoadingSuperviseurs(true);
    try {
      const data = await fetchSuperviseurs();
      setSuperviseurs(data.results || []);
    } catch (error: any) {
      showToast('Erreur lors du chargement des superviseurs', 'error');
    } finally {
      setIsLoadingSuperviseurs(false);
    }
  };

  const handleAssignSuperviseur = async (superviseurId: number) => {
    if (!site) return;
    try {
      await updateSite(Number(site.id), { superviseur: superviseurId });
      showToast('Superviseur assigné avec succès', 'success');
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.list() });
      setShowAssignSuperviseurModal(false);
    } catch (error: any) {
      showToast("Erreur lors de l'assignation du superviseur", 'error');
    }
  };

  const handleSuperviseurCreated = async (newSuperviseur: SuperviseurList) => {
    // Rafraîchir la liste des superviseurs
    await loadSuperviseurs();

    // Assigner automatiquement le nouveau superviseur au site
    if (site) {
      try {
        await updateSite(Number(site.id), { superviseur: newSuperviseur.utilisateur });
        showToast(`Superviseur ${newSuperviseur.fullName} créé et assigné avec succès`, 'success');
        queryClient.invalidateQueries({ queryKey: queryKeys.sites.list() });
        setShowAssignSuperviseurModal(false);
        setShowCreateSuperviseurModal(false);
      } catch (error: any) {
        showToast("Superviseur créé mais erreur lors de l'assignation", 'error');
        setShowCreateSuperviseurModal(false);
      }
    }
  };

  // Load available équipes when modal opens
  useEffect(() => {
    if (showAssignEquipeModal) {
      loadAvailableEquipes();
    }
  }, [showAssignEquipeModal]);

  const loadAvailableEquipes = async () => {
    setIsLoadingAvailableEquipes(true);
    try {
      const data = await fetchEquipes({});
      setAvailableEquipes(data.results || []);
    } catch (error: any) {
      showToast('Erreur lors du chargement des équipes', 'error');
    } finally {
      setIsLoadingAvailableEquipes(false);
    }
  };

  const handleAssignEquipe = async (equipeId: number) => {
    if (!site) return;
    try {
      // Récupérer l'équipe pour vérifier son état actuel
      const equipe = availableEquipes.find((e) => e.id === equipeId);
      if (!equipe) return;

      // Logique intelligente :
      // 1. Si l'équipe n'a PAS de site principal → en faire le site principal
      // 2. Sinon → ajouter aux sites secondaires
      if (!equipe.sitePrincipal) {
        // Aucun site principal → ce site devient le principal
        await updateEquipe(equipeId, {
          sitePrincipal: Number(site.id),
        });
        showToast('Équipe assignée comme site principal', 'success');
      } else {
        // A déjà un site principal → ajouter aux secondaires
        const currentSecondaires = equipe.sitesSecondaires || [];

        // Vérifier si déjà dans les secondaires
        if (currentSecondaires.includes(Number(site.id))) {
          showToast('Cette équipe est déjà assignée à ce site', 'info');
          return;
        }

        // Vérifier si c'est déjà le site principal
        if (equipe.sitePrincipal === Number(site.id)) {
          showToast('Ce site est déjà le site principal de cette équipe', 'info');
          return;
        }

        await updateEquipe(equipeId, {
          sitesSecondaires: [...currentSecondaires, Number(site.id)],
        });
        showToast('Équipe assignée comme site secondaire', 'success');
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.sites.list() });
      setShowAssignEquipeModal(false);
    } catch (error: any) {
      showToast("Erreur lors de l'assignation de l'équipe", 'error');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;
  if (!site) return <ErrorDisplay message="Site non trouvé." />;

  return (
    <div className="bg-white flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            to="/sites"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Retour à la liste"
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center bg-slate-100`}
              style={{ backgroundColor: `${site.color}20` }}
            >
              <Building2 className="w-6 h-6" style={{ color: site.color }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{site.name}</h1>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {site.category}
                </span>
                <span>•</span>
                <StatusBadge
                  variant="boolean"
                  value={site.actif}
                  labels={{ true: 'Actif', false: 'Inactif' }}
                  size="xs"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!currentUser?.roles?.includes('CLIENT') && (
            <>
              <button
                onClick={editModal.open}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Modifier
              </button>
              <button
                onClick={deleteModal.open}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
              {deleteModal.isOpen && (
                <ConfirmDeleteModal
                  title="Supprimer le site"
                  message="Êtes-vous sûr de vouloir supprimer ce site ? Cette action est irréversible."
                  onConfirm={handleDelete}
                  onCancel={deleteModal.close}
                  confirmText="Supprimer"
                  cancelText="Annuler"
                />
              )}
            </>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex-shrink-0 bg-white border-b border-slate-100 px-6">
        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex gap-4">
            <TabButton
              active={activeTab === 'info'}
              onClick={() => setActiveTab('info')}
              icon={<Info className="w-4 h-4" />}
              label="Général"
            />
            <TabButton
              active={activeTab === 'equipes'}
              onClick={() => setActiveTab('equipes')}
              icon={<UsersRound className="w-4 h-4" />}
              label="Équipes"
              badge={equipes.length}
            />
            <TabButton
              active={activeTab === 'stats'}
              onClick={() => setActiveTab('stats')}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Statistiques"
            />
            <TabButton
              active={activeTab === 'historique'}
              onClick={() => setActiveTab('historique')}
              icon={<History className="w-4 h-4" />}
              label="Historique"
            />
          </div>
          {activeTab === 'equipes' && currentUser?.roles?.includes('ADMIN') && (
            <button
              onClick={() => setShowAssignEquipeModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Assigner une équipe
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {activeTab === 'info' ? (
          <SiteInfoTab
            site={site}
            currentUser={currentUser}
            onAssignClient={() => setShowAssignClientModal(true)}
            onAssignSuperviseur={() => setShowAssignSuperviseurModal(true)}
          />
        ) : activeTab === 'equipes' ? (
          /* Onglet Équipes */
          <div className="p-6">
            {isLoadingEquipes ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : equipes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {equipes.map((equipe) => (
                  <div
                    key={equipe.id}
                    className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                          <UsersRound className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">{equipe.nomEquipe}</h3>
                          <p className="text-sm text-slate-500">
                            {equipe.nombreMembres} membre{equipe.nombreMembres > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      {currentUser?.roles?.includes('ADMIN') && (
                        <button
                          onClick={async () => {
                            try {
                              // Vérifier si c'est le site principal ou secondaire
                              if (equipe.sitePrincipal === Number(site.id)) {
                                // C'est le site principal → retirer
                                await updateEquipe(equipe.id, { sitePrincipal: null });
                                showToast('Site principal retiré', 'success');
                              } else if (equipe.sitesSecondaires?.includes(Number(site.id))) {
                                // C'est un site secondaire → retirer de la liste
                                const nouveauxSecondaires = equipe.sitesSecondaires.filter(
                                  (siteId) => siteId !== Number(site.id),
                                );
                                await updateEquipe(equipe.id, {
                                  sitesSecondaires: nouveauxSecondaires,
                                });
                                showToast('Site secondaire retiré', 'success');
                              }
                              queryClient.invalidateQueries({ queryKey: queryKeys.sites.list() });
                            } catch (error) {
                              showToast('Erreur lors de la désassignation', 'error');
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Désassigner cette équipe"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {equipe.chefEquipeNom && (
                      <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs font-medium text-slate-500 mb-1">Chef d'équipe</p>
                        <p className="text-sm font-bold text-slate-800">{equipe.chefEquipeNom}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <StatusBadge
                        variant="boolean"
                        value={equipe.nombreMembres > 0}
                        labels={{ true: 'Active', false: 'Vide' }}
                        size="xs"
                      />
                      <button
                        onClick={() => navigate(`/teams?equipe=${equipe.id}`)}
                        className="text-xs text-emerald-600 font-medium hover:underline"
                      >
                        Voir détails
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
                <UsersRound className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-800 mb-2">Aucune équipe affectée</h3>
                <p className="text-slate-500 mb-6">
                  Ce site n'a pas encore d'équipes assignées pour les interventions.
                </p>
                {currentUser?.roles?.includes('ADMIN') && (
                  <button
                    onClick={() => setShowAssignEquipeModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Assigner une équipe
                  </button>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'stats' ? (
          <div className="p-6">
            <SiteStatisticsTab statistics={statistics} isLoading={isLoadingStats} />
          </div>
        ) : (
          <SiteHistoriqueTab
            historiqueData={historiqueData}
            isLoadingHistorique={isLoadingHistorique}
            kpiDetailRows={kpiDetailRows}
            isLoadingKpiDetail={isLoadingKpiDetail}
            selectedMois={selectedMois}
            onMoisChange={setSelectedMois}
          />
        )}
      </main>

      {/* Edit Modal */}
      {site && (
        <SiteEditModal
          site={site}
          isOpen={editModal.isOpen}
          onClose={editModal.close}
          onSaved={handleEditSuccess}
        />
      )}

      {/* Assign Client Modal */}
      {showAssignClientModal && (
        <AssignmentModal
          title="Assigner un client"
          placeholder="Rechercher un client..."
          emptyMessage="Aucun client disponible"
          isLoading={isLoadingClients}
          items={clients.map((c) => ({
            id: c.id,
            title: c.nom,
            subtitle:
              [c.contactPrincipal, c.emailFacturation].filter(Boolean).join(' • ') || undefined,
          }))}
          onSelect={(id) => handleAssignClient(id as number)}
          onClose={() => setShowAssignClientModal(false)}
        />
      )}

      {/* Assign Superviseur Modal */}
      {showAssignSuperviseurModal && (
        <AssignmentModal
          title="Assigner un superviseur"
          placeholder="Rechercher un superviseur..."
          emptyMessage="Aucun superviseur disponible"
          isLoading={isLoadingSuperviseurs}
          items={superviseurs.map((s) => ({
            id: s.utilisateur,
            title: s.fullName,
            subtitle: s.email,
          }))}
          onSelect={(id) => handleAssignSuperviseur(id as number)}
          onClose={() => setShowAssignSuperviseurModal(false)}
          headerAction={
            <button
              onClick={() => setShowCreateSuperviseurModal(true)}
              className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex-shrink-0"
              title="Créer un nouveau superviseur"
            >
              <Plus className="w-5 h-5" />
            </button>
          }
        />
      )}

      {/* Assign Équipe Modal */}
      {showAssignEquipeModal && (
        <AssignmentModal
          title="Assigner une équipe au site"
          placeholder="Rechercher une équipe..."
          emptyMessage="Aucune équipe disponible"
          isLoading={isLoadingAvailableEquipes}
          items={availableEquipes.map((e) => ({
            id: e.id,
            title: e.nomEquipe,
            subtitle: [
              `${e.nombreMembres} membre${e.nombreMembres > 1 ? 's' : ''}`,
              e.chefEquipeNom ? `Chef: ${e.chefEquipeNom}` : null,
              e.siteNom ? `Site actuel: ${e.siteNom}` : null,
            ]
              .filter(Boolean)
              .join(' • '),
          }))}
          onSelect={(id) => handleAssignEquipe(id as number)}
          onClose={() => setShowAssignEquipeModal(false)}
        />
      )}

      {/* Create Superviseur Modal */}
      <CreateSuperviseurModal
        isOpen={showCreateSuperviseurModal}
        onClose={() => setShowCreateSuperviseurModal(false)}
        onCreated={handleSuperviseurCreated}
      />
    </div>
  );
};

export default SiteDetailPage;
