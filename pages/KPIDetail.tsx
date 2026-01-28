import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Target, TrendingUp, TrendingDown, Minus, Clock, CheckCircle2,
    AlertTriangle, RefreshCw, Calendar, Building2, Activity,
    ArrowLeft, Download, Printer, History, FileText, BarChart3,
    ChevronLeft, ChevronRight, Info, Layers, Users, MapPin
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, Cell, AreaChart, Area,
    ComposedChart, ReferenceLine
} from 'recharts';
import { apiFetch } from '../services/api';
import LoadingScreen from '../components/LoadingScreen';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Types
interface KPIDetails {
    valeur: number;
    objectif: number | null;
    unite: string;
    objectif_atteint: boolean | null;
    details: Record<string, any>;
    alerte?: boolean;
    message_alerte?: string;
    error?: string;
}

interface KPIEvolution {
    valeur_precedente: number;
    variation: number;
    variation_pct: number;
    tendance: 'hausse' | 'baisse' | 'stable';
}

interface KPIData {
    periode: {
        mois: string;
        debut: string;
        fin: string;
    };
    kpis: Record<string, KPIDetails>;
    evolution: Record<string, KPIEvolution>;
    sites_disponibles: Array<{ id: number; nom: string }>;
}

interface KPIHistorique {
    historique: Array<{
        mois: string;
        kpis: Record<string, number>;
    }>;
}

// Couleurs et labels
const KPI_COLORS: Record<string, string> = {
    respect_planning: '#059669',
    taux_realisation_reclamations: '#3b82f6',
    temps_moyen_traitement_reclamations: '#f59e0b',
    temps_realisation_taches: '#8b5cf6',
    temps_travail_par_site: '#ec4899',
};

const KPI_LABELS: Record<string, string> = {
    respect_planning: 'Respect du planning',
    taux_realisation_reclamations: 'Taux de réalisation des réclamations',
    temps_moyen_traitement_reclamations: 'Temps moyen de traitement des réclamations',
    temps_realisation_taches: 'Temps de réalisation par tâche',
    temps_travail_par_site: 'Temps total de travail par site',
};

const KPI_DESCRIPTIONS: Record<string, string> = {
    respect_planning: 'Pourcentage de tâches terminées dans les délais prévus. L\'objectif est d\'atteindre plus de 95% de respect du planning, sans aucun retard supérieur à 7 jours.',
    taux_realisation_reclamations: 'Pourcentage de réclamations qui ont été ouvertes ET clôturées dans le même mois M. Cet indicateur mesure l\'efficacité du traitement des réclamations.',
    temps_moyen_traitement_reclamations: 'Temps moyen écoulé entre la création d\'une réclamation et sa clôture, calculé par type de réclamation. Un temps plus court indique une meilleure réactivité.',
    temps_realisation_taches: 'Temps moyen nécessaire pour réaliser une tâche, groupé par type de tâche et par site. Permet d\'identifier les inefficacités.',
    temps_travail_par_site: 'Total des heures de travail effectuées sur chaque site pendant la période sélectionnée. Permet de suivre l\'allocation des ressources.',
};

const KPI_FORMULAS: Record<string, string> = {
    respect_planning: '(Tâches terminées dans les délais / Total tâches terminées) × 100',
    taux_realisation_reclamations: '(Réclamations ouvertes et clôturées dans M / Total réclamations ouvertes dans M) × 100',
    temps_moyen_traitement_reclamations: 'Σ(date_cloture - date_creation) / Nombre de réclamations clôturées',
    temps_realisation_taches: 'Σ(heures) / Σ(quantité) — normalisé par m², ml ou unité selon le type',
    temps_travail_par_site: 'Σ(heures travaillées par tous les opérateurs sur le site)',
};

const ALL_KPI_KEYS = [
    'respect_planning',
    'taux_realisation_reclamations',
    'temps_moyen_traitement_reclamations',
    'temps_realisation_taches',
    'temps_travail_par_site'
] as const;

// Helper pour formater le ratio d'efficacité normalisé
function formatRatio(ratio: number | null | undefined, unite: string): string {
    if (ratio == null) return '—';
    if (unite === 'm2') return `${ratio.toFixed(4)} h/m\u00B2`;
    if (unite === 'ml') return `${ratio.toFixed(4)} h/ml`;
    return `${ratio.toFixed(1)} h/unit\u00E9`;
}

function formatUniteLabel(unite: string): string {
    if (unite === 'm2') return 'm\u00B2';
    if (unite === 'ml') return 'ml';
    if (unite === 'arbres') return 'arbres';
    if (unite === 'cuvettes') return 'cuvettes';
    return 'unit\u00E9s';
}

// Composant TrendIcon
const TrendIcon: React.FC<{ tendance: 'hausse' | 'baisse' | 'stable'; isGoodWhenUp?: boolean; size?: 'sm' | 'md' | 'lg' }> =
    ({ tendance, isGoodWhenUp = true, size = 'md' }) => {
        const isPositive = (tendance === 'hausse' && isGoodWhenUp) || (tendance === 'baisse' && !isGoodWhenUp);
        const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

        if (tendance === 'stable') {
            return <Minus className={`${sizeClass} text-slate-400`} />;
        }

        return isPositive
            ? <TrendingUp className={`${sizeClass} text-emerald-500`} />
            : <TrendingDown className={`${sizeClass} text-red-500`} />;
    };

// Page de détail KPI
const KPIDetail: React.FC = () => {
    const { kpiKey } = useParams<{ kpiKey: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<KPIData | null>(null);
    const [historique, setHistorique] = useState<KPIHistorique | null>(null);

    // Filtres depuis l'URL
    const selectedSite = searchParams.get('site') || '';
    const selectedMois = searchParams.get('mois') || (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    })();

    // Charger les données
    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (selectedSite) params.append('site_id', selectedSite);
            if (selectedMois) params.append('mois', selectedMois);

            const [kpiResponse, historiqueResponse] = await Promise.all([
                apiFetch(`${API_BASE_URL}/kpis/?${params.toString()}`),
                apiFetch(`${API_BASE_URL}/kpis/historique/?${params.toString()}`),
            ]);

            const kpiData = await kpiResponse.json();
            const historiqueData = await historiqueResponse.json();

            setData(kpiData);
            setHistorique(historiqueData);
        } catch (err: any) {
            console.error('Error loading KPI data:', err);
            setError(err.message || 'Erreur lors du chargement des KPIs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedSite, selectedMois]);

    // Préparer les données historiques pour ce KPI
    const kpiHistoryData = useMemo(() => {
        if (!kpiKey || !historique) return [];
        return historique.historique.map(item => ({
            mois: new Date(item.mois + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
            moisFull: new Date(item.mois + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
            moisValue: item.mois,
            valeur: item.kpis[kpiKey] ?? 0,
        }));
    }, [kpiKey, historique]);

    // Calculer les statistiques
    const stats = useMemo(() => {
        if (!kpiHistoryData.length) return null;
        const values = kpiHistoryData.map(d => d.valeur);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const latest = values[values.length - 1] ?? 0;
        const previous = values[values.length - 2] ?? latest;
        const variation = latest - previous;
        const variationPct = previous !== 0 ? (variation / previous) * 100 : 0;

        return { avg, min, max, latest, previous, variation, variationPct };
    }, [kpiHistoryData]);

    // Navigation entre KPIs
    const currentIndex = kpiKey ? ALL_KPI_KEYS.indexOf(kpiKey as typeof ALL_KPI_KEYS[number]) : -1;
    const prevKPI = currentIndex > 0 ? ALL_KPI_KEYS[currentIndex - 1] : null;
    const nextKPI = currentIndex < ALL_KPI_KEYS.length - 1 ? ALL_KPI_KEYS[currentIndex + 1] : null;

    const navigateToKPI = (key: string) => {
        const params = new URLSearchParams();
        if (selectedSite) params.append('site', selectedSite);
        if (selectedMois) params.append('mois', selectedMois);
        navigate(`/reporting/kpi/${key}?${params.toString()}`);
    };

    // Vérifier que le KPI existe
    if (!kpiKey || !ALL_KPI_KEYS.includes(kpiKey as typeof ALL_KPI_KEYS[number])) {
        return (
            <div className="h-screen flex items-center justify-center p-6 bg-slate-50">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-red-800 mb-2">KPI non trouvé</h3>
                    <p className="text-red-600 mb-4">L'indicateur demandé n'existe pas.</p>
                    <button
                        onClick={() => navigate('/reporting')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 mx-auto"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Retour aux KPIs
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <LoadingScreen isLoading={true} loop={true} minDuration={0} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen flex items-center justify-center p-6 bg-slate-50">
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

    const kpi = data.kpis[kpiKey];
    const evolution = data.evolution[kpiKey];
    const color = KPI_COLORS[kpiKey];
    const isGoodWhenUp = !['temps_moyen_traitement_reclamations', 'temps_realisation_taches'].includes(kpiKey);

    // Nom du site sélectionné
    const selectedSiteName = data.sites_disponibles.find(s => s.id.toString() === selectedSite)?.nom;

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
            {/* Header avec navigation */}
            <div className="bg-white border-b border-slate-200 flex-shrink-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/reporting?tab=kpis')}
                                className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span className="hidden sm:inline">Retour aux KPIs</span>
                            </button>

                            {/* Navigation entre KPIs */}
                            <div className="flex items-center gap-1 border-l border-slate-200 pl-4">
                                <button
                                    onClick={() => prevKPI && navigateToKPI(prevKPI)}
                                    disabled={!prevKPI}
                                    className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title={prevKPI ? KPI_LABELS[prevKPI] : undefined}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="text-sm text-slate-500 px-2">
                                    {currentIndex + 1} / {ALL_KPI_KEYS.length}
                                </span>
                                <button
                                    onClick={() => nextKPI && navigateToKPI(nextKPI)}
                                    disabled={!nextKPI}
                                    className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title={nextKPI ? KPI_LABELS[nextKPI] : undefined}
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={loadData}
                                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span className="hidden sm:inline">Actualiser</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenu principal - Scrollable */}
            <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                {/* En-tête du KPI */}
                <div
                    className="rounded-2xl p-6 text-white shadow-lg"
                    style={{ backgroundColor: color }}
                >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Target className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold">{KPI_LABELS[kpiKey]}</h1>
                                    <p className="text-white/70 text-sm">KPI {currentIndex + 1}</p>
                                </div>
                            </div>
                            <p className="text-white/80 mt-3 max-w-2xl">
                                {KPI_DESCRIPTIONS[kpiKey]}
                            </p>
                        </div>

                        {/* Valeur actuelle */}
                        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                            <div className="text-center">
                                <div className="text-5xl font-bold">{kpi.valeur}</div>
                                <div className="text-xl text-white/80">{kpi.unite}</div>
                                {kpi.objectif !== null && (
                                    <div className="mt-2 text-sm text-white/70">
                                        Objectif: {kpi.objectif}{kpi.unite}
                                        {kpi.objectif_atteint && (
                                            <CheckCircle2 className="w-4 h-4 inline ml-2" />
                                        )}
                                    </div>
                                )}
                                {evolution && (
                                    <div className="mt-2 flex items-center justify-center gap-2">
                                        <TrendIcon tendance={evolution.tendance} isGoodWhenUp={isGoodWhenUp} />
                                        <span className="text-sm">
                                            {evolution.variation >= 0 ? '+' : ''}{evolution.variation_pct}% vs mois précédent
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contexte */}
                    <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-white/60" />
                            <span>Période: {new Date(data.periode.debut).toLocaleDateString('fr-FR')} - {new Date(data.periode.fin).toLocaleDateString('fr-FR')}</span>
                        </div>
                        {selectedSiteName && (
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-white/60" />
                                <span>Site: {selectedSiteName}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Alerte si présente */}
                {kpi.alerte && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-red-800">Alerte</h3>
                            <p className="text-red-700">{kpi.message_alerte}</p>
                        </div>
                    </div>
                )}

                {/* Statistiques rapides */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <div className="text-sm text-slate-500 mb-1">Moyenne (6 mois)</div>
                            <div className="text-2xl font-bold text-slate-800">{stats.avg.toFixed(1)}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <div className="text-sm text-slate-500 mb-1">Minimum</div>
                            <div className="text-2xl font-bold text-slate-800">{stats.min.toFixed(1)}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <div className="text-sm text-slate-500 mb-1">Maximum</div>
                            <div className="text-2xl font-bold text-slate-800">{stats.max.toFixed(1)}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <div className="text-sm text-slate-500 mb-1">Variation mensuelle</div>
                            <div className={`text-2xl font-bold ${
                                stats.variation >= 0
                                    ? (isGoodWhenUp ? 'text-emerald-600' : 'text-red-600')
                                    : (isGoodWhenUp ? 'text-red-600' : 'text-emerald-600')
                            }`}>
                                {stats.variation >= 0 ? '+' : ''}{stats.variationPct.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                )}

                {/* Graphique d'évolution */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-600" />
                        Évolution sur 6 mois (M-6 à M)
                    </h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={kpiHistoryData}>
                                <defs>
                                    <linearGradient id={`gradient-${kpiKey}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                {kpi.objectif !== null && (
                                    <ReferenceLine
                                        y={kpi.objectif}
                                        stroke="#059669"
                                        strokeDasharray="5 5"
                                        label={{ value: `Objectif: ${kpi.objectif}`, position: 'right', fontSize: 11, fill: '#059669' }}
                                    />
                                )}
                                {stats && (
                                    <ReferenceLine
                                        y={stats.avg}
                                        stroke="#94a3b8"
                                        strokeDasharray="3 3"
                                        label={{ value: `Moy: ${stats.avg.toFixed(1)}`, position: 'left', fontSize: 11, fill: '#94a3b8' }}
                                    />
                                )}
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const dataPoint = payload[0]?.payload as { moisFull: string; valeur: number };
                                            return (
                                                <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                                                    <p className="text-sm font-medium text-slate-800">{dataPoint.moisFull}</p>
                                                    <p className="text-lg font-bold" style={{ color }}>
                                                        {dataPoint.valeur} {kpi.unite}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="valeur"
                                    stroke={color}
                                    strokeWidth={3}
                                    fill={`url(#gradient-${kpiKey})`}
                                    dot={{ fill: color, strokeWidth: 2, r: 5 }}
                                    activeDot={{ r: 7, strokeWidth: 0 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tableau des valeurs mensuelles */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        Détail mensuel
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Mois</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Valeur</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Variation</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Tendance</th>
                                    {kpi.objectif !== null && (
                                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Objectif</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {kpiHistoryData.map((item, index) => {
                                    const prevValue = index > 0 ? kpiHistoryData[index - 1]?.valeur : null;
                                    const variation = prevValue !== null ? item.valeur - prevValue : null;
                                    const variationPct = prevValue !== null && prevValue !== 0
                                        ? ((item.valeur - prevValue) / prevValue * 100).toFixed(1)
                                        : null;
                                    const isLatest = index === kpiHistoryData.length - 1;
                                    const meetsObjectif = kpi.objectif !== null
                                        ? (isGoodWhenUp ? item.valeur >= kpi.objectif : item.valeur <= kpi.objectif)
                                        : null;

                                    return (
                                        <tr
                                            key={item.mois}
                                            className={`border-b border-slate-100 hover:bg-slate-50 ${isLatest ? 'bg-emerald-50/50' : ''}`}
                                        >
                                            <td className="py-3 px-4">
                                                <span className="text-sm text-slate-700">{item.moisFull}</span>
                                                {isLatest && (
                                                    <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                                                        Actuel
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <span className="text-sm font-medium text-slate-800">
                                                    {item.valeur} {kpi.unite}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {variation !== null ? (
                                                    <span className={
                                                        variation >= 0
                                                            ? (isGoodWhenUp ? 'text-emerald-600' : 'text-red-600')
                                                            : (isGoodWhenUp ? 'text-red-600' : 'text-emerald-600')
                                                    }>
                                                        {variation >= 0 ? '+' : ''}{variation.toFixed(1)} ({variationPct}%)
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {variation !== null ? (
                                                    <TrendIcon
                                                        tendance={variation > 0 ? 'hausse' : variation < 0 ? 'baisse' : 'stable'}
                                                        isGoodWhenUp={isGoodWhenUp}
                                                        size="sm"
                                                    />
                                                ) : (
                                                    <Minus className="w-4 h-4 text-slate-300 mx-auto" />
                                                )}
                                            </td>
                                            {kpi.objectif !== null && (
                                                <td className="py-3 px-4 text-center">
                                                    {meetsObjectif ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            Atteint
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                                            Non atteint
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Formule de calcul */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Info className="w-5 h-5 text-emerald-600" />
                        Formule de calcul
                    </h2>
                    <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm text-slate-700">
                        {KPI_FORMULAS[kpiKey]}
                    </div>
                </div>

                {/* Détails spécifiques au KPI */}
                {kpi.details && Object.keys(kpi.details).length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-emerald-600" />
                            Détails pour {data.periode.mois}
                        </h2>

                        {/* Affichage spécifique selon le KPI */}
                        {kpiKey === 'respect_planning' && kpi.details && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-4 bg-emerald-50 rounded-lg">
                                        <div className="text-3xl font-bold text-emerald-600">
                                            {kpi.details.taches_conformes ?? 0}
                                        </div>
                                        <div className="text-sm text-emerald-700">Tâches dans les délais</div>
                                    </div>
                                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                                        <div className="text-3xl font-bold text-orange-600">
                                            {kpi.details.taches_retard_1_7j ?? 0}
                                        </div>
                                        <div className="text-sm text-orange-700">Tâches en retard</div>
                                    </div>
                                    <div className="text-center p-4 bg-red-50 rounded-lg">
                                        <div className="text-3xl font-bold text-red-600">
                                            {kpi.details.taches_retard_critique ?? 0}
                                        </div>
                                        <div className="text-sm text-red-700">Retards &gt; 7 jours</div>
                                    </div>
                                </div>

                                {kpi.details.details_retards_critiques?.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="text-sm font-medium text-slate-700 mb-2">Tâches avec retard critique</h4>
                                        <div className="space-y-2">
                                            {kpi.details.details_retards_critiques.map((tache: any) => (
                                                <div key={tache.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                                    <span className="text-sm text-red-800">{tache.titre}</span>
                                                    <span className="text-sm text-red-600 font-medium">+{tache.retard_max_jours} jours</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {kpiKey === 'taux_realisation_reclamations' && kpi.details && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-slate-50 rounded-lg">
                                    <div className="text-3xl font-bold text-slate-600">
                                        {kpi.details.total_ouvertes ?? 0}
                                    </div>
                                    <div className="text-sm text-slate-500">Ouvertes (M)</div>
                                </div>
                                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                                    <div className="text-3xl font-bold text-emerald-600">
                                        {kpi.details.realisees ?? 0}
                                    </div>
                                    <div className="text-sm text-emerald-700">Réalisées (M)</div>
                                </div>
                                <div className="text-center p-4 bg-orange-50 rounded-lg">
                                    <div className="text-3xl font-bold text-orange-600">
                                        {kpi.details.non_realisees ?? 0}
                                    </div>
                                    <div className="text-sm text-orange-700">Non réalisées</div>
                                </div>
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <div className="text-3xl font-bold text-blue-600">
                                        {kpi.details.en_cours ?? 0}
                                    </div>
                                    <div className="text-sm text-blue-700">En cours</div>
                                </div>
                            </div>
                        )}

                        {kpiKey === 'temps_moyen_traitement_reclamations' && kpi.details?.par_type_reclamation && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-slate-700 mb-3">Par type de réclamation</h4>
                                {Object.entries(kpi.details.par_type_reclamation).map(([typeRec, typeData]: [string, any]) => (
                                    <div key={typeRec} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <span className="text-sm text-slate-700">{typeRec}</span>
                                        <div className="text-right">
                                            <span className="text-sm font-medium text-slate-800">{typeData.moyenne_heures}h</span>
                                            <span className="text-xs text-slate-400 ml-2">({typeData.count} réclamations)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {kpiKey === 'temps_realisation_taches' && kpi.details?.par_type && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-slate-700 mb-3">Par type de tâche</h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-2 px-3 text-slate-600 font-medium">Type de tâche</th>
                                                <th className="text-right py-2 px-3 text-slate-600 font-medium">Tâches</th>
                                                <th className="text-right py-2 px-3 text-slate-600 font-medium">Ratio d'efficacité</th>
                                                <th className="text-right py-2 px-3 text-slate-600 font-medium">Total heures</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {kpi.details.par_type.map((item: any, index: number) => (
                                                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="py-2 px-3">
                                                        <span className="font-medium text-slate-800">{item.type_tache}</span>
                                                        {item.taches_sans_quantite > 0 && (
                                                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                                                                {item.taches_sans_quantite} sans objets
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-slate-700">{item.count}</td>
                                                    <td className="py-2 px-3 text-right">
                                                        {item.ratio_efficacite != null ? (
                                                            <span className="font-medium text-slate-800">
                                                                {formatRatio(item.ratio_efficacite, item.unite_productivite)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-500">{item.moyenne_heures}h/tâche</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-slate-700">{item.total_heures}h</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {kpiKey === 'temps_realisation_taches' && kpi.details?.par_site_et_type && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-slate-700 mb-3">Par site et type de tâche</h4>
                                {kpi.details.par_site_et_type.map((item: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <div>
                                            <span className="text-sm font-medium text-slate-800">{item.site_nom}</span>
                                            <span className="text-xs text-slate-500 ml-2">({item.type_tache})</span>
                                        </div>
                                        <div className="text-right">
                                            {item.ratio_efficacite != null ? (
                                                <span className="text-sm font-medium text-slate-800">
                                                    {formatRatio(item.ratio_efficacite, item.unite_productivite)}
                                                </span>
                                            ) : (
                                                <span className="text-sm font-medium text-slate-800">{item.moyenne_heures}h/tâche</span>
                                            )}
                                            <span className="text-xs text-slate-400 ml-2">({item.count} tâches)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {kpiKey === 'temps_travail_par_site' && kpi.details?.par_site && (
                            <div className="space-y-4">
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={kpi.details.par_site} layout="vertical" margin={{ left: 100 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis
                                                dataKey="site_nom"
                                                type="category"
                                                tick={{ fontSize: 12 }}
                                                width={100}
                                            />
                                            <Tooltip formatter={(value: number) => [`${value}h`, 'Heures']} />
                                            <Bar dataKey="heures" name="Heures" fill={color} radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation rapide vers autres KPIs */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-emerald-600" />
                        Autres indicateurs
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {ALL_KPI_KEYS.filter(k => k !== kpiKey).map(k => {
                            const otherKpi = data.kpis[k];
                            return (
                                <button
                                    key={k}
                                    onClick={() => navigateToKPI(k)}
                                    className="text-left p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all group"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: KPI_COLORS[k] }}
                                        />
                                        <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700 truncate">
                                            {KPI_LABELS[k]}
                                        </span>
                                    </div>
                                    <div className="text-lg font-bold text-slate-800">
                                        {otherKpi?.valeur} {otherKpi?.unite}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default KPIDetail;
