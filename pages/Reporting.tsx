import React, { useState, useEffect } from 'react';
import {
    BarChart3, TrendingUp, Users, AlertTriangle, RefreshCw, Calendar,
    Trees, Droplet, Building2, FileText
} from 'lucide-react';
import {
    BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { apiFetch } from '../services/api';
import LoadingScreen from '../components/LoadingScreen';
import MonthlyReport from './MonthlyReport';
import WeeklyReport from './WeeklyReport';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Couleurs pour les graphiques
const COLORS = {
    primary: '#059669',
    secondary: '#3b82f6',
    warning: '#f59e0b',
    danger: '#ef4444',
    success: '#22c55e',
    gray: '#6b7280',
};

const STATE_COLORS: Record<string, string> = {
    bon: '#22c55e',
    moyen: '#eab308',
    mauvais: '#f97316',
    critique: '#ef4444'
};

const STATUT_COLORS: Record<string, string> = {
    NOUVELLE: '#3b82f6',
    PRISE_EN_COMPTE: '#8b5cf6',
    EN_COURS: '#f59e0b',
    RESOLUE: '#22c55e',
    CLOTUREE: '#6b7280',
};

interface ReportingData {
    taches: {
        total: number;
        terminees: number;
        en_cours: number;
        planifiees: number;
        en_retard: number;
        taux_realisation: number;
        taux_respect_delais: number;
        terminees_7j: number;
        creees_7j: number;
    };
    reclamations: {
        total: number;
        nouvelles_7j: number;
        en_retard: number;
        resolues_7j: number;
        par_statut: Record<string, number>;
        par_type: Array<{ type_reclamation__nom_reclamation: string; count: number }>;
        delai_moyen_heures: number | null;
        satisfaction_moyenne: number | null;
        nombre_evaluations: number;
    };
    equipes: {
        total: number;
        actives: number;
        charge_moyenne: number;
        charges: Array<{
            id: number;
            nom: string;
            charge_percent: number;
            nb_taches: number;
            operateurs_total: number;
            operateurs_disponibles: number;
        }>;
    };
    inventaire: {
        total_objets: number;
        vegetation: {
            total: number;
            par_type: Record<string, number>;
        };
        hydraulique: {
            total: number;
            par_type: Record<string, number>;
        };
        par_etat: Record<string, number>;
        sites: {
            total: number;
            actifs: number;
        };
    };
}

const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    trend?: { value: number; label: string };
}> = ({ title, value, subtitle, icon, color, trend }) => (
    <div className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
                {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
                {trend && (
                    <p className={`text-xs mt-1 ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trend.value >= 0 ? '+' : ''}{trend.value} {trend.label}
                    </p>
                )}
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
                {icon}
            </div>
        </div>
    </div>
);

const ProgressBar: React.FC<{
    label: string;
    value: number;
    color: string;
    suffix?: string;
}> = ({ label, value, color, suffix = '%' }) => (
    <div>
        <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">{label}</span>
            <span className="font-bold" style={{ color }}>{value}{suffix}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
                className="h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
            />
        </div>
    </div>
);

type TabType = 'statistics' | 'monthly' | 'weekly';

const Reporting: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('statistics');
    const [data, setData] = useState<ReportingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiFetch(`${API_BASE_URL}/reporting/`);
            const result = await response.json();
            setData(result);
        } catch (err: any) {
            console.error('Error loading reporting data:', err);
            setError(err.message || 'Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'statistics') {
            loadData();
        }
    }, [activeTab]);

    const tabs = [
        { id: 'statistics' as TabType, label: 'Statistiques', icon: BarChart3 },
        { id: 'monthly' as TabType, label: 'Rapport de Site mensuel', icon: FileText },
        { id: 'weekly' as TabType, label: 'Rapport Hebdomadaire', icon: Calendar },
    ];

    // Render tab content based on active tab
    if (activeTab === 'monthly') {
        return (
            <div className="min-h-screen bg-gray-50">
                {/* Tab Navigation */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="w-full">
                        <div className="flex gap-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-3 font-medium text-sm rounded-t-lg transition-colors ${
                                        activeTab === tab.id
                                            ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <MonthlyReport />
            </div>
        );
    }

    if (activeTab === 'weekly') {
        return (
            <div className="min-h-screen bg-gray-50">
                {/* Tab Navigation */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="w-full">
                        <div className="flex gap-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-3 font-medium text-sm rounded-t-lg transition-colors ${
                                        activeTab === tab.id
                                            ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <WeeklyReport />
            </div>
        );
    }

    // Statistics tab content
    if (loading) {
        return (
            <div className="fixed inset-0 z-50">
                <LoadingScreen isLoading={true} loop={true} minDuration={0} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur de chargement</h3>
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={loadData}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 mx-auto"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    // Préparer les données pour les graphiques
    const etatData = Object.entries(data.inventaire.par_etat)
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0);

    const reclamationsParTypeData = data.reclamations.par_type
        .slice(0, 5)
        .map(item => ({
            name: item.type_reclamation__nom_reclamation || 'Non défini',
            value: item.count
        }));

    const reclamationsParStatutData = Object.entries(data.reclamations.par_statut)
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0);

    const equipeChargeData = data.equipes.charges.slice(0, 6).map(eq => ({
        name: eq.nom.length > 12 ? eq.nom.substring(0, 12) + '...' : eq.nom,
        charge: eq.charge_percent,
        taches: eq.nb_taches,
    }));

    const inventaireData = [
        { name: 'Végétation', value: data.inventaire.vegetation.total, color: '#22c55e' },
        { name: 'Hydraulique', value: data.inventaire.hydraulique.total, color: '#3b82f6' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Tab Navigation */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="w-full">
                    <div className="flex gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm rounded-t-lg transition-colors ${
                                    activeTab === tab.id
                                        ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6 w-full">

            {/* KPIs principaux */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Objets"
                    value={data.inventaire.total_objets.toLocaleString()}
                    subtitle={`${data.inventaire.sites.actifs} sites actifs`}
                    icon={<Building2 className="w-6 h-6 text-white" />}
                    color="bg-emerald-600"
                />
                <StatCard
                    title="Tâches Actives"
                    value={data.taches.en_cours + data.taches.planifiees}
                    subtitle={`${data.taches.en_retard} en retard`}
                    icon={<Calendar className="w-6 h-6 text-white" />}
                    color="bg-blue-600"
                    trend={{ value: data.taches.creees_7j, label: 'cette semaine' }}
                />
                <StatCard
                    title="Réclamations"
                    value={data.reclamations.total}
                    subtitle={`${data.reclamations.en_retard} en retard`}
                    icon={<AlertTriangle className="w-6 h-6 text-white" />}
                    color="bg-orange-600"
                    trend={{ value: data.reclamations.nouvelles_7j, label: 'nouvelles (7j)' }}
                />
                <StatCard
                    title="Équipes Actives"
                    value={data.equipes.actives}
                    subtitle={`Charge moy. ${data.equipes.charge_moyenne}%`}
                    icon={<Users className="w-6 h-6 text-white" />}
                    color="bg-purple-600"
                />
            </div>

            {/* Performance des Tâches et Charge Équipes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance des Interventions */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                        Performance des Interventions
                    </h2>
                    <div className="space-y-4">
                        <ProgressBar
                            label="Taux de réalisation"
                            value={data.taches.taux_realisation}
                            color={COLORS.primary}
                        />
                        <ProgressBar
                            label="Respect des délais"
                            value={data.taches.taux_respect_delais}
                            color={COLORS.secondary}
                        />
                        {data.reclamations.satisfaction_moyenne && (
                            <ProgressBar
                                label="Satisfaction client"
                                value={data.reclamations.satisfaction_moyenne * 20}
                                color={COLORS.warning}
                                suffix={` (${data.reclamations.satisfaction_moyenne}/5)`}
                            />
                        )}
                    </div>
                    <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{data.taches.terminees}</div>
                            <div className="text-xs text-gray-500">Terminées</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{data.taches.en_cours}</div>
                            <div className="text-xs text-gray-500">En cours</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{data.taches.en_retard}</div>
                            <div className="text-xs text-gray-500">En retard</div>
                        </div>
                    </div>
                </div>

                {/* Charge des Équipes */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Charge des Équipes
                    </h2>
                    {equipeChargeData.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={equipeChargeData} layout="vertical" margin={{ left: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" domain={[0, 100]} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        formatter={(value, name) => [
                                            name === 'charge' ? `${value}%` : value,
                                            name === 'charge' ? 'Charge' : 'Tâches'
                                        ]}
                                    />
                                    <Bar dataKey="charge" name="Charge" radius={[0, 4, 4, 0]}>
                                        {equipeChargeData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.charge > 90 ? COLORS.danger : entry.charge > 70 ? COLORS.warning : COLORS.secondary}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-gray-400">
                            Aucune équipe active
                        </div>
                    )}
                    {data.equipes.charges.some(e => e.charge_percent > 90) && (
                        <p className="text-xs text-orange-600 mt-2 italic flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Certaines équipes sont proches de la saturation
                        </p>
                    )}
                </div>
            </div>

            {/* Réclamations */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Analyse des Réclamations
                </h2>

                {/* KPIs Réclamations */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="text-2xl font-bold text-blue-600">{data.reclamations.nouvelles_7j}</div>
                        <div className="text-xs text-blue-800 font-medium">Nouvelles (7j)</div>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                        <div className="text-2xl font-bold text-orange-600">{data.reclamations.en_retard}</div>
                        <div className="text-xs text-orange-800 font-medium">En retard</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                        <div className="text-2xl font-bold text-green-600">{data.reclamations.resolues_7j}</div>
                        <div className="text-xs text-green-800 font-medium">Résolues (7j)</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="text-2xl font-bold text-gray-600">
                            {data.reclamations.delai_moyen_heures ? `${data.reclamations.delai_moyen_heures}h` : '-'}
                        </div>
                        <div className="text-xs text-gray-800 font-medium">Délai moyen</div>
                    </div>
                </div>

                {/* Graphiques Réclamations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Par Type */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Répartition par type</h3>
                        {reclamationsParTypeData.length > 0 ? (
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={reclamationsParTypeData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                                            outerRadius={70}
                                            dataKey="value"
                                        >
                                            {reclamationsParTypeData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={Object.values(STATUT_COLORS)[index % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-gray-400">
                                Aucune donnée
                            </div>
                        )}
                    </div>

                    {/* Par Statut */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Répartition par statut</h3>
                        {reclamationsParStatutData.length > 0 ? (
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={reclamationsParStatutData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="value" name="Réclamations" radius={[4, 4, 0, 0]}>
                                            {reclamationsParStatutData.map((entry) => (
                                                <Cell key={`cell-${entry.name}`} fill={STATUT_COLORS[entry.name] || COLORS.gray} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-gray-400">
                                Aucune donnée
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Inventaire */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Répartition Végétation / Hydraulique */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-emerald-600" />
                        Répartition de l'Inventaire
                    </h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={inventaireData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={true}
                                    label={({ name, value, percent }) => `${name}: ${value} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                                    outerRadius={80}
                                    dataKey="value"
                                >
                                    {inventaireData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="flex items-center gap-3">
                            <Trees className="w-8 h-8 text-green-600" />
                            <div>
                                <div className="text-xl font-bold text-gray-900">{data.inventaire.vegetation.total}</div>
                                <div className="text-xs text-gray-500">Végétation</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Droplet className="w-8 h-8 text-blue-600" />
                            <div>
                                <div className="text-xl font-bold text-gray-900">{data.inventaire.hydraulique.total}</div>
                                <div className="text-xs text-gray-500">Hydraulique</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Distribution par État */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Distribution par État</h2>
                    {etatData.length > 0 ? (
                        <>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={etatData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                                            outerRadius={80}
                                            dataKey="value"
                                        >
                                            {etatData.map((entry) => (
                                                <Cell key={`cell-${entry.name}`} fill={STATE_COLORS[entry.name] || COLORS.gray} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 grid grid-cols-4 gap-2 pt-4 border-t">
                                {Object.entries(data.inventaire.par_etat).map(([state, count]) => (
                                    <div key={state} className="text-center">
                                        <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: STATE_COLORS[state] }}></div>
                                        <div className="text-sm font-bold text-gray-900">{count}</div>
                                        <div className="text-xs text-gray-500 capitalize">{state}</div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-gray-400">
                            Aucune donnée
                        </div>
                    )}
                </div>
            </div>
        </div>
        </div>
    );
};

export default Reporting;
