import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import {
  ChevronLeft,
  Building2,
  Package,
  MapPin as MapPinIcon,
  ClipboardList,
  Edit,
  Loader2,
  Plus,
  X as XIcon,
  Search,
  Users,
  UserPlus,
} from 'lucide-react';
import {
  fetchStructureById,
  fetchStructureUtilisateurs,
  fetchOrphanClients,
  assignClientToStructure,
} from '../services/usersApi';
import type { Client } from '../types/users';
import { fetchAllSites, SiteFrontend } from '../services/api';
import { planningService } from '../services/planningService';
import { fetchClientInventoryStats } from '../services/clientInventoryService';
import type { StructureClientDetail, ClientUser } from '../types/users';
import type { Tache } from '../types/planning';
import { useToast } from '../contexts/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { DetailEmptyState } from '../components/DetailModal';
import LoadingWrapper from '../components/LoadingWrapper';
import { useUrlModal } from '../hooks/useUrlModal';
import EditStructureModal from '../components/structures/EditStructureModal';
import OngletSites from '../components/structures/OngletSites';
import OngletUtilisateurs from '../components/structures/OngletUtilisateurs';
import OngletInterventions from '../components/structures/OngletInterventions';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'general' | 'utilisateurs' | 'sites' | 'inventaire' | 'interventions';

interface InventoryStats {
  totalObjets: number;
  vegetation: {
    total: number;
    byType: Record<string, number>;
  };
  hydraulique: {
    total: number;
    byType: Record<string, number>;
  };
  bySite?: Array<{
    siteId: number | string;
    siteName: string;
    total: number;
    vegetation: number;
    hydraulique: number;
  }>;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const LoadingScreen: React.FC = () => (
  <div className="fixed inset-0 z-50">
    <LoadingWrapper isLoading={true}>
      <div />
    </LoadingWrapper>
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

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
}> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
    <div className="text-sm font-medium text-slate-500 mb-1">{title}</div>
    <div className="text-3xl font-bold text-slate-800">{value}</div>
    {icon && color && (
      <div
        className={`absolute top-4 right-4 w-10 h-10 rounded-lg flex items-center justify-center ${color}`}
      >
        {icon}
      </div>
    )}
  </div>
);

// ============================================================================
// ONGLET GENERAL
// ============================================================================

const OngletGeneral: React.FC<{ structure: StructureClientDetail }> = ({ structure }) => {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Non disponible';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Date invalide';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* COLONNE GAUCHE - Informations principales */}
      <div className="lg:col-span-2 space-y-6">
        {/* ORGANISATION */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h2 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Organisation
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1">Nom de la structure</p>
              <p className="text-sm font-bold text-slate-800">{structure.nom}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1">Contact principal</p>
              <p className="text-sm font-bold text-slate-800">
                {structure.contactPrincipal || '—'}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1">Téléphone</p>
              <p className="text-sm font-bold text-slate-800">{structure.telephone || '—'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1">Email facturation</p>
              <p className="text-sm font-bold text-slate-800 truncate">
                {structure.emailFacturation || '—'}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 sm:col-span-2">
              <p className="text-xs font-medium text-slate-500 mb-1">Adresse</p>
              <p className="text-sm font-bold text-slate-800">{structure.adresse || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* COLONNE DROITE - Stats, Statut, Logo */}
      <div className="space-y-6">
        {/* STATISTIQUES - Style Dashboard */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="Utilisateurs" value={structure.utilisateursCount} />
          <StatCard title="Sites" value={structure.sitesCount} />
        </div>

        {/* STATUT */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h2 className="font-bold text-lg text-slate-800 mb-4">Statut</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-sm text-slate-500">Structure</span>
              <span
                className={`text-xs font-bold px-2 py-1 rounded-full ${
                  structure.actif ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {structure.actif ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-sm text-slate-500">Créée le</span>
              <span className="text-sm font-bold text-slate-800">
                {formatDate(structure.dateCreation)}
              </span>
            </div>
          </div>
        </div>

        {/* LOGO */}
        {structure.logoDisplay && (
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Logo de l'organisation</h2>
            <div className="flex items-center justify-center p-4 bg-slate-50 rounded-lg border border-slate-100">
              <img
                src={structure.logoDisplay}
                alt={structure.nom}
                className="max-w-full max-h-32 object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// ONGLET INVENTAIRE
// ============================================================================

const OngletInventaire: React.FC<{
  stats: InventoryStats | null;
  isLoading: boolean;
}> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <LoadingWrapper isLoading={true}>
        <div />
      </LoadingWrapper>
    );
  }

  if (!stats || stats.totalObjets === 0) {
    return (
      <DetailEmptyState
        icon={<Package className="w-12 h-12" />}
        title="Aucun objet inventorie"
        description="Cette structure ne possede pas encore d'objets dans l'inventaire."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Objets" value={stats.totalObjets} />
        <StatCard title="Végétation" value={stats.vegetation.total} />
        <StatCard title="Hydraulique" value={stats.hydraulique.total} />
      </div>

      {stats.bySite && stats.bySite.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-lg text-slate-800">Répartition par Site</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                    Site
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">
                    Végétation
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">
                    Hydraulique
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {stats.bySite.map((site) => (
                  <tr key={site.siteId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPinIcon className="w-4 h-4 text-emerald-600 mr-2" />
                        <span className="text-sm font-medium text-slate-800">{site.siteName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        {site.total}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-slate-800">
                      {site.vegetation}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-slate-800">
                      {site.hydraulique}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.vegetation.total > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-4">Répartition Végétation</h3>
            <div className="space-y-3">
              {Object.entries(stats.vegetation.byType).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <span className="text-sm text-slate-700 capitalize">{type}</span>
                  <span className="text-sm font-bold text-slate-800">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.hydraulique.total > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-4">Répartition Hydraulique</h3>
            <div className="space-y-3">
              {Object.entries(stats.hydraulique.byType).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <span className="text-sm text-slate-700 capitalize">{type}</span>
                  <span className="text-sm font-bold text-slate-800">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StructureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  // Lire l'onglet depuis l'URL, défaut à 'general'
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  const validTabs: TabType[] = ['general', 'utilisateurs', 'sites', 'inventaire', 'interventions'];
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'general';

  // Donnée principale via React Query — cache 2 min, 0 refetch au retour de navigation
  const numericId = Number(id);
  const {
    data: structure,
    isLoading,
    refetch: refetchStructure,
  } = useQuery({
    queryKey: queryKeys.structures.detail(numericId),
    queryFn: () => fetchStructureById(numericId),
    enabled: !!id && !isNaN(numericId),
    staleTime: 2 * 60 * 1000,
  });
  const [activeTab, setActiveTabState] = useState<TabType>(initialTab);
  const [showAssignSiteModal, setShowAssignSiteModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const editModal = useUrlModal('edit');

  // Modale pour affecter des clients orphelins
  const [showOrphanModal, setShowOrphanModal] = useState(false);
  const [orphanClients, setOrphanClients] = useState<Client[]>([]);
  const [isLoadingOrphans, setIsLoadingOrphans] = useState(false);
  const [orphanSearchQuery, setOrphanSearchQuery] = useState('');

  // Fonction pour changer d'onglet et mettre à jour l'URL
  const setActiveTab = useCallback(
    (tab: TabType) => {
      setActiveTabState(tab);
      setSearchParams({ tab }, { replace: true });
    },
    [setSearchParams],
  );

  // Synchroniser l'onglet avec l'URL quand on utilise retour/avancer du navigateur
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType | null;
    if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTabState(tabParam);
    }
  }, [searchParams]);

  // Data per tab
  const [utilisateurs, setUtilisateurs] = useState<ClientUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [sites, setSites] = useState<SiteFrontend[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [isLoadingTaches, setIsLoadingTaches] = useState(false);

  // Quand la structure change, pré-charger les utilisateurs depuis la réponse de détail
  useEffect(() => {
    if (structure?.utilisateurs) {
      setUtilisateurs(structure.utilisateurs);
    }
  }, [structure?.id]);

  // Reset tab data when navigating to a different structure
  useEffect(() => {
    setSites([]);
    setInventoryStats(null);
    setTaches([]);
  }, [id]);

  // Lazy load tab data
  useEffect(() => {
    if (!structure) return;

    if (activeTab === 'utilisateurs' && utilisateurs.length === 0 && !isLoadingUsers) {
      loadUtilisateurs();
    }
    if (activeTab === 'sites' && sites.length === 0 && !isLoadingSites) {
      loadSites();
    }
    if (activeTab === 'inventaire' && !inventoryStats && !isLoadingInventory) {
      loadInventoryStats();
    }
    if (activeTab === 'interventions' && taches.length === 0 && !isLoadingTaches) {
      loadTaches();
    }
  }, [activeTab, structure]);

  // loadStructure est remplacé par useQuery ci-dessus

  const loadUtilisateurs = async () => {
    setIsLoadingUsers(true);
    try {
      const users = await fetchStructureUtilisateurs(Number(id));
      setUtilisateurs(users);
    } catch (error: any) {
      showToast('Erreur lors du chargement des utilisateurs', 'error');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadOrphanClients = async () => {
    setIsLoadingOrphans(true);
    try {
      const orphans = await fetchOrphanClients();
      setOrphanClients(orphans);
    } catch (error: any) {
      showToast('Erreur lors du chargement des clients orphelins', 'error');
      setOrphanClients([]);
    } finally {
      setIsLoadingOrphans(false);
    }
  };

  const handleAssignOrphan = async (clientId: number) => {
    try {
      await assignClientToStructure(clientId, Number(id));
      showToast('Utilisateur affecté avec succès', 'success');
      setShowOrphanModal(false);
      setOrphanSearchQuery('');
      // Recharger les utilisateurs de la structure
      loadUtilisateurs();
      // Retirer le client de la liste des orphelins
      setOrphanClients((prev) => prev.filter((c) => c.utilisateur !== clientId));
    } catch (error: any) {
      showToast("Erreur lors de l'affectation", 'error');
    }
  };

  // Charger les orphelins quand la modale s'ouvre
  useEffect(() => {
    if (showOrphanModal && orphanClients.length === 0) {
      loadOrphanClients();
    }
  }, [showOrphanModal]);

  const filteredOrphans = orphanClients.filter(
    (c) =>
      c.nom?.toLowerCase().includes(orphanSearchQuery.toLowerCase()) ||
      c.prenom?.toLowerCase().includes(orphanSearchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(orphanSearchQuery.toLowerCase()),
  );

  const loadSites = async () => {
    setIsLoadingSites(true);
    try {
      const allSites = await fetchAllSites();
      const structureId = Number(id);
      const structureSites = allSites.filter((s) => s.structure_client === structureId);
      setSites(structureSites);
    } catch (error: any) {
      showToast('Erreur lors du chargement des sites', 'error');
    } finally {
      setIsLoadingSites(false);
    }
  };

  const loadInventoryStats = async () => {
    setIsLoadingInventory(true);
    try {
      // Note: On utilise l'ancienne API qui filtre par client, a adapter si necessaire
      const stats = await fetchClientInventoryStats(Number(id));
      setInventoryStats(stats);
    } catch (error: any) {
      setInventoryStats({
        totalObjets: 0,
        vegetation: { total: 0, byType: {} },
        hydraulique: { total: 0, byType: {} },
      });
    } finally {
      setIsLoadingInventory(false);
    }
  };

  const loadTaches = async () => {
    setIsLoadingTaches(true);
    try {
      // Utiliser le filtre backend pour optimiser la requête
      const response = await planningService.getTaches({ structure_client_id: Number(id) });
      setTaches(response.results || []);
    } catch (error: any) {
      showToast('Erreur lors du chargement des taches', 'error');
    } finally {
      setIsLoadingTaches(false);
    }
  };

  if (isLoading) return <LoadingScreen />;
  if (!structure) return null;

  return (
    <div className="bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            to="/clients"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-3">
            {structure.logoDisplay ? (
              <img
                src={structure.logoDisplay}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-200"
                alt={structure.nom}
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-emerald-600" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-800">{structure.nom}</h1>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Users className="w-4 h-4" />
                <span>
                  {structure.utilisateursCount} utilisateur
                  {structure.utilisateursCount > 1 ? 's' : ''}
                </span>
                <span className="text-slate-300">•</span>
                <MapPinIcon className="w-4 h-4" />
                <span>
                  {structure.sitesCount} site{structure.sitesCount > 1 ? 's' : ''}
                </span>
                <span className="text-slate-300">•</span>
                <StatusBadge
                  variant="boolean"
                  value={structure.actif}
                  labels={{ true: 'Active', false: 'Inactive' }}
                  size="xs"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={editModal.open}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 font-medium"
          >
            <Edit className="w-4 h-4" />
            Modifier
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex-shrink-0 bg-white border-b border-slate-100 px-6">
        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex gap-4">
            <TabButton
              active={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
              icon={<Building2 className="w-4 h-4" />}
              label="General"
            />
            <TabButton
              active={activeTab === 'utilisateurs'}
              onClick={() => setActiveTab('utilisateurs')}
              icon={<Users className="w-4 h-4" />}
              label="Utilisateurs"
              badge={utilisateurs.length}
            />
            <TabButton
              active={activeTab === 'sites'}
              onClick={() => setActiveTab('sites')}
              icon={<MapPinIcon className="w-4 h-4" />}
              label="Sites"
              badge={sites.length}
            />
            <TabButton
              active={activeTab === 'inventaire'}
              onClick={() => setActiveTab('inventaire')}
              icon={<Package className="w-4 h-4" />}
              label="Inventaire"
              badge={inventoryStats?.totalObjets}
            />
            <TabButton
              active={activeTab === 'interventions'}
              onClick={() => setActiveTab('interventions')}
              icon={<ClipboardList className="w-4 h-4" />}
              label="Interventions"
              badge={taches.filter((t) => !['TERMINEE', 'ANNULEE'].includes(t.statut)).length}
            />
          </div>

          {activeTab === 'utilisateurs' && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowOrphanModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shadow-sm text-sm font-medium"
                title="Affecter un utilisateur client existant sans organisation"
              >
                <Users className="w-4 h-4" />
                Affecter un existant
              </button>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
              >
                <UserPlus className="w-4 h-4" />
                Créer un utilisateur
              </button>
            </div>
          )}

          {activeTab === 'sites' && (
            <button
              onClick={() => setShowAssignSiteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Assigner un site
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === 'general' && <OngletGeneral structure={structure} />}
        {activeTab === 'utilisateurs' && (
          <OngletUtilisateurs
            utilisateurs={utilisateurs}
            structureId={Number(id)}
            onRefresh={() => {
              refetchStructure();
              loadUtilisateurs();
            }}
            isLoading={isLoadingUsers}
            showAddModal={showAddUserModal}
            setShowAddModal={setShowAddUserModal}
          />
        )}
        {activeTab === 'sites' && (
          <OngletSites
            sites={sites}
            isLoading={isLoadingSites}
            structureId={Number(id)}
            onRefresh={loadSites}
            showAssignModal={showAssignSiteModal}
            setShowAssignModal={setShowAssignSiteModal}
          />
        )}
        {activeTab === 'inventaire' && (
          <OngletInventaire stats={inventoryStats} isLoading={isLoadingInventory} />
        )}
        {activeTab === 'interventions' && (
          <OngletInterventions taches={taches} isLoading={isLoadingTaches} />
        )}
      </main>

      {/* Modal Edition Structure */}
      {editModal.isOpen && structure && (
        <EditStructureModal
          structure={structure}
          onClose={editModal.close}
          onSaved={() => {
            editModal.close();
            refetchStructure();
          }}
        />
      )}

      {/* Modal Affecter clients orphelins */}
      {showOrphanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-amber-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Affecter un utilisateur existant
                  </h2>
                  <p className="text-sm text-slate-500">Utilisateurs clients sans organisation</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowOrphanModal(false);
                  setOrphanSearchQuery('');
                }}
                className="p-2 hover:bg-amber-100 rounded-lg"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, prénom ou email..."
                  value={orphanSearchQuery}
                  onChange={(e) => setOrphanSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingOrphans ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  <span className="ml-2 text-gray-500">Chargement...</span>
                </div>
              ) : filteredOrphans.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>
                    {orphanSearchQuery
                      ? 'Aucun utilisateur trouvé pour cette recherche'
                      : 'Aucun utilisateur client sans organisation'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredOrphans.map((client) => (
                    <button
                      key={client.utilisateur}
                      onClick={() => handleAssignOrphan(client.utilisateur)}
                      className="w-full p-4 border rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 group-hover:text-amber-700">
                            {client.prenom} {client.nom}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">{client.email}</div>
                        </div>
                        <Plus className="w-5 h-5 text-gray-400 group-hover:text-amber-600" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => {
                  setShowOrphanModal(false);
                  setOrphanSearchQuery('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
