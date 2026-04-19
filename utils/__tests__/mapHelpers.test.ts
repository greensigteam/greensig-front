import { describe, expect, it } from 'vitest';
import { OBJECT_COLORS, TYPE_TO_API, createMarkerIcon, createSiteIcon } from '../mapHelpers';

describe('OBJECT_COLORS', () => {
  it('is populated from legend sources', () => {
    expect(Object.keys(OBJECT_COLORS).length).toBeGreaterThan(0);
  });

  it('only contains hex colour strings', () => {
    for (const value of Object.values(OBJECT_COLORS)) {
      expect(value).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    }
  });
});

describe('TYPE_TO_API', () => {
  it('maps the 15 object types plus Site to API endpoints', () => {
    // 15 object types + Site = 16 entries
    expect(Object.keys(TYPE_TO_API)).toHaveLength(16);
  });

  it.each([
    ['Arbre', 'arbres'],
    ['Puit', 'puits'],
    ['Pompe', 'pompes'],
    ['Site', 'sites'],
  ])('maps %s -> %s', (type, endpoint) => {
    expect(TYPE_TO_API[type]).toBe(endpoint);
  });
});

describe('createSiteIcon', () => {
  it('returns a valid SVG data URI', () => {
    const uri = createSiteIcon('#ff0000', 'INFRASTRUCTURE');
    expect(uri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    const decoded = decodeURIComponent(uri.replace('data:image/svg+xml;charset=utf-8,', ''));
    expect(decoded).toContain('<svg');
    expect(decoded).toContain('#ff0000');
  });

  it('falls back to INFRASTRUCTURE icon for unknown categories', () => {
    const unknown = createSiteIcon('#000', 'UNKNOWN');
    const infra = createSiteIcon('#000', 'INFRASTRUCTURE');
    expect(unknown).toBe(infra);
  });

  it('uses a larger size when hovered', () => {
    const normal = createSiteIcon('#000', 'RECHERCHE', false);
    const hovered = createSiteIcon('#000', 'RECHERCHE', true);
    expect(hovered).not.toBe(normal);
    const decodedHover = decodeURIComponent(hovered);
    expect(decodedHover).toContain('width="48"');
  });
});

describe('createMarkerIcon', () => {
  it('returns a valid SVG data URI containing the given colour', () => {
    const uri = createMarkerIcon('#00ff00');
    expect(uri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    const decoded = decodeURIComponent(uri.replace('data:image/svg+xml;charset=utf-8,', ''));
    expect(decoded).toContain('#00ff00');
    expect(decoded).toContain('<svg');
  });

  it('produces a different SVG when hovered', () => {
    const normal = createMarkerIcon('#111');
    const hovered = createMarkerIcon('#111', true);
    expect(hovered).not.toBe(normal);
  });
});
