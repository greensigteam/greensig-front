import type { RenderContext } from './renderContext';
import { drawSectionTitle, ensureSpace } from './renderContext';
import { REPORT_COLORS } from './colors';

/** Payload API des groupes de photos avant/après. */
export interface PhotoGroupInput {
  tache_nom?: string | null;
  avant?: Array<{ url?: string | null }> | null;
  apres?: Array<{ url?: string | null }> | null;
}

/** Assets déjà téléchargés pour un groupe — produit par `loadPhotoGroupAssets`. */
export interface PhotoGroupAssets {
  taskName: string;
  avantBase64: string | null;
  apresBase64: string | null;
}

/**
 * Pré-charge le base64 de la première photo avant/après de chaque groupe via
 * le loader injecté (`loadImageAsBase64`). Signature du loader compatible avec
 * `services/pdfGenerator.ts:loadImageAsBase64`.
 *
 * Async isolé : le rendu (`drawMonthlyPhotos`) reste pur.
 */
export async function loadPhotoGroupAssets(
  groups: PhotoGroupInput[],
  loadImage: (url: string) => Promise<string | null>,
): Promise<PhotoGroupAssets[]> {
  const assets: PhotoGroupAssets[] = [];
  for (const group of groups) {
    const avantUrl = group.avant?.[0]?.url ?? null;
    const apresUrl = group.apres?.[0]?.url ?? null;
    const [avantBase64, apresBase64] = await Promise.all([
      avantUrl ? loadImage(avantUrl) : Promise.resolve(null),
      apresUrl ? loadImage(apresUrl) : Promise.resolve(null),
    ]);
    assets.push({
      taskName: group.tache_nom || 'Intervention',
      avantBase64,
      apresBase64,
    });
  }
  return assets;
}

const IMG_WIDTH = 75;
const IMG_HEIGHT = 55;
const IMG_GAP = 10;

function drawPlaceholder(ctx: RenderContext, x: number, y: number): void {
  const { doc } = ctx;
  doc.setFillColor(...REPORT_COLORS.lightGray);
  doc.roundedRect(x, y, IMG_WIDTH, IMG_HEIGHT, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Image non disponible', x + IMG_WIDTH / 2, y + IMG_HEIGHT / 2, { align: 'center' });
}

/**
 * Section 6 — Photos avant/après. Contrairement aux autres sections, cette
 * section commence **toujours sur une nouvelle page** (comportement historique).
 * Retourne le `y` final ; si `assets` est vide, retourne `currentY` sans
 * rien dessiner (l'appelant n'aurait pas dû nous appeler).
 */
export function drawMonthlyPhotos(
  ctx: RenderContext,
  _currentY: number,
  assets: PhotoGroupAssets[],
): number {
  if (assets.length === 0) return _currentY;

  const { doc, margin } = ctx;
  let y = ctx.addContentPage();
  y = drawSectionTitle(ctx, y, 'PHOTOS AVANT/APRÈS', '6');

  for (const group of assets) {
    y = ensureSpace(ctx, y, 85);

    // Titre de la tâche
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...REPORT_COLORS.dark);
    doc.text(group.taskName, margin, y);
    y += 6;

    // Labels AVANT / APRÈS
    doc.setFontSize(9);
    doc.setTextColor(...REPORT_COLORS.gray);
    doc.setFont('helvetica', 'normal');
    doc.text('AVANT', margin + IMG_WIDTH / 2, y, { align: 'center' });
    doc.text('APRÈS', margin + IMG_WIDTH + IMG_GAP + IMG_WIDTH / 2, y, { align: 'center' });
    y += 4;

    // Image avant
    if (group.avantBase64) {
      doc.addImage(group.avantBase64, 'JPEG', margin, y, IMG_WIDTH, IMG_HEIGHT);
    } else {
      drawPlaceholder(ctx, margin, y);
    }

    // Image après
    const xApres = margin + IMG_WIDTH + IMG_GAP;
    if (group.apresBase64) {
      doc.addImage(group.apresBase64, 'JPEG', xApres, y, IMG_WIDTH, IMG_HEIGHT);
    } else {
      drawPlaceholder(ctx, xApres, y);
    }

    y += IMG_HEIGHT + 12;
  }

  return y;
}

/** Un site avec ses groupes de photos pré-chargés. */
export interface PhotoSiteAssets {
  siteName: string;
  groups: PhotoGroupAssets[];
}

/**
 * Section 6 multi-sites. Un bandeau gris foncé par site (comme Sections 4/5
 * multi), puis les groupes du site. Les sites sans photos sont ignorés
 * silencieusement (contrairement à travaux multi). Commence toujours par une
 * nouvelle page. Ne dessine rien et retourne `_currentY` si aucun site n'a
 * de photos (l'appelant gère déjà le test `hasAnyPhotos`).
 *
 * Subtilité dimensionnelle : le multi-sites hérite de tailles de police
 * légèrement différentes du mono (10/8 au lieu de 11/9, gouttière 10 au lieu
 * de 12) — on préserve ce comportement pour ne pas casser les rapports en
 * cours de production.
 */
export function drawMonthlyPhotosMulti(
  ctx: RenderContext,
  _currentY: number,
  sites: PhotoSiteAssets[],
): number {
  const nonEmpty = sites.filter((s) => s.groups.length > 0);
  if (nonEmpty.length === 0) return _currentY;

  const { doc, pageWidth, margin } = ctx;
  let y = ctx.addContentPage();
  y = drawSectionTitle(ctx, y, 'PHOTOS AVANT/APRÈS', '6');

  for (const site of nonEmpty) {
    // Bandeau site
    y = ensureSpace(ctx, y, 15);
    doc.setFillColor(50, 50, 50);
    doc.roundedRect(margin, y - 3, pageWidth - 2 * margin, 12, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(site.siteName, margin + 5, y + 5);
    y += 15;

    for (const group of site.groups) {
      y = ensureSpace(ctx, y, 85);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...REPORT_COLORS.dark);
      doc.text(group.taskName, margin, y);
      y += 6;

      doc.setFontSize(8);
      doc.setTextColor(...REPORT_COLORS.gray);
      doc.setFont('helvetica', 'normal');
      doc.text('AVANT', margin + IMG_WIDTH / 2, y, { align: 'center' });
      doc.text('APRÈS', margin + IMG_WIDTH + IMG_GAP + IMG_WIDTH / 2, y, {
        align: 'center',
      });
      y += 4;

      if (group.avantBase64) {
        doc.addImage(group.avantBase64, 'JPEG', margin, y, IMG_WIDTH, IMG_HEIGHT);
      } else {
        drawPlaceholder(ctx, margin, y);
      }

      const xApres = margin + IMG_WIDTH + IMG_GAP;
      if (group.apresBase64) {
        doc.addImage(group.apresBase64, 'JPEG', xApres, y, IMG_WIDTH, IMG_HEIGHT);
      } else {
        drawPlaceholder(ctx, xApres, y);
      }

      y += IMG_HEIGHT + 10;
    }
  }

  return y;
}

// ===== Variantes hebdomadaires =====

/**
 * Section 6 — Photos hebdomadaire mono-site. Même layout que mono mensuel
 * (font 11/9, gouttière 12) mais :
 *  - limitée aux `maxGroups` premiers groupes (défaut 6)
 *  - overflow "+ N autre(s) groupe(s) de photos" à la fin si `assets` dépasse.
 * Commence toujours par une nouvelle page.
 */
export function drawWeeklyPhotos(
  ctx: RenderContext,
  _currentY: number,
  assets: PhotoGroupAssets[],
  maxGroups = 6,
): number {
  if (assets.length === 0) return _currentY;

  const { doc, margin } = ctx;
  let y = ctx.addContentPage();
  y = drawSectionTitle(ctx, y, 'PHOTOS AVANT/APRÈS', '6');
  y += 10; // blank line after title (legacy behaviour)

  const visible = assets.slice(0, maxGroups);
  for (const group of visible) {
    y = ensureSpace(ctx, y, 85);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...REPORT_COLORS.dark);
    doc.text(group.taskName, margin, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(...REPORT_COLORS.gray);
    doc.setFont('helvetica', 'normal');
    doc.text('AVANT', margin + IMG_WIDTH / 2, y, { align: 'center' });
    doc.text('APRÈS', margin + IMG_WIDTH + IMG_GAP + IMG_WIDTH / 2, y, { align: 'center' });
    y += 4;

    if (group.avantBase64) {
      doc.addImage(group.avantBase64, 'JPEG', margin, y, IMG_WIDTH, IMG_HEIGHT);
    } else {
      drawPlaceholder(ctx, margin, y);
    }
    const xApres = margin + IMG_WIDTH + IMG_GAP;
    if (group.apresBase64) {
      doc.addImage(group.apresBase64, 'JPEG', xApres, y, IMG_WIDTH, IMG_HEIGHT);
    } else {
      drawPlaceholder(ctx, xApres, y);
    }

    y += IMG_HEIGHT + 12;
  }

  if (assets.length > maxGroups) {
    doc.setFontSize(9);
    doc.setTextColor(...REPORT_COLORS.gray);
    doc.text(`+ ${assets.length - maxGroups} autre(s) groupe(s) de photos`, margin, y);
  }

  return y;
}

/**
 * Section 6 multi-sites hebdomadaire. Fonts 10/8, gouttière 10 (mêmes dims
 * que la variante mensuelle multi), mais chaque site est limité à `maxGroups`
 * premiers groupes avec un message overflow à la fin.
 */
export function drawWeeklyPhotosMulti(
  ctx: RenderContext,
  _currentY: number,
  sites: PhotoSiteAssets[],
  maxGroups = 4,
): number {
  const nonEmpty = sites.filter((s) => s.groups.length > 0);
  if (nonEmpty.length === 0) return _currentY;

  const { doc, pageWidth, margin } = ctx;
  let y = ctx.addContentPage();
  y = drawSectionTitle(ctx, y, 'PHOTOS AVANT/APRÈS', '6');

  for (const site of nonEmpty) {
    y = ensureSpace(ctx, y, 15);
    doc.setFillColor(50, 50, 50);
    doc.roundedRect(margin, y - 3, pageWidth - 2 * margin, 12, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(site.siteName, margin + 5, y + 5);
    y += 15;

    const visible = site.groups.slice(0, maxGroups);
    for (const group of visible) {
      y = ensureSpace(ctx, y, 85);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...REPORT_COLORS.dark);
      doc.text(group.taskName, margin, y);
      y += 6;

      doc.setFontSize(8);
      doc.setTextColor(...REPORT_COLORS.gray);
      doc.setFont('helvetica', 'normal');
      doc.text('AVANT', margin + IMG_WIDTH / 2, y, { align: 'center' });
      doc.text('APRÈS', margin + IMG_WIDTH + IMG_GAP + IMG_WIDTH / 2, y, {
        align: 'center',
      });
      y += 4;

      if (group.avantBase64) {
        doc.addImage(group.avantBase64, 'JPEG', margin, y, IMG_WIDTH, IMG_HEIGHT);
      } else {
        drawPlaceholder(ctx, margin, y);
      }
      const xApres = margin + IMG_WIDTH + IMG_GAP;
      if (group.apresBase64) {
        doc.addImage(group.apresBase64, 'JPEG', xApres, y, IMG_WIDTH, IMG_HEIGHT);
      } else {
        drawPlaceholder(ctx, xApres, y);
      }

      y += IMG_HEIGHT + 10;
    }

    if (site.groups.length > maxGroups) {
      doc.setFontSize(9);
      doc.setTextColor(...REPORT_COLORS.gray);
      doc.text(`+ ${site.groups.length - maxGroups} autre(s) groupe(s) de photos`, margin, y);
      y += 8;
    }
  }

  return y;
}
