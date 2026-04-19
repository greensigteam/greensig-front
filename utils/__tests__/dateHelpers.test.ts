import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatLocalDate,
  getCurrentLocalDateTimeForInput,
  getHoursDifference,
  isEndBeforeStartDay,
  utcToLocalInput,
} from '../dateHelpers';

describe('utcToLocalInput', () => {
  it('returns the current local date/time when input is null', () => {
    const result = utcToLocalInput(null);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('returns the current local date/time when input is undefined', () => {
    const result = utcToLocalInput(undefined);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('formats an ISO string as YYYY-MM-DDTHH:mm', () => {
    const result = utcToLocalInput('2025-12-27T15:00:00Z');
    expect(result).toMatch(/^2025-12-27T\d{2}:\d{2}$/);
  });

  it('formats a Date object as YYYY-MM-DDTHH:mm', () => {
    const d = new Date(2025, 5, 15, 10, 30);
    expect(utcToLocalInput(d)).toBe('2025-06-15T10:30');
  });

  it('zero-pads single-digit month/day/hours/minutes', () => {
    const d = new Date(2025, 0, 2, 3, 4);
    expect(utcToLocalInput(d)).toBe('2025-01-02T03:04');
  });
});

describe('formatLocalDate', () => {
  it('returns "-" when input is null or undefined', () => {
    expect(formatLocalDate(null)).toBe('-');
    expect(formatLocalDate(undefined)).toBe('-');
  });

  it('returns a non-empty formatted string for a valid Date', () => {
    const d = new Date(2025, 5, 15, 10, 30);
    const out = formatLocalDate(d);
    expect(out).not.toBe('-');
    expect(out.length).toBeGreaterThan(0);
  });

  it('accepts custom Intl options', () => {
    const d = new Date(2025, 5, 15, 10, 30);
    const out = formatLocalDate(d, { year: 'numeric' });
    expect(out).toContain('2025');
  });
});

describe('getCurrentLocalDateTimeForInput', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns a string matching the datetime-local format', () => {
    vi.setSystemTime(new Date(2025, 2, 8, 14, 5));
    expect(getCurrentLocalDateTimeForInput()).toBe('2025-03-08T14:05');
  });
});

describe('getHoursDifference', () => {
  it('returns 0 for identical dates', () => {
    const d = new Date('2025-01-01T00:00:00Z');
    expect(getHoursDifference(d, d)).toBe(0);
  });

  it('returns absolute difference regardless of arg order', () => {
    const a = new Date('2025-01-01T00:00:00Z');
    const b = new Date('2025-01-01T05:00:00Z');
    expect(getHoursDifference(a, b)).toBe(5);
    expect(getHoursDifference(b, a)).toBe(5);
  });

  it('accepts ISO string inputs', () => {
    expect(getHoursDifference('2025-01-01T00:00:00Z', '2025-01-02T00:00:00Z')).toBe(24);
  });

  it('floors fractional hour differences', () => {
    expect(getHoursDifference('2025-01-01T00:00:00Z', '2025-01-01T01:59:59Z')).toBe(1);
  });
});

describe('isEndBeforeStartDay', () => {
  it('returns false when end is the same day as start', () => {
    expect(isEndBeforeStartDay('2026-04-15', '2026-04-15')).toBe(false);
  });

  it('returns false when end is strictly after start', () => {
    expect(isEndBeforeStartDay('2026-04-15', '2026-04-20')).toBe(false);
  });

  it('returns true when end is strictly before start', () => {
    expect(isEndBeforeStartDay('2026-04-20', '2026-04-15')).toBe(true);
  });

  // Regression: l'ancien code comparait `end.getDate() < start.getDate()`
  // (jour du mois uniquement), ce qui faussait la comparaison inter-mois.
  it('returns false for a valid range that crosses a month boundary (Apr 30 → May 1)', () => {
    expect(isEndBeforeStartDay('2026-04-30', '2026-05-01')).toBe(false);
  });

  it('returns false for a valid range that crosses a year boundary (Dec 31 → Jan 1)', () => {
    expect(isEndBeforeStartDay('2025-12-31', '2026-01-01')).toBe(false);
  });

  it('ignores time-of-day when comparing days', () => {
    expect(isEndBeforeStartDay('2026-04-15T23:00:00', '2026-04-15T01:00:00')).toBe(false);
  });

  it('accepts Date objects as well as strings', () => {
    const start = new Date(2026, 3, 30); // 30 avril
    const end = new Date(2026, 4, 1); // 1 mai
    expect(isEndBeforeStartDay(start, end)).toBe(false);
  });
});
