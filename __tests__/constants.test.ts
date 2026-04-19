import { describe, expect, it } from 'vitest';
import {
  HYDRO_LEGEND,
  INITIAL_POSITION,
  MAP_LAYERS,
  PDF_IMAGE_LOAD_TIMEOUT_MS,
  PDF_SATELLITE_TILE_URL_TEMPLATE,
  RECLAMATION_LEGEND,
  RECLAMATION_STATUS_COLORS,
  RECLAMATION_STATUS_LABELS,
  SITE_LEGEND,
  VEG_LEGEND,
} from '../constants';
import { MapLayerType } from '../types';

describe('INITIAL_POSITION', () => {
  it('targets the UM6P Benguerir campus with a reasonable zoom', () => {
    expect(INITIAL_POSITION.lat).toBeCloseTo(32.216, 2);
    expect(INITIAL_POSITION.lng).toBeCloseTo(-7.937, 2);
    expect(INITIAL_POSITION.zoom).toBeGreaterThan(10);
    expect(INITIAL_POSITION.zoom).toBeLessThan(20);
  });
});

describe('MAP_LAYERS', () => {
  it('defines a config entry for every MapLayerType enum member', () => {
    for (const key of [
      MapLayerType.PLAN,
      MapLayerType.SATELLITE,
      MapLayerType.TERRAIN,
      MapLayerType.NAVIGATION,
    ]) {
      const layer = MAP_LAYERS[key];
      expect(layer).toBeDefined();
      expect(layer.id).toBe(key);
      expect(layer.url).toMatch(/\{z\}.*\{x\}.*\{y\}|\{z\}.*\{y\}.*\{x\}/);
      expect(layer.name.length).toBeGreaterThan(0);
      expect(layer.maxNativeZoom).toBeGreaterThan(0);
    }
  });
});

describe('Legend arrays', () => {
  it('VEG_LEGEND has 7 entries with {type, color, icon}', () => {
    expect(VEG_LEGEND).toHaveLength(7);
    for (const entry of VEG_LEGEND) {
      expect(entry.type).toMatch(/^[A-Z]/);
      expect(entry.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(entry.icon).toBeTruthy();
    }
  });

  it('HYDRO_LEGEND has 8 entries with {type, color}', () => {
    expect(HYDRO_LEGEND).toHaveLength(8);
    for (const entry of HYDRO_LEGEND) {
      expect(entry.type).toMatch(/^[A-Z]/);
      expect(entry.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('SITE_LEGEND has a single Site entry', () => {
    expect(SITE_LEGEND).toEqual([{ type: 'Site', color: '#3b82f6' }]);
  });
});

describe('RECLAMATION_* maps', () => {
  const STATUSES = [
    'NOUVELLE',
    'EN_COURS',
    'RESOLUE',
    'EN_ATTENTE_VALIDATION_CLOTURE',
    'INTERVENTION_REFUSEE',
    'CLOTUREE',
    'REJETEE',
  ];

  it('color and label maps share the same status keys', () => {
    expect(Object.keys(RECLAMATION_STATUS_COLORS).sort()).toEqual([...STATUSES].sort());
    expect(Object.keys(RECLAMATION_STATUS_LABELS).sort()).toEqual([...STATUSES].sort());
  });

  it('every color value is a hex triplet', () => {
    for (const v of Object.values(RECLAMATION_STATUS_COLORS)) {
      expect(v).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('every label value is a non-empty string', () => {
    for (const v of Object.values(RECLAMATION_STATUS_LABELS)) {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    }
  });

  it('RECLAMATION_LEGEND entries reference known statuses', () => {
    for (const entry of RECLAMATION_LEGEND) {
      expect(STATUSES).toContain(entry.type);
      expect(entry.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });
});

describe('PDF constants', () => {
  it('PDF_SATELLITE_TILE_URL_TEMPLATE contains {z} {x} {y} placeholders', () => {
    expect(PDF_SATELLITE_TILE_URL_TEMPLATE).toContain('{z}');
    expect(PDF_SATELLITE_TILE_URL_TEMPLATE).toContain('{x}');
    expect(PDF_SATELLITE_TILE_URL_TEMPLATE).toContain('{y}');
  });

  it('PDF_IMAGE_LOAD_TIMEOUT_MS is a positive number of milliseconds', () => {
    expect(PDF_IMAGE_LOAD_TIMEOUT_MS).toBeGreaterThan(0);
    expect(PDF_IMAGE_LOAD_TIMEOUT_MS).toBeLessThanOrEqual(60_000);
  });
});
