import { describe, it, expect } from 'vitest';
import { getGeometryCenter } from '../geometryCenter';

describe('getGeometryCenter', () => {
  it('returns null for null/undefined/empty geometry', () => {
    expect(getGeometryCenter(null)).toBeNull();
    expect(getGeometryCenter(undefined)).toBeNull();
    expect(getGeometryCenter({})).toBeNull();
    expect(getGeometryCenter({ type: 'Point' })).toBeNull();
  });

  it('handles Point geometry', () => {
    const result = getGeometryCenter({
      type: 'Point',
      coordinates: [10, 20],
    });
    expect(result).toEqual({ lng: 10, lat: 20 });
  });

  it('returns null for invalid Point coordinates', () => {
    expect(getGeometryCenter({ type: 'Point', coordinates: [] })).toBeNull();
    expect(getGeometryCenter({ type: 'Point', coordinates: ['a', 'b'] })).toBeNull();
  });

  it('handles LineString geometry', () => {
    const result = getGeometryCenter({
      type: 'LineString',
      coordinates: [
        [0, 0],
        [10, 10],
      ],
    });
    expect(result).toEqual({ lng: 5, lat: 5 });
  });

  it('handles Polygon geometry (uses exterior ring centroid)', () => {
    const result = getGeometryCenter({
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    });
    expect(result).toEqual({ lng: 4, lat: 4 });
  });

  it('handles MultiPolygon geometry (uses first polygon)', () => {
    const result = getGeometryCenter({
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
        ],
      ],
    });
    expect(result).toEqual({ lng: 4, lat: 4 });
  });

  it('handles MultiLineString geometry', () => {
    const result = getGeometryCenter({
      type: 'MultiLineString',
      coordinates: [
        [
          [0, 0],
          [10, 10],
        ],
        [
          [20, 20],
          [30, 30],
        ],
      ],
    });
    expect(result).toEqual({ lng: 15, lat: 15 });
  });

  it('handles MultiPoint geometry', () => {
    const result = getGeometryCenter({
      type: 'MultiPoint',
      coordinates: [
        [0, 0],
        [10, 10],
      ],
    });
    expect(result).toEqual({ lng: 5, lat: 5 });
  });

  it('returns null for unknown geometry type', () => {
    expect(getGeometryCenter({ type: 'GeometryCollection', coordinates: [] })).toBeNull();
  });

  it('returns null for empty Polygon ring', () => {
    expect(getGeometryCenter({ type: 'Polygon', coordinates: [[]] })).toBeNull();
  });

  it('returns null for empty MultiPolygon', () => {
    expect(getGeometryCenter({ type: 'MultiPolygon', coordinates: [] })).toBeNull();
  });

  it('returns null for empty LineString', () => {
    expect(getGeometryCenter({ type: 'LineString', coordinates: [] })).toBeNull();
  });

  it('returns null for empty MultiLineString', () => {
    expect(getGeometryCenter({ type: 'MultiLineString', coordinates: [] })).toBeNull();
  });
});
