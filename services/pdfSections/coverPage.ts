import type { jsPDF } from 'jspdf';
import type { MonthlyReportData } from '../../types/reports';
import { REPORT_COLORS } from './colors';

export interface MonthlyCoverPageDeps {
  /** Logo GreenSIG en base64, ou null si indisponible. */
  logoBase64: string | null;
  /** Logo ENJR en base64, ou null si indisponible. */
  logoEnjrBase64: string | null;
  /** Carte satellite avec polygone du site en base64, ou null. */
  mapBase64: string | null;
  /** Texte de période déjà formaté ("Du 01 avril 2026 au 30 avril 2026"). */
  formattedPeriode: string;
  /** Titre principal, par défaut "RAPPORT D'ACTIVITÉ". */
  title?: string;
  /** Sous-titre optionnel (ex. "Semaine 16 - 2026"). Décale le contenu vers le bas. */
  subtitle?: string;
}

/**
 * Peint la page de couverture du rapport mensuel mono-site sur `doc`.
 *
 * Fonction pure : aucun effet de bord (pas d'append page, pas de save, pas de
 * fetch). Les assets doivent être pré-chargés par l'appelant et passés dans
 * `deps`. Après l'appel, le curseur `y` n'est pas géré ici — l'appelant doit
 * appeler `doc.addPage()` pour passer à la page suivante.
 */
export function drawMonthlyCoverPage(
  doc: jsPDF,
  reportData: MonthlyReportData,
  deps: MonthlyCoverPageDeps,
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  const { logoBase64, logoEnjrBase64, mapBase64, formattedPeriode, title, subtitle } = deps;
  const { primary, dark, gray, lightGray } = REPORT_COLORS;

  // Fond blanc
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Logos en haut : GreenSIG à gauche, ENJR à droite
  if (logoBase64 && logoEnjrBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 15, 55, 28);
    doc.addImage(logoEnjrBase64, 'PNG', pageWidth - margin - 55, 15, 55, 28);
  } else if (logoBase64) {
    const logoW = 70;
    const logoH = 35;
    doc.addImage(logoBase64, 'PNG', (pageWidth - logoW) / 2, 15, logoW, logoH);
  }

  // Titre principal
  doc.setFontSize(28);
  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'bold');
  doc.text(title || "RAPPORT D'ACTIVITÉ", pageWidth / 2, 65, { align: 'center' });

  let nextY = 75;
  if (subtitle) {
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(subtitle, pageWidth / 2, 78, { align: 'center' });
    nextY = 88;
  }

  // Sous-titre
  doc.setFontSize(12);
  doc.setTextColor(...gray);
  doc.setFont('helvetica', 'normal');
  doc.text('Gestion des Espaces Verts', pageWidth / 2, nextY, { align: 'center' });

  // Nom du site (fond gris foncé)
  const siteBoxY = nextY + 10;
  doc.setFillColor(50, 50, 50);
  doc.roundedRect(30, siteBoxY, pageWidth - 60, 20, 3, 3, 'F');

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(reportData.site?.nom || 'Site', pageWidth / 2, siteBoxY + 14, { align: 'center' });

  // Carte du site (si disponible)
  const mapY = siteBoxY + 30;
  const mapWidth = pageWidth - 40;
  const mapHeight = 100;
  let coverContentY = siteBoxY + 27;

  if (mapBase64) {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(20 - 0.5, mapY - 0.5, mapWidth + 1, mapHeight + 1);

    doc.addImage(mapBase64, 'JPEG', 20, mapY, mapWidth, mapHeight);
    coverContentY = mapY + mapHeight + 5;
  }

  // Période
  const periodeBoxY = coverContentY + 5;
  doc.setFillColor(...lightGray);
  doc.roundedRect(35, periodeBoxY, pageWidth - 70, 16, 2, 2, 'F');

  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'normal');
  doc.text(formattedPeriode, pageWidth / 2, periodeBoxY + 11, { align: 'center' });

  // Informations du site — Coordonnées + Superficie
  let y = periodeBoxY + 25;
  doc.setFontSize(10);
  doc.setTextColor(...dark);

  const centroid = reportData.site?.centroid;
  if (centroid?.lat != null && centroid?.lng != null) {
    doc.setFont('helvetica', 'bold');
    doc.text('Coordonnées :', 35, y);
    doc.setFont('helvetica', 'normal');
    const latDir = centroid.lat >= 0 ? 'N' : 'S';
    const lngDir = centroid.lng >= 0 ? 'E' : 'W';
    const coordStr = `${latDir} ${Math.abs(centroid.lat).toFixed(4)}\u00B0  ${lngDir} ${Math.abs(centroid.lng).toFixed(4)}\u00B0`;
    doc.text(coordStr, 70, y);
    y += 7;
  }
  if (reportData.site?.superficie) {
    doc.setFont('helvetica', 'bold');
    doc.text('Superficie :', 35, y);
    doc.setFont('helvetica', 'normal');
    const superficieFormatted = reportData.site.superficie
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    doc.text(`${superficieFormatted} m\u00B2`, 70, y);
  }
}
