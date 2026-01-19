import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Target, TrendingUp, TrendingDown, Minus, CheckCircle2,
    AlertTriangle, RefreshCw, Filter, Calendar, Building2, Activity,
    ChevronDown, ChevronUp, X, RotateCcw, Download, Printer, Eye, EyeOff,
    BarChart3, ExternalLink, FileSpreadsheet, FileText, History
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import ExcelJS from 'exceljs';
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
    kpis: {
        respect_planning: KPIDetails;
        taux_realisation_reclamations: KPIDetails;
        temps_moyen_traitement_reclamations: KPIDetails;
        temps_realisation_taches: KPIDetails;
        temps_travail_par_site: KPIDetails;
    };
    evolution: Record<string, KPIEvolution>;
    sites_disponibles: Array<{ id: number; nom: string }>;
}

interface KPIHistorique {
    historique: Array<{
        mois: string;
        kpis: Record<string, number>;
    }>;
}

// Couleurs
const COLORS = {
    primary: '#059669',
    secondary: '#3b82f6',
    warning: '#f59e0b',
    danger: '#ef4444',
    success: '#22c55e',
    gray: '#6b7280',
};

const KPI_COLORS: Record<string, string> = {
    respect_planning: '#059669',
    taux_realisation_reclamations: '#3b82f6',
    temps_moyen_traitement_reclamations: '#f59e0b',
    temps_realisation_taches: '#8b5cf6',
    temps_travail_par_site: '#ec4899',
};

const KPI_LABELS: Record<string, string> = {
    respect_planning: 'Respect du planning',
    taux_realisation_reclamations: 'Taux de réalisation réclamations',
    temps_moyen_traitement_reclamations: 'Temps moyen traitement réclamations',
    temps_realisation_taches: 'Temps de réalisation par tâche',
    temps_travail_par_site: 'Temps total de travail',
};

const ALL_KPI_KEYS = [
    'respect_planning',
    'taux_realisation_reclamations',
    'temps_moyen_traitement_reclamations',
    'temps_realisation_taches',
    'temps_travail_par_site'
] as const;

// Composants
const TrendIcon: React.FC<{ tendance: 'hausse' | 'baisse' | 'stable'; isGoodWhenUp?: boolean }> =
    ({ tendance, isGoodWhenUp = true }) => {
        const isPositive = (tendance === 'hausse' && isGoodWhenUp) || (tendance === 'baisse' && !isGoodWhenUp);

        if (tendance === 'stable') {
            return <Minus className="w-4 h-4 text-slate-400" />;
        }

        return isPositive
            ? <TrendingUp className="w-4 h-4 text-emerald-500" />
            : <TrendingDown className="w-4 h-4 text-red-500" />;
    };

const KPICard: React.FC<{
    title: string;
    kpi: KPIDetails;
    evolution?: KPIEvolution;
    color: string;
    isGoodWhenUp?: boolean;
    onClick?: () => void;
    kpiKey?: string;
}> = ({ title, kpi, evolution, color, isGoodWhenUp = true, onClick, kpiKey }) => {
    const hasObjectif = kpi.objectif !== null;
    const progressPct = hasObjectif ? Math.min((kpi.valeur / kpi.objectif!) * 100, 100) : 0;

    return (
        <div
            className={`bg-white p-6 rounded-xl border border-slate-100 shadow-sm transition-all duration-200 ${
                onClick ? 'cursor-pointer hover:shadow-md hover:border-emerald-200 hover:scale-[1.02] group' : ''
            }`}
            onClick={onClick}
            title={onClick ? 'Cliquer pour voir l\'historique détaillé' : undefined}
        >
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-sm font-medium text-slate-500">{title}</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-bold text-slate-800">
                            {kpi.valeur}
                        </span>
                        <span className="text-lg text-slate-500">{kpi.unite}</span>
                    </div>
                </div>
                <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: color + '20' }}
                >
                    <Target className="w-6 h-6" style={{ color }} />
                </div>
            </div>

            {/* Barre de progression vers l'objectif */}
            {hasObjectif && (
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Objectif: {kpi.objectif}{kpi.unite}</span>
                        <span className={kpi.objectif_atteint ? 'text-emerald-600 font-medium' : 'text-slate-600'}>
                            {kpi.objectif_atteint ? 'Atteint' : `${Math.round(progressPct)}%`}
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                                width: `${progressPct}%`,
                                backgroundColor: kpi.objectif_atteint ? COLORS.success : color
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Alerte */}
            {kpi.alerte && (
                <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-xs text-red-700">{kpi.message_alerte}</span>
                </div>
            )}

            {/* Evolution */}
            {evolution && (
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <TrendIcon tendance={evolution.tendance} isGoodWhenUp={isGoodWhenUp} />
                    <span className={`text-sm ${evolution.tendance === 'stable' ? 'text-slate-500' :
                        (evolution.tendance === 'hausse' && isGoodWhenUp) || (evolution.tendance === 'baisse' && !isGoodWhenUp)
                            ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                        {evolution.variation >= 0 ? '+' : ''}{evolution.variation} ({evolution.variation_pct}%)
                    </span>
                    <span className="text-xs text-slate-400">vs mois précédent</span>
                    {onClick && (
                        <ExternalLink className="w-4 h-4 text-slate-300 ml-auto group-hover:text-emerald-500 transition-colors" />
                    )}
                </div>
            )}

            {/* Click indicator when no evolution */}
            {!evolution && onClick && (
                <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400 group-hover:text-emerald-500 transition-colors flex items-center gap-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Voir détails
                    </span>
                </div>
            )}
        </div>
    );
};

const DetailCard: React.FC<{
    title: string;
    children: React.ReactNode;
}> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            {title}
        </h3>
        {children}
    </div>
);

const KPIReport: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<KPIData | null>(null);
    const [historique, setHistorique] = useState<KPIHistorique | null>(null);

    // Filtres
    const [selectedSite, setSelectedSite] = useState<string>('');
    const [selectedMois, setSelectedMois] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [showFilters, setShowFilters] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    // Filtrage par type de KPI
    const [visibleKPIs, setVisibleKPIs] = useState<Set<string>>(new Set(ALL_KPI_KEYS));

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

    // Fermer le menu d'export au clic externe
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Générer les options de mois (12 derniers mois)
    const moisOptions = useMemo(() => {
        const options = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
            options.push({ value, label });
        }
        return options;
    }, []);

    // Raccourcis de période - MUST be before early returns
    const periodeRaccourcis = useMemo(() => {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
        const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const twoMonthsAgoStr = `${twoMonthsAgo.getFullYear()}-${String(twoMonthsAgo.getMonth() + 1).padStart(2, '0')}`;
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        const threeMonthsAgoStr = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}`;

        return [
            { label: 'Ce mois', value: currentMonth, icon: '📅' },
            { label: 'M-1', value: lastMonthStr, icon: '◀' },
            { label: 'M-2', value: twoMonthsAgoStr, icon: '◀◀' },
            { label: 'M-3', value: threeMonthsAgoStr, icon: '◀◀◀' },
        ];
    }, []);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <LoadingScreen isLoading={true} loop={true} minDuration={0} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 p-6">
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

    // Préparer les données pour le graphique d'évolution
    const chartData = historique?.historique.map(item => ({
        mois: new Date(item.mois + '-01').toLocaleDateString('fr-FR', { month: 'short' }),
        'Respect planning': item.kpis.respect_planning,
        'Réalisation réclamations': item.kpis.taux_realisation_reclamations,
        'Temps traitement (h)': item.kpis.temps_moyen_traitement_reclamations,
        'Temps tâche (h)': item.kpis.temps_realisation_taches,
        'Total travail (h)': item.kpis.temps_travail_par_site,
    })) || [];

    // Données pour le graphique par site
    const sitesData = data.kpis.temps_travail_par_site.details?.par_site || [];

    // Fonction pour récupérer le logo en base64
    const getLogoAsBase64 = async (): Promise<string | null> => {
        try {
            const response = await fetch('/logofinal.png');
            if (!response.ok) return null;

            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Erreur lors du chargement du logo:', error);
            return null;
        }
    };

    // Export PDF - Synthèse uniquement avec design professionnel
    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            const printWindow = window.open('', '_blank');
            if (!printWindow || !data) return;

            const selectedSiteName = data.sites_disponibles.find(s => s.id.toString() === selectedSite)?.nom || 'Tous les sites';
            const dateDebut = new Date(data.periode.debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
            const dateFin = new Date(data.periode.fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

            // Récupérer le logo
            const logoBase64 = await getLogoAsBase64();

            // Calculer les statistiques globales
            const kpisAtteints = Object.values(data.kpis).filter(k => k.objectif_atteint === true).length;
            const kpisNonAtteints = Object.values(data.kpis).filter(k => k.objectif_atteint === false).length;
            const totalKpis = Object.keys(data.kpis).length;

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Synthèse KPIs - ${data.periode.mois}</title>
                    <style>
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            padding: 40px;
                            color: #1e293b;
                            line-height: 1.6;
                            background: #fff;
                        }

                        /* En-tête */
                        .header {
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            margin-bottom: 40px;
                            padding: 25px 35px;
                            background: linear-gradient(135deg, #059669 0%, #047857 100%);
                            border-radius: 16px;
                            color: white;
                        }
                        .header-content {
                            flex: 1;
                        }
                        .header h1 {
                            font-size: 26px;
                            margin-bottom: 6px;
                            font-weight: 700;
                        }
                        .header .subtitle {
                            font-size: 14px;
                            opacity: 0.9;
                        }
                        .header-logo {
                            width: 80px;
                            height: 80px;
                            background: white;
                            border-radius: 12px;
                            padding: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        }
                        .header-logo img {
                            max-width: 100%;
                            max-height: 100%;
                            object-fit: contain;
                        }

                        /* Informations */
                        .info-section {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 20px;
                            margin-bottom: 35px;
                        }
                        .info-card {
                            background: #f8fafc;
                            padding: 20px;
                            border-radius: 12px;
                            border-left: 4px solid #059669;
                        }
                        .info-label {
                            font-size: 12px;
                            color: #64748b;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            margin-bottom: 5px;
                        }
                        .info-value {
                            font-size: 16px;
                            font-weight: 600;
                            color: #1e293b;
                        }

                        /* Résumé global */
                        .summary-section {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 20px;
                            margin-bottom: 40px;
                        }
                        .summary-card {
                            text-align: center;
                            padding: 25px 20px;
                            border-radius: 16px;
                            border: 2px solid;
                        }
                        .summary-card.total {
                            background: #f0fdf4;
                            border-color: #86efac;
                        }
                        .summary-card.success {
                            background: #dcfce7;
                            border-color: #22c55e;
                        }
                        .summary-card.warning {
                            background: #fef3c7;
                            border-color: #f59e0b;
                        }
                        .summary-number {
                            font-size: 48px;
                            font-weight: 700;
                            line-height: 1;
                        }
                        .summary-card.total .summary-number { color: #059669; }
                        .summary-card.success .summary-number { color: #16a34a; }
                        .summary-card.warning .summary-number { color: #d97706; }
                        .summary-label {
                            font-size: 14px;
                            color: #64748b;
                            margin-top: 8px;
                        }

                        /* Titre de section */
                        .section-title {
                            font-size: 20px;
                            font-weight: 700;
                            color: #1e293b;
                            margin-bottom: 20px;
                            padding-bottom: 10px;
                            border-bottom: 3px solid #059669;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                        }
                        .section-title::before {
                            content: '';
                            width: 8px;
                            height: 8px;
                            background: #059669;
                            border-radius: 50%;
                        }

                        /* Tableau des KPIs */
                        .kpi-table {
                            width: 100%;
                            border-collapse: separate;
                            border-spacing: 0;
                            border-radius: 12px;
                            overflow: hidden;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                        }
                        .kpi-table th {
                            background: #059669;
                            color: white;
                            font-weight: 600;
                            padding: 16px 20px;
                            text-align: left;
                            font-size: 13px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        .kpi-table td {
                            padding: 18px 20px;
                            border-bottom: 1px solid #e2e8f0;
                            font-size: 14px;
                        }
                        .kpi-table tr:last-child td {
                            border-bottom: none;
                        }
                        .kpi-table tr:nth-child(even) {
                            background: #f8fafc;
                        }

                        /* Nom du KPI avec indicateur couleur */
                        .kpi-name {
                            display: flex;
                            align-items: center;
                            gap: 12px;
                        }
                        .kpi-dot {
                            width: 12px;
                            height: 12px;
                            border-radius: 50%;
                            flex-shrink: 0;
                        }
                        .kpi-label {
                            font-weight: 600;
                            color: #1e293b;
                        }

                        /* Valeurs */
                        .value-cell {
                            font-weight: 700;
                            font-size: 18px;
                            color: #1e293b;
                        }
                        .value-unit {
                            font-weight: 400;
                            font-size: 14px;
                            color: #64748b;
                            margin-left: 4px;
                        }

                        /* Badges de statut */
                        .status-badge {
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                            padding: 8px 16px;
                            border-radius: 50px;
                            font-size: 13px;
                            font-weight: 600;
                        }
                        .status-success {
                            background: #dcfce7;
                            color: #166534;
                        }
                        .status-warning {
                            background: #fef3c7;
                            color: #92400e;
                        }
                        .status-na {
                            background: #f1f5f9;
                            color: #64748b;
                        }

                        /* Evolution */
                        .evolution-cell {
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        }
                        .evolution-badge {
                            display: inline-flex;
                            align-items: center;
                            gap: 4px;
                            padding: 6px 12px;
                            border-radius: 8px;
                            font-weight: 600;
                            font-size: 13px;
                        }
                        .evolution-up {
                            background: #dcfce7;
                            color: #16a34a;
                        }
                        .evolution-down {
                            background: #fee2e2;
                            color: #dc2626;
                        }
                        .evolution-stable {
                            background: #f1f5f9;
                            color: #64748b;
                        }
                        .evolution-arrow {
                            font-size: 16px;
                        }

                        /* Footer */
                        .footer {
                            margin-top: 50px;
                            padding-top: 25px;
                            border-top: 2px solid #e2e8f0;
                            text-align: center;
                        }
                        .footer-text {
                            color: #94a3b8;
                            font-size: 12px;
                        }
                        .footer-brand {
                            color: #059669;
                            font-weight: 600;
                        }

                        @media print {
                            body { padding: 20px; }
                            @page {
                                margin: 1.5cm;
                                size: A4 landscape;
                            }
                            .header, .header-logo {
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            .summary-card, .status-badge, .evolution-badge, .kpi-table th, .kpi-dot {
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                        }
                    </style>
                </head>
                <body>
                    <!-- En-tête -->
                    <div class="header">
                        <div class="header-content">
                            <h1>Synthèse des Indicateurs de Performance</h1>
                            <p class="subtitle">GreenSIG - Système de Gestion des Espaces Verts</p>
                        </div>
                        ${logoBase64 ? `
                            <div class="header-logo">
                                <img src="${logoBase64}" alt="GreenSIG Logo">
                            </div>
                        ` : ''}
                    </div>

                    <!-- Informations -->
                    <div class="info-section">
                        <div class="info-card">
                            <div class="info-label">Période</div>
                            <div class="info-value">${dateDebut} — ${dateFin}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-label">Site</div>
                            <div class="info-value">${selectedSiteName}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-label">Date du rapport</div>
                            <div class="info-value">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        </div>
                    </div>

                    <!-- Résumé global -->
                    <div class="summary-section">
                        <div class="summary-card total">
                            <div class="summary-number">${totalKpis}</div>
                            <div class="summary-label">KPIs suivis</div>
                        </div>
                        <div class="summary-card success">
                            <div class="summary-number">${kpisAtteints}</div>
                            <div class="summary-label">Objectifs atteints</div>
                        </div>
                        <div class="summary-card warning">
                            <div class="summary-number">${kpisNonAtteints}</div>
                            <div class="summary-label">À améliorer</div>
                        </div>
                    </div>

                    <!-- Tableau des KPIs -->
                    <div class="section-title">Détail des indicateurs</div>
                    <table class="kpi-table">
                        <thead>
                            <tr>
                                <th style="width: 30%">Indicateur</th>
                                <th style="width: 15%">Valeur</th>
                                <th style="width: 15%">Objectif</th>
                                <th style="width: 18%">Statut</th>
                                <th style="width: 22%">Évolution vs M-1</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(data.kpis).map(([key, kpi]) => {
                                const evolution = data.evolution[key];
                                const color = KPI_COLORS[key];
                                const isGoodWhenUp = !['temps_moyen_traitement_reclamations', 'temps_realisation_taches'].includes(key);

                                let evolutionClass = 'evolution-stable';
                                let evolutionIcon = '→';
                                if (evolution) {
                                    const isPositive = (evolution.tendance === 'hausse' && isGoodWhenUp) || (evolution.tendance === 'baisse' && !isGoodWhenUp);
                                    const isNegative = (evolution.tendance === 'baisse' && isGoodWhenUp) || (evolution.tendance === 'hausse' && !isGoodWhenUp);
                                    if (isPositive) {
                                        evolutionClass = 'evolution-up';
                                        evolutionIcon = '↑';
                                    } else if (isNegative) {
                                        evolutionClass = 'evolution-down';
                                        evolutionIcon = '↓';
                                    }
                                }

                                return `
                                    <tr>
                                        <td>
                                            <div class="kpi-name">
                                                <div class="kpi-dot" style="background-color: ${color}"></div>
                                                <span class="kpi-label">${KPI_LABELS[key]}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="value-cell">${kpi.valeur}</span>
                                            <span class="value-unit">${kpi.unite}</span>
                                        </td>
                                        <td>
                                            ${kpi.objectif !== null
                                                ? `<span class="value-cell">${kpi.objectif}</span><span class="value-unit">${kpi.unite}</span>`
                                                : '<span style="color: #94a3b8">—</span>'
                                            }
                                        </td>
                                        <td>
                                            ${kpi.objectif_atteint === true
                                                ? '<span class="status-badge status-success">✓ Atteint</span>'
                                                : kpi.objectif_atteint === false
                                                    ? '<span class="status-badge status-warning">✗ Non atteint</span>'
                                                    : '<span class="status-badge status-na">—</span>'
                                            }
                                        </td>
                                        <td>
                                            ${evolution
                                                ? `<div class="evolution-cell">
                                                    <span class="evolution-badge ${evolutionClass}">
                                                        <span class="evolution-arrow">${evolutionIcon}</span>
                                                        ${evolution.variation >= 0 ? '+' : ''}${evolution.variation_pct}%
                                                    </span>
                                                   </div>`
                                                : '<span style="color: #94a3b8">—</span>'
                                            }
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>

                    <!-- Footer -->
                    <div class="footer">
                        <p class="footer-text">
                            Document généré automatiquement par <span class="footer-brand">GreenSIG</span>
                            <br>© ${new Date().getFullYear()} - Tous droits réservés
                        </p>
                    </div>
                </body>
                </html>
            `);

            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
        } catch (err) {
            console.error('Erreur export PDF:', err);
        } finally {
            setIsExporting(false);
        }
    };

    // Export Excel multi-feuilles avec ExcelJS - Design professionnel
    const handleExportExcel = async (syntheseOnly: boolean = false) => {
        if (!data) return;
        setShowExportMenu(false);
        setIsExporting(true);

        try {
            const selectedSiteName = data.sites_disponibles.find(s => s.id.toString() === selectedSite)?.nom || 'Tous les sites';
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'GreenSIG';
            workbook.created = new Date();

            // Récupérer le logo pour l'ajouter au workbook
            let logoId: number | null = null;
            try {
                const response = await fetch('/logofinal.png');
                if (response.ok) {
                    const logoBlob = await response.blob();
                    const logoBuffer = await logoBlob.arrayBuffer();
                    logoId = workbook.addImage({
                        buffer: logoBuffer,
                        extension: 'png',
                    });
                }
            } catch (err) {
                console.warn('Logo non chargé pour Excel:', err);
            }

            // Styles communs
            const headerStyle: Partial<ExcelJS.Style> = {
                font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } },
                alignment: { horizontal: 'center', vertical: 'middle' },
                border: {
                    top: { style: 'thin', color: { argb: 'FF047857' } },
                    bottom: { style: 'thin', color: { argb: 'FF047857' } },
                    left: { style: 'thin', color: { argb: 'FF047857' } },
                    right: { style: 'thin', color: { argb: 'FF047857' } }
                }
            };

            const titleStyle: Partial<ExcelJS.Style> = {
                font: { bold: true, size: 16, color: { argb: 'FF059669' } },
                alignment: { horizontal: 'left', vertical: 'middle' }
            };

            const subTitleStyle: Partial<ExcelJS.Style> = {
                font: { bold: true, size: 12, color: { argb: 'FF1e293b' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf1f5f9' } },
                alignment: { horizontal: 'left', vertical: 'middle' }
            };

            const dataCellStyle: Partial<ExcelJS.Style> = {
                border: {
                    top: { style: 'thin', color: { argb: 'FFe2e8f0' } },
                    bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } },
                    left: { style: 'thin', color: { argb: 'FFe2e8f0' } },
                    right: { style: 'thin', color: { argb: 'FFe2e8f0' } }
                },
                alignment: { vertical: 'middle' }
            };

            const statusAtteint: Partial<ExcelJS.Style> = {
                font: { bold: true, color: { argb: 'FF166534' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFdcfce7' } },
                alignment: { horizontal: 'center', vertical: 'middle' }
            };

            const statusNonAtteint: Partial<ExcelJS.Style> = {
                font: { bold: true, color: { argb: 'FF92400e' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFfef3c7' } },
                alignment: { horizontal: 'center', vertical: 'middle' }
            };

            // ===== Feuille 1: Synthèse =====
            const wsSynthese = workbook.addWorksheet('Synthèse', {
                views: [{ state: 'frozen', ySplit: 11 }]
            });

            // Ajouter le logo en haut à droite
            if (logoId !== null) {
                wsSynthese.addImage(logoId, {
                    tl: { col: 5.5, row: 0.2 },
                    ext: { width: 80, height: 80 }
                });
            }

            // En-tête du document
            wsSynthese.mergeCells('A1:E1');
            wsSynthese.getCell('A1').value = 'RAPPORT DES INDICATEURS DE PERFORMANCE (KPIs)';
            wsSynthese.getCell('A1').style = titleStyle;
            wsSynthese.getRow(1).height = 35;

            wsSynthese.mergeCells('A2:E2');
            wsSynthese.getCell('A2').value = 'GreenSIG - Système de Gestion des Espaces Verts';
            wsSynthese.getCell('A2').style = { font: { italic: true, color: { argb: 'FF64748b' } } };
            wsSynthese.getRow(2).height = 25;

            // Informations générales
            wsSynthese.mergeCells('A4:E4');
            wsSynthese.getCell('A4').value = 'INFORMATIONS GÉNÉRALES';
            wsSynthese.getCell('A4').style = subTitleStyle;
            wsSynthese.getRow(4).height = 25;

            const infoData = [
                ['Période', `${new Date(data.periode.debut).toLocaleDateString('fr-FR')} - ${new Date(data.periode.fin).toLocaleDateString('fr-FR')}`],
                ['Mois', data.periode.mois],
                ['Site', selectedSiteName],
                ['Date de génération', `${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`],
            ];

            infoData.forEach((row, index) => {
                const rowNum = 5 + index;
                wsSynthese.getCell(`A${rowNum}`).value = row[0];
                wsSynthese.getCell(`A${rowNum}`).style = { font: { bold: true, color: { argb: 'FF64748b' } } };
                wsSynthese.getCell(`B${rowNum}`).value = row[1];
                wsSynthese.getCell(`B${rowNum}`).style = { font: { color: { argb: 'FF1e293b' } } };
            });

            // Tableau de synthèse
            wsSynthese.mergeCells('A10:E10');
            wsSynthese.getCell('A10').value = 'SYNTHÈSE DES KPIs';
            wsSynthese.getCell('A10').style = subTitleStyle;
            wsSynthese.getRow(10).height = 25;

            // En-têtes du tableau
            const syntheseHeaders = ['KPI', 'Valeur', 'Unité', 'Objectif', 'Statut', 'Évolution', 'Tendance'];
            syntheseHeaders.forEach((header, index) => {
                const cell = wsSynthese.getCell(11, index + 1);
                cell.value = header;
                cell.style = headerStyle;
            });
            wsSynthese.getRow(11).height = 25;

            // Données des KPIs
            let rowIndex = 12;
            Object.entries(data.kpis).forEach(([key, kpi], idx) => {
                const evolution = data.evolution[key];
                const row = wsSynthese.getRow(rowIndex);

                // Couleur alternée pour les lignes
                const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFf8fafc';

                row.getCell(1).value = KPI_LABELS[key];
                row.getCell(1).style = { ...dataCellStyle, font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } };

                row.getCell(2).value = kpi.valeur;
                row.getCell(2).style = { ...dataCellStyle, alignment: { horizontal: 'center' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } };

                row.getCell(3).value = kpi.unite;
                row.getCell(3).style = { ...dataCellStyle, alignment: { horizontal: 'center' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } };

                row.getCell(4).value = kpi.objectif !== null ? kpi.objectif : '-';
                row.getCell(4).style = { ...dataCellStyle, alignment: { horizontal: 'center' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } };

                // Statut avec couleur
                const statusCell = row.getCell(5);
                if (kpi.objectif_atteint === true) {
                    statusCell.value = '✓ Atteint';
                    statusCell.style = { ...dataCellStyle, ...statusAtteint };
                } else if (kpi.objectif_atteint === false) {
                    statusCell.value = '✗ Non atteint';
                    statusCell.style = { ...dataCellStyle, ...statusNonAtteint };
                } else {
                    statusCell.value = '-';
                    statusCell.style = { ...dataCellStyle, alignment: { horizontal: 'center' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } };
                }

                // Evolution
                const evolutionCell = row.getCell(6);
                if (evolution) {
                    const evolutionValue = `${evolution.variation >= 0 ? '+' : ''}${evolution.variation_pct}%`;
                    evolutionCell.value = evolutionValue;
                    const isPositive = evolution.variation >= 0;
                    evolutionCell.style = {
                        ...dataCellStyle,
                        alignment: { horizontal: 'center' },
                        font: { bold: true, color: { argb: isPositive ? 'FF16a34a' : 'FFdc2626' } },
                        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
                    };
                } else {
                    evolutionCell.value = '-';
                    evolutionCell.style = { ...dataCellStyle, alignment: { horizontal: 'center' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } };
                }

                // Tendance avec icône
                const tendanceCell = row.getCell(7);
                if (evolution) {
                    const icon = evolution.tendance === 'hausse' ? '↑' : evolution.tendance === 'baisse' ? '↓' : '→';
                    tendanceCell.value = `${icon} ${evolution.tendance.charAt(0).toUpperCase() + evolution.tendance.slice(1)}`;
                    tendanceCell.style = { ...dataCellStyle, alignment: { horizontal: 'center' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } };
                } else {
                    tendanceCell.value = '-';
                    tendanceCell.style = { ...dataCellStyle, alignment: { horizontal: 'center' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } };
                }

                row.height = 22;
                rowIndex++;
            });

            // Largeur des colonnes
            wsSynthese.columns = [
                { width: 45 }, { width: 12 }, { width: 10 }, { width: 12 }, { width: 18 }, { width: 14 }, { width: 14 }
            ];

            // Ajouter filtre automatique
            wsSynthese.autoFilter = { from: 'A11', to: 'G16' };

            // Si synthèse uniquement, télécharger maintenant
            if (syntheseOnly) {
                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `synthese_kpis_${data.periode.mois}_${selectedSiteName.replace(/\s+/g, '_')}.xlsx`;
                link.click();
                URL.revokeObjectURL(url);
                return;
            }

            // ===== Feuille 2: Respect Planning =====
            const wsRespect = workbook.addWorksheet('Respect Planning', {
                properties: { tabColor: { argb: 'FF059669' } }
            });

            wsRespect.mergeCells('A1:C1');
            wsRespect.getCell('A1').value = 'RESPECT DU PLANNING - Détails';
            wsRespect.getCell('A1').style = titleStyle;
            wsRespect.getRow(1).height = 30;

            // Métriques principales
            const kpi1 = data.kpis.respect_planning;
            const respectMetrics = [
                ['Métrique', 'Valeur', 'Couleur'],
                ['Tâches terminées dans les délais', kpi1.details?.terminees_dans_delais ?? 0, 'success'],
                ['Tâches terminées en retard', kpi1.details?.terminees_en_retard ?? 0, 'warning'],
                ['Retards critiques (> 7 jours)', kpi1.details?.retards_critiques ?? 0, 'danger'],
                ['Taux de respect', `${kpi1.valeur}${kpi1.unite}`, 'info'],
                ['Objectif', kpi1.objectif !== null ? `${kpi1.objectif}${kpi1.unite}` : '-', 'info'],
            ];

            respectMetrics.forEach((row, index) => {
                const rowNum = 3 + index;
                if (index === 0) {
                    wsRespect.getCell(`A${rowNum}`).value = row[0];
                    wsRespect.getCell(`A${rowNum}`).style = headerStyle;
                    wsRespect.getCell(`B${rowNum}`).value = row[1];
                    wsRespect.getCell(`B${rowNum}`).style = headerStyle;
                } else {
                    wsRespect.getCell(`A${rowNum}`).value = row[0];
                    wsRespect.getCell(`A${rowNum}`).style = dataCellStyle;

                    const valueCell = wsRespect.getCell(`B${rowNum}`);
                    valueCell.value = row[1];

                    // Couleur selon le type
                    const colorMap: Record<string, string> = {
                        success: 'FFdcfce7',
                        warning: 'FFfef3c7',
                        danger: 'FFfee2e2',
                        info: 'FFdbeafe'
                    };
                    valueCell.style = {
                        ...dataCellStyle,
                        alignment: { horizontal: 'center' },
                        font: { bold: true },
                        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colorMap[row[2] as string] || 'FFFFFFFF' } }
                    };
                }
            });

            // Tâches en retard critique
            if (kpi1.details?.taches_retard_critique?.length > 0) {
                const startRow = 11;
                wsRespect.mergeCells(`A${startRow}:B${startRow}`);
                wsRespect.getCell(`A${startRow}`).value = 'TÂCHES AVEC RETARD CRITIQUE';
                wsRespect.getCell(`A${startRow}`).style = subTitleStyle;

                wsRespect.getCell(`A${startRow + 1}`).value = 'Titre de la tâche';
                wsRespect.getCell(`A${startRow + 1}`).style = headerStyle;
                wsRespect.getCell(`B${startRow + 1}`).value = 'Retard (jours)';
                wsRespect.getCell(`B${startRow + 1}`).style = headerStyle;

                kpi1.details.taches_retard_critique.forEach((t: any, idx: number) => {
                    const rowNum = startRow + 2 + idx;
                    wsRespect.getCell(`A${rowNum}`).value = t.titre;
                    wsRespect.getCell(`A${rowNum}`).style = dataCellStyle;
                    wsRespect.getCell(`B${rowNum}`).value = `+${t.retard_jours}`;
                    wsRespect.getCell(`B${rowNum}`).style = {
                        ...dataCellStyle,
                        alignment: { horizontal: 'center' },
                        font: { bold: true, color: { argb: 'FFdc2626' } },
                        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFfee2e2' } }
                    };
                });
            }

            wsRespect.columns = [{ width: 50 }, { width: 20 }];

            // ===== Feuille 3: Réclamations =====
            const wsReclamations = workbook.addWorksheet('Réclamations', {
                properties: { tabColor: { argb: 'FF3b82f6' } }
            });

            wsReclamations.mergeCells('A1:B1');
            wsReclamations.getCell('A1').value = 'TAUX DE RÉALISATION DES RÉCLAMATIONS';
            wsReclamations.getCell('A1').style = { ...titleStyle, font: { ...titleStyle.font, color: { argb: 'FF3b82f6' } } };
            wsReclamations.getRow(1).height = 30;

            const kpi2 = data.kpis.taux_realisation_reclamations;
            const reclamationsData = [
                ['Métrique', 'Valeur'],
                ['Total ouvertes sur le mois', kpi2.details?.total_ouvertes ?? 0],
                ['Réclamations réalisées', kpi2.details?.realisees ?? 0],
                ['Réclamations non réalisées', kpi2.details?.non_realisees ?? 0],
                ['Réclamations en cours', kpi2.details?.en_cours ?? 0],
                ['Taux de réalisation', `${kpi2.valeur}${kpi2.unite}`],
            ];

            reclamationsData.forEach((row, index) => {
                const rowNum = 3 + index;
                if (index === 0) {
                    wsReclamations.getCell(`A${rowNum}`).value = row[0];
                    wsReclamations.getCell(`A${rowNum}`).style = { ...headerStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3b82f6' } } };
                    wsReclamations.getCell(`B${rowNum}`).value = row[1];
                    wsReclamations.getCell(`B${rowNum}`).style = { ...headerStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3b82f6' } } };
                } else {
                    wsReclamations.getCell(`A${rowNum}`).value = row[0];
                    wsReclamations.getCell(`A${rowNum}`).style = dataCellStyle;
                    wsReclamations.getCell(`B${rowNum}`).value = row[1];
                    wsReclamations.getCell(`B${rowNum}`).style = { ...dataCellStyle, alignment: { horizontal: 'center' }, font: { bold: true } };
                }
            });

            wsReclamations.columns = [{ width: 40 }, { width: 20 }];

            // ===== Feuille 4: Temps Traitement =====
            const wsTemps = workbook.addWorksheet('Temps Traitement', {
                properties: { tabColor: { argb: 'FFf59e0b' } }
            });

            wsTemps.mergeCells('A1:C1');
            wsTemps.getCell('A1').value = 'TEMPS MOYEN DE TRAITEMENT DES RÉCLAMATIONS';
            wsTemps.getCell('A1').style = { ...titleStyle, font: { ...titleStyle.font, color: { argb: 'FFf59e0b' } } };
            wsTemps.getRow(1).height = 30;

            const kpi3 = data.kpis.temps_moyen_traitement_reclamations;
            wsTemps.getCell('A3').value = 'Temps moyen global';
            wsTemps.getCell('A3').style = { font: { bold: true } };
            wsTemps.getCell('B3').value = `${kpi3.valeur}${kpi3.unite}`;
            wsTemps.getCell('B3').style = { font: { bold: true, size: 14, color: { argb: 'FFf59e0b' } } };

            if (kpi3.details?.par_type_reclamation) {
                wsTemps.mergeCells('A6:C6');
                wsTemps.getCell('A6').value = 'PAR TYPE DE RÉCLAMATION';
                wsTemps.getCell('A6').style = subTitleStyle;

                const tempsHeaders = ['Type', 'Temps moyen (h)', 'Nombre'];
                tempsHeaders.forEach((h, i) => {
                    wsTemps.getCell(7, i + 1).value = h;
                    wsTemps.getCell(7, i + 1).style = { ...headerStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf59e0b' } } };
                });

                let tempsRow = 8;
                Object.entries(kpi3.details.par_type_reclamation).forEach(([type, d]: [string, any], idx) => {
                    const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFfefce8';
                    wsTemps.getCell(`A${tempsRow}`).value = type;
                    wsTemps.getCell(`A${tempsRow}`).style = { ...dataCellStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } };
                    wsTemps.getCell(`B${tempsRow}`).value = d.moyenne_heures;
                    wsTemps.getCell(`B${tempsRow}`).style = { ...dataCellStyle, alignment: { horizontal: 'center' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } };
                    wsTemps.getCell(`C${tempsRow}`).value = d.count;
                    wsTemps.getCell(`C${tempsRow}`).style = { ...dataCellStyle, alignment: { horizontal: 'center' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } };
                    tempsRow++;
                });

                wsTemps.autoFilter = { from: 'A7', to: `C${tempsRow - 1}` };
            }

            wsTemps.columns = [{ width: 35 }, { width: 20 }, { width: 15 }];

            // ===== Feuille 5: Temps par Site =====
            const wsSites = workbook.addWorksheet('Temps par Site', {
                properties: { tabColor: { argb: 'FFec4899' } }
            });

            wsSites.mergeCells('A1:B1');
            wsSites.getCell('A1').value = 'TEMPS TOTAL DE TRAVAIL PAR SITE';
            wsSites.getCell('A1').style = { ...titleStyle, font: { ...titleStyle.font, color: { argb: 'FFec4899' } } };
            wsSites.getRow(1).height = 30;

            const kpi5 = data.kpis.temps_travail_par_site;
            wsSites.getCell('A3').value = 'Total global';
            wsSites.getCell('A3').style = { font: { bold: true } };
            wsSites.getCell('B3').value = `${kpi5.valeur}${kpi5.unite}`;
            wsSites.getCell('B3').style = { font: { bold: true, size: 14, color: { argb: 'FFec4899' } } };

            if (kpi5.details?.par_site?.length > 0) {
                wsSites.mergeCells('A6:B6');
                wsSites.getCell('A6').value = 'RÉPARTITION PAR SITE';
                wsSites.getCell('A6').style = subTitleStyle;

                wsSites.getCell('A7').value = 'Site';
                wsSites.getCell('A7').style = { ...headerStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFec4899' } } };
                wsSites.getCell('B7').value = 'Heures travaillées';
                wsSites.getCell('B7').style = { ...headerStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFec4899' } } };

                let siteRow = 8;
                kpi5.details.par_site.forEach((item: any, idx: number) => {
                    const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFfdf2f8';
                    wsSites.getCell(`A${siteRow}`).value = item.site_nom;
                    wsSites.getCell(`A${siteRow}`).style = { ...dataCellStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } };
                    wsSites.getCell(`B${siteRow}`).value = item.heures;
                    wsSites.getCell(`B${siteRow}`).style = { ...dataCellStyle, alignment: { horizontal: 'center' }, font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } };
                    siteRow++;
                });

                wsSites.autoFilter = { from: 'A7', to: `B${siteRow - 1}` };
            }

            wsSites.columns = [{ width: 45 }, { width: 20 }];

            // ===== Feuille 6: Historique =====
            if (historique?.historique?.length) {
                const wsHistorique = workbook.addWorksheet('Historique', {
                    properties: { tabColor: { argb: 'FF6366f1' } },
                    views: [{ state: 'frozen', ySplit: 3 }]
                });

                wsHistorique.mergeCells('A1:F1');
                wsHistorique.getCell('A1').value = 'HISTORIQUE DES 6 DERNIERS MOIS';
                wsHistorique.getCell('A1').style = { ...titleStyle, font: { ...titleStyle.font, color: { argb: 'FF6366f1' } } };
                wsHistorique.getRow(1).height = 30;

                const histoHeaders = ['Mois', 'Respect planning (%)', 'Réal. réclamations (%)', 'Temps trait. (h)', 'Temps tâche (h)', 'Total travail (h)'];
                histoHeaders.forEach((h, i) => {
                    wsHistorique.getCell(3, i + 1).value = h;
                    wsHistorique.getCell(3, i + 1).style = { ...headerStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366f1' } } };
                });
                wsHistorique.getRow(3).height = 25;

                let histoRow = 4;
                historique.historique.forEach((item, idx) => {
                    const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFf5f3ff';
                    const row = wsHistorique.getRow(histoRow);

                    row.getCell(1).value = new Date(item.mois + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                    row.getCell(2).value = item.kpis.respect_planning ?? '-';
                    row.getCell(3).value = item.kpis.taux_realisation_reclamations ?? '-';
                    row.getCell(4).value = item.kpis.temps_moyen_traitement_reclamations ?? '-';
                    row.getCell(5).value = item.kpis.temps_realisation_taches ?? '-';
                    row.getCell(6).value = item.kpis.temps_travail_par_site ?? '-';

                    for (let i = 1; i <= 6; i++) {
                        row.getCell(i).style = {
                            ...dataCellStyle,
                            alignment: { horizontal: i === 1 ? 'left' : 'center' },
                            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
                        };
                    }
                    histoRow++;
                });

                wsHistorique.autoFilter = { from: 'A3', to: `F${histoRow - 1}` };
                wsHistorique.columns = [
                    { width: 22 }, { width: 22 }, { width: 24 }, { width: 18 }, { width: 18 }, { width: 18 }
                ];
            }

            // Télécharger le fichier Excel
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `rapport_kpis_complet_${data.periode.mois}_${selectedSiteName.replace(/\s+/g, '_')}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Erreur export Excel:', err);
        } finally {
            setIsExporting(false);
        }
    };

    // Vérifier si des filtres sont actifs
    const hasActiveFilters = selectedSite !== '' || selectedMois !== periodeRaccourcis[0]?.value || visibleKPIs.size < ALL_KPI_KEYS.length;

    // Réinitialiser les filtres
    const resetFilters = () => {
        setSelectedSite('');
        setSelectedMois(periodeRaccourcis[0]?.value || '');
        setVisibleKPIs(new Set(ALL_KPI_KEYS));
    };

    // Toggle KPI visibility
    const toggleKPIVisibility = (kpiKey: string) => {
        setVisibleKPIs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(kpiKey)) {
                // Don't allow removing the last KPI
                if (newSet.size > 1) {
                    newSet.delete(kpiKey);
                }
            } else {
                newSet.add(kpiKey);
            }
            return newSet;
        });
    };

    // Toggle all KPIs
    const toggleAllKPIs = () => {
        if (visibleKPIs.size === ALL_KPI_KEYS.length) {
            // If all selected, select only first one
            setVisibleKPIs(new Set([ALL_KPI_KEYS[0]]));
        } else {
            // Select all
            setVisibleKPIs(new Set(ALL_KPI_KEYS));
        }
    };

    // Obtenir le nom du site sélectionné
    const selectedSiteName = data?.sites_disponibles.find(s => s.id.toString() === selectedSite)?.nom;

    // Navigation vers la page de détail KPI
    const navigateToKPIDetail = (kpiKey: string) => {
        const params = new URLSearchParams();
        if (selectedSite) params.append('site', selectedSite);
        if (selectedMois) params.append('mois', selectedMois);
        navigate(`/reporting/kpi/${kpiKey}?${params.toString()}`);
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div id="kpi-report-content" className="p-6 space-y-6">
                {/* En-tête */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <Target className="w-5 h-5 text-white" />
                            </div>
                            Indicateurs de Performance (KPIs)
                        </h1>
                        <p className="text-slate-500 mt-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Période: <span className="font-medium text-slate-700">{new Date(data.periode.debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-medium text-slate-700">{new Date(data.periode.fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Bouton Filtres (toggle) */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border ${
                                showFilters
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 border-slate-200'
                            }`}
                            title={showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden sm:inline">Filtres</span>
                            {hasActiveFilters && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {/* Séparateur */}
                        <div className="hidden sm:block w-px h-8 bg-slate-200" />

                        {/* Export PDF */}
                        <button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200 disabled:opacity-50"
                            title="Exporter en PDF"
                        >
                            <Printer className="w-4 h-4" />
                            <span className="hidden sm:inline">PDF</span>
                        </button>

                        {/* Export Excel - Menu déroulant */}
                        <div className="relative" ref={exportMenuRef}>
                            <button
                                onClick={() => !isExporting && setShowExportMenu(!showExportMenu)}
                                disabled={isExporting}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
                                    isExporting
                                        ? 'text-slate-400 bg-slate-50 border-slate-200 cursor-wait'
                                        : showExportMenu
                                            ? 'text-green-700 bg-green-50 border-green-200'
                                            : 'text-slate-600 hover:text-green-600 hover:bg-green-50 border-slate-200'
                                }`}
                                title={isExporting ? 'Exportation en cours...' : 'Options d\'exportation Excel'}
                            >
                                {isExporting ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <FileSpreadsheet className="w-4 h-4" />
                                )}
                                <span className="hidden sm:inline">{isExporting ? 'Export...' : 'Excel'}</span>
                                {!isExporting && <ChevronDown className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />}
                            </button>

                            {/* Menu déroulant */}
                            {showExportMenu && (
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-3 py-2 border-b border-slate-100">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                            Options d'exportation
                                        </span>
                                    </div>

                                    {/* Option 1: Rapport complet */}
                                    <button
                                        onClick={() => handleExportExcel(false)}
                                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-green-50 transition-colors text-left"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                            <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-800">Rapport complet</div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                7 feuilles: Synthèse, détails par KPI, historique
                                            </div>
                                        </div>
                                    </button>

                                    {/* Option 2: Synthèse uniquement */}
                                    <button
                                        onClick={() => handleExportExcel(true)}
                                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-800">Synthèse uniquement</div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                1 feuille avec le récapitulatif des KPIs
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Séparateur */}
                        <div className="hidden sm:block w-px h-8 bg-slate-200" />

                        {/* Historique */}
                        <button
                            onClick={() => navigate('/reporting/kpis/historique')}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200"
                            title="Voir l'historique complet des KPIs"
                        >
                            <History className="w-4 h-4" />
                            <span className="hidden sm:inline">Historique</span>
                        </button>

                        {/* Actualiser */}
                        <button
                            onClick={loadData}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200"
                            title="Actualiser les données"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Actualiser</span>
                        </button>
                    </div>
                </div>

                {/* Panneau de filtres amélioré - collapsible */}
                {showFilters && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <Filter className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                    <span className="font-semibold text-slate-700">Filtres de période</span>
                                    {hasActiveFilters && (
                                        <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                            {(selectedSite ? 1 : 0) + (selectedMois !== periodeRaccourcis[0]?.value ? 1 : 0)} actif(s)
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {hasActiveFilters && (
                                    <button
                                        onClick={resetFilters}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Réinitialiser
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Sélection rapide de période */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    Période rapide
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {periodeRaccourcis.map((periode) => (
                                        <button
                                            key={periode.value}
                                            onClick={() => setSelectedMois(periode.value)}
                                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${selectedMois === periode.value
                                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            {periode.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sélection du mois */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    Mois personnalisé
                                </label>
                                <select
                                    value={selectedMois}
                                    onChange={(e) => setSelectedMois(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                >
                                    {moisOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Filtre par site */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-slate-400" />
                                    Site
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedSite}
                                        onChange={(e) => setSelectedSite(e.target.value)}
                                        className={`w-full px-4 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all ${selectedSite ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'
                                            }`}
                                    >
                                        <option value="">Tous les sites</option>
                                        {data.sites_disponibles.map(site => (
                                            <option key={site.id} value={site.id}>
                                                {site.nom}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedSite && (
                                        <button
                                            onClick={() => setSelectedSite('')}
                                            className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Filtrage par type de KPI */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-slate-400" />
                                    KPIs à afficher
                                </label>
                                <button
                                    onClick={toggleAllKPIs}
                                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                >
                                    {visibleKPIs.size === ALL_KPI_KEYS.length ? 'Désélectionner tout' : 'Tout sélectionner'}
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {ALL_KPI_KEYS.map((kpiKey) => (
                                    <button
                                        key={kpiKey}
                                        onClick={() => toggleKPIVisibility(kpiKey)}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                            visibleKPIs.has(kpiKey)
                                                ? 'text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                        }`}
                                        style={visibleKPIs.has(kpiKey) ? { backgroundColor: KPI_COLORS[kpiKey] } : {}}
                                    >
                                        {visibleKPIs.has(kpiKey) ? (
                                            <Eye className="w-3.5 h-3.5" />
                                        ) : (
                                            <EyeOff className="w-3.5 h-3.5" />
                                        )}
                                        {KPI_LABELS[kpiKey]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tags des filtres actifs */}
                        {hasActiveFilters && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-slate-500">Filtres actifs:</span>
                                    {selectedSite && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                            <Building2 className="w-3 h-3" />
                                            {selectedSiteName}
                                            <button
                                                onClick={() => setSelectedSite('')}
                                                className="ml-1 hover:text-emerald-900"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    )}
                                    {selectedMois !== periodeRaccourcis[0]?.value && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                            <Calendar className="w-3 h-3" />
                                            {moisOptions.find(m => m.value === selectedMois)?.label}
                                            <button
                                                onClick={() => setSelectedMois(periodeRaccourcis[0]?.value || '')}
                                                className="ml-1 hover:text-blue-900"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                )}

                {/* Cartes KPIs - Filtrées par visibilité */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleKPIs.has('respect_planning') && (
                        <KPICard
                            title="Respect du planning"
                            kpi={data.kpis.respect_planning}
                            evolution={data.evolution.respect_planning}
                            color={KPI_COLORS.respect_planning}
                            isGoodWhenUp={true}
                            onClick={() => navigateToKPIDetail('respect_planning')}
                            kpiKey="respect_planning"
                        />
                    )}
                    {visibleKPIs.has('taux_realisation_reclamations') && (
                        <KPICard
                            title="Taux de réalisation réclamations"
                            kpi={data.kpis.taux_realisation_reclamations}
                            evolution={data.evolution.taux_realisation_reclamations}
                            color={KPI_COLORS.taux_realisation_reclamations}
                            isGoodWhenUp={true}
                            onClick={() => navigateToKPIDetail('taux_realisation_reclamations')}
                            kpiKey="taux_realisation_reclamations"
                        />
                    )}
                    {visibleKPIs.has('temps_moyen_traitement_reclamations') && (
                        <KPICard
                            title="Temps moyen traitement réclamations"
                            kpi={data.kpis.temps_moyen_traitement_reclamations}
                            evolution={data.evolution.temps_moyen_traitement_reclamations}
                            color={KPI_COLORS.temps_moyen_traitement_reclamations}
                            isGoodWhenUp={false}
                            onClick={() => navigateToKPIDetail('temps_moyen_traitement_reclamations')}
                            kpiKey="temps_moyen_traitement_reclamations"
                        />
                    )}
                    {visibleKPIs.has('temps_realisation_taches') && (
                        <KPICard
                            title="Temps de réalisation par tâche"
                            kpi={data.kpis.temps_realisation_taches}
                            evolution={data.evolution.temps_realisation_taches}
                            color={KPI_COLORS.temps_realisation_taches}
                            isGoodWhenUp={false}
                            onClick={() => navigateToKPIDetail('temps_realisation_taches')}
                            kpiKey="temps_realisation_taches"
                        />
                    )}
                    {visibleKPIs.has('temps_travail_par_site') && (
                        <KPICard
                            title="Temps total de travail"
                            kpi={data.kpis.temps_travail_par_site}
                            evolution={data.evolution.temps_travail_par_site}
                            color={KPI_COLORS.temps_travail_par_site}
                            isGoodWhenUp={true}
                            onClick={() => navigateToKPIDetail('temps_travail_par_site')}
                            kpiKey="temps_travail_par_site"
                        />
                    )}
                </div>

                {/* Graphiques */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Evolution des KPIs sur 6 mois - Tous les 5 KPIs */}
                    <DetailCard title="Evolution sur 6 mois (tous les KPIs)">
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: '%', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: 'heures', angle: 90, position: 'insideRight', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    {/* KPI 1: Respect planning (%) */}
                                    {visibleKPIs.has('respect_planning') && (
                                        <Line
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="Respect planning"
                                            stroke={KPI_COLORS.respect_planning}
                                            strokeWidth={2}
                                            dot={{ fill: KPI_COLORS.respect_planning, r: 3 }}
                                            activeDot={{ r: 5 }}
                                        />
                                    )}
                                    {/* KPI 2: Réalisation réclamations (%) */}
                                    {visibleKPIs.has('taux_realisation_reclamations') && (
                                        <Line
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="Réalisation réclamations"
                                            stroke={KPI_COLORS.taux_realisation_reclamations}
                                            strokeWidth={2}
                                            dot={{ fill: KPI_COLORS.taux_realisation_reclamations, r: 3 }}
                                            activeDot={{ r: 5 }}
                                        />
                                    )}
                                    {/* KPI 3: Temps traitement réclamations (h) */}
                                    {visibleKPIs.has('temps_moyen_traitement_reclamations') && (
                                        <Line
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="Temps traitement (h)"
                                            stroke={KPI_COLORS.temps_moyen_traitement_reclamations}
                                            strokeWidth={2}
                                            dot={{ fill: KPI_COLORS.temps_moyen_traitement_reclamations, r: 3 }}
                                            activeDot={{ r: 5 }}
                                            strokeDasharray="5 5"
                                        />
                                    )}
                                    {/* KPI 4: Temps tâche (h) */}
                                    {visibleKPIs.has('temps_realisation_taches') && (
                                        <Line
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="Temps tâche (h)"
                                            stroke={KPI_COLORS.temps_realisation_taches}
                                            strokeWidth={2}
                                            dot={{ fill: KPI_COLORS.temps_realisation_taches, r: 3 }}
                                            activeDot={{ r: 5 }}
                                            strokeDasharray="5 5"
                                        />
                                    )}
                                    {/* KPI 5: Total travail (h) */}
                                    {visibleKPIs.has('temps_travail_par_site') && (
                                        <Line
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="Total travail (h)"
                                            stroke={KPI_COLORS.temps_travail_par_site}
                                            strokeWidth={2}
                                            dot={{ fill: KPI_COLORS.temps_travail_par_site, r: 3 }}
                                            activeDot={{ r: 5 }}
                                        />
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-2 text-xs text-slate-500 text-center">
                            Axe gauche: pourcentages (%) | Axe droit: heures (h) | Lignes pointillées: temps moyens
                        </div>
                    </DetailCard>

                    {/* Temps de travail par site */}
                    <DetailCard title="Temps de travail par site">
                        {sitesData.length > 0 ? (
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sitesData} layout="vertical" margin={{ left: 100 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis
                                            dataKey="site_nom"
                                            type="category"
                                            tick={{ fontSize: 12 }}
                                            width={100}
                                        />
                                        <Tooltip
                                            formatter={(value: number) => [`${value}h`, 'Heures']}
                                        />
                                        <Bar dataKey="heures" name="Heures" radius={[0, 4, 4, 0]}>
                                            {sitesData.map((entry: any, index: number) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={KPI_COLORS.temps_travail_par_site}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-80 flex items-center justify-center text-slate-400">
                                Aucune donnée disponible
                            </div>
                        )}
                    </DetailCard>
                </div>

                {/* Détails par KPI */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Détails respect planning */}
                    <DetailCard title="Détails - Respect du planning">
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                                    <div className="text-2xl font-bold text-emerald-600">
                                        {data.kpis.respect_planning.details?.terminees_dans_delais ?? 0}
                                    </div>
                                    <div className="text-xs text-emerald-700">Dans les délais</div>
                                </div>
                                <div className="text-center p-3 bg-orange-50 rounded-lg">
                                    <div className="text-2xl font-bold text-orange-600">
                                        {data.kpis.respect_planning.details?.terminees_en_retard ?? 0}
                                    </div>
                                    <div className="text-xs text-orange-700">En retard</div>
                                </div>
                                <div className="text-center p-3 bg-red-50 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600">
                                        {data.kpis.respect_planning.details?.retards_critiques ?? 0}
                                    </div>
                                    <div className="text-xs text-red-700">Retards &gt; 7j</div>
                                </div>
                            </div>

                            {data.kpis.respect_planning.details?.taches_retard_critique?.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-sm font-medium text-slate-700 mb-2">Tâches avec retard critique</h4>
                                    <div className="space-y-2">
                                        {data.kpis.respect_planning.details.taches_retard_critique.map((tache: any) => (
                                            <div key={tache.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                                                <span className="text-sm text-red-800 truncate">{tache.titre}</span>
                                                <span className="text-xs text-red-600 font-medium">+{tache.retard_jours}j</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </DetailCard>

                    {/* Détails réclamations */}
                    <DetailCard title="Détails - Réclamations">
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-3">
                                <div className="text-center p-3 bg-slate-50 rounded-lg">
                                    <div className="text-2xl font-bold text-slate-600">
                                        {data.kpis.taux_realisation_reclamations.details?.total_ouvertes ?? 0}
                                    </div>
                                    <div className="text-xs text-slate-500">Ouvertes (M)</div>
                                </div>
                                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                                    <div className="text-2xl font-bold text-emerald-600">
                                        {data.kpis.taux_realisation_reclamations.details?.realisees ?? 0}
                                    </div>
                                    <div className="text-xs text-emerald-700">Réalisées (M)</div>
                                </div>
                                <div className="text-center p-3 bg-orange-50 rounded-lg">
                                    <div className="text-2xl font-bold text-orange-600">
                                        {data.kpis.taux_realisation_reclamations.details?.non_realisees ?? 0}
                                    </div>
                                    <div className="text-xs text-orange-700">Non réalisées</div>
                                </div>
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {data.kpis.taux_realisation_reclamations.details?.en_cours ?? 0}
                                    </div>
                                    <div className="text-xs text-blue-700">En cours</div>
                                </div>
                            </div>

                            {/* Temps par type de réclamation */}
                            {data.kpis.temps_moyen_traitement_reclamations.details?.par_type_reclamation && (
                                <div className="mt-4">
                                    <h4 className="text-sm font-medium text-slate-700 mb-2">Temps moyen par type de réclamation</h4>
                                    <div className="space-y-2">
                                        {Object.entries(data.kpis.temps_moyen_traitement_reclamations.details.par_type_reclamation).map(([typeRec, typeData]: [string, any]) => (
                                            <div key={typeRec} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                                <span className="text-sm text-slate-700">{typeRec}</span>
                                                <div className="text-right">
                                                    <span className="text-sm font-medium text-slate-800">{typeData.moyenne_heures}h</span>
                                                    <span className="text-xs text-slate-400 ml-2">({typeData.count} récl.)</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </DetailCard>
                </div>

                {/* Synthèse mensuelle */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        Synthèse mensuelle
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">KPI</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Valeur</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Objectif</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Statut</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Evolution</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(data.kpis).map(([key, kpi]) => {
                                    const evolution = data.evolution[key];
                                    const isGoodWhenUp = !['temps_moyen_traitement_reclamations', 'temps_realisation_taches'].includes(key);

                                    return (
                                        <tr key={key} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: KPI_COLORS[key] }}
                                                    />
                                                    <span className="text-sm text-slate-700">{KPI_LABELS[key]}</span>
                                                </div>
                                            </td>
                                            <td className="text-right py-3 px-4">
                                                <span className="text-sm font-medium text-slate-800">
                                                    {kpi.valeur} {kpi.unite}
                                                </span>
                                            </td>
                                            <td className="text-right py-3 px-4">
                                                <span className="text-sm text-slate-500">
                                                    {kpi.objectif !== null ? `${kpi.objectif} ${kpi.unite}` : '-'}
                                                </span>
                                            </td>
                                            <td className="text-center py-3 px-4">
                                                {kpi.objectif_atteint !== null ? (
                                                    kpi.objectif_atteint ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                            Atteint
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                                            Non atteint
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="text-right py-3 px-4">
                                                {evolution && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <TrendIcon tendance={evolution.tendance} isGoodWhenUp={isGoodWhenUp} />
                                                        <span className={`text-sm ${evolution.tendance === 'stable' ? 'text-slate-500' :
                                                            (evolution.tendance === 'hausse' && isGoodWhenUp) || (evolution.tendance === 'baisse' && !isGoodWhenUp)
                                                                ? 'text-emerald-600' : 'text-red-600'
                                                            }`}>
                                                            {evolution.variation >= 0 ? '+' : ''}{evolution.variation_pct}%
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KPIReport;
