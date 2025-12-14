import { useRef, useEffect } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { Feature } from 'ol';
import { Point, Polygon } from 'ol/geom';
import { circular } from 'ol/geom/Polygon';
import { fromLonLat } from 'ol/proj';
import type Map from 'ol/Map';
import type { UserLocation } from '../types';

export interface UseUserLocationDisplayOptions {
  mapInstance: React.RefObject<Map | null>;
  userLocation?: UserLocation | null;
}

export interface UseUserLocationDisplayReturn {
  userLocationLayerRef: React.RefObject<VectorLayer<VectorSource> | null>;
  userLocationSourceRef: React.RefObject<VectorSource | null>;
}

/**
 * Custom hook for displaying user's geolocation on the map
 *
 * Features:
 * - Blue marker for user position
 * - Accuracy circle (semi-transparent blue)
 * - Proper geographic circle approximation (64-sided polygon)
 * - Highest z-index (110) for visibility
 * - Auto-clears when userLocation is null
 *
 * @param options - Configuration options
 * @returns User location layer refs
 */
export function useUserLocationDisplay(options: UseUserLocationDisplayOptions): UseUserLocationDisplayReturn {
  const { mapInstance, userLocation } = options;

  const userLocationLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const userLocationSourceRef = useRef<VectorSource | null>(null);

  // Initialize user location layer
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Create user location source
    const userLocationSource = new VectorSource();
    userLocationSourceRef.current = userLocationSource;

    // Create user location layer with dynamic styling
    const userLocationLayer = new VectorLayer({
      source: userLocationSource,
      zIndex: 110, // Above all other layers
      style: (feature) => {
        const type = feature.get('type');

        if (type === 'accuracy') {
          // Accuracy circle (semi-transparent blue)
          return new Style({
            fill: new Fill({
              color: 'rgba(59, 130, 246, 0.15)' // Very transparent blue
            }),
            stroke: new Stroke({
              color: '#3b82f6',
              width: 2,
              lineDash: [5, 5] // Dashed line
            })
          });
        } else {
          // Position marker (blue dot with white border)
          return new Style({
            image: new CircleStyle({
              radius: 8,
              fill: new Fill({
                color: '#3b82f6' // Blue
              }),
              stroke: new Stroke({
                color: '#ffffff',
                width: 3
              })
            })
          });
        }
      }
    });
    userLocationLayerRef.current = userLocationLayer;
    map.addLayer(userLocationLayer);

    // Cleanup on unmount
    return () => {
      if (userLocationLayer && map) {
        map.removeLayer(userLocationLayer);
      }
    };
  }, [mapInstance]);

  // Update user location when it changes
  useEffect(() => {
    if (!userLocation || !userLocationSourceRef.current) {
      // Clear user location if null
      userLocationSourceRef.current?.clear();
      return;
    }

    const userLocationSource = userLocationSourceRef.current;
    userLocationSource.clear();

    const { lat, lng, accuracy } = userLocation;
    const position = fromLonLat([lng, lat]);

    // Add accuracy circle if accuracy is provided
    if (accuracy && accuracy > 0) {
      // Create a polygon approximation of a circle with radius = accuracy in meters
      // circular() creates a polygon in geographic coordinates (WGS84) that we then transform
      const circleGeometry = circular([lng, lat], accuracy, 64); // 64 points for smoothness
      const circlePolygon = new Polygon(circleGeometry.getCoordinates()).transform('EPSG:4326', 'EPSG:3857');

      const circleFeature = new Feature({
        geometry: circlePolygon,
        type: 'accuracy'
      });
      userLocationSource.addFeature(circleFeature);
    }

    // Add user position marker (blue dot)
    const markerFeature = new Feature({
      geometry: new Point(position),
      type: 'marker'
    });
    userLocationSource.addFeature(markerFeature);
  }, [userLocation]);

  return {
    userLocationLayerRef,
    userLocationSourceRef
  };
}
