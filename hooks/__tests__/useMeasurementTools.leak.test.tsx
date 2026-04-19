import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useMeasurementTools } from '../useMeasurementTools';

/**
 * Sprint 6 — régression de fuite : le listener `mouseout` du viewport était
 * ajouté mais jamais retiré (handler anonyme). Chaque toggle `isMeasuring`
 * en empilait un de plus. Ce test vérifie la symétrie add/remove.
 */

interface FakeMap {
  on: ReturnType<typeof vi.fn>;
  un: ReturnType<typeof vi.fn>;
  addInteraction: ReturnType<typeof vi.fn>;
  removeInteraction: ReturnType<typeof vi.fn>;
  addOverlay: ReturnType<typeof vi.fn>;
  removeOverlay: ReturnType<typeof vi.fn>;
  getViewport: () => HTMLElement;
}

function makeFakeMap(): FakeMap {
  const viewport = document.createElement('div');
  return {
    on: vi.fn(),
    un: vi.fn(),
    addInteraction: vi.fn(),
    removeInteraction: vi.fn(),
    addOverlay: vi.fn(),
    removeOverlay: vi.fn(),
    getViewport: () => viewport,
  };
}

describe('useMeasurementTools — viewport listener leak', () => {
  let fakeMap: FakeMap;
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fakeMap = makeFakeMap();
    const viewport = fakeMap.getViewport();
    addSpy = vi.spyOn(viewport, 'addEventListener');
    removeSpy = vi.spyOn(viewport, 'removeEventListener');
  });

  function setup(isMeasuring: boolean) {
    return renderHook(
      ({ measuring }: { measuring: boolean }) => {
        const mapRef = useRef(fakeMap as unknown as import('ol').Map);
        return useMeasurementTools({
          mapInstance: mapRef,
          isMeasuring: measuring,
          measurementType: 'distance',
        });
      },
      { initialProps: { measuring: isMeasuring } },
    );
  }

  it('removes the mouseout listener it adds when isMeasuring toggles off', () => {
    const { rerender } = setup(true);

    const mouseoutAdds = addSpy.mock.calls.filter((c) => c[0] === 'mouseout').length;
    expect(mouseoutAdds).toBe(1);

    rerender({ measuring: false });

    const mouseoutRemoves = removeSpy.mock.calls.filter((c) => c[0] === 'mouseout').length;
    expect(mouseoutRemoves).toBe(1);
  });

  it('does not stack mouseout listeners across multiple toggles', () => {
    const { rerender } = setup(true);
    rerender({ measuring: false });
    rerender({ measuring: true });
    rerender({ measuring: false });
    rerender({ measuring: true });
    rerender({ measuring: false });

    const adds = addSpy.mock.calls.filter((c) => c[0] === 'mouseout').length;
    const removes = removeSpy.mock.calls.filter((c) => c[0] === 'mouseout').length;
    expect(adds).toBe(removes);
  });

  it('removes the mouseout listener on unmount', () => {
    const { unmount } = setup(true);

    const addsBefore = addSpy.mock.calls.filter((c) => c[0] === 'mouseout').length;
    expect(addsBefore).toBe(1);

    unmount();

    const removes = removeSpy.mock.calls.filter((c) => c[0] === 'mouseout').length;
    expect(removes).toBe(1);
  });
});
