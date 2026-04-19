import { describe, expect, it } from 'vitest';
import { paintMonthlyContentChrome } from '../pageChrome';
import { createRecordedPdf } from '../../../tests/utils/jspdfRecorder';

/**
 * Snapshot du header/footer/numéro de page. `paintMonthlyContentChrome` boucle
 * sur les pages 2..N — on crée donc 3 pages (1 cover + 2 contenu) pour
 * vérifier que la pagination `Page 1/2`, `Page 2/2` est correcte et que la
 * couverture reste intacte.
 */

const CHROME_DEPS = {
  pageWidth: 210,
  pageHeight: 297,
  margin: 20,
  headerHeight: 18,
};

describe('paintMonthlyContentChrome — snapshot', () => {
  it('paints header + footer fallback + page numbers on content pages only', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    doc.addPage(); // page 2
    doc.addPage(); // page 3
    const baselineLen = trace.length;

    paintMonthlyContentChrome(doc, {
      ...CHROME_DEPS,
      logoBase64: 'LOGO_STUB',
      footerBase64: null,
    });

    // Les ops posées par le helper sont celles ajoutées après la baseline.
    const chromeOps = trace.slice(baselineLen);
    expect(chromeOps).toMatchSnapshot();
  });

  it('uses the footer image when provided', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    doc.addPage(); // page 2
    const baselineLen = trace.length;

    paintMonthlyContentChrome(doc, {
      ...CHROME_DEPS,
      logoBase64: 'LOGO_STUB',
      footerBase64: 'FOOTER_STUB',
    });

    const chromeOps = trace.slice(baselineLen);
    expect(chromeOps).toMatchSnapshot();
  });

  it('skips the logo when not provided (no-op on addImage)', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    doc.addPage();
    const baselineLen = trace.length;

    paintMonthlyContentChrome(doc, {
      ...CHROME_DEPS,
      logoBase64: null,
      footerBase64: null,
    });

    const chromeOps = trace.slice(baselineLen);
    // Aucune opération addImage ne doit apparaître.
    expect(chromeOps.filter((op) => op.op === 'addImage')).toEqual([]);
  });
});
