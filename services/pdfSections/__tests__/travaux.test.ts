import { describe, expect, it } from 'vitest';
import {
  drawMonthlyTravauxEffectues,
  drawMonthlyTravauxEffectuesMulti,
  drawMonthlyTravauxPlanifies,
  drawMonthlyTravauxPlanifiesMulti,
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

const SITE = 'Site Test UM6P Benguerir';

describe('drawMonthlyTravauxEffectues — snapshot', () => {
  it('renders the empty-state message when no items', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawMonthlyTravauxEffectues(buildCtx(doc), 38, { siteName: SITE, items: [] });
    expect({ finalY: y, trace }).toMatchSnapshot();
  });

  it('renders the site banner + deduplicated task types', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawMonthlyTravauxEffectues(buildCtx(doc), 38, {
      siteName: SITE,
      items: [
        { type: 'Tonte gazon' },
        { type: 'Élagage arbres' },
        { type: 'Tonte gazon' }, // doublon — doit être dédupliqué
        { type: null }, // filtré
        { type: 'Désherbage' },
      ],
    });
    expect({ finalY: y, trace }).toMatchSnapshot();
  });
});

describe('drawMonthlyTravauxPlanifies — snapshot', () => {
  it('renders the empty-state message when no items', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawMonthlyTravauxPlanifies(buildCtx(doc), 38, { siteName: SITE, items: [] });
    expect({ finalY: y, trace }).toMatchSnapshot();
  });

  it('renders the site banner + deduplicated task types', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawMonthlyTravauxPlanifies(buildCtx(doc), 38, {
      siteName: SITE,
      items: [{ type: 'Arrosage' }, { type: 'Taille haies' }, { type: 'Arrosage' }],
    });
    expect({ finalY: y, trace }).toMatchSnapshot();
  });
});

describe('drawMonthlyTravauxEffectuesMulti — snapshot', () => {
  it('renders one banner per site, including empty ones', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawMonthlyTravauxEffectuesMulti(buildCtx(doc), 38, {
      sites: [
        {
          siteName: 'Site A',
          items: [{ type: 'Tonte gazon' }, { type: 'Tonte gazon' }, { type: 'Élagage' }],
        },
        // Site sans items — doit quand même afficher le bandeau + message.
        { siteName: 'Site B', items: [] },
        {
          siteName: 'Site C',
          items: [{ type: 'Désherbage' }, { type: null }, { type: 'Désherbage' }],
        },
      ],
    });
    expect({ finalY: y, trace }).toMatchSnapshot();
  });
});

describe('drawMonthlyTravauxPlanifiesMulti — snapshot', () => {
  it('renders one banner per site, including empty ones', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawMonthlyTravauxPlanifiesMulti(buildCtx(doc), 38, {
      sites: [
        { siteName: 'Site A', items: [{ type: 'Arrosage' }, { type: 'Taille haies' }] },
        { siteName: 'Site B', items: [] },
      ],
    });
    expect({ finalY: y, trace }).toMatchSnapshot();
  });
});
