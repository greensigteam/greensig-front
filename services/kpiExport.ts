import ExcelJS from 'exceljs';
import { KPIData, KPIHistorique, KPI_LABELS, KPI_COLORS } from '../hooks/useKPIData';

// Utility function to get logo as base64
export const getLogoAsBase64 = async (): Promise<string | null> => {
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

// Common Excel styles
export const getExcelStyles = () => {
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

    return {
        headerStyle,
        titleStyle,
        subTitleStyle,
        dataCellStyle,
        statusAtteint,
        statusNonAtteint
    };
};

// Generate PDF content
export const generatePDFContent = (
    data: KPIData,
    selectedSiteName: string,
    logoBase64: string | null
): string => {
    const dateDebut = new Date(data.periode.debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const dateFin = new Date(data.periode.fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    const kpisAtteints = Object.values(data.kpis).filter(k => k.objectif_atteint === true).length;
    const kpisNonAtteints = Object.values(data.kpis).filter(k => k.objectif_atteint === false).length;
    const totalKpis = Object.keys(data.kpis).length;

    return `
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
                .header-content { flex: 1; }
                .header h1 { font-size: 26px; margin-bottom: 6px; font-weight: 700; }
                .header .subtitle { font-size: 14px; opacity: 0.9; }
                .header-logo {
                    width: 80px; height: 80px;
                    background: white;
                    border-radius: 12px;
                    padding: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .header-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
                .info-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 35px; }
                .info-card { background: #f8fafc; padding: 20px; border-radius: 12px; border-left: 4px solid #059669; }
                .info-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
                .info-value { font-size: 16px; font-weight: 600; color: #1e293b; }
                .summary-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
                .summary-card { text-align: center; padding: 25px 20px; border-radius: 16px; border: 2px solid; }
                .summary-card.total { background: #f0fdf4; border-color: #86efac; }
                .summary-card.success { background: #dcfce7; border-color: #22c55e; }
                .summary-card.warning { background: #fef3c7; border-color: #f59e0b; }
                .summary-number { font-size: 48px; font-weight: 700; line-height: 1; }
                .summary-card.total .summary-number { color: #059669; }
                .summary-card.success .summary-number { color: #16a34a; }
                .summary-card.warning .summary-number { color: #d97706; }
                .summary-label { font-size: 14px; color: #64748b; margin-top: 8px; }
                .section-title {
                    font-size: 20px; font-weight: 700; color: #1e293b;
                    margin-bottom: 20px; padding-bottom: 10px;
                    border-bottom: 3px solid #059669;
                    display: flex; align-items: center; gap: 10px;
                }
                .section-title::before { content: ''; width: 8px; height: 8px; background: #059669; border-radius: 50%; }
                .kpi-table { width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                .kpi-table th { background: #059669; color: white; font-weight: 600; padding: 16px 20px; text-align: left; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
                .kpi-table td { padding: 18px 20px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
                .kpi-table tr:last-child td { border-bottom: none; }
                .kpi-table tr:nth-child(even) { background: #f8fafc; }
                .kpi-name { display: flex; align-items: center; gap: 12px; }
                .kpi-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
                .kpi-label { font-weight: 600; color: #1e293b; }
                .value-cell { font-weight: 700; font-size: 18px; color: #1e293b; }
                .value-unit { font-weight: 400; font-size: 14px; color: #64748b; margin-left: 4px; }
                .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 50px; font-size: 13px; font-weight: 600; }
                .status-success { background: #dcfce7; color: #166534; }
                .status-warning { background: #fef3c7; color: #92400e; }
                .status-na { background: #f1f5f9; color: #64748b; }
                .evolution-cell { display: flex; align-items: center; gap: 8px; }
                .evolution-badge { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 8px; font-weight: 600; font-size: 13px; }
                .evolution-up { background: #dcfce7; color: #16a34a; }
                .evolution-down { background: #fee2e2; color: #dc2626; }
                .evolution-stable { background: #f1f5f9; color: #64748b; }
                .evolution-arrow { font-size: 16px; }
                .footer { margin-top: 50px; padding-top: 25px; border-top: 2px solid #e2e8f0; text-align: center; }
                .footer-text { color: #94a3b8; font-size: 12px; }
                .footer-brand { color: #059669; font-weight: 600; }
                @media print {
                    body { padding: 20px; }
                    @page { margin: 1.5cm; size: A4 landscape; }
                    .header, .header-logo, .summary-card, .status-badge, .evolution-badge, .kpi-table th, .kpi-dot {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-content">
                    <h1>Synthèse des Indicateurs de Performance</h1>
                    <p class="subtitle">GreenSIG - Système de Gestion des Espaces Verts</p>
                </div>
                ${logoBase64 ? `<div class="header-logo"><img src="${logoBase64}" alt="GreenSIG Logo"></div>` : ''}
            </div>

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
                            if (isPositive) { evolutionClass = 'evolution-up'; evolutionIcon = '↑'; }
                            else if (isNegative) { evolutionClass = 'evolution-down'; evolutionIcon = '↓'; }
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

            <div class="footer">
                <p class="footer-text">
                    Document généré automatiquement par <span class="footer-brand">GreenSIG</span>
                    <br>© ${new Date().getFullYear()} - Tous droits réservés
                </p>
            </div>
        </body>
        </html>
    `;
};

// Export PDF
export const exportPDF = async (
    data: KPIData,
    selectedSiteName: string
): Promise<void> => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoBase64 = await getLogoAsBase64();
    const htmlContent = generatePDFContent(data, selectedSiteName, logoBase64);

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
};
