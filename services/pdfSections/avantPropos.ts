import type { RenderContext } from './renderContext';
import { drawSectionTitle, ensureSpace } from './renderContext';
import { REPORT_COLORS } from './colors';

export interface MonthlyAvantProposDeps {
  /**
   * Noms des sites affichés en puces au milieu du paragraphe d'intro.
   * Mono-site : passer `[nom]` (1 entrée). Multi-sites : passer la liste
   * complète. Les deux cas produisent le même flux : chaque puce occupe
   * 6 mm, puis 4 mm de gouttière.
   */
  siteNames: string[];
  /**
   * Libellé de période injecté dans la 3e ligne d'intro.
   * - Mensuel : `'ce mois'` (défaut)
   * - Hebdomadaire : `'cette semaine'`
   */
  periodLabel?: string;
}

function buildIntroLines(periodLabel: string): string[] {
  return [
    "Grâce à nos experts éprouvés, nos techniques bien conçues, et nos méthodes convenablement exécutées, la société ENJR a pour objectif principal la réussite de l'opération d'entretien et de jardinage et ce dans les règles de l'art.",
    '',
    `Ainsi, durant ${periodLabel}, nos équipes de jardiniers ont effectué les travaux d'entretien des espaces verts des sites suivants :`,
  ];
}

const OUTRO_LINES = [
  "L'encadrement d'ENJR met en \u0153uvre toutes les dispositions nécessaires pour une amélioration continue des conditions de travail de ce projet.",
  '',
  "Aussi, nous supervisons de près toutes les actions opérationnelles afin d'avoir un livrable à la hauteur des espérances de nos clients.",
  '',
  'Grâce à toutes ces actions, nous constatons, indéniablement un changement favorable et motivant au niveau de tous les sites.',
  '',
  "Dans ce qui suit, les photos prises illustrent l'avancement et les situations de chaque site.",
];

/**
 * Peint la section 1 "AVANT-PROPOS" du rapport mensuel mono-site.
 *
 * Fonction pure (pas d'I/O, pas de `doc.addPage` direct — la pagination
 * passe par `ctx.addContentPage`). Retourne le `y` final, curseur positionné
 * juste après le dernier paragraphe + 10 mm de gouttière.
 */
export function drawMonthlyAvantPropos(
  ctx: RenderContext,
  currentY: number,
  deps: MonthlyAvantProposDeps,
): number {
  const { doc, pageWidth, margin } = ctx;
  let y = drawSectionTitle(ctx, currentY, 'AVANT-PROPOS', '1');

  doc.setFontSize(10);
  doc.setTextColor(...REPORT_COLORS.dark);
  doc.setFont('helvetica', 'normal');

  const introLines = buildIntroLines(deps.periodLabel ?? 'ce mois');
  for (const text of introLines) {
    if (text === '') {
      y += 4;
    } else {
      const wrappedLines = doc.splitTextToSize(text, pageWidth - 2 * margin);
      for (const line of wrappedLines) {
        y = ensureSpace(ctx, y, 6);
        doc.text(line, margin, y);
        y += 5;
      }
      y += 2;
    }
  }

  // Liste des sites en puces
  y += 2;
  doc.setFont('helvetica', 'bold');
  for (const name of deps.siteNames) {
    y = ensureSpace(ctx, y, 8);
    doc.text(`\u2022  ${name}`, margin + 5, y);
    y += 6;
  }
  y += 4;
  doc.setFont('helvetica', 'normal');

  for (const text of OUTRO_LINES) {
    if (text === '') {
      y += 4;
    } else {
      const wrappedLines = doc.splitTextToSize(text, pageWidth - 2 * margin);
      for (const line of wrappedLines) {
        y = ensureSpace(ctx, y, 6);
        doc.text(line, margin, y);
        y += 5;
      }
      y += 2;
    }
  }
  y += 10;

  return y;
}
