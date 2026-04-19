import { format } from 'date-fns';
import autoTable from 'jspdf-autotable';
import type { RenderContext } from './renderContext';
import { drawSectionTitle, ensureSpace } from './renderContext';
import { REPORT_COLORS } from './colors';

/** Ligne du planning telle que renvoyée par le backend (champs optionnels). */
export interface AnnexeItem {
  date?: string | null;
  reference?: string | null;
  type?: string | null;
  equipes?: string | null;
  statut_label?: string | null;
  priorite_label?: string | null;
}

export interface MonthlyAnnexesDeps {
  siteName: string;
  items: AnnexeItem[];
  /** Marges passées à autoTable (header/footer). */
  tableMargins: { top: number; bottom: number; left: number; right: number };
  /** Callback autoTable quand une nouvelle page est créée (peint le header). */
  didDrawPage: (data: unknown) => void;
}

/** Retour de jspdf-autotable après dessin — seul `finalY` nous intéresse. */
interface DocWithLastAutoTable {
  lastAutoTable?: { finalY: number };
}

/**
 * Section 10 — Annexes. Tableau détaillé du planning planifié pour le site.
 * Démarre toujours sur une nouvelle page (comportement historique). Retourne
 * `currentY` inchangé si `items` est vide (l'appelant ne devrait pas nous
 * appeler dans ce cas).
 */
export function drawMonthlyAnnexes(
  ctx: RenderContext,
  currentY: number,
  deps: MonthlyAnnexesDeps,
): number {
  if (deps.items.length === 0) return currentY;

  const { doc, pageWidth, margin } = ctx;
  let y = ctx.addContentPage();
  y = drawSectionTitle(ctx, y, 'ANNEXES', '10');

  y = ensureSpace(ctx, y, 15);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...REPORT_COLORS.dark);
  doc.text('Détail du planning — Travaux planifiés', margin, y);
  y += 10;

  // Bandeau site
  y = ensureSpace(ctx, y, 15);
  doc.setFillColor(50, 50, 50);
  doc.roundedRect(margin, y - 3, pageWidth - 2 * margin, 12, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(deps.siteName, margin + 5, y + 5);
  y += 12;

  const body = deps.items.map((item) => [
    item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-',
    item.reference || '-',
    item.type || '-',
    item.equipes || '-',
    item.statut_label || '-',
    item.priorite_label || '-',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Réf.', 'Type', 'Équipe(s)', 'Statut', 'Priorité']],
    body,
    theme: 'striped',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 20 },
      2: { cellWidth: 45 },
      3: { cellWidth: 45 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22 },
    },
    margin: deps.tableMargins,
    didDrawPage: deps.didDrawPage,
  });

  const afterTable = (doc as unknown as DocWithLastAutoTable).lastAutoTable?.finalY ?? y;
  return afterTable + 10;
}

export interface AnnexeSite {
  siteName: string;
  items: AnnexeItem[];
}

export interface MonthlyAnnexesMultiDeps {
  sites: AnnexeSite[];
  tableMargins: { top: number; bottom: number; left: number; right: number };
  didDrawPage: (data: unknown) => void;
}

/**
 * Variante multi-sites de la section 10 : un `autoTable` par site ayant du
 * planning. Sites sans planning sont ignorés silencieusement. Renvoie
 * `currentY` inchangé si aucun site n'a d'items (évite une page blanche).
 */
export function drawMonthlyAnnexesMulti(
  ctx: RenderContext,
  currentY: number,
  deps: MonthlyAnnexesMultiDeps,
): number {
  const nonEmpty = deps.sites.filter((s) => s.items.length > 0);
  if (nonEmpty.length === 0) return currentY;

  const { doc, pageWidth, margin } = ctx;
  let y = ctx.addContentPage();
  y = drawSectionTitle(ctx, y, 'ANNEXES', '10');

  y = ensureSpace(ctx, y, 12);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...REPORT_COLORS.dark);
  doc.text('Détail du planning — Travaux planifiés', margin, y);
  y += 10;

  for (const site of nonEmpty) {
    y = ensureSpace(ctx, y, 15);
    doc.setFillColor(50, 50, 50);
    doc.roundedRect(margin, y - 3, pageWidth - 2 * margin, 12, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(site.siteName, margin + 5, y + 5);
    y += 12;

    const body = site.items.map((item) => [
      item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-',
      item.reference || '-',
      item.type || '-',
      item.equipes || '-',
      item.statut_label || '-',
      item.priorite_label || '-',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Réf.', 'Type', 'Équipe(s)', 'Statut', 'Priorité']],
      body,
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 20 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 },
        4: { cellWidth: 22 },
        5: { cellWidth: 22 },
      },
      margin: deps.tableMargins,
      didDrawPage: deps.didDrawPage,
    });

    y = ((doc as unknown as DocWithLastAutoTable).lastAutoTable?.finalY ?? y) + 10;
  }

  return y;
}
