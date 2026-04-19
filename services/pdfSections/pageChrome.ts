import type jsPDF from 'jspdf';

export interface PageChromeDeps {
  logoBase64: string | null;
  footerBase64: string | null;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  headerHeight: number;
}

/**
 * Peint header + footer + numéro de page sur chaque page de contenu (la page 1
 * de couverture est exclue). Appelé une seule fois à la fin de la génération —
 * après que toutes les sections ont été dessinées, pour connaître le nombre
 * total de pages.
 *
 * Extrait de `handleDownloadPDF` et `handleDownloadMultiPDF` qui avaient la
 * même boucle byte-for-byte. Les 2 contextes n'ont aucune différence, d'où
 * un seul helper.
 */
export function paintMonthlyContentChrome(doc: jsPDF, deps: PageChromeDeps): void {
  const { logoBase64, footerBase64, pageWidth, pageHeight, margin, headerHeight } = deps;
  const totalPages = doc.getNumberOfPages();
  const contentPages = totalPages - 1; // Exclure la page de couverture
  const lightGray: [number, number, number] = [243, 244, 246];

  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);

    // Header (logo + ligne de séparation)
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', margin, 5, 25, 10);
    }
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.3);
    doc.line(margin, headerHeight, pageWidth - margin, headerHeight);

    // Footer — image si dispo, sinon texte ENJR
    if (footerBase64) {
      const footerImgW = pageWidth - 2 * margin;
      const footerImgH = 12;
      doc.addImage(footerBase64, 'JPEG', margin, pageHeight - 22, footerImgW, footerImgH);
    } else {
      doc.setDrawColor(...lightGray);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 22, pageWidth - margin, pageHeight - 22);
      doc.setFontSize(5.5);
      doc.setTextColor(120, 120, 120);
      doc.setFont('helvetica', 'bold');
      doc.text(
        'EXPERT NETTOYAGE & JARDINAGE RHAMNA SARL au capital social : 100 000,00DH',
        pageWidth / 2,
        pageHeight - 18,
        { align: 'center' },
      );
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Si\u00E8ge social : Hay Massira N\u00B0 22 BENGUERIR - Email : enjr.contact@gmail.com  IF : 51685065  ICE : 002948885000033  Patente : 45404667  RC : 3051',
        pageWidth / 2,
        pageHeight - 14,
        { align: 'center' },
      );
    }

    // Numéro de page
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${i - 1} / ${contentPages}`, pageWidth - margin, pageHeight - 6, {
      align: 'right',
    });
  }
}
