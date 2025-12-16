import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, Star, AlertCircle, Filter, ArrowLeft } from 'lucide-react';
import { fetchReclamationStats } from '../services/reclamationsApi';
import { ReclamationStats } from '../types/reclamations';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const STATUT_LABELS: { [key: string]: string } = {
    'NOUVELLE': 'Nouvelle',
    'PRISE_EN_COMPTE': 'Prise en compte',
    'EN_COURS': 'En cours',
    'RESOLUE': 'Résolue',
    'CLOTUREE': 'Clôturée',
    'REJETEE': 'Rejetée'
};

const ReclamationsDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<ReclamationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        date_debut: '',
        date_fin: '',
        site: undefined as number | undefined,
        zone: undefined as number | undefined,
        type_reclamation: undefined as number | undefined
    });

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await fetchReclamationStats(filters);
            setStats(data);
        } catch (error) {
            console.error('Erreur chargement stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Impossible de charger les statistiques</p>
            </div>
        );
    }

    // Préparer les données pour les graphiques
    const statutData = Object.entries(stats.par_statut).map(([statut, count]) => ({
        name: STATUT_LABELS[statut] || statut,
        value: count
    }));

    const typeData = stats.par_type.map((item) => ({
        name: item.type_reclamation__nom_reclamation,
        count: item.count
    }));

    const urgenceData = stats.par_urgence.map((item) => ({
        name: item.urgence__niveau_urgence,
        count: item.count
    }));

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Statistiques Réclamations</h1>
                    <p className="text-gray-500 mt-1">Analyse et indicateurs de performance</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/reclamations')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Retour
                    </button>
                    <button
                        onClick={loadStats}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <Filter className="w-4 h-4" />
                        Actualiser
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total */}
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 font-medium">Total Réclamations</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-full">
                            <AlertCircle className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                {/* Délai moyen */}
                {stats.delai_moyen_heures !== undefined && (
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Délai Moyen</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">
                                    {Math.round(stats.delai_moyen_heures)}h
                                </p>
                            </div>
                            <div className="bg-green-100 p-3 rounded-full">
                                <Clock className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Satisfaction */}
                {stats.satisfaction_moyenne !== undefined && (
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Satisfaction Moyenne</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">
                                    {stats.satisfaction_moyenne.toFixed(1)}/5
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {stats.nombre_evaluations} évaluations
                                </p>
                            </div>
                            <div className="bg-yellow-100 p-3 rounded-full">
                                <Star className="w-6 h-6 text-yellow-600" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Taux résolution */}
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 font-medium">Taux de Résolution</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">
                                {stats.total > 0
                                    ? Math.round(((stats.par_statut['RESOLUE'] || 0) + (stats.par_statut['CLOTUREE'] || 0)) / stats.total * 100)
                                    : 0}%
                            </p>
                        </div>
                        <div className="bg-purple-100 p-3 rounded-full">
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Répartition par Statut (Pie Chart) */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Statut</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={statutData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {statutData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Répartition par Type (Bar Chart) */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Type</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={typeData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Répartition par Urgence */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Urgence</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={urgenceData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#10b981" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Répartition par Zone */}
                {stats.par_zone.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Zone</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.par_zone}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="zone__nom" angle={-45} textAnchor="end" height={100} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#f59e0b" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReclamationsDashboard;
