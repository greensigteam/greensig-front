import { describe, expect, it } from 'vitest';
import { drawWeeklyPhotos, drawWeeklyPhotosMulti } from '../photos';
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

const FAKE_AVANT = 'data:image/jpeg;base64,AAA';
const FAKE_APRES = 'data:image/jpeg;base64,BBB';

describe('drawWeeklyPhotos (mono)', () => {
  it('returns currentY untouched when no assets', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawWeeklyPhotos(buildCtx(doc), 100, []);
    expect(y).toBe(100);
    expect(trace).toHaveLength(0);
  });

  it('renders up to maxGroups=6 + overflow hint', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const assets = Array.from({ length: 8 }, (_, i) => ({
      taskName: `Tâche ${i + 1}`,
      avantBase64: FAKE_AVANT,
      apresBase64: FAKE_APRES,
    }));
    const y = drawWeeklyPhotos(buildCtx(doc), 38, assets);
    expect(trace).toMatchSnapshot('weekly-photos-overflow');
    expect(y).toBeGreaterThan(38);
  });

  it('renders placeholders when images are missing', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawWeeklyPhotos(buildCtx(doc), 38, [
      { taskName: 'Intervention', avantBase64: null, apresBase64: null },
    ]);
    expect({ finalY: y, trace }).toMatchSnapshot('weekly-photos-placeholder');
  });
});

describe('drawWeeklyPhotosMulti', () => {
  it('returns currentY when all sites are empty', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawWeeklyPhotosMulti(buildCtx(doc), 100, [
      { siteName: 'A', groups: [] },
      { siteName: 'B', groups: [] },
    ]);
    expect(y).toBe(100);
    expect(trace).toHaveLength(0);
  });

  it('caps each site to maxGroups=4 with overflow hint and skips empty sites', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const buildAssets = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        taskName: `Task ${i + 1}`,
        avantBase64: FAKE_AVANT,
        apresBase64: FAKE_APRES,
      }));
    const y = drawWeeklyPhotosMulti(buildCtx(doc), 38, [
      { siteName: 'Site A', groups: buildAssets(6) },
      { siteName: 'Site B', groups: [] },
      { siteName: 'Site C', groups: buildAssets(2) },
    ]);
    expect(trace).toMatchSnapshot('weekly-photos-multi-overflow');
    expect(y).toBeGreaterThan(38);
  });
});
