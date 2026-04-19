import autoTable from 'jspdf-autotable';
import type { RenderContext } from './renderContext';
import { drawSectionTitle, ensureSpace } from './renderContext';
import { REPORT_COLORS } from './colors';

interface DocWithLastAutoTable {
  lastAutoTable?: { finalY: number };
}

interface TableMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TravauxItem {
  type?: string | null;
}

export interface MonthlyTravauxDeps {
  siteName: string;
  items: TravauxItem[];
}

/**
 * Pattern commun des sections 4 "Travaux effectués" et 5 "Travaux planifiés" :
 *
 *   Titre — Intro grise — (si vide) message d'absence — (sinon) bandeau site +
 *   liste dédupliquée des types de tâches en puces.
 *
 * Section 4 et 5 partageaient 45 lignes quasi-identiques ; on factorise ici.
 */
function drawTaskTypeSummary(
  ctx: RenderContext,
  currentY: number,
  opts: {
    title: string;
    num: string;
    intro: string;
    emptyMessage: string;
    siteName: string;
    items: TravauxItem[];
  },
): number {
  const { doc, pageWidth, margin } = ctx;
  let y = drawSectionTitle(ctx, currentY, opts.title, opts.num);

  // Intro grise
  y = ensureSpace(ctx, y, 15);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  const introLines = doc.splitTextToSize(opts.intro, pageWidth - 2 * margin);
  doc.text(introLines, margin, y);
  y += introLines.length * 5 + 6;

  if (opts.items.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...REPORT_COLORS.dark);
    doc.text(opts.emptyMessage, margin, y);
    y += 15;
    return y;
  }

  // Bandeau site (gris foncé)
  y = ensureSpace(ctx, y, 15);
  doc.setFillColor(50, 50, 50);
  doc.roundedRect(margin, y - 3, pageWidth - 2 * margin, 12, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.siteName, margin + 5, y + 5);
  y += 15;

  // Liste dédupliquée des intitulés de tâches
  const taskTypes = [
    ...new Set(opts.items.map((item) => item.type).filter((t): t is string => Boolean(t))),
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...REPORT_COLORS.dark);
  for (const taskType of taskTypes) {
    y = ensureSpace(ctx, y, 8);
    doc.text(`\u2022  ${taskType}`, margin + 4, y);
    y += 7;
  }
  y += 5;
  return y;
}

const INTRO_EFFECTUES =
  'Dans le cadre du suivi des travaux, les tâches réalisées sont présentées ci-après :';
const INTRO_PLANIFIES =
  'Pour assurer la continuité des interventions, les travaux planifiés sont présentés ci-après. Le détail complet du planning par site est présenté dans les annexes.';

/** Section 4 — Travaux effectués du mois pour le site courant. */
export function drawMonthlyTravauxEffectues(
  ctx: RenderContext,
  currentY: number,
  deps: MonthlyTravauxDeps,
): number {
  return drawTaskTypeSummary(ctx, currentY, {
    title: 'TRAVAUX EFFECTUÉS',
    num: '4',
    intro: INTRO_EFFECTUES,
    emptyMessage: 'Aucun travail réalisé sur cette période.',
    siteName: deps.siteName,
    items: deps.items,
  });
}

/** Section 5 — Travaux planifiés du mois pour le site courant. */
export function drawMonthlyTravauxPlanifies(
  ctx: RenderContext,
  currentY: number,
  deps: MonthlyTravauxDeps,
): number {
  return drawTaskTypeSummary(ctx, currentY, {
    title: 'TRAVAUX PLANIFIÉS',
    num: '5',
    intro: INTRO_PLANIFIES,
    emptyMessage: 'Aucune intervention planifiée.',
    siteName: deps.siteName,
    items: deps.items,
  });
}

export interface MonthlyTravauxMultiSite {
  siteName: string;
  items: TravauxItem[];
}

export interface MonthlyTravauxMultiDeps {
  sites: MonthlyTravauxMultiSite[];
}

/**
 * Variante multi-sites des sections 4/5. Contrairement au mono-site, chaque
 * site affiche TOUJOURS son bandeau (même s'il n'a pas d'items) : le lecteur
 * voit qu'aucun travail n'a été fait pour ce site, et non que le site est
 * absent du rapport.
 */
function drawTaskTypeSummaryMulti(
  ctx: RenderContext,
  currentY: number,
  opts: {
    title: string;
    num: string;
    intro: string;
    emptyMessage: string;
    sites: MonthlyTravauxMultiSite[];
  },
): number {
  const { doc, pageWidth, margin } = ctx;
  let y = drawSectionTitle(ctx, currentY, opts.title, opts.num);

  y = ensureSpace(ctx, y, 15);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  const introLines = doc.splitTextToSize(opts.intro, pageWidth - 2 * margin);
  doc.text(introLines, margin, y);
  y += introLines.length * 5 + 6;

  for (const site of opts.sites) {
    y = ensureSpace(ctx, y, 15);
    doc.setFillColor(50, 50, 50);
    doc.roundedRect(margin, y - 3, pageWidth - 2 * margin, 12, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(site.siteName, margin + 5, y + 5);
    y += 15;

    if (site.items.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(...REPORT_COLORS.dark);
      doc.setFont('helvetica', 'normal');
      doc.text(opts.emptyMessage, margin, y);
      y += 10;
      continue;
    }

    const taskTypes = [
      ...new Set(site.items.map((item) => item.type).filter((t): t is string => Boolean(t))),
    ];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...REPORT_COLORS.dark);
    for (const taskType of taskTypes) {
      y = ensureSpace(ctx, y, 8);
      doc.text(`\u2022  ${taskType}`, margin + 4, y);
      y += 7;
    }
    y += 5;
  }
  return y;
}

/** Section 4 multi-sites — Travaux effectués, un bloc par site. */
export function drawMonthlyTravauxEffectuesMulti(
  ctx: RenderContext,
  currentY: number,
  deps: MonthlyTravauxMultiDeps,
): number {
  return drawTaskTypeSummaryMulti(ctx, currentY, {
    title: 'TRAVAUX EFFECTUÉS',
    num: '4',
    intro: INTRO_EFFECTUES,
    emptyMessage: 'Aucun travail réalisé sur cette période.',
    sites: deps.sites,
  });
}

/** Section 5 multi-sites — Travaux planifiés, un bloc par site. */
export function drawMonthlyTravauxPlanifiesMulti(
  ctx: RenderContext,
  currentY: number,
  deps: MonthlyTravauxMultiDeps,
): number {
  return drawTaskTypeSummaryMulti(ctx, currentY, {
    title: 'TRAVAUX PLANIFIÉS',
    num: '5',
    intro: INTRO_PLANIFIES,
    emptyMessage: 'Aucune intervention planifiée.',
    sites: deps.sites,
  });
}

// ===== Variantes hebdomadaires (tables autoTable, pas de puces) =====

export interface WeeklyTravauxItem {
  type?: string | null;
  count?: number | null;
}

export interface WeeklyTravauxDeps {
  items: WeeklyTravauxItem[];
  tableMargins: TableMargins;
  didDrawPage: (data: unknown) => void;
  emptyMessage: string;
  subtitle: string;
  headHeader: [string, string];
}

/**
 * Rendu d'une section "Travaux" hebdomadaire mono-site.
 * Diff notable avec la version mensuelle : pas de liste dédupliquée de types,
 * mais un `autoTable` [type, count] avec un en-tête contextuel.
 * Ne dessine PAS le titre de section — laissé à l'appelant qui en possède déjà
 * l'emplacement dans son flux.
 */
function drawWeeklyTaskTypeTable(
  ctx: RenderContext,
  currentY: number,
  deps: WeeklyTravauxDeps,
): number {
  const { doc, margin } = ctx;
  let y = currentY;

  doc.setFontSize(10);
  doc.setTextColor(...REPORT_COLORS.gray);
  doc.text(deps.subtitle, margin, y);
  y += 10;

  if (!deps.items || deps.items.length === 0) {
    doc.setTextColor(...REPORT_COLORS.dark);
    doc.text(deps.emptyMessage, margin, y);
    return y + 15;
  }

  autoTable(doc, {
    startY: y,
    head: [[...deps.headHeader]],
    body: deps.items.map((t) => [t.type || 'N/A', String(t.count || 0)]),
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: {
      fillColor: REPORT_COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: deps.tableMargins,
    didDrawPage: deps.didDrawPage,
  });
  return ((doc as unknown as DocWithLastAutoTable).lastAutoTable?.finalY ?? y) + 15;
}

export function drawWeeklyTravauxEffectues(
  ctx: RenderContext,
  currentY: number,
  deps: Omit<WeeklyTravauxDeps, 'emptyMessage' | 'subtitle' | 'headHeader'>,
): number {
  return drawWeeklyTaskTypeTable(ctx, currentY, {
    ...deps,
    subtitle: 'Opérations validées cette semaine',
    emptyMessage: 'Aucun travail validé cette semaine.',
    headHeader: ["Type d'intervention", 'Nombre'],
  });
}

export function drawWeeklyTravauxPlanifies(
  ctx: RenderContext,
  currentY: number,
  deps: Omit<WeeklyTravauxDeps, 'emptyMessage' | 'subtitle' | 'headHeader'>,
): number {
  return drawWeeklyTaskTypeTable(ctx, currentY, {
    ...deps,
    subtitle: 'Interventions prévues la semaine prochaine',
    emptyMessage: 'Aucun travail planifié.',
    headHeader: ["Type d'intervention", 'Nombre prévu'],
  });
}

export interface WeeklyTravauxMultiSite {
  siteName: string;
  items: WeeklyTravauxItem[];
}

export interface WeeklyTravauxMultiDeps {
  sites: WeeklyTravauxMultiSite[];
  tableMargins: TableMargins;
  didDrawPage: (data: unknown) => void;
}

interface WeeklyMultiOpts {
  subtitle: string;
  emptyMessage: string;
  headHeader: [string, string];
}

/**
 * Rendu multi-sites : un bandeau gris par site, puis soit un message vide,
 * soit un `autoTable` [type, count]. Ne dessine PAS le titre de section.
 */
function drawWeeklyTaskTypeTableMulti(
  ctx: RenderContext,
  currentY: number,
  deps: WeeklyTravauxMultiDeps,
  opts: WeeklyMultiOpts,
): number {
  const { doc, pageWidth, margin } = ctx;
  let y = currentY;

  doc.setFontSize(10);
  doc.setTextColor(...REPORT_COLORS.gray);
  doc.text(opts.subtitle, margin, y);
  y += 10;

  for (const site of deps.sites) {
    y = ensureSpace(ctx, y, 15);
    doc.setFillColor(50, 50, 50);
    doc.roundedRect(margin, y - 3, pageWidth - 2 * margin, 12, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(site.siteName, margin + 5, y + 5);
    y += 15;

    if (!site.items || site.items.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(...REPORT_COLORS.dark);
      doc.setFont('helvetica', 'normal');
      doc.text(opts.emptyMessage, margin, y);
      y += 10;
      continue;
    }

    autoTable(doc, {
      startY: y,
      head: [[...opts.headHeader]],
      body: site.items.map((t) => [t.type || 'N/A', String(t.count || 0)]),
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: {
        fillColor: REPORT_COLORS.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: deps.tableMargins,
      didDrawPage: deps.didDrawPage,
    });
    y = ((doc as unknown as DocWithLastAutoTable).lastAutoTable?.finalY ?? y) + 10;
  }
  return y;
}

export function drawWeeklyTravauxEffectuesMulti(
  ctx: RenderContext,
  currentY: number,
  deps: WeeklyTravauxMultiDeps,
): number {
  return drawWeeklyTaskTypeTableMulti(ctx, currentY, deps, {
    subtitle: 'Opérations validées cette semaine',
    emptyMessage: 'Aucun travail validé cette semaine.',
    headHeader: ["Type d'intervention", 'Nombre'],
  });
}

export function drawWeeklyTravauxPlanifiesMulti(
  ctx: RenderContext,
  currentY: number,
  deps: WeeklyTravauxMultiDeps,
): number {
  return drawWeeklyTaskTypeTableMulti(ctx, currentY, deps, {
    subtitle: 'Interventions prévues la semaine prochaine',
    emptyMessage: 'Aucun travail planifié.',
    headHeader: ["Type d'intervention", 'Nombre prévu'],
  });
}
