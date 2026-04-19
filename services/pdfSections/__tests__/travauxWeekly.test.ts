import { describe, expect, it, vi } from 'vitest';
import {
  drawWeeklyTravauxEffectues,
  drawWeeklyTravauxPlanifies,
  drawWeeklyTravauxEffectuesMulti,
  drawWeeklyTravauxPlanifiesMulti,
} from '../travaux';
import { createRecordedPdf } from '../../../tests/utils/jspdfRecorder';
import type { RenderContext } from '../renderContext';

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

describe('drawWeeklyTravauxEffectues / Planifies (mono)', () => {
  it('renders empty-state message when items is empty (effectues)', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawWeeklyTravauxEffectues(buildCtx(doc), 38, {
      items: [],
      tableMargins: TABLE_MARGINS,
      didDrawPage: vi.fn(),
    });
    expect({ finalY: y, trace }).toMatchSnapshot();
  });

  it('renders table rows (effectues)', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawWeeklyTravauxEffectues(buildCtx(doc), 38, {
      items: [
        { type: 'Tonte', count: 12 },
        { type: 'Élagage', count: 3 },
      ],
      tableMargins: TABLE_MARGINS,
      didDrawPage: vi.fn(),
    });
    expect(trace).toMatchSnapshot('weekly-travaux-effectues-mono');
    expect(y).toBeGreaterThan(38);
  });

  it('renders planifies subtitle + head', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawWeeklyTravauxPlanifies(buildCtx(doc), 38, {
      items: [{ type: 'Arrosage', count: 5 }],
      tableMargins: TABLE_MARGINS,
      didDrawPage: vi.fn(),
    });
    expect(trace).toMatchSnapshot('weekly-travaux-planifies-mono');
    expect(y).toBeGreaterThan(38);
  });
});

describe('drawWeeklyTravauxEffectues / Planifies (multi)', () => {
  it('renders one table per site, empty-state blocks when a site has no items', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawWeeklyTravauxEffectuesMulti(buildCtx(doc), 38, {
      sites: [
        { siteName: 'Site A', items: [{ type: 'Tonte', count: 4 }] },
        { siteName: 'Site B', items: [] },
        { siteName: 'Site C', items: [{ type: 'Élagage', count: 2 }] },
      ],
      tableMargins: TABLE_MARGINS,
      didDrawPage: vi.fn(),
    });
    expect(trace).toMatchSnapshot('weekly-travaux-effectues-multi');
    expect(y).toBeGreaterThan(38);
  });

  it('planifies multi uses the "Nombre prévu" header', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawWeeklyTravauxPlanifiesMulti(buildCtx(doc), 38, {
      sites: [{ siteName: 'Site X', items: [{ type: 'Arrosage', count: 7 }] }],
      tableMargins: TABLE_MARGINS,
      didDrawPage: vi.fn(),
    });
    expect(trace).toMatchSnapshot('weekly-travaux-planifies-multi');
    expect(y).toBeGreaterThan(38);
  });
});
