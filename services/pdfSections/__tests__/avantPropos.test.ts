import { describe, expect, it } from 'vitest';
import { drawMonthlyAvantPropos } from '../avantPropos';
import { createRecordedPdf } from '../../../tests/utils/jspdfRecorder';
import type { RenderContext } from '../renderContext';

/**
 * Snapshot de la section "Avant-propos" du rapport mensuel. Contenu statique —
 * la trace ne doit varier qu'avec le nom du site injecté. On mocke
 * `addContentPage` pour capturer la pagination sans dépendre du header réel.
 */

function buildCtx(doc: ReturnType<typeof createRecordedPdf>['doc']): RenderContext {
  return {
    doc,
    pageWidth: 210,
    margin: 20,
    // contentEndY volontairement généreux pour éviter les sauts de page
    // accidentels sur un contenu de 1 page : la section tient largement.
    contentEndY: 260,
    addContentPage: () => {
      doc.addPage();
      return 38; // margin + headerHeight
    },
  };
}

describe('drawMonthlyAvantPropos — snapshot', () => {
  it('renders the static text with the given site name', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawMonthlyAvantPropos(buildCtx(doc), 38, {
      siteNames: ['Site Test UM6P Benguerir'],
    });
    expect({ finalY: y, trace }).toMatchSnapshot();
  });

  it('renders with a different site name (bullet line changes)', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawMonthlyAvantPropos(buildCtx(doc), 38, { siteNames: ['Campus Rabat'] });
    expect({ finalY: y, trace }).toMatchSnapshot();
  });

  it('renders multiple site names in sequence (multi-site flow)', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawMonthlyAvantPropos(buildCtx(doc), 38, {
      siteNames: ['Site A', 'Site B', 'Site C'],
    });
    expect({ finalY: y, trace }).toMatchSnapshot();
  });
});
