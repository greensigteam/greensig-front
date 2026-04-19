import type { RenderContext } from './renderContext';
import { drawSectionTitle, ensureSpace } from './renderContext';
import { REPORT_COLORS } from './colors';

const ACTIONS_INTRO =
  "Afin d'améliorer notre rendement, et éviter les éventuelles dérives de nos process, nous avons mis en place plusieurs actions notamment :";

const ACTIONS_LIST = [
  'Instaurer une réunion hebdomadaire chaque lundi en présence de tous les responsables des sites',
  'Standardiser les méthodes de travail pour tous les sites : explications théoriques et suivi sur le terrain : bordures du gazon, hauteur de taille, ...',
  'Augmenter la fréquence de nettoyage des ordures éventuelles à trois fois par jour',
  'Désinfecter systématiquement les outils de travail',
  "Nommer un caporal par site pour le suivi et l'exécution des travaux",
  'Programmer au minimum deux visites par jour du superviseur de tous les sites pour la planification des actions et le suivi des réalisations',
  'Recueillir le besoin de chaque site en outillage et en consommable et distribuer le matériel nécessaire selon les besoins (asperseurs, tuyaux, ...)',
  '\u00C9diter une matrice de polyvalence pour connaître le niveau de compétence des techniques et la maîtrise des outils de travail pour définir les affectations des jardiniers en fonction des spécificités de chaque site',
];

/**
 * Peint la section 2 "ACTIONS MISES EN PLACE" du rapport mensuel. Contenu
 * statique (puces), indépendant du site. Fonction pure — retourne le `y`
 * final avec +10 mm de gouttière.
 */
export function drawMonthlyActions(ctx: RenderContext, currentY: number): number {
  const { doc, pageWidth, margin } = ctx;
  let y = drawSectionTitle(ctx, currentY, 'ACTIONS MISES EN PLACE', '2');

  doc.setFontSize(10);
  doc.setTextColor(...REPORT_COLORS.dark);
  doc.setFont('helvetica', 'normal');

  const introLines = doc.splitTextToSize(ACTIONS_INTRO, pageWidth - 2 * margin);
  for (const line of introLines) {
    y = ensureSpace(ctx, y, 6);
    doc.text(line, margin, y);
    y += 5;
  }
  y += 5;

  for (const action of ACTIONS_LIST) {
    const bulletLines = doc.splitTextToSize(`\u2022  ${action}`, pageWidth - 2 * margin - 5);
    for (const line of bulletLines) {
      y = ensureSpace(ctx, y, 6);
      doc.text(line, margin + 5, y);
      y += 5;
    }
    y += 3;
  }
  y += 10;

  return y;
}
