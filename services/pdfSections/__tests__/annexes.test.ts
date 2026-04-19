import { describe, expect, it, vi } from 'vitest';
import { drawMonthlyAnnexes, drawMonthlyAnnexesMulti } from '../annexes';
import { createRecordedPdf } from '../../../tests/utils/jspdfRecorder';
import type { RenderContext } from '../renderContext';

/**
 * Snapshot de la section ANNEXES. Attention : les dates passées utilisent
 * `T12:00:00Z` (noon UTC) pour rester stables sur tous les fuseaux de CI.
 * `date-fns.format(date, 'dd/MM/yyyy')` ne change pas de jour à midi UTC
 * pour les TZ de -12 à +14.
 */

function buildCtx(doc: ReturnType<typeof createRecordedPdf>['doc']): RenderContext {
  return {
    doc,
    pageWidth: 210,
    margin: 20,
    contentEndY: 260,
    addContentPage: () => {
      doc.addPage();
      return 38;
    },
  };
}

const TABLE_MARGINS = { top: 38, bottom: 45, left: 20, right: 20 };

describe('drawMonthlyAnnexes', () => {
  it('returns currentY unchanged when no items', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const didDrawPage = vi.fn();
    const y = drawMonthlyAnnexes(buildCtx(doc), 100, {
      siteName: 'Test',
      items: [],
      tableMargins: TABLE_MARGINS,
      didDrawPage,
    });
    expect(y).toBe(100);
    expect(trace).toEqual([]);
    expect(didDrawPage).not.toHaveBeenCalled();
  });

  it('renders the table with formatted dates and fallbacks', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const didDrawPage = vi.fn();
    const y = drawMonthlyAnnexes(buildCtx(doc), 100, {
      siteName: 'Site UM6P Benguerir',
      items: [
        {
          date: '2026-04-15T12:00:00Z',
          reference: 'T-001',
          type: 'Tonte gazon',
          equipes: 'Équipe A',
          statut_label: 'Planifié',
          priorite_label: 'Haute',
        },
        {
          // Tous les champs manquants doivent tomber sur '-'.
          date: null,
          reference: null,
          type: null,
          equipes: null,
          statut_label: null,
          priorite_label: null,
        },
      ],
      tableMargins: TABLE_MARGINS,
      didDrawPage,
    });
    // autoTable ajoute de nombreux appels — on snapshot la trace entière.
    expect(trace).toMatchSnapshot('annexes-trace');
    // `finalY` dépend de la librairie autoTable ; on vérifie juste qu'il
    // est > 100 (i.e. le tableau a bien été dessiné).
    expect(y).toBeGreaterThan(100);
  });
});

describe('drawMonthlyAnnexesMulti', () => {
  it('returns currentY unchanged when no site has items', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const didDrawPage = vi.fn();
    const y = drawMonthlyAnnexesMulti(buildCtx(doc), 100, {
      sites: [
        { siteName: 'Site A', items: [] },
        { siteName: 'Site B', items: [] },
      ],
      tableMargins: TABLE_MARGINS,
      didDrawPage,
    });
    expect(y).toBe(100);
    expect(trace).toEqual([]);
    expect(didDrawPage).not.toHaveBeenCalled();
  });

  it('renders one table per site with planning, skipping empty ones', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const didDrawPage = vi.fn();
    const y = drawMonthlyAnnexesMulti(buildCtx(doc), 100, {
      sites: [
        {
          siteName: 'Site A',
          items: [
            {
              date: '2026-04-10T12:00:00Z',
              reference: 'A-001',
              type: 'Tonte',
              equipes: 'Équipe A',
              statut_label: 'Planifié',
              priorite_label: 'Normale',
            },
          ],
        },
        // Site B sans planning — doit être ignoré, pas de bandeau.
        { siteName: 'Site B', items: [] },
        {
          siteName: 'Site C',
          items: [
            {
              date: '2026-04-20T12:00:00Z',
              reference: null,
              type: 'Arrosage',
              equipes: null,
              statut_label: null,
              priorite_label: 'Haute',
            },
          ],
        },
      ],
      tableMargins: TABLE_MARGINS,
      didDrawPage,
    });
    expect(trace).toMatchSnapshot('annexes-multi-trace');
    expect(y).toBeGreaterThan(100);
  });
});
