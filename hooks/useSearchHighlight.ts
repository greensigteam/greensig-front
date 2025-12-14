import { useRef, useEffect } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { Feature } from 'ol';
import type Map from 'ol/Map';
import type { MapSearchResult } from '../types';

export interface UseSearchHighlightOptions {
  mapInstance: React.RefObject<Map | null>;
  vectorSourceRef: React.RefObject<VectorSource | null>;
  sitesSourceRef: React.RefObject<VectorSource | null>;
  searchResult?: MapSearchResult | null;
}

export interface UseSearchHighlightReturn {
  highlightLayerRef: React.RefObject<VectorLayer<VectorSource> | null>;
  highlightSourceRef: React.RefObject<VectorSource | null>;
}

/**
 * Custom hook for search result highlighting with flash animation
 *
 * Features:
 * - Highlights search results on the map
 * - Yellow pulsing animation (4 cycles, 2 seconds)
 * - Searches in both objects and sites layers
 * - Auto-clears after animation
 * - Proper cleanup to prevent memory leaks
 *
 * @param options - Configuration options
 * @returns Highlight layer refs
 */
export function useSearchHighlight(options: UseSearchHighlightOptions): UseSearchHighlightReturn {
  const {
    mapInstance,
    vectorSourceRef,
    sitesSourceRef,
    searchResult
  } = options;

  const highlightLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const highlightSourceRef = useRef<VectorSource | null>(null);

  // Initialize highlight layer
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Create highlight source
    const highlightSource = new VectorSource();
    highlightSourceRef.current = highlightSource;

    // Create highlight layer with yellow styling
    const highlightLayer = new VectorLayer({
      source: highlightSource,
      zIndex: 105, // Above all other layers (including measurements)
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 0, 0.4)' // Semi-transparent yellow
        }),
        stroke: new Stroke({
          color: '#FFD700', // Gold
          width: 4
        }),
        image: new CircleStyle({
          radius: 12,
          fill: new Fill({
            color: 'rgba(255, 215, 0, 0.6)'
          }),
          stroke: new Stroke({
            color: '#FFD700',
            width: 3
          })
        })
      })
    });
    highlightLayerRef.current = highlightLayer;
    map.addLayer(highlightLayer);

    // Cleanup on unmount
    return () => {
      if (highlightLayer && map) {
        map.removeLayer(highlightLayer);
      }
    };
  }, [mapInstance]);

  // Handle search result highlighting with flash animation
  useEffect(() => {
    if (!searchResult || !searchResult.objectId || !searchResult.objectType || !highlightSourceRef.current) {
      return undefined;
    }

    const highlightSource = highlightSourceRef.current;
    const highlightLayer = highlightLayerRef.current;

    // Clear previous highlight
    highlightSource.clear();

    // Find the feature in existing layers
    let foundFeature: Feature | null = null;

    // Search in data layer (objects with clustering)
    if (vectorSourceRef.current) {
      const features = vectorSourceRef.current.getFeatures();
      foundFeature = features.find((f: Feature) => {
        const props = f.getProperties();
        return props.id === searchResult.objectId && props.object_type === searchResult.objectType;
      }) || null;
    }

    // If not found in objects, search in sites layer
    if (!foundFeature && sitesSourceRef.current) {
      const features = sitesSourceRef.current.getFeatures();
      foundFeature = features.find((f: Feature) => {
        const props = f.getProperties();
        return props.id === searchResult.objectId;
      }) || null;
    }

    if (foundFeature) {
      // Clone the geometry and add to highlight layer
      const geometry = foundFeature.getGeometry();
      if (geometry) {
        const highlightFeature = new Feature({
          geometry: geometry.clone()
        });
        highlightSource.addFeature(highlightFeature);

        // Flash animation: pulse opacity
        if (highlightLayer) {
          let opacity = 1;
          let direction = -1; // Start by fading out
          let cycles = 0;
          const maxCycles = 4; // 4 pulses (2 seconds total)

          const interval = setInterval(() => {
            opacity += direction * 0.1; // Change by 10%

            if (opacity <= 0.3) {
              opacity = 0.3;
              direction = 1; // Fade in
            } else if (opacity >= 1) {
              opacity = 1;
              direction = -1; // Fade out
              cycles++;
            }

            // Update layer opacity
            highlightLayer.setOpacity(opacity);

            if (cycles >= maxCycles) {
              clearInterval(interval);
              // Clear highlight after animation
              setTimeout(() => {
                highlightSource.clear();
                highlightLayer.setOpacity(1);
              }, 1000);
            }
          }, 100); // Update every 100ms

          // Cleanup on unmount or new search
          return () => {
            clearInterval(interval);
            highlightSource.clear();
            highlightLayer.setOpacity(1);
          };
        }
      }
    }
    return undefined;
  }, [searchResult, vectorSourceRef, sitesSourceRef]);

  return {
    highlightLayerRef,
    highlightSourceRef
  };
}
