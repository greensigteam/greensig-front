import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getSiteById, fetchAllSites, SiteFrontend, deleteSite, apiFetch } from '../services/api';
import { OLMap } from '../components/OLMap';
import { MAP_LAYERS } from '../constants';
import { useToast } from '../contexts/ToastContext';
import SiteEditModal from '../components/sites/SiteEditModal';
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
    Trees
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
    <div className="flex items-center justify-center h-full">
        <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-2"></div>
            <p className="text-gray-600">Chargement des détails du site...</p>
        </div>
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

    // Reload trigger
    const [refreshKey, setRefreshKey] = useState(0);

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

        if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce site ? Cette action est irréversible.")) {
            return;
        }

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
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                    </button>
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
                            <div className="flex items-center justify-center h-64">
                                <div className="text-center">
                                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-2"></div>
                                    <p className="text-gray-600">Chargement des statistiques...</p>
                                </div>
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
                                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
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
                                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
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
                                                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
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
        </div>
    );
};

export default SiteDetailPage;
