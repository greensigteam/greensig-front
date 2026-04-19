import type { jsPDF } from 'jspdf';
import { REPORT_COLORS } from './colors';

/**
 * Contexte de rendu partagé entre toutes les sections du rapport PDF.
 *
 * Les fonctions `draw*` des sections consomment ce contexte + un `y` courant
 * et retournent le nouveau `y`. Aucune section ne mute l'état — seul
 * l'appelant (MonthlyReport / WeeklyReport) tient le `y` courant.
 *
 * `addContentPage` est la seule callback à effet de bord : elle ajoute une
 * page via `doc.addPage()`, peint le header (logo + ligne), et retourne la
 * position Y de départ du contenu de cette nouvelle page.
 */
export interface RenderContext {
  doc: jsPDF;
  pageWidth: number;
  margin: number;
  contentEndY: number;
  addContentPage: () => number;
}

/**
 * Vérifie qu'il reste `requiredHeight` en bas de page. Si non, ajoute une
 * nouvelle page et retourne la nouvelle position Y de départ ; sinon
 * retourne `currentY` inchangé.
 */
export function ensureSpace(ctx: RenderContext, currentY: number, requiredHeight: number): number {
  if (currentY + requiredHeight > ctx.contentEndY) return ctx.addContentPage();
  return currentY;
}

/**
 * Dessine le titre numéroté d'une section ("1. AVANT-PROPOS") avec la barre
 * verticale primaire à gauche, et retourne le nouveau `y` (après le titre).
 * Restaure la fonte à 'helvetica' normal avant de rendre la main.
 */
export function drawSectionTitle(
  ctx: RenderContext,
  currentY: number,
  title: string,
  num: string,
): number {
  let y = ensureSpace(ctx, currentY, 20);
  const { doc, margin } = ctx;
  doc.setFillColor(...REPORT_COLORS.primary);
  doc.rect(margin, y - 5, 6, 12, 'F');
  doc.setFontSize(16);
  doc.setTextColor(...REPORT_COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(`${num}. ${title}`, margin + 10, y + 3);
  y += 15;
  doc.setFont('helvetica', 'normal');
  return y;
}
