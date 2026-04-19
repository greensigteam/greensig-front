import { describe, expect, it } from 'vitest';
import { DEFAULT_BADGE, getBadgeColors } from '../users';

describe('getBadgeColors', () => {
  const map = {
    OK: { bg: 'bg-green', text: 'text-green' },
    KO: { bg: 'bg-red', text: 'text-red' },
  };

  it('returns the matching entry when key is present', () => {
    expect(getBadgeColors(map, 'OK')).toEqual(map.OK);
    expect(getBadgeColors(map, 'KO')).toEqual(map.KO);
  });

  it('returns DEFAULT_BADGE when key is null', () => {
    expect(getBadgeColors(map, null)).toBe(DEFAULT_BADGE);
  });

  it('returns DEFAULT_BADGE when key is undefined', () => {
    expect(getBadgeColors(map)).toBe(DEFAULT_BADGE);
  });

  it('returns DEFAULT_BADGE when key is not in map', () => {
    expect(getBadgeColors(map, 'MISSING' as unknown as 'OK')).toBe(DEFAULT_BADGE);
  });

  it('DEFAULT_BADGE is the expected neutral gray', () => {
    expect(DEFAULT_BADGE).toEqual({ bg: 'bg-gray-100', text: 'text-gray-800' });
  });
});
