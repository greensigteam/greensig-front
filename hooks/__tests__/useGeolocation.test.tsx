import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGeolocation } from '../useGeolocation';

function mockGeolocation(impl: Partial<Geolocation>) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
      ...impl,
    },
  });
}

describe('useGeolocation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an initial idle state', () => {
    mockGeolocation({ getCurrentPosition: vi.fn() });
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.isGeolocating).toBe(false);
    expect(result.current.geolocationResult).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets error and calls onError when navigator.geolocation is missing', () => {
    const original = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(navigator),
      'geolocation',
    );
    try {
      Object.defineProperty(Object.getPrototypeOf(navigator), 'geolocation', {
        configurable: true,
        get: () => undefined,
      });
      // happy-dom's `navigator` still has the prototype getter → use a different path:
      // override the hook's global by stubbing navigator itself.
      vi.stubGlobal('navigator', {} as Navigator);

      const onError = vi.fn();
      const { result } = renderHook(() => useGeolocation({ onError }));
      act(() => result.current.requestGeolocation());
      expect(result.current.error?.code).toBe(0);
      expect(result.current.error?.message).toMatch(/pas supportée/i);
      expect(onError).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
      if (original) {
        Object.defineProperty(Object.getPrototypeOf(navigator), 'geolocation', original);
      }
    }
  });

  it('populates geolocationResult on successful position', () => {
    const onSuccess = vi.fn();
    const fakePosition = {
      coords: {
        latitude: 32.2,
        longitude: -7.9,
        accuracy: 5,
        altitude: 400,
        altitudeAccuracy: 2,
        heading: 90,
        speed: 1.4,
      },
      timestamp: 1_700_000_000_000,
    };
    mockGeolocation({
      getCurrentPosition: vi.fn((success: PositionCallback) => {
        success(fakePosition as unknown as GeolocationPosition);
      }),
    });
    const { result } = renderHook(() => useGeolocation({ onSuccess }));

    act(() => result.current.requestGeolocation());

    expect(result.current.isGeolocating).toBe(false);
    expect(result.current.geolocationResult?.coordinates).toEqual({ lat: 32.2, lng: -7.9 });
    expect(result.current.geolocationResult?.accuracy).toBe(5);
    expect(result.current.geolocationResult?.altitude).toBe(400);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('maps error codes to friendly messages', () => {
    const cases = [
      { code: 1, re: /refusé/i },
      { code: 2, re: /indisponible/i },
      { code: 3, re: /expiré/i },
      { code: 99, re: /Impossible/i },
    ];
    for (const { code, re } of cases) {
      mockGeolocation({
        getCurrentPosition: vi.fn((_s: PositionCallback, error?: PositionErrorCallback) => {
          error?.({ code, message: '' } as GeolocationPositionError);
        }),
      });
      const onError = vi.fn();
      const { result } = renderHook(() => useGeolocation({ onError }));
      act(() => result.current.requestGeolocation());
      expect(result.current.error?.message).toMatch(re);
      expect(onError).toHaveBeenCalled();
    }
  });

  it('clearGeolocation resets result and error', () => {
    const fakePosition = {
      coords: {
        latitude: 1,
        longitude: 2,
        accuracy: 1,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: 1,
    };
    mockGeolocation({
      getCurrentPosition: vi.fn((s: PositionCallback) =>
        s(fakePosition as unknown as GeolocationPosition),
      ),
    });
    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.requestGeolocation());
    expect(result.current.geolocationResult).not.toBeNull();

    act(() => result.current.clearGeolocation());
    expect(result.current.geolocationResult).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
