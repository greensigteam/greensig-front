import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getSiteById, fetchAllSites, SiteFrontend, deleteSite, updateSite, apiFetch, fetchCurrentUser } from '../services/api';
import { fetchClients, fetchEquipes, fetchSuperviseurs, updateEquipe } from '../services/usersApi';
import type { Client, EquipeList, SuperviseurList } from '../types/users';
import { OLMap } from '../components/OLMap';
import { MAP_LAYERS } from '../constants';
import { useToast } from '../contexts/ToastContext';
import SiteEditModal from '../components/sites/SiteEditModal';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import LoadingScreen from '../components/LoadingScreen';
import {
    ChevronLeft,
    MapPin,
    Info,
    Edit,
    Trash2,
    Calendar,
    Ruler,
    Hash,
    CheckCircle,
    AlertCircle,
    Building2,
    BarChart3,
    TrendingUp,
    Droplet,
    Trees,
    Users,
    Plus,
    Search,
    X as XIcon,
    Loader2
} from 'lucide-react';
import {
    BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { VEG_LEGEND, HYDRO_LEGEND } from '../constants';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Couleurs pour les graphiques - basées sur les légendes des filtres de la carte
const STATE_COLORS: Record<string, string> = {
    bon: '#22c55e',      // green-500
    moyen: '#eab308',    // yellow-500
    mauvais: '#f97316',  // orange-500
    critique: '#ef4444'  // red-500
};

// Mapping des couleurs par type d'objet (harmonisé avec les filtres de la carte)
// L'API renvoie les types en minuscule/pluriel, les filtres utilisent PascalCase/singulier
const TYPE_COLORS: Record<string, string> = {
    // Végétation - clés API -> couleurs des filtres
    'arbres': VEG_LEGEND.find(l => l.type === 'Arbre')?.color || '#22c55e',
    'gazons': VEG_LEGEND.find(l => l.type === 'Gazon')?.color || '#84cc16',
    'palmiers': VEG_LEGEND.find(l => l.type === 'Palmier')?.color || '#16a34a',
    'arbustes': VEG_LEGEND.find(l => l.type === 'Arbuste')?.color || '#65a30d',
    'vivaces': VEG_LEGEND.find(l => l.type === 'Vivace')?.color || '#a3e635',
    'cactus': VEG_LEGEND.find(l => l.type === 'Cactus')?.color || '#4d7c0f',
    'graminees': VEG_LEGEND.find(l => l.type === 'Graminee')?.color || '#bef264',
    // Hydraulique - clés API -> couleurs des filtres
    'puits': HYDRO_LEGEND.find(l => l.type === 'Puit')?.color || '#0ea5e9',
    'pompes': HYDRO_LEGEND.find(l => l.type === 'Pompe')?.color || '#06b6d4',
    'vannes': HYDRO_LEGEND.find(l => l.type === 'Vanne')?.color || '#14b8a6',
    'clapets': HYDRO_LEGEND.find(l => l.type === 'Clapet')?.color || '#0891b2',
    'canalisations': HYDRO_LEGEND.find(l => l.type === 'Canalisation')?.color || '#0284c7',
    'aspersions': HYDRO_LEGEND.find(l => l.type === 'Aspersion')?.color || '#38bdf8',
    'gouttes': HYDRO_LEGEND.find(l => l.type === 'Goutte')?.color || '#7dd3fc',
    'ballons': HYDRO_LEGEND.find(l => l.type === 'Ballon')?.color || '#0369a1',
};

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
            <Link to="/sites" className="mt-4 inline-block text-emerald-600 hover:text-emerald-700 font-medium">
                Retour à la liste
            </Link>
        </div>
    </div>
);

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
                {icon}
            </div>
        </div>
    </div>
);

const SiteDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [site, setSite] = useState<SiteFrontend | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'stats'>('info');
    const [statistics, setStatistics] = useState<any>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Client assignment modal
    const [showAssignClientModal, setShowAssignClientModal] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [clientSearchQuery, setClientSearchQuery] = useState('');

    // Superviseur assignment modal
    const [showAssignSuperviseurModal, setShowAssignSuperviseurModal] = useState(false);
    const [superviseurs, setSuperviseurs] = useState<SuperviseurList[]>([]);
    const [isLoadingSuperviseurs, setIsLoadingSuperviseurs] = useState(false);
    const [superviseurSearchQuery, setSuperviseurSearchQuery] = useState('');

    // Équipe assignment modal
    const [showAssignEquipeModal, setShowAssignEquipeModal] = useState(false);
    const [availableEquipes, setAvailableEquipes] = useState<EquipeList[]>([]);
    const [isLoadingAvailableEquipes, setIsLoadingAvailableEquipes] = useState(false);
    const [equipeSearchQuery, setEquipeSearchQuery] = useState('');

    // Équipes affectées au site
    const [equipes, setEquipes] = useState<EquipeList[]>([]);
    const [isLoadingEquipes, setIsLoadingEquipes] = useState(false);

    // Current user (for displaying "Vous-même" if client is owner)
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Reload trigger
    const [refreshKey, setRefreshKey] = useState(0);

    // Load current user on mount
    useEffect(() => {
        const loadCurrentUser = async () => {
            try {
                const user = await fetchCurrentUser();
                setCurrentUser(user);
            } catch (error) {
                console.error('Error loading current user:', error);
            }
        };
        loadCurrentUser();
    }, []);

    useEffect(() => {
        if (!id) {
            setError("ID du site manquant dans l'URL.");
            setIsLoading(false);
            return;
        }

        const loadSite = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // First attempt with cached data
                let sites = await getSiteById(id).then(s => s ? [s] : []);
                let foundSite = sites.length > 0 ? sites[0] : undefined;

                // If not found, force refresh cache and try again
                if (!foundSite) {
                    const allSites = await fetchAllSites(true);
                    // Flexible comparison (string/number)
                    foundSite = allSites.find(s => String(s.id) === String(id));
                } else {
                    // Even if found via getSiteById, ensure ID match is robust
                    // getSiteById uses strictly fetchAllSites() internal logic
                }

                if (foundSite) {
                    setSite(foundSite);
                } else {
                    console.warn(`Site not found. ID requested: ${id}`);
                    setError("Site non trouvé.");
                }
            } catch (err: any) {
                console.error("Error loading site:", err);
                setError(err.message || 'Erreur de chargement des données.');
            } finally {
                setIsLoading(false);
            }
        };

        loadSite();
    }, [id, refreshKey]);

    // Load équipes affectées au site
    useEffect(() => {
        const loadEquipes = async () => {
            if (!id) return;

            const siteId = parseInt(id);
            if (isNaN(siteId)) {
                console.error('Invalid site ID:', id);
                return;
            }

            console.log('[SiteDetailPage] Fetching équipes for site:', siteId);
            setIsLoadingEquipes(true);
            try {
                // Force refresh to bypass cache when filtering by site
                const response = await fetchEquipes({ site: siteId }, true);
                console.log('[SiteDetailPage] Équipes received:', response.results.length, 'teams');
                console.log('[SiteDetailPage] First team (if any):', response.results[0]);
                setEquipes(response.results);
            } catch (error) {
                console.error('Erreur chargement équipes:', error);
            } finally {
                setIsLoadingEquipes(false);
            }
        };
        loadEquipes();
    }, [id, refreshKey]);

    // Load statistics when stats tab is active
    useEffect(() => {
        if (activeTab === 'stats' && id && !statistics) {
            loadStatistics();
        }
    }, [activeTab, id]);

    const loadStatistics = async () => {
        if (!id) return;

        setIsLoadingStats(true);
        try {
            const response = await apiFetch(`${API_BASE_URL}/sites/${id}/statistics/`);
            const data = await response.json();
            setStatistics(data);
        } catch (error: any) {
            console.error('Error loading statistics:', error);
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

    const handleEditSuccess = (updatedSite: SiteFrontend) => {
        setSite(updatedSite);
        setIsEditModalOpen(false);
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
            const data = await fetchClients();
            setClients(data.results || []);
        } catch (error: any) {
            showToast('Erreur lors du chargement des clients', 'error');
        } finally {
            setIsLoadingClients(false);
        }
    };

    const handleAssignClient = async (clientId: number) => {
        if (!site) return;
        try {
            await updateSite(Number(site.id), { client: clientId });
            showToast('Client assigné avec succès', 'success');
            setRefreshKey(prev => prev + 1); // Trigger reload
            setShowAssignClientModal(false);
            setClientSearchQuery('');
        } catch (error: any) {
            showToast('Erreur lors de l\'assignation du client', 'error');
        }
    };

    const filteredClients = clients.filter(c =>
        c.nomStructure?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
        c.nom?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(clientSearchQuery.toLowerCase())
    );

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
            setRefreshKey(prev => prev + 1); // Trigger reload
            setShowAssignSuperviseurModal(false);
            setSuperviseurSearchQuery('');
        } catch (error: any) {
            showToast('Erreur lors de l\'assignation du superviseur', 'error');
        }
    };

    const filteredSuperviseurs = superviseurs.filter(s =>
        s.fullName?.toLowerCase().includes(superviseurSearchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(superviseurSearchQuery.toLowerCase())
    );

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
            // Update équipe with site using proper API function
            await updateEquipe(equipeId, { site: Number(site.id) });
            showToast('Équipe assignée avec succès', 'success');
            setRefreshKey(prev => prev + 1); // Trigger reload
            setShowAssignEquipeModal(false);
            setEquipeSearchQuery('');
        } catch (error: any) {
            showToast('Erreur lors de l\'assignation de l\'équipe', 'error');
        }
    };

    const filteredAvailableEquipes = availableEquipes.filter(e =>
        e.nomEquipe?.toLowerCase().includes(equipeSearchQuery.toLowerCase())
    );

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorDisplay message={error} />;
    if (!site) return <ErrorDisplay message="Site non trouvé." />;

    return (
        <div className="h-full bg-white flex flex-col">
            {/* Header */}
            <header className="flex-shrink-0 bg-white border-b p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link to="/sites" className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Retour à la liste">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-gray-100`} style={{ backgroundColor: `${site.color}20` }}>
                            <Building2 className="w-6 h-6" style={{ color: site.color }} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{site.name}</h1>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                    {site.category}
                                </span>
                                <span>•</span>
                                <span className={`inline-flex items-center gap-1 ${site.actif ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    {site.actif ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                    {site.actif ? 'Actif' : 'Inactif'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <Edit className="w-4 h-4" />
                        Modifier
                    </button>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                    </button>
                    {showDeleteModal && (
                        <ConfirmDeleteModal
                            title="Supprimer le site"
                            message="Êtes-vous sûr de vouloir supprimer ce site ? Cette action est irréversible."
                            onConfirm={handleDelete}
                            onCancel={() => setShowDeleteModal(false)}
                            confirmText="Supprimer"
                            cancelText="Annuler"
                        />
                    )}
                </div>
            </header>

            {/* Tabs */}
            <div className="flex-shrink-0 bg-white border-b px-6">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'info'
                            ? 'border-emerald-600 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Informations
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'stats'
                            ? 'border-emerald-600 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Statistiques
                        </div>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-gray-50/50">
                {activeTab === 'info' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                        {/* Left Column - Details */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="bg-white p-6 rounded-xl border shadow-sm">
                                <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                                    <Info className="w-5 h-5 text-emerald-600" />
                                    Informations Générales
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    <div>
                                        <dt className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                                            <Users className="w-4 h-4" /> Client Propriétaire
                                        </dt>
                                        <dd className="flex items-center gap-2">
                                            <div className="flex-1 text-base font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                                {(() => {
                                                    // If current user is the owner client, display "Vous-même"
                                                    if (currentUser &&
                                                        currentUser.roles?.includes('CLIENT') &&
                                                        currentUser.client_id &&
                                                        currentUser.client_id === site.client) {
                                                        return 'Vous-même';
                                                    }
                                                    return site.client_nom || 'Non assigné';
                                                })()}
                                            </div>
                                            {currentUser?.roles?.includes('ADMIN') && (
                                                <button
                                                    onClick={() => setShowAssignClientModal(true)}
                                                    className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex-shrink-0"
                                                    title="Assigner un client"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            )}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                                            <Users className="w-4 h-4" /> Superviseur Affecté
                                        </dt>
                                        <dd className="flex items-center gap-2">
                                            <div className="flex-1 text-base font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                                {site.superviseur_nom || 'Non assigné'}
                                            </div>
                                            {currentUser?.roles?.includes('ADMIN') && (
                                                <button
                                                    onClick={() => setShowAssignSuperviseurModal(true)}
                                                    className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex-shrink-0"
                                                    title="Assigner un superviseur"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            )}
                                        </dd>
                                    </div>
                                    <div className="col-span-2">
                                        <dt className="flex items-center justify-between text-sm font-medium text-gray-500 mb-2">
                                            <span className="flex items-center gap-2">
                                                <Users className="w-4 h-4" /> Équipes Affectées ({equipes.length})
                                            </span>
                                            {currentUser?.roles?.includes('ADMIN') && (
                                                <button
                                                    onClick={() => setShowAssignEquipeModal(true)}
                                                    className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                                                    title="Assigner une équipe"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </dt>
                                        <dd>
                                            {isLoadingEquipes ? (
                                                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Chargement des équipes...
                                                </div>
                                            ) : equipes.length > 0 ? (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {equipes.map((equipe) => (
                                                        <div
                                                            key={equipe.id}
                                                            className="flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-200"
                                                        >
                                                            <div>
                                                                <p className="font-medium text-gray-900 text-sm">{equipe.nomEquipe}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {equipe.nombreMembres} membre{equipe.nombreMembres > 1 ? 's' : ''}
                                                                    {equipe.chefEquipeNom ? ` • Chef: ${equipe.chefEquipeNom}` : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-base text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                                    Aucune équipe affectée
                                                </div>
                                            )}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                                            <Hash className="w-4 h-4" /> Code Site
                                        </dt>
                                        <dd className="text-base font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 font-mono">
                                            {site.code_site || 'N/A'}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                                            <MapPin className="w-4 h-4" /> Adresse
                                        </dt>
                                        <dd className="text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                            {site.adresse || 'N/A'}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                                            <Ruler className="w-4 h-4" /> Superficie Totale
                                        </dt>
                                        <dd className="text-base font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                            {site.superficie_totale
                                                ? `${site.superficie_totale.toLocaleString('fr-FR')} m²`
                                                : 'Non définie'
                                            }
                                        </dd>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border shadow-sm">
                                <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                                    <Calendar className="w-5 h-5 text-emerald-600" />
                                    Contrat
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500 mb-1">Date de début</dt>
                                        <dd className="text-base text-gray-900">
                                            {site.date_debut_contrat
                                                ? new Date(site.date_debut_contrat).toLocaleDateString('fr-FR')
                                                : 'Non définie'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500 mb-1">Date de fin</dt>
                                        <dd className="text-base text-gray-900">
                                            {site.date_fin_contrat
                                                ? new Date(site.date_fin_contrat).toLocaleDateString('fr-FR')
                                                : 'Non définie'}
                                        </dd>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Map */}
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-xl border shadow-sm h-full flex flex-col">
                                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-emerald-600" />
                                    Localisation
                                </h2>
                                <div className="flex-1 min-h-[300px] rounded-lg overflow-hidden border">
                                    <OLMap
                                        isMiniMap={true}
                                        activeLayer={MAP_LAYERS.SATELLITE}
                                        targetLocation={{ coordinates: site.coordinates, zoom: 16 }}
                                        highlightedGeometry={site.geometry}
                                        searchResult={{
                                            name: site.name,
                                            coordinates: site.coordinates,
                                            description: site.description,
                                            zoom: 16
                                        }}
                                        onObjectClick={() => {
                                            navigate('/map', {
                                                state: {
                                                    targetLocation: {
                                                        coordinates: site.coordinates,
                                                        zoom: 17
                                                    }
                                                }
                                            });
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2 text-center">
                                    Cliquez pour voir sur la carte principale
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-6">
                        {isLoadingStats ? (
                            <div className="fixed inset-0 z-50">
                                <LoadingScreen isLoading={true} loop={true} minDuration={0} />
                            </div>
                        ) : statistics ? (
                            <div className="space-y-6">
                                {/* Overview Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <StatCard
                                        title="Total Objets"
                                        value={statistics.total_objects}
                                        icon={<BarChart3 className="w-6 h-6 text-white" />}
                                        color="bg-emerald-600"
                                    />
                                    <StatCard
                                        title="Végétation"
                                        value={statistics.vegetation.total}
                                        icon={<Trees className="w-6 h-6 text-white" />}
                                        color="bg-green-600"
                                    />
                                    <StatCard
                                        title="Hydraulique"
                                        value={statistics.hydraulique.total}
                                        icon={<Droplet className="w-6 h-6 text-white" />}
                                        color="bg-blue-600"
                                    />
                                    <StatCard
                                        title="Maintenance Urgente"
                                        value={statistics.interventions.urgent_maintenance}
                                        icon={<TrendingUp className="w-6 h-6 text-white" />}
                                        color="bg-orange-600"
                                    />
                                </div>

                                {/* Charts Section - Bar Charts for Types */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Vegetation by Type - Bar Chart */}
                                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                            <Trees className="w-5 h-5 text-green-600" />
                                            Végétation par Type
                                        </h3>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={Object.entries(statistics.vegetation.by_type)
                                                        .map(([type, count]) => ({ name: type, value: count as number }))
                                                        .filter(item => item.value > 0)}
                                                    layout="vertical"
                                                    margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis type="number" />
                                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} />
                                                    <Tooltip />
                                                    <Bar dataKey="value" name="Quantité" radius={[0, 4, 4, 0]}>
                                                        {Object.entries(statistics.vegetation.by_type)
                                                            .filter(([, count]) => (count as number) > 0)
                                                            .map(([typeName], index) => (
                                                                <Cell key={`cell-${index}`} fill={TYPE_COLORS[typeName] || '#22c55e'} />
                                                            ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Hydraulic by Type - Bar Chart */}
                                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                            <Droplet className="w-5 h-5 text-blue-600" />
                                            Hydraulique par Type
                                        </h3>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={Object.entries(statistics.hydraulique.by_type)
                                                        .map(([type, count]) => ({ name: type, value: count as number }))
                                                        .filter(item => item.value > 0)}
                                                    layout="vertical"
                                                    margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis type="number" />
                                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} />
                                                    <Tooltip />
                                                    <Bar dataKey="value" name="Quantité" radius={[0, 4, 4, 0]}>
                                                        {Object.entries(statistics.hydraulique.by_type)
                                                            .filter(([, count]) => (count as number) > 0)
                                                            .map(([typeName], index) => (
                                                                <Cell key={`cell-${index}`} fill={TYPE_COLORS[typeName] || '#3b82f6'} />
                                                            ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Pie Charts for State Distribution */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Vegetation State - Pie Chart */}
                                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                            <Trees className="w-5 h-5 text-green-600" />
                                            État Végétation
                                        </h3>
                                        <div className="h-64">
                                            {Object.values(statistics.vegetation.by_state).some((v: any) => v > 0) ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={Object.entries(statistics.vegetation.by_state)
                                                                .map(([state, count]) => ({ name: state, value: count as number }))
                                                                .filter(item => item.value > 0)}
                                                            cx="50%"
                                                            cy="50%"
                                                            labelLine={false}
                                                            label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                                                            outerRadius={80}
                                                            fill="#8884d8"
                                                            dataKey="value"
                                                        >
                                                            {Object.entries(statistics.vegetation.by_state)
                                                                .filter(([, count]) => (count as number) > 0)
                                                                .map(([state]) => (
                                                                    <Cell key={`cell-${state}`} fill={STATE_COLORS[state] || '#gray'} />
                                                                ))}
                                                        </Pie>
                                                        <Tooltip />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-400">
                                                    Aucune donnée
                                                </div>
                                            )}
                                        </div>
                                        {/* Legend with values */}
                                        <div className="mt-4 grid grid-cols-2 gap-2">
                                            {Object.entries(statistics.vegetation.by_state).map(([state, count]: [string, any]) => (
                                                <div key={state} className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STATE_COLORS[state] }}></span>
                                                    <span className="text-sm text-gray-600 capitalize">{state}:</span>
                                                    <span className="text-sm font-semibold">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Hydraulic State - Pie Chart */}
                                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                            <Droplet className="w-5 h-5 text-blue-600" />
                                            État Hydraulique
                                        </h3>
                                        <div className="h-64">
                                            {Object.values(statistics.hydraulique.by_state).some((v: any) => v > 0) ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={Object.entries(statistics.hydraulique.by_state)
                                                                .map(([state, count]) => ({ name: state, value: count as number }))
                                                                .filter(item => item.value > 0)}
                                                            cx="50%"
                                                            cy="50%"
                                                            labelLine={false}
                                                            label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                                                            outerRadius={80}
                                                            fill="#8884d8"
                                                            dataKey="value"
                                                        >
                                                            {Object.entries(statistics.hydraulique.by_state)
                                                                .filter(([, count]) => (count as number) > 0)
                                                                .map(([state]) => (
                                                                    <Cell key={`cell-${state}`} fill={STATE_COLORS[state] || '#gray'} />
                                                                ))}
                                                        </Pie>
                                                        <Tooltip />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-400">
                                                    Aucune donnée
                                                </div>
                                            )}
                                        </div>
                                        {/* Legend with values */}
                                        <div className="mt-4 grid grid-cols-2 gap-2">
                                            {Object.entries(statistics.hydraulique.by_state).map(([state, count]: [string, any]) => (
                                                <div key={state} className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STATE_COLORS[state] }}></span>
                                                    <span className="text-sm text-gray-600 capitalize">{state}:</span>
                                                    <span className="text-sm font-semibold">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Top Families - Bar Chart */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Familles de Végétation</h3>
                                        {statistics.vegetation.by_family.length > 0 ? (
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={statistics.vegetation.by_family.slice(0, 7).map((item: any) => ({
                                                            name: item.famille.length > 15 ? item.famille.substring(0, 15) + '...' : item.famille,
                                                            value: item.count
                                                        }))}
                                                        layout="vertical"
                                                        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis type="number" />
                                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                                                        <Tooltip />
                                                        <Bar dataKey="value" name="Quantité" fill="#16a34a" radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <div className="h-64 flex items-center justify-center text-gray-400">
                                                Aucune famille enregistrée
                                            </div>
                                        )}
                                    </div>

                                    {/* Intervention Stats - Pie Chart */}
                                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-orange-600" />
                                            Répartition des Interventions
                                        </h3>
                                        <div className="h-64">
                                            {(statistics.interventions.never_intervened + statistics.interventions.urgent_maintenance + statistics.interventions.last_30_days) > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={[
                                                                { name: 'Jamais intervenu', value: statistics.interventions.never_intervened, color: '#9ca3af' },
                                                                { name: 'Maintenance urgente', value: statistics.interventions.urgent_maintenance, color: '#f97316' },
                                                                { name: '30 derniers jours', value: statistics.interventions.last_30_days, color: '#22c55e' }
                                                            ].filter(item => item.value > 0)}
                                                            cx="50%"
                                                            cy="50%"
                                                            labelLine={false}
                                                            label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                                                            outerRadius={80}
                                                            fill="#8884d8"
                                                            dataKey="value"
                                                        >
                                                            {[
                                                                { name: 'Jamais intervenu', value: statistics.interventions.never_intervened, color: '#9ca3af' },
                                                                { name: 'Maintenance urgente', value: statistics.interventions.urgent_maintenance, color: '#f97316' },
                                                                { name: '30 derniers jours', value: statistics.interventions.last_30_days, color: '#22c55e' }
                                                            ].filter(item => item.value > 0).map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-400">
                                                    Aucune donnée d'intervention
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Intervention Statistics */}
                                <div className="bg-white p-6 rounded-xl border shadow-sm">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-orange-600" />
                                        Statistiques d'Intervention
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <p className="text-sm text-gray-500 mb-1">Jamais intervenu</p>
                                            <p className="text-2xl font-bold text-gray-900">{statistics.interventions.never_intervened}</p>
                                        </div>
                                        <div className="p-4 bg-orange-50 rounded-lg">
                                            <p className="text-sm text-orange-600 mb-1">Maintenance urgente (&gt; 6 mois)</p>
                                            <p className="text-2xl font-bold text-orange-700">{statistics.interventions.urgent_maintenance}</p>
                                        </div>
                                        <div className="p-4 bg-green-50 rounded-lg">
                                            <p className="text-sm text-green-600 mb-1">Derniers 30 jours</p>
                                            <p className="text-2xl font-bold text-green-700">{statistics.interventions.last_30_days}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-12">
                                Aucune statistique disponible
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Edit Modal */}
            {site && (
                <SiteEditModal
                    site={site}
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSaved={handleEditSuccess}
                />
            )}

            {/* Assign Client Modal */}
            {showAssignClientModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
                        {/* Header */}
                        <div className="p-6 border-b flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Assigner un client</h2>
                            <button
                                onClick={() => {
                                    setShowAssignClientModal(false);
                                    setClientSearchQuery('');
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search bar */}
                        <div className="p-4 border-b">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher un client..."
                                    value={clientSearchQuery}
                                    onChange={(e) => setClientSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Client list */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {isLoadingClients ? (
                                <div className="fixed inset-0 z-50">
                                    <LoadingScreen isLoading={true} loop={true} minDuration={0} />
                                </div>
                            ) : filteredClients.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">
                                        {clientSearchQuery
                                            ? 'Aucun client trouvé pour cette recherche'
                                            : 'Aucun client disponible'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredClients.map((client) => (
                                        <button
                                            key={client.utilisateur}
                                            onClick={() => handleAssignClient(client.utilisateur)}
                                            className="w-full p-4 border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900 group-hover:text-emerald-700">
                                                        {client.nomStructure}
                                                    </div>
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        {client.nom} {client.prenom} • {client.email}
                                                    </div>
                                                </div>
                                                <Plus className="w-5 h-5 text-gray-400 group-hover:text-emerald-600" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button
                                onClick={() => {
                                    setShowAssignClientModal(false);
                                    setClientSearchQuery('');
                                }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Superviseur Modal */}
            {showAssignSuperviseurModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
                        {/* Header */}
                        <div className="p-6 border-b flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Assigner un superviseur</h2>
                            <button
                                onClick={() => {
                                    setShowAssignSuperviseurModal(false);
                                    setSuperviseurSearchQuery('');
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search bar */}
                        <div className="p-4 border-b">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher un superviseur..."
                                    value={superviseurSearchQuery}
                                    onChange={(e) => setSuperviseurSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Superviseur list */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {isLoadingSuperviseurs ? (
                                <div className="fixed inset-0 z-50">
                                    <LoadingScreen isLoading={true} loop={true} minDuration={0} />
                                </div>
                            ) : filteredSuperviseurs.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">
                                        {superviseurSearchQuery
                                            ? 'Aucun superviseur trouvé pour cette recherche'
                                            : 'Aucun superviseur disponible'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredSuperviseurs.map((superviseur) => (
                                        <button
                                            key={superviseur.utilisateur}
                                            onClick={() => handleAssignSuperviseur(superviseur.utilisateur)}
                                            className="w-full p-4 border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900 group-hover:text-emerald-700">
                                                        {superviseur.fullName}
                                                    </div>
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        {superviseur.email}
                                                    </div>
                                                </div>
                                                <Plus className="w-5 h-5 text-gray-400 group-hover:text-emerald-600" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button
                                onClick={() => {
                                    setShowAssignSuperviseurModal(false);
                                    setSuperviseurSearchQuery('');
                                }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Équipe Modal */}
            {showAssignEquipeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
                        {/* Header */}
                        <div className="p-6 border-b flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Assigner une équipe au site</h2>
                            <button
                                onClick={() => {
                                    setShowAssignEquipeModal(false);
                                    setEquipeSearchQuery('');
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search bar */}
                        <div className="p-4 border-b">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher une équipe..."
                                    value={equipeSearchQuery}
                                    onChange={(e) => setEquipeSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Équipe list */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {isLoadingAvailableEquipes ? (
                                <div className="fixed inset-0 z-50">
                                    <LoadingScreen isLoading={true} loop={true} minDuration={0} />
                                </div>
                            ) : filteredAvailableEquipes.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">
                                        {equipeSearchQuery
                                            ? 'Aucune équipe trouvée pour cette recherche'
                                            : 'Aucune équipe disponible'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredAvailableEquipes.map((equipe) => (
                                        <button
                                            key={equipe.id}
                                            onClick={() => handleAssignEquipe(equipe.id)}
                                            className="w-full p-4 border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900 group-hover:text-emerald-700">
                                                        {equipe.nomEquipe}
                                                    </div>
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        {equipe.nombreMembres} membre{equipe.nombreMembres > 1 ? 's' : ''}
                                                        {equipe.chefEquipeNom ? ` • Chef: ${equipe.chefEquipeNom}` : ''}
                                                        {equipe.siteNom ? ` • Site actuel: ${equipe.siteNom}` : ''}
                                                    </div>
                                                </div>
                                                <Plus className="w-5 h-5 text-gray-400 group-hover:text-emerald-600" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button
                                onClick={() => {
                                    setShowAssignEquipeModal(false);
                                    setEquipeSearchQuery('');
                                }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SiteDetailPage;
