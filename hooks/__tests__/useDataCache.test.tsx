import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CACHE_KEYS,
  clearAllCache,
  invalidateCacheByPrefix,
  prefetchCache,
  useCachedFetch,
} from '../useDataCache';

beforeEach(() => clearAllCache());
afterEach(() => clearAllCache());

describe('useCachedFetch — initial fetch', () => {
  it('starts loading then populates data from the fetchFn', async () => {
    const fetchFn = vi.fn().mockResolvedValue(['a', 'b']);
    const { result } = renderHook(() => useCachedFetch('k1', fetchFn));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(['a', 'b']);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('captures thrown errors and exposes them via the error field', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useCachedFetch('k-err', fetchFn));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.data).toBeNull();
  });

  it('skips fetch when immediate=false', async () => {
    const fetchFn = vi.fn().mockResolvedValue('x');
    const { result } = renderHook(() => useCachedFetch('k2', fetchFn, { immediate: false }));

    // Give React a tick
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });
});

describe('useCachedFetch — cache reuse', () => {
  it('second hook with same key returns cached data without refetch', async () => {
    const fetchFn = vi.fn().mockResolvedValue('fresh');
    const first = renderHook(() => useCachedFetch('shared', fetchFn));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(first.result.current.data).toBe('fresh');

    const second = renderHook(() => useCachedFetch('shared', fetchFn));
    // Second hook should pick data straight from cache synchronously
    expect(second.result.current.data).toBe('fresh');
    expect(second.result.current.loading).toBe(false);

    // fetchFn was called only once (by the first hook's mount effect)
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('refetch() bypasses cache and re-invokes fetchFn', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');
    const { result } = renderHook(() => useCachedFetch('k3', fetchFn));
    await waitFor(() => expect(result.current.data).toBe('v1'));

    await act(async () => {
      await result.current.refetch();
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result.current.data).toBe('v2');
  });

  it('returns stale cache on error if prior data exists', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce('cached')
      .mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useCachedFetch('k-stale', fetchFn));
    await waitFor(() => expect(result.current.data).toBe('cached'));

    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.data).toBe('cached');
    expect(result.current.error?.message).toBe('offline');
  });
});

describe('useCachedFetch — setData', () => {
  it('sets data directly and updates the shared cache', async () => {
    const fetchFn = vi.fn().mockResolvedValue('initial');
    const { result } = renderHook(() => useCachedFetch<string>('k-setdata', fetchFn));
    await waitFor(() => expect(result.current.data).toBe('initial'));

    act(() => result.current.setData('patched'));
    expect(result.current.data).toBe('patched');

    // A new hook with the same key should read the patched value from cache
    const { result: result2 } = renderHook(() => useCachedFetch<string>('k-setdata', fetchFn));
    expect(result2.current.data).toBe('patched');
  });

  it('setData accepts an updater function', async () => {
    const fetchFn = vi.fn().mockResolvedValue(1);
    const { result } = renderHook(() => useCachedFetch<number>('k-upd', fetchFn));
    await waitFor(() => expect(result.current.data).toBe(1));

    act(() => result.current.setData((prev) => (prev ?? 0) + 10));
    expect(result.current.data).toBe(11);
  });
});

describe('invalidate / invalidateCacheByPrefix / clearAllCache', () => {
  it('invalidate() drops only the matching key', async () => {
    const fetchFn = vi.fn().mockResolvedValue('v');
    const { result } = renderHook(() => useCachedFetch('k-inv', fetchFn));
    await waitFor(() => expect(result.current.data).toBe('v'));

    act(() => result.current.invalidate());

    // Fresh hook should refetch rather than serve stale
    const fetchFn2 = vi.fn().mockResolvedValue('v2');
    const { result: r2 } = renderHook(() => useCachedFetch('k-inv', fetchFn2));
    await waitFor(() => expect(r2.current.data).toBe('v2'));
    expect(fetchFn2).toHaveBeenCalledTimes(1);
  });

  it('invalidateCacheByPrefix drops only keys starting with the prefix', async () => {
    await prefetchCache('users:1', () => Promise.resolve('u1'));
    await prefetchCache('users:2', () => Promise.resolve('u2'));
    await prefetchCache('other:1', () => Promise.resolve('o1'));

    invalidateCacheByPrefix('users:');

    const fetchOther = vi.fn().mockResolvedValue('other-fresh');
    const { result: other } = renderHook(() => useCachedFetch('other:1', fetchOther));
    // Other is still cached → no fetch
    expect(other.current.data).toBe('o1');
    expect(fetchOther).not.toHaveBeenCalled();

    const fetchUsers = vi.fn().mockResolvedValue('u1-fresh');
    const { result: users } = renderHook(() => useCachedFetch('users:1', fetchUsers));
    await waitFor(() => expect(users.current.data).toBe('u1-fresh'));
    expect(fetchUsers).toHaveBeenCalledTimes(1);
  });

  it('clearAllCache wipes every entry', async () => {
    await prefetchCache('a', () => Promise.resolve('A'));
    await prefetchCache('b', () => Promise.resolve('B'));
    clearAllCache();

    const fetchA = vi.fn().mockResolvedValue('A-new');
    const { result } = renderHook(() => useCachedFetch('a', fetchA));
    await waitFor(() => expect(result.current.data).toBe('A-new'));
    expect(fetchA).toHaveBeenCalledTimes(1);
  });
});

describe('prefetchCache', () => {
  it('populates cache so that subsequent hooks skip their fetch', async () => {
    await prefetchCache('k-pref', () => Promise.resolve(42));

    const fetchFn = vi.fn();
    const { result } = renderHook(() => useCachedFetch('k-pref', fetchFn));
    expect(result.current.data).toBe(42);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('silently swallows errors so it never throws', async () => {
    await expect(
      prefetchCache('k-fail', () => Promise.reject(new Error('nope'))),
    ).resolves.toBeUndefined();
  });
});

describe('CACHE_KEYS', () => {
  it('exposes stable string keys', () => {
    expect(CACHE_KEYS.EQUIPES).toBe('equipes');
    expect(CACHE_KEYS.SITES).toBe('sites');
    expect(CACHE_KEYS.CLIENTS).toBe('clients');
    expect(CACHE_KEYS.TYPES_TACHES).toBe('types-taches');
    expect(CACHE_KEYS.COMPETENCES).toBe('competences');
    expect(CACHE_KEYS.SUPERVISEURS).toBe('operateurs');
  });
});
