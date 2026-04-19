import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the initial value synchronously', () => {
    const { result } = renderHook(() => useDebounce('initial', 200));
    expect(result.current).toBe('initial');
  });

  it('delays propagation of new values by the given delay', () => {
    const { result, rerender } = renderHook(
      ({ v, d }: { v: string; d: number }) => useDebounce(v, d),
      { initialProps: { v: 'a', d: 200 } },
    );

    rerender({ v: 'b', d: 200 });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });

  it('cancels the pending timeout when the value changes again quickly', () => {
    const { result, rerender } = renderHook(({ v }: { v: string }) => useDebounce(v, 100), {
      initialProps: { v: 'a' },
    });

    rerender({ v: 'b' });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    rerender({ v: 'c' });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe('c');
  });

  it('works with non-string values (numbers, objects)', () => {
    const obj1 = { x: 1 };
    const obj2 = { x: 2 };
    const { result, rerender } = renderHook(({ v }: { v: { x: number } }) => useDebounce(v, 50), {
      initialProps: { v: obj1 },
    });
    rerender({ v: obj2 });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe(obj2);
  });
});
