import autoTable from 'jspdf-autotable';
import type { RenderContext } from './renderContext';
import { drawSectionTitle, ensureSpace } from './renderContext';
import { REPORT_COLORS } from './colors';

/**
 * Section 3 — Indicateurs de performance (KPI).
 *
 * Le fetch API (`apiFetch('/kpis/?...')`) reste dans l'appelant parce qu'il
 * dépend du contexte mono vs multi-site (param `site_id`). Cette fonction ne
 * prend que le payload déjà résolu (`kpis: any | null`) et s'occupe du
 * rendu :
 *  - Titre de section
 *  - Intro (localisée sur `moisLabel`)
 *  - Tableau principal à 4 colonnes (Indicateur / Valeur / Seuil / Statut)
 *  - KPI 4 — détail par type de réclamation (si données)
 *  - KPI 5 — temps de réalisation par type de tâche (si données)
 *  - KPI 5bis — temps de réalisation par type ET par site (si données)
 *
 * Si `kpis == null`, affiche uniquement le message d'absence de données.
 */

// ===== Mapping des clés API vers libellés du rapport =====

const KPI_LABELS: Record<string, string> = {
  respect_planning: 'Respect du planning',
  qualite_service: 'Qualité de service',
  taux_traitement_reclamations: 'Taux de traitement des réclamations',
  temps_moyen_traitement: 'Temps moyen traitement réclamations',
  temps_total_par_site: 'Temps total de travail',
};

const KPI_KEYS = Object.keys(KPI_LABELS);

function formatKpiStatut(statut: string | undefined | null): string {
  switch (statut) {
    case 'vert':
      return 'Conforme';
    case 'orange':
      return 'Attention';
    case 'rouge':
      return 'Non conforme';
    default:
      return '-';
  }
}

function extractKpiRow(key: string, kpis: any): [string, string, string, string] {
  const label = KPI_LABELS[key] || key;

  if (['respect_planning', 'qualite_service', 'taux_traitement_reclamations'].includes(key)) {
    const kpi = kpis[key];
    if (!kpi) return [label, '-', '-', '-'];
    const valeur = kpi.valeur != null ? `${Number(kpi.valeur).toFixed(1)}${kpi.unite || ''}` : '-';
    const seuil = kpi.seuil != null ? `${kpi.seuil}${kpi.unite || ''}` : '-';
    const statut = formatKpiStatut(kpi.statut);
    return [label, valeur, seuil, statut];
  }

  if (key === 'temps_moyen_traitement') {
    const kpi = kpis.temps_moyen_traitement;
    if (!kpi?.global) return [label, '-', '-', '-'];
    const valeur =
      kpi.global.valeur != null
        ? `${Number(kpi.global.valeur).toFixed(1)}${kpi.global.unite || 'h'}`
        : '-';
    const seuil = kpi.global.seuil != null ? `${kpi.global.seuil}${kpi.global.unite || 'h'}` : '-';
    const statut = formatKpiStatut(kpi.global.statut);
    return [label, valeur, seuil, statut];
  }

  if (key === 'temps_total_par_site') {
    const kpi = kpis.temps_total_par_site;
    if (!kpi) return [label, '-', '-', '-'];
    const valeur = `${kpi.total_heures ?? '-'}h`;
    return [label, valeur, '-', '-'];
  }

  return [label, '-', '-', '-'];
}

function buildKpiRows(kpis: any): [string, string, string, string][] {
  return KPI_KEYS.map((key) => extractKpiRow(key, kpis));
}

/** Colore la colonne "Statut" selon sa valeur. Seul side-effect sur `data`. */
function kpiDidParseCell(data: any): void {
  if (data.section === 'body' && data.column.index === 3) {
    const val = data.cell.raw;
    if (val === 'Conforme') {
      data.cell.styles.textColor = [22, 163, 74];
      data.cell.styles.fontStyle = 'bold';
    } else if (val === 'Attention') {
      data.cell.styles.textColor = [217, 119, 6];
      data.cell.styles.fontStyle = 'bold';
    } else if (val === 'Non conforme') {
      data.cell.styles.textColor = [220, 38, 38];
      data.cell.styles.fontStyle = 'bold';
    }
  }
}

interface DocWithLastAutoTable {
  lastAutoTable?: { finalY: number };
}

interface TableMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface MonthlyKpiDeps {
  /** Payload `/api/kpis/` — si `null`, affiche un message d'indisponibilité. */
  kpis: any | null;
  /** Libellé localisé du mois (ex. "avril 2026"). */
  moisLabel: string;
  tableMargins: TableMargins;
  didDrawPage: (data: unknown) => void;
}

function renderKpi4Detail(
  ctx: RenderContext,
  currentY: number,
  kpis: any,
  tableMargins: TableMargins,
  didDrawPage: (data: unknown) => void,
): number {
  const kpi = kpis.temps_moyen_traitement;
  if (!kpi?.par_type || !Array.isArray(kpi.par_type) || kpi.par_type.length === 0) {
    return currentY;
  }

  const sorted = [...kpi.par_type].sort((a: any, b: any) => (b.valeur || 0) - (a.valeur || 0));
  const { doc, pageWidth, margin } = ctx;
  let y = currentY;

  y = ensureSpace(ctx, y, 30);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(75, 85, 99);
  const introLines = doc.splitTextToSize(
    'Afin de fournir une vue plus détaillée, le temps moyen de traitement des réclamations est ventilé par type de réclamation :',
    pageWidth - 2 * margin,
  );
  doc.text(introLines, margin, y);
  y += introLines.length * 5 + 4;

  y = ensureSpace(ctx, y, 20 + sorted.length * 8);
  autoTable(doc, {
    startY: y,
    head: [['Type de réclamation', 'Temps moyen de traitement', 'Nb réclamations']],
    body: sorted.map((t: any) => [t.nom || 'N/A', `${(t.valeur || 0).toFixed(1)} h`, t.total ?? 0]),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center', cellWidth: 55 },
      2: { halign: 'center', cellWidth: 35 },
    },
    margin: tableMargins,
    didDrawPage,
  });
  return ((doc as unknown as DocWithLastAutoTable).lastAutoTable?.finalY ?? y) + 10;
}

function renderKpi5(
  ctx: RenderContext,
  currentY: number,
  kpis: any,
  tableMargins: TableMargins,
  didDrawPage: (data: unknown) => void,
): number {
  const entries = kpis.temps_realisation_tache;
  if (!Array.isArray(entries) || entries.length === 0) return currentY;

  const byType: Record<string, { heures: number; interventions: number }> = {};
  for (const e of entries) {
    const k = e.type_tache || 'Autre';
    if (!byType[k]) byType[k] = { heures: 0, interventions: 0 };
    byType[k].heures += e.heures || 0;
    byType[k].interventions += e.nb_interventions || 0;
  }

  const aggregated = Object.entries(byType).sort((a, b) => b[1].interventions - a[1].interventions);
  if (aggregated.length === 0) return currentY;

  const { doc, pageWidth, margin } = ctx;
  let y = currentY;

  y = ensureSpace(ctx, y, 30);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(75, 85, 99);
  const introLines = doc.splitTextToSize(
    "En complément des indicateurs figurant dans le tableau, le temps de réalisation par tâche, avec le nombre d'interventions associées à chaque tâche, est présenté ci-après :",
    pageWidth - 2 * margin,
  );
  doc.text(introLines, margin, y);
  y += introLines.length * 5 + 4;

  y = ensureSpace(ctx, y, 20 + aggregated.length * 8);
  autoTable(doc, {
    startY: y,
    head: [['Type de tâche', 'Temps de réalisation (h)', 'Nb interventions']],
    body: aggregated.map(([type, data]) => [
      type,
      `${data.heures.toFixed(1)} h`,
      data.interventions,
    ]),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: REPORT_COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center', cellWidth: 55 },
      2: { halign: 'center', cellWidth: 35 },
    },
    margin: tableMargins,
    didDrawPage,
  });
  return ((doc as unknown as DocWithLastAutoTable).lastAutoTable?.finalY ?? y) + 10;
}

function renderKpi5BySite(
  ctx: RenderContext,
  currentY: number,
  kpis: any,
  tableMargins: TableMargins,
  didDrawPage: (data: unknown) => void,
): number {
  const entries = kpis.temps_realisation_tache;
  if (!Array.isArray(entries) || entries.length === 0) return currentY;

  const rows = [...entries].sort((a: any, b: any) => {
    const typeCmp = (a.type_tache || '').localeCompare(b.type_tache || '');
    if (typeCmp !== 0) return typeCmp;
    return (b.nb_interventions || 0) - (a.nb_interventions || 0);
  });
  if (rows.length === 0) return currentY;

  const { doc, margin } = ctx;
  let y = currentY;

  y = ensureSpace(ctx, y, 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...REPORT_COLORS.dark);
  doc.text('Temps de réalisation des tâches par type et par site', margin, y);
  y += 8;

  y = ensureSpace(ctx, y, 20 + rows.length * 8);
  autoTable(doc, {
    startY: y,
    head: [['Type de tâche', 'Site', 'Temps (h)', 'Nb interventions']],
    body: rows.map((e: any) => [
      e.type_tache || 'N/A',
      e.site_nom || '-',
      `${(e.heures || 0).toFixed(1)} h`,
      e.nb_interventions ?? 0,
    ]),
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: {
      fillColor: REPORT_COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 60 },
      2: { halign: 'center', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 30 },
    },
    margin: tableMargins,
    didDrawPage,
  });
  return ((doc as unknown as DocWithLastAutoTable).lastAutoTable?.finalY ?? y) + 10;
}

// ===== KPI 4/5 — variante hebdomadaire (graphiques à barres) =====

function drawHorizontalBarChart(
  doc: any,
  bars: { label: string; value: number; detail?: string }[],
  options: {
    x: number;
    y: number;
    width: number;
    barHeight: number;
    barGap: number;
    barColor: [number, number, number];
    maxValue?: number;
  },
): number {
  const { x, y, width, barHeight, barGap, barColor } = options;
  const maxVal = options.maxValue || Math.max(...bars.map((b) => b.value), 1);
  const labelWidth = 55;
  const valueWidth = 30;
  const chartWidth = width - labelWidth - valueWidth;
  let currentY = y;

  for (const bar of bars) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    const truncatedLabel = bar.label.length > 22 ? bar.label.substring(0, 20) + '...' : bar.label;
    doc.text(truncatedLabel, x, currentY + barHeight / 2 + 1);

    const barWidth = maxVal > 0 ? (bar.value / maxVal) * chartWidth : 0;
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(x + labelWidth, currentY, chartWidth, barHeight, 1.5, 1.5, 'F');
    if (barWidth > 0) {
      doc.setFillColor(...barColor);
      doc.roundedRect(x + labelWidth, currentY, Math.max(barWidth, 3), barHeight, 1.5, 1.5, 'F');
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    const valText = bar.detail || String(bar.value);
    doc.text(valText, x + labelWidth + chartWidth + 3, currentY + barHeight / 2 + 1);

    currentY += barHeight + barGap;
  }

  return currentY;
}

function renderWeeklyKpi4Detail(ctx: RenderContext, currentY: number, kpis: any): number {
  const kpi = kpis.temps_moyen_traitement;
  if (!kpi?.par_type || !Array.isArray(kpi.par_type) || kpi.par_type.length === 0) {
    return currentY;
  }

  const { doc, pageWidth, margin } = ctx;
  const chartHeight = 15 + kpi.par_type.length * 9 + 5;
  let y = ensureSpace(ctx, currentY, chartHeight);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...REPORT_COLORS.dark);
  doc.text('Détail par type de réclamation', margin, y);
  y += 7;

  const bars = kpi.par_type.map((t: any) => ({
    label: t.nom || 'N/A',
    value: t.valeur || 0,
    detail: `${(t.valeur || 0).toFixed(1)}h (${t.total})`,
  }));
  y = drawHorizontalBarChart(doc, bars, {
    x: margin,
    y,
    width: pageWidth - 2 * margin,
    barHeight: 6,
    barGap: 3,
    barColor: [245, 158, 11],
  });

  return y + 5;
}

function renderWeeklyKpi5(ctx: RenderContext, currentY: number, kpis: any): number {
  const entries = kpis.temps_realisation_tache;
  if (!Array.isArray(entries) || entries.length === 0) return currentY;

  const byType: Record<string, { heures: number; interventions: number }> = {};
  for (const e of entries) {
    const key = e.type_tache || 'Autre';
    if (!byType[key]) byType[key] = { heures: 0, interventions: 0 };
    byType[key].heures += e.heures || 0;
    byType[key].interventions += e.nb_interventions || 0;
  }

  const aggregated = Object.entries(byType).sort((a, b) => b[1].heures - a[1].heures);
  if (aggregated.length === 0) return currentY;

  const { doc, pageWidth, margin } = ctx;
  const chartHeight = 15 + aggregated.length * 9 + 10;
  let y = ensureSpace(ctx, currentY, chartHeight);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...REPORT_COLORS.dark);
  doc.text('Temps de réalisation par type de tâche', margin, y);
  y += 7;

  const totalH = aggregated.reduce((s, [, v]) => s + v.heures, 0);
  const totalI = aggregated.reduce((s, [, v]) => s + v.interventions, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(`Total : ${totalH.toFixed(1)}h — ${totalI} intervention(s)`, margin, y);
  y += 8;

  const bars = aggregated.map(([type, data]) => ({
    label: type,
    value: data.heures,
    detail: `${data.heures.toFixed(1)}h (${data.interventions})`,
  }));
  y = drawHorizontalBarChart(doc, bars, {
    x: margin,
    y,
    width: pageWidth - 2 * margin,
    barHeight: 6,
    barGap: 3,
    barColor: REPORT_COLORS.primary,
  });

  return y + 5;
}

export interface WeeklyKpiDeps {
  kpis: any | null;
  tableMargins: TableMargins;
  didDrawPage: (data: unknown) => void;
}

/**
 * Section 3 — KPI du rapport hebdomadaire. Même tableau principal que le
 * mensuel, mais KPI4/5 rendus en graphiques à barres au lieu de tables.
 * Pas de KPI5 par site (spécificité mensuelle).
 */
export function drawWeeklyKpiSection(
  ctx: RenderContext,
  currentY: number,
  deps: WeeklyKpiDeps,
): number {
  const { doc, margin } = ctx;
  let y = currentY;

  if (!deps.kpis) {
    doc.setFontSize(10);
    doc.setTextColor(...REPORT_COLORS.dark);
    doc.text('Données KPI non disponibles pour cette période.', margin, y);
    return y + 15;
  }

  autoTable(doc, {
    startY: y,
    head: [['Indicateur', 'Valeur', 'Seuil', 'Statut']],
    body: buildKpiRows(deps.kpis),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: {
      fillColor: REPORT_COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { halign: 'center', cellWidth: 35 },
      2: { halign: 'center', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 30 },
    },
    margin: deps.tableMargins,
    didDrawPage: deps.didDrawPage,
    didParseCell: kpiDidParseCell,
  });
  y = ((doc as unknown as DocWithLastAutoTable).lastAutoTable?.finalY ?? y) + 15;

  y = renderWeeklyKpi4Detail(ctx, y, deps.kpis);
  y = renderWeeklyKpi5(ctx, y, deps.kpis);
  return y;
}

/** Dessine toute la section 3 (titre + tables ou fallback). */
export function drawMonthlyKpiSection(
  ctx: RenderContext,
  currentY: number,
  deps: MonthlyKpiDeps,
): number {
  const { doc, pageWidth, margin } = ctx;
  let y = drawSectionTitle(ctx, currentY, 'INDICATEURS DE PERFORMANCE', '3');

  if (!deps.kpis) {
    doc.setFontSize(10);
    doc.setTextColor(...REPORT_COLORS.dark);
    doc.text('Données KPI non disponibles pour cette période.', margin, y);
    return y + 15;
  }

  // Intro
  y = ensureSpace(ctx, y, 20);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  const introLines = doc.splitTextToSize(
    `Dans le but de suivre le déroulement des activités, les indicateurs de performance du mois de ${deps.moisLabel} sont présentés ci-après.`,
    pageWidth - 2 * margin,
  );
  doc.text(introLines, margin, y);
  y += introLines.length * 5 + 6;

  // Tableau principal
  autoTable(doc, {
    startY: y,
    head: [['Indicateur', 'Valeur', 'Seuil', 'Statut']],
    body: buildKpiRows(deps.kpis),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: {
      fillColor: REPORT_COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { halign: 'center', cellWidth: 35 },
      2: { halign: 'center', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 30 },
    },
    margin: deps.tableMargins,
    didDrawPage: deps.didDrawPage,
    didParseCell: kpiDidParseCell,
  });
  y = ((doc as unknown as DocWithLastAutoTable).lastAutoTable?.finalY ?? y) + 15;

  // Tables de détail (chacune est un no-op si pas de données)
  y = renderKpi4Detail(ctx, y, deps.kpis, deps.tableMargins, deps.didDrawPage);
  y = renderKpi5(ctx, y, deps.kpis, deps.tableMargins, deps.didDrawPage);
  y = renderKpi5BySite(ctx, y, deps.kpis, deps.tableMargins, deps.didDrawPage);

  return y;
}
