import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    History, TrendingUp, TrendingDown, Minus, Calendar, Building2,
    ArrowLeft, Download, RefreshCw, Filter, ChevronDown, ChevronUp,
    BarChart3, Table, Eye, EyeOff, FileSpreadsheet, Printer
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import ExcelJS from 'exceljs';
import { apiFetch } from '../services/api';
import LoadingScreen from '../components/LoadingScreen';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Types
interface HistoriqueItem {
    mois: string;
    kpis: Record<string, number | null>;
}

interface HistoriqueData {
    historique: HistoriqueItem[];
}

interface SiteOption {
    id: number;
    nom: string;
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
    taux_realisation_reclamations: 'Taux réal. réclamations',
    temps_moyen_traitement_reclamations: 'Temps moy. traitement',
    temps_realisation_taches: 'Temps réal. tâches',
    temps_travail_par_site: 'Temps travail / site',
};

const KPI_FULL_LABELS: Record<string, string> = {
    respect_planning: 'Respect du planning',
    taux_realisation_reclamations: 'Taux de réalisation des réclamations',
    temps_moyen_traitement_reclamations: 'Temps moyen de traitement des réclamations',
    temps_realisation_taches: 'Temps de réalisation par tâche',
    temps_travail_par_site: 'Temps total de travail par site',
};

const KPI_UNITS: Record<string, string> = {
    respect_planning: '%',
    taux_realisation_reclamations: '%',
    temps_moyen_traitement_reclamations: 'h',
    temps_realisation_taches: 'h',
    temps_travail_par_site: 'h',
};

const ALL_KPI_KEYS = [
    'respect_planning',
    'taux_realisation_reclamations',
    'temps_moyen_traitement_reclamations',
    'temps_realisation_taches',
    'temps_travail_par_site'
] as const;

// Composant TrendIcon
const TrendIcon: React.FC<{ current: number | null; previous: number | null; isGoodWhenUp?: boolean }> =
    ({ current, previous, isGoodWhenUp = true }) => {
        if (current === null || previous === null) return <Minus className="w-4 h-4 text-slate-400" />;

        const diff = current - previous;
        if (Math.abs(diff) < 0.01) return <Minus className="w-4 h-4 text-slate-400" />;

        const isUp = diff > 0;
        const isPositive = (isUp && isGoodWhenUp) || (!isUp && !isGoodWhenUp);

        if (isUp) {
            return <TrendingUp className={`w-4 h-4 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />;
        }
        return <TrendingDown className={`w-4 h-4 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />;
    };

export default function KPIHistorique() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // États
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [historique, setHistorique] = useState<HistoriqueData | null>(null);
    const [sites, setSites] = useState<SiteOption[]>([]);
    const [selectedSite, setSelectedSite] = useState<string>(searchParams.get('site') || '');
    const [nbMois, setNbMois] = useState<number>(12);
    const [showFilters, setShowFilters] = useState(true);
    const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
    const [visibleKPIs, setVisibleKPIs] = useState<Set<string>>(new Set(ALL_KPI_KEYS));
    const [isExporting, setIsExporting] = useState(false);

    // Charger les données
    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Charger les sites disponibles depuis l'endpoint KPIs principal
            const kpiResponse = await apiFetch(`${API_BASE_URL}/kpis/`);
            const kpiData = await kpiResponse.json();
            if (kpiData.sites_disponibles) {
                setSites(kpiData.sites_disponibles);
            }

            // Charger l'historique avec le bon paramètre site_id
            const params = new URLSearchParams();
            if (selectedSite) params.append('site_id', selectedSite);
            params.append('nb_mois', nbMois.toString());

            const histResponse = await apiFetch(`${API_BASE_URL}/kpis/historique/?${params.toString()}`);
            const histData = await histResponse.json();
            setHistorique(histData);
        } catch (err) {
            console.error('Erreur chargement historique:', err);
            setError('Erreur lors du chargement des données historiques');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedSite, nbMois]);

    // Données formatées pour le graphique
    const chartData = useMemo(() => {
        if (!historique?.historique || historique.historique.length === 0) return [];

        return historique.historique.map(item => {
            const date = new Date(item.mois + '-01');
            return {
                mois: item.mois,
                moisLabel: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
                moisFull: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                respect_planning: item.kpis.respect_planning ?? null,
                taux_realisation_reclamations: item.kpis.taux_realisation_reclamations ?? null,
                temps_moyen_traitement_reclamations: item.kpis.temps_moyen_traitement_reclamations ?? null,
                temps_realisation_taches: item.kpis.temps_realisation_taches ?? null,
                temps_travail_par_site: item.kpis.temps_travail_par_site ?? null,
            };
        }); // L'API retourne déjà dans l'ordre chronologique
    }, [historique]);

    // Toggle visibilité KPI
    const toggleKPIVisibility = (kpiKey: string) => {
        setVisibleKPIs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(kpiKey)) {
                if (newSet.size > 1) newSet.delete(kpiKey);
            } else {
                newSet.add(kpiKey);
            }
            return newSet;
        });
    };

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
        } catch {
            return null;
        }
    };

    // Export PDF
    const handleExportPDF = async () => {
        if (!historique?.historique || chartData.length === 0) return;
        setIsExporting(true);

        try {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                setIsExporting(false);
                return;
            }

            const logoBase64 = await getLogoAsBase64();
            const siteName = sites.find(s => s.id.toString() === selectedSite)?.nom || 'Tous les sites';

            // Générer les lignes du tableau
            const tableRows = chartData.map((row, idx) => {
                const cells = ALL_KPI_KEYS.map(k => {
                    const val = row[k as keyof typeof row];
                    const prevRow = idx > 0 ? chartData[idx - 1] : null;
                    const prevVal = prevRow ? prevRow[k as keyof typeof prevRow] : null;
                    let trendClass = '';

                    if (val !== null && prevVal !== null && typeof val === 'number' && typeof prevVal === 'number') {
                        const diff = val - prevVal;
                        if (Math.abs(diff) > 0.01) {
                            const isGoodWhenUp = !['temps_moyen_traitement_reclamations', 'temps_realisation_taches'].includes(k);
                            const isPositive = (diff > 0 && isGoodWhenUp) || (diff < 0 && !isGoodWhenUp);
                            trendClass = isPositive ? 'trend-up' : 'trend-down';
                        }
                    }
                    return `<td class="${trendClass}">${val !== null && val !== undefined ? val : '-'}</td>`;
                }).join('');

                return `<tr><td>${row.moisFull}</td>${cells}</tr>`;
            }).join('');

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Historique KPIs</title>
                    <style>
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body { font-family: 'Segoe UI', sans-serif; padding: 30px; color: #1e293b; }
                        .header {
                            display: flex; align-items: center; justify-content: space-between;
                            margin-bottom: 30px; padding: 20px 30px;
                            background: linear-gradient(135deg, #059669, #047857);
                            border-radius: 12px; color: white;
                        }
                        .header h1 { font-size: 24px; margin-bottom: 5px; }
                        .header .subtitle { font-size: 13px; opacity: 0.9; }
                        .header-logo {
                            width: 70px; height: 70px; background: white;
                            border-radius: 10px; padding: 6px;
                            display: flex; align-items: center; justify-content: center;
                        }
                        .header-logo img { max-width: 100%; max-height: 100%; }
                        .info-bar {
                            display: flex; gap: 30px; margin-bottom: 25px;
                            padding: 15px 20px; background: #f8fafc; border-radius: 8px;
                        }
                        .info-item { display: flex; align-items: center; gap: 8px; }
                        .info-label { color: #64748b; font-size: 12px; }
                        .info-value { color: #1e293b; font-weight: 600; }
                        table { width: 100%; border-collapse: collapse; font-size: 12px; }
                        th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: center; }
                        th { background: #059669; color: white; font-weight: 600; }
                        th:first-child { text-align: left; }
                        td:first-child { text-align: left; font-weight: 500; }
                        tr:nth-child(even) { background: #f8fafc; }
                        .trend-up { color: #16a34a; font-weight: 600; }
                        .trend-down { color: #dc2626; font-weight: 600; }
                        .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 11px; }
                        @media print {
                            @page { margin: 1.5cm; size: A4 landscape; }
                            .header, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1>Historique des Indicateurs de Performance</h1>
                            <p class="subtitle">GreenSIG - Système de Gestion des Espaces Verts</p>
                        </div>
                        ${logoBase64 ? `<div class="header-logo"><img src="${logoBase64}" alt="Logo"></div>` : ''}
                    </div>

                    <div class="info-bar">
                        <div class="info-item">
                            <span class="info-label">Site :</span>
                            <span class="info-value">${siteName}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Période :</span>
                            <span class="info-value">${nbMois} derniers mois</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Généré le :</span>
                            <span class="info-value">${new Date().toLocaleDateString('fr-FR')}</span>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Mois</th>
                                <th>Respect planning (%)</th>
                                <th>Réal. réclamations (%)</th>
                                <th>Temps trait. (h)</th>
                                <th>Temps tâches (h)</th>
                                <th>Temps/site (h)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>

                    <div class="footer">
                        <p>Document généré automatiquement par GreenSIG - © ${new Date().getFullYear()}</p>
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

    // Export Excel
    const handleExportExcel = async () => {
        if (!historique?.historique || chartData.length === 0) return;
        setIsExporting(true);

        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'GreenSIG';
            workbook.created = new Date();

            const siteName = sites.find(s => s.id.toString() === selectedSite)?.nom || 'Tous les sites';

            // Récupérer le logo
            let logoId: number | null = null;
            try {
                const response = await fetch('/logofinal.png');
                if (response.ok) {
                    const logoBlob = await response.blob();
                    const logoBuffer = await logoBlob.arrayBuffer();
                    logoId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
                }
            } catch (err) {
                console.warn('Logo non chargé:', err);
            }

            const ws = workbook.addWorksheet('Historique KPIs', {
                views: [{ state: 'frozen', ySplit: 6 }]
            });

            // Logo
            if (logoId !== null) {
                ws.addImage(logoId, { tl: { col: 5, row: 0.2 }, ext: { width: 70, height: 70 } });
            }

            // Titre
            ws.mergeCells('A1:E1');
            ws.getCell('A1').value = 'HISTORIQUE DES INDICATEURS DE PERFORMANCE';
            ws.getCell('A1').style = {
                font: { bold: true, size: 16, color: { argb: 'FF059669' } },
                alignment: { horizontal: 'left', vertical: 'middle' }
            };
            ws.getRow(1).height = 30;

            ws.getCell('A2').value = 'GreenSIG - Système de Gestion des Espaces Verts';
            ws.getCell('A2').style = { font: { italic: true, color: { argb: 'FF64748b' } } };

            // Infos
            ws.getCell('A4').value = 'Site :';
            ws.getCell('A4').style = { font: { bold: true, color: { argb: 'FF64748b' } } };
            ws.getCell('B4').value = siteName;

            ws.getCell('C4').value = 'Période :';
            ws.getCell('C4').style = { font: { bold: true, color: { argb: 'FF64748b' } } };
            ws.getCell('D4').value = `${nbMois} derniers mois`;

            // En-têtes tableau
            const headers = ['Mois', 'Respect planning (%)', 'Réal. réclamations (%)', 'Temps trait. (h)', 'Temps tâches (h)', 'Temps/site (h)'];
            headers.forEach((h, i) => {
                const cell = ws.getCell(6, i + 1);
                cell.value = h;
                cell.style = {
                    font: { bold: true, color: { argb: 'FFFFFFFF' } },
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } },
                    alignment: { horizontal: 'center', vertical: 'middle' },
                    border: {
                        top: { style: 'thin', color: { argb: 'FF047857' } },
                        bottom: { style: 'thin', color: { argb: 'FF047857' } },
                        left: { style: 'thin', color: { argb: 'FF047857' } },
                        right: { style: 'thin', color: { argb: 'FF047857' } }
                    }
                };
            });
            ws.getRow(6).height = 25;

            // Données
            chartData.forEach((row, idx) => {
                const rowNum = 7 + idx;
                const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFf8fafc';

                ws.getCell(rowNum, 1).value = row.moisFull;
                ws.getCell(rowNum, 1).style = {
                    font: { bold: true },
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } },
                    border: { top: { style: 'thin', color: { argb: 'FFe2e8f0' } }, bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } }, left: { style: 'thin', color: { argb: 'FFe2e8f0' } }, right: { style: 'thin', color: { argb: 'FFe2e8f0' } } }
                };

                ALL_KPI_KEYS.forEach((k, kIdx) => {
                    const val = row[k as keyof typeof row];
                    const cell = ws.getCell(rowNum, kIdx + 2);
                    cell.value = val !== null && val !== undefined ? val : '-';
                    cell.style = {
                        alignment: { horizontal: 'center' },
                        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } },
                        border: { top: { style: 'thin', color: { argb: 'FFe2e8f0' } }, bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } }, left: { style: 'thin', color: { argb: 'FFe2e8f0' } }, right: { style: 'thin', color: { argb: 'FFe2e8f0' } } }
                    };
                });
            });

            // Largeurs colonnes
            ws.columns = [
                { width: 22 }, { width: 20 }, { width: 22 }, { width: 18 }, { width: 18 }, { width: 18 }
            ];

            // Filtre auto
            if (chartData.length > 0) {
                ws.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6 + chartData.length, column: 6 } };
            }

            // Télécharger
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `historique_kpis_${siteName.replace(/\s+/g, '_')}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Erreur export Excel:', err);
        } finally {
            setIsExporting(false);
        }
    };

    if (loading) return <LoadingScreen message="Chargement de l'historique..." />;

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <History className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Erreur</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button
                        onClick={loadData}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 flex-shrink-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/reporting')}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <History className="w-6 h-6 text-green-600" />
                                    Historique des KPIs
                                </h1>
                                <p className="text-sm text-slate-500">
                                    Évolution des indicateurs sur {nbMois} mois
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Toggle vue */}
                            <div className="flex items-center bg-slate-100 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                        viewMode === 'table'
                                            ? 'bg-white text-green-700 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-800'
                                    }`}
                                >
                                    <Table className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('chart')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                        viewMode === 'chart'
                                            ? 'bg-white text-green-700 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-800'
                                    }`}
                                >
                                    <BarChart3 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Export buttons */}
                            <button
                                onClick={handleExportPDF}
                                disabled={isExporting}
                                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-slate-200"
                            >
                                <Printer className="w-4 h-4" />
                                <span className="hidden sm:inline">PDF</span>
                            </button>
                            <button
                                onClick={handleExportExcel}
                                disabled={isExporting}
                                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-slate-200"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                <span className="hidden sm:inline">Excel</span>
                            </button>

                            {/* Refresh */}
                            <button
                                onClick={loadData}
                                disabled={loading}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <RefreshCw className={`w-5 h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Filtres */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="w-full flex items-center justify-between p-4"
                    >
                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                            <Filter className="w-5 h-5" />
                            Filtres
                        </div>
                        {showFilters ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    {showFilters && (
                        <div className="px-4 pb-4 border-t border-slate-100 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Site */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        <Building2 className="w-4 h-4 inline mr-1" />
                                        Site
                                    </label>
                                    <select
                                        value={selectedSite}
                                        onChange={(e) => setSelectedSite(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    >
                                        <option value="">Tous les sites</option>
                                        {sites.map(site => (
                                            <option key={site.id} value={site.id}>{site.nom}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Nombre de mois */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        Période
                                    </label>
                                    <select
                                        value={nbMois}
                                        onChange={(e) => setNbMois(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    >
                                        <option value={3}>3 derniers mois</option>
                                        <option value={6}>6 derniers mois</option>
                                        <option value={12}>12 derniers mois</option>
                                    </select>
                                </div>

                                {/* KPIs visibles */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        KPIs affichés
                                    </label>
                                    <div className="flex flex-wrap gap-1">
                                        {ALL_KPI_KEYS.map(key => (
                                            <button
                                                key={key}
                                                onClick={() => toggleKPIVisibility(key)}
                                                className={`px-2 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                                                    visibleKPIs.has(key)
                                                        ? 'text-white'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}
                                                style={{
                                                    backgroundColor: visibleKPIs.has(key) ? KPI_COLORS[key] : undefined
                                                }}
                                            >
                                                {visibleKPIs.has(key) ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                                {KPI_LABELS[key].split(' ').slice(0, 2).join(' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Contenu principal */}
                {viewMode === 'table' ? (
                    /* Vue tableau */
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gradient-to-r from-green-600 to-green-700">
                                        <th className="px-4 py-3 text-left text-white font-semibold">Mois</th>
                                        {ALL_KPI_KEYS.filter(k => visibleKPIs.has(k)).map(key => (
                                            <th
                                                key={key}
                                                className="px-4 py-3 text-center text-white font-semibold"
                                                style={{ minWidth: '140px' }}
                                            >
                                                <div className="flex flex-col items-center gap-1">
                                                    <span>{KPI_LABELS[key]}</span>
                                                    <span className="text-xs opacity-75">({KPI_UNITS[key]})</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {chartData.map((row, idx) => (
                                        <tr
                                            key={row.mois}
                                            className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                                                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                            }`}
                                        >
                                            <td className="px-4 py-3 font-medium text-slate-800">
                                                {row.moisFull}
                                            </td>
                                            {ALL_KPI_KEYS.filter(k => visibleKPIs.has(k)).map(key => {
                                                const val = row[key as keyof typeof row] as number | null;
                                                const prevRow = chartData[idx - 1];
                                                const prevVal = prevRow ? prevRow[key as keyof typeof prevRow] as number | null : null;
                                                const isGoodWhenUp = !['temps_moyen_traitement_reclamations', 'temps_realisation_taches'].includes(key);

                                                return (
                                                    <td key={key} className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="font-semibold text-slate-700">
                                                                {val !== null ? val : '-'}
                                                            </span>
                                                            <TrendIcon
                                                                current={val}
                                                                previous={prevVal}
                                                                isGoodWhenUp={isGoodWhenUp}
                                                            />
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Vue graphique */
                    <div className="space-y-6">
                        {/* Graphique principal - Toutes les lignes */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">
                                Évolution des indicateurs
                            </h3>
                            <div className="h-96 w-full">
                                <ResponsiveContainer width="100%" height={384} minWidth={0}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="moisLabel"
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                        />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                            }}
                                            labelFormatter={(label) => {
                                                const item = chartData.find(d => d.moisLabel === label);
                                                return item?.moisFull || label;
                                            }}
                                            formatter={(value: number, name: string) => [
                                                `${value} ${KPI_UNITS[name] || ''}`,
                                                KPI_FULL_LABELS[name] || name
                                            ]}
                                        />
                                        <Legend
                                            formatter={(value) => KPI_LABELS[value] || value}
                                        />
                                        {ALL_KPI_KEYS.filter(k => visibleKPIs.has(k)).map(key => (
                                            <Line
                                                key={key}
                                                type="monotone"
                                                dataKey={key}
                                                stroke={KPI_COLORS[key]}
                                                strokeWidth={2}
                                                dot={{ fill: KPI_COLORS[key], strokeWidth: 2, r: 4 }}
                                                activeDot={{ r: 6, strokeWidth: 2 }}
                                                connectNulls
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Graphiques individuels */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {ALL_KPI_KEYS.filter(k => visibleKPIs.has(k)).map(key => (
                                <div key={key} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: KPI_COLORS[key] }}
                                        />
                                        <h4 className="font-semibold text-slate-800">
                                            {KPI_FULL_LABELS[key]}
                                        </h4>
                                    </div>
                                    <div className="h-48 w-full">
                                        <ResponsiveContainer width="100%" height={192} minWidth={0}>
                                            <AreaChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis
                                                    dataKey="moisLabel"
                                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                                />
                                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '8px'
                                                    }}
                                                    formatter={(value: number) => [
                                                        `${value} ${KPI_UNITS[key]}`,
                                                        KPI_FULL_LABELS[key]
                                                    ]}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey={key}
                                                    stroke={KPI_COLORS[key]}
                                                    fill={KPI_COLORS[key]}
                                                    fillOpacity={0.2}
                                                    strokeWidth={2}
                                                    connectNulls
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}
