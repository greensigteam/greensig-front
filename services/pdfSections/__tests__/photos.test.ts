import { describe, expect, it, vi } from 'vitest';
import { drawMonthlyPhotos, drawMonthlyPhotosMulti, loadPhotoGroupAssets } from '../photos';
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

describe('loadPhotoGroupAssets', () => {
  it('resolves avant + apres in parallel via the injected loader', async () => {
    const calls: string[] = [];
    const loader = vi.fn(async (url: string) => {
      calls.push(url);
      return `B64(${url})`;
    });
    const groups = [
      { tache_nom: 'Tonte', avant: [{ url: 'a1' }], apres: [{ url: 'p1' }] },
      { tache_nom: null, avant: [], apres: [{ url: 'p2' }] },
    ];
    const assets = await loadPhotoGroupAssets(groups, loader);
    expect(assets).toEqual([
      { taskName: 'Tonte', avantBase64: 'B64(a1)', apresBase64: 'B64(p1)' },
      { taskName: 'Intervention', avantBase64: null, apresBase64: 'B64(p2)' },
    ]);
    expect(loader).toHaveBeenCalledTimes(3);
  });

  it('returns an empty array when given no groups', async () => {
    const loader = vi.fn();
    expect(await loadPhotoGroupAssets([], loader as never)).toEqual([]);
    expect(loader).not.toHaveBeenCalled();
  });
});

describe('drawMonthlyPhotos — snapshot', () => {
  it('returns currentY unchanged when no assets', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawMonthlyPhotos(buildCtx(doc), 100, []);
    expect(y).toBe(100);
    expect(trace).toEqual([]);
  });

  it('renders both images present', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawMonthlyPhotos(buildCtx(doc), 38, [
      { taskName: 'Tonte gazon', avantBase64: 'AV_B64', apresBase64: 'AP_B64' },
    ]);
    expect({ finalY: y, trace }).toMatchSnapshot();
  });

  it('renders placeholders when images are missing', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawMonthlyPhotos(buildCtx(doc), 38, [
      { taskName: 'Élagage', avantBase64: null, apresBase64: null },
    ]);
    expect({ finalY: y, trace }).toMatchSnapshot();
  });

  it('paginates between two groups when the second does not fit', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const ctx: RenderContext = { ...buildCtx(doc), contentEndY: 150 };
    const y = drawMonthlyPhotos(ctx, 38, [
      { taskName: 'Groupe 1', avantBase64: 'AV1', apresBase64: 'AP1' },
      { taskName: 'Groupe 2', avantBase64: 'AV2', apresBase64: 'AP2' },
    ]);
    expect({ finalY: y, trace }).toMatchSnapshot();
  });
});

describe('drawMonthlyPhotosMulti — snapshot', () => {
  it('returns currentY unchanged when no site has photos', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawMonthlyPhotosMulti(buildCtx(doc), 100, [
      { siteName: 'Site A', groups: [] },
      { siteName: 'Site B', groups: [] },
    ]);
    expect(y).toBe(100);
    expect(trace).toEqual([]);
  });

  it('renders one banner per non-empty site, skipping empty ones', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawMonthlyPhotosMulti(buildCtx(doc), 38, [
      {
        siteName: 'Site A',
        groups: [{ taskName: 'Tonte', avantBase64: 'AV_A', apresBase64: 'AP_A' }],
      },
      // Site B sans photos — doit être silencieusement ignoré.
      { siteName: 'Site B', groups: [] },
      {
        siteName: 'Site C',
        groups: [{ taskName: 'Élagage', avantBase64: null, apresBase64: 'AP_C' }],
      },
    ]);
    expect({ finalY: y, trace }).toMatchSnapshot();
  });
});
