export function getGeometryCenter(geometry: any): { lat: number; lng: number } | null {
  if (!geometry || !geometry.type || !geometry.coordinates) {
    return null;
  }

  const coords = geometry.coordinates;

  switch (geometry.type) {
    case 'Point':
      if (
        Array.isArray(coords) &&
        coords.length >= 2 &&
        typeof coords[0] === 'number' &&
        typeof coords[1] === 'number'
      ) {
        return { lng: coords[0], lat: coords[1] };
      }
      return null;

    case 'LineString':
    case 'MultiPoint': {
      if (Array.isArray(coords) && coords.length > 0) {
        let sumLng = 0,
          sumLat = 0,
          count = 0;
        for (const pt of coords) {
          if (Array.isArray(pt) && pt.length >= 2) {
            sumLng += pt[0];
            sumLat += pt[1];
            count++;
          }
        }
        if (count > 0) {
          return { lng: sumLng / count, lat: sumLat / count };
        }
      }
      return null;
    }

    case 'Polygon': {
      if (Array.isArray(coords) && coords.length > 0 && Array.isArray(coords[0])) {
        const ring = coords[0];
        let sumLng = 0,
          sumLat = 0,
          count = 0;
        for (const pt of ring) {
          if (Array.isArray(pt) && pt.length >= 2) {
            sumLng += pt[0];
            sumLat += pt[1];
            count++;
          }
        }
        if (count > 0) {
          return { lng: sumLng / count, lat: sumLat / count };
        }
      }
      return null;
    }

    case 'MultiPolygon': {
      if (
        Array.isArray(coords) &&
        coords.length > 0 &&
        Array.isArray(coords[0]) &&
        coords[0].length > 0 &&
        Array.isArray(coords[0][0])
      ) {
        const ring = coords[0][0];
        let sumLng = 0,
          sumLat = 0,
          count = 0;
        for (const pt of ring) {
          if (Array.isArray(pt) && pt.length >= 2) {
            sumLng += pt[0];
            sumLat += pt[1];
            count++;
          }
        }
        if (count > 0) {
          return { lng: sumLng / count, lat: sumLat / count };
        }
      }
      return null;
    }

    case 'MultiLineString': {
      if (Array.isArray(coords)) {
        let sumLng = 0,
          sumLat = 0,
          count = 0;
        for (const line of coords) {
          if (Array.isArray(line)) {
            for (const pt of line) {
              if (Array.isArray(pt) && pt.length >= 2) {
                sumLng += pt[0];
                sumLat += pt[1];
                count++;
              }
            }
          }
        }
        if (count > 0) {
          return { lng: sumLng / count, lat: sumLat / count };
        }
      }
      return null;
    }

    default:
      return null;
  }
}
