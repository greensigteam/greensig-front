import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Target, RefreshCw, Filter, Calendar, ChevronDown, ChevronUp,
    Printer, FileSpreadsheet, FileText, History
} from 'lucide-react';
import ExcelJS from 'exceljs';
import LoadingScreen from '../components/LoadingScreen';
import { AlertTriangle } from 'lucide-react';

// Custom hook and types
import { useKPIData, KPI_COLORS, KPI_LABELS, ALL_KPI_KEYS } from '../hooks/useKPIData';

// Components
import { KPICard, KPIFilters, KPIEvolutionChart, SitesChart, KPIDetailPlanning, KPIDetailReclamations } from '../components/kpi';

// Export utilities
import { exportPDF, getLogoAsBase64, getExcelStyles } from '../services/kpiExport';

const KPIReport: React.FC = () => {
    const navigate = useNavigate();
    const {
        // Data
        data,
        historique,
        loading,
        error,
        // Filters
        selectedSite,
        setSelectedSite,
        selectedMois,
        setSelectedMois,
        showFilters,
        setShowFilters,
        visibleKPIs,
        // Export state
        isExporting,
        setIsExporting,
        showExportMenu,
        setShowExportMenu,
        exportMenuRef,
        // Computed values
        moisOptions,
        periodeRaccourcis,
        hasActiveFilters,
        selectedSiteName,
        chartData,
        sitesData,
        // Actions
        loadData,
        resetFilters,
        toggleKPIVisibility,
        toggleAllKPIs,
    } = useKPIData();

    // Navigation to KPI detail page
    const navigateToKPIDetail = (kpiKey: string) => {
        const params = new URLSearchParams();
        if (selectedSite) params.append('site', selectedSite);
        if (selectedMois) params.append('mois', selectedMois);
        navigate(`/reporting/kpi/${kpiKey}?${params.toString()}`);
    };

    // Export PDF handler
    const handleExportPDF = async () => {
        if (!data) return;
        setIsExporting(true);
        try {
            await exportPDF(data, selectedSiteName);
        } catch (err) {
            console.error('Erreur export PDF:', err);
        } finally {
            setIsExporting(false);
        }
    };

    // Export Excel handler (keeping inline due to complexity)
    const handleExportExcel = async (syntheseOnly: boolean = false) => {
        if (!data) return;
        setShowExportMenu(false);
        setIsExporting(true);

        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'GreenSIG';
            workbook.created = new Date();

            // Get logo
            let logoId: number | null = null;
            try {
                const response = await fetch('/logofinal.png');
                if (response.ok) {
                    const logoBlob = await response.blob();
                    const logoBuffer = await logoBlob.arrayBuffer();
                    logoId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
                }
            } catch (err) {
                console.warn('Logo non chargé pour Excel:', err);
            }

            const { headerStyle, titleStyle, subTitleStyle, dataCellStyle, statusAtteint, statusNonAtteint } = getExcelStyles();

            // ===== Sheet 1: Synthesis =====
            const wsSynthese = workbook.addWorksheet('Synthèse', { views: [{ state: 'frozen', ySplit: 11 }] });

            if (logoId !== null) {
                wsSynthese.addImage(logoId, { tl: { col: 5.5, row: 0.2 }, ext: { width: 80, height: 80 } });
            }

            wsSynthese.mergeCells('A1:E1');
            wsSynthese.getCell('A1').value = 'RAPPORT DES INDICATEURS DE PERFORMANCE (KPIs)';
            wsSynthese.getCell('A1').style = titleStyle;
            wsSynthese.getRow(1).height = 35;

            wsSynthese.mergeCells('A2:E2');
            wsSynthese.getCell('A2').value = 'GreenSIG - Système de Gestion des Espaces Verts';
            wsSynthese.getCell('A2').style = { font: { italic: true, color: { argb: 'FF64748b' } } };
            wsSynthese.getRow(2).height = 25;

            // General info
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

            // KPI synthesis table
            wsSynthese.mergeCells('A10:E10');
            wsSynthese.getCell('A10').value = 'SYNTHÈSE DES KPIs';
            wsSynthese.getCell('A10').style = subTitleStyle;
            wsSynthese.getRow(10).height = 25;

            const syntheseHeaders = ['KPI', 'Valeur', 'Unité', 'Objectif', 'Statut', 'Évolution', 'Tendance'];
            syntheseHeaders.forEach((header, index) => {
                const cell = wsSynthese.getCell(11, index + 1);
                cell.value = header;
                cell.style = headerStyle;
            });
            wsSynthese.getRow(11).height = 25;

            let rowIndex = 12;
            Object.entries(data.kpis).forEach(([key, kpi], idx) => {
                const evolution = data.evolution[key];
                const row = wsSynthese.getRow(rowIndex);
                const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFf8fafc';

                row.getCell(1).value = KPI_LABELS[key];
                row.getCell(1).style = { ...dataCellStyle, font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } };

                row.getCell(2).value = kpi.valeur;
                row.getCell(2).style = { ...dataCellStyle, alignment: { horizontal: 'center' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } };

                row.getCell(3).value = kpi.unite;
                row.getCell(3).style = { ...dataCellStyle, alignment: { horizontal: 'center' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } };

                row.getCell(4).value = kpi.objectif !== null ? kpi.objectif : '-';
                row.getCell(4).style = { ...dataCellStyle, alignment: { horizontal: 'center' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } };

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

            wsSynthese.columns = [{ width: 45 }, { width: 12 }, { width: 10 }, { width: 12 }, { width: 18 }, { width: 14 }, { width: 14 }];
            wsSynthese.autoFilter = { from: 'A11', to: 'G16' };

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

            // Additional sheets for full export (simplified)
            // Sheet 2: Planning details
            const wsPlanning = workbook.addWorksheet('Respect Planning', { properties: { tabColor: { argb: 'FF059669' } } });
            wsPlanning.getCell('A1').value = 'RESPECT DU PLANNING - Détails';
            wsPlanning.getCell('A1').style = titleStyle;

            const kpi1 = data.kpis.respect_planning;
            wsPlanning.getCell('A3').value = 'Taux de respect';
            wsPlanning.getCell('B3').value = `${kpi1.valeur}${kpi1.unite}`;
            wsPlanning.getCell('A4').value = 'Tâches conformes';
            wsPlanning.getCell('B4').value = kpi1.details?.taches_conformes ?? 0;
            wsPlanning.getCell('A5').value = 'Tâches en avance';
            wsPlanning.getCell('B5').value = kpi1.details?.taches_en_avance ?? 0;
            wsPlanning.getCell('A6').value = 'Retards 1-7 jours';
            wsPlanning.getCell('B6').value = kpi1.details?.taches_retard_1_7j ?? 0;
            wsPlanning.getCell('A7').value = 'Retards critiques';
            wsPlanning.getCell('B7').value = kpi1.details?.taches_retard_critique ?? 0;
            wsPlanning.columns = [{ width: 30 }, { width: 20 }];

            // Sheet 3: Claims
            const wsClaims = workbook.addWorksheet('Réclamations', { properties: { tabColor: { argb: 'FF3b82f6' } } });
            wsClaims.getCell('A1').value = 'RÉCLAMATIONS - Détails';
            wsClaims.getCell('A1').style = { ...titleStyle, font: { ...titleStyle.font, color: { argb: 'FF3b82f6' } } };

            const kpi2 = data.kpis.taux_realisation_reclamations;
            wsClaims.getCell('A3').value = 'Taux de réalisation';
            wsClaims.getCell('B3').value = `${kpi2.valeur}${kpi2.unite}`;
            wsClaims.getCell('A4').value = 'Total ouvertes';
            wsClaims.getCell('B4').value = kpi2.details?.total_ouvertes ?? 0;
            wsClaims.getCell('A5').value = 'Réalisées';
            wsClaims.getCell('B5').value = kpi2.details?.realisees ?? 0;
            wsClaims.columns = [{ width: 30 }, { width: 20 }];

            // Sheet 4: Sites
            const wsSites = workbook.addWorksheet('Temps par Site', { properties: { tabColor: { argb: 'FFec4899' } } });
            wsSites.getCell('A1').value = 'TEMPS DE TRAVAIL PAR SITE';
            wsSites.getCell('A1').style = { ...titleStyle, font: { ...titleStyle.font, color: { argb: 'FFec4899' } } };

            const kpi5 = data.kpis.temps_travail_par_site;
            wsSites.getCell('A3').value = 'Total global';
            wsSites.getCell('B3').value = `${kpi5.valeur}${kpi5.unite}`;

            if (kpi5.details?.par_site?.length > 0) {
                wsSites.getCell('A5').value = 'Site';
                wsSites.getCell('A5').style = headerStyle;
                wsSites.getCell('B5').value = 'Heures';
                wsSites.getCell('B5').style = headerStyle;

                kpi5.details.par_site.forEach((item: any, idx: number) => {
                    wsSites.getCell(`A${6 + idx}`).value = item.site_nom;
                    wsSites.getCell(`B${6 + idx}`).value = item.heures;
                });
            }
            wsSites.columns = [{ width: 40 }, { width: 20 }];

            // Sheet 5: History
            if (historique?.historique?.length) {
                const wsHist = workbook.addWorksheet('Historique', { properties: { tabColor: { argb: 'FF6366f1' } } });
                wsHist.getCell('A1').value = 'HISTORIQUE DES 6 DERNIERS MOIS';
                wsHist.getCell('A1').style = { ...titleStyle, font: { ...titleStyle.font, color: { argb: 'FF6366f1' } } };

                const headers = ['Mois', 'Respect planning (%)', 'Réclamations (%)', 'Temps trait. (h)', 'Temps tâche (h)', 'Total (h)'];
                headers.forEach((h, i) => {
                    wsHist.getCell(3, i + 1).value = h;
                    wsHist.getCell(3, i + 1).style = headerStyle;
                });

                historique.historique.forEach((item, idx) => {
                    const row = 4 + idx;
                    wsHist.getCell(`A${row}`).value = item.mois;
                    wsHist.getCell(`B${row}`).value = item.kpis.respect_planning ?? '-';
                    wsHist.getCell(`C${row}`).value = item.kpis.taux_realisation_reclamations ?? '-';
                    wsHist.getCell(`D${row}`).value = item.kpis.temps_moyen_traitement_reclamations ?? '-';
                    wsHist.getCell(`E${row}`).value = item.kpis.temps_realisation_taches ?? '-';
                    wsHist.getCell(`F${row}`).value = item.kpis.temps_travail_par_site ?? '-';
                });

                wsHist.columns = [{ width: 15 }, { width: 20 }, { width: 18 }, { width: 16 }, { width: 16 }, { width: 12 }];
            }

            // Download file
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

    // Loading state
    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <LoadingScreen isLoading={true} loop={true} minDuration={0} />
            </div>
        );
    }

    // Error state
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

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50">
            <div id="kpi-report-content" className="p-6 space-y-6 max-w-[1920px] mx-auto">
                {/* Header */}
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

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Filters toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border ${
                                showFilters
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 border-slate-200'
                            }`}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden sm:inline">Filtres</span>
                            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <div className="hidden sm:block w-px h-8 bg-slate-200" />

                        {/* PDF Export */}
                        <button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200 disabled:opacity-50"
                        >
                            <Printer className="w-4 h-4" />
                            <span className="hidden sm:inline">PDF</span>
                        </button>

                        {/* Excel Export Menu */}
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
                            >
                                {isExporting ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <FileSpreadsheet className="w-4 h-4" />
                                )}
                                <span className="hidden sm:inline">{isExporting ? 'Export...' : 'Excel'}</span>
                                {!isExporting && <ChevronDown className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />}
                            </button>

                            {showExportMenu && (
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-3 py-2 border-b border-slate-100">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                            Options d'exportation
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleExportExcel(false)}
                                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-green-50 transition-colors text-left"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                            <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-800">Rapport complet</div>
                                            <div className="text-xs text-slate-500 mt-0.5">5 feuilles avec détails</div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => handleExportExcel(true)}
                                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-800">Synthèse uniquement</div>
                                            <div className="text-xs text-slate-500 mt-0.5">1 feuille récapitulatif</div>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="hidden sm:block w-px h-8 bg-slate-200" />

                        {/* History */}
                        <button
                            onClick={() => navigate('/reporting/kpis/historique')}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200"
                        >
                            <History className="w-4 h-4" />
                            <span className="hidden sm:inline">Historique</span>
                        </button>

                        {/* Refresh */}
                        <button
                            onClick={loadData}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Actualiser</span>
                        </button>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <KPIFilters
                        data={data}
                        selectedSite={selectedSite}
                        setSelectedSite={setSelectedSite}
                        selectedMois={selectedMois}
                        setSelectedMois={setSelectedMois}
                        moisOptions={moisOptions}
                        periodeRaccourcis={periodeRaccourcis}
                        hasActiveFilters={hasActiveFilters}
                        selectedSiteName={selectedSiteName}
                        visibleKPIs={visibleKPIs}
                        resetFilters={resetFilters}
                        toggleKPIVisibility={toggleKPIVisibility}
                        toggleAllKPIs={toggleAllKPIs}
                    />
                )}

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleKPIs.has('respect_planning') && (
                        <KPICard
                            title="Respect du planning"
                            kpi={data.kpis.respect_planning}
                            evolution={data.evolution.respect_planning}
                            color={KPI_COLORS.respect_planning}
                            isGoodWhenUp={true}
                            onClick={() => navigateToKPIDetail('respect_planning')}
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
                        />
                    )}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <KPIEvolutionChart chartData={chartData} visibleKPIs={visibleKPIs} />
                    <SitesChart sitesData={sitesData} />
                </div>

                {/* Detail Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <KPIDetailPlanning details={data.kpis.respect_planning.details} />
                    <KPIDetailReclamations details={data.kpis.taux_realisation_reclamations.details} />
                </div>
            </div>
        </div>
    );
};

export default KPIReport;
