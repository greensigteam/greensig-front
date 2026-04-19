import { describe, expect, it } from 'vitest';
import { drawMonthlyActions } from '../actions';
import { createRecordedPdf } from '../../../tests/utils/jspdfRecorder';
import type { RenderContext } from '../renderContext';

/**
 * Snapshot de la section "Actions mises en place" — texte 100 % statique.
 * Le seul degré de liberté est le `y` de départ. On pose deux cas : début
 * de page et position basse qui force une nouvelle page.
 */

function buildCtx(
  doc: ReturnType<typeof createRecordedPdf>['doc'],
  contentEndY: number,
): RenderContext {
  return {
    doc,
    pageWidth: 210,
    margin: 20,
    contentEndY,
    addContentPage: () => {
      doc.addPage();
      return 38; // margin + headerHeight
    },
  };
}

describe('drawMonthlyActions — snapshot', () => {
  it('renders the full bullet list on a single page', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawMonthlyActions(buildCtx(doc, 260), 38);
    expect({ finalY: y, trace }).toMatchSnapshot();
  });

  it('paginates when the content does not fit on the current page', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    // Force a page break by starting close to contentEndY.
    const y = drawMonthlyActions(buildCtx(doc, 120), 100);
    expect({ finalY: y, trace }).toMatchSnapshot();
  });
});
