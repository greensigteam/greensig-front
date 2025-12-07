import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

export interface DrawnFeature {
  id: string;
  type: 'Point' | 'LineString' | 'Polygon';
  coordinates: number[] | number[][] | number[][][];
  properties: {
    measurement?: string;
    type_vegetation?: string;
    color?: string;
  };
  layer: L.Layer;
}

interface LeafletDrawingProps {
  drawingMode: 'Point' | 'LineString' | 'Polygon' | 'Rectangle' | null;
  drawingColor: string;
  vegetationType: string;
  onDrawEnd?: (feature: DrawnFeature) => void;
  onFeaturesChange?: (features: DrawnFeature[]) => void;
}

// Format area in m² or hectares
function formatArea(area: number): string {
  if (area > 10000) {
    return (area / 10000).toFixed(2) + ' ha';
  }
  return area.toFixed(2) + ' m²';
}

// Format length in m or km
function formatLength(length: number): string {
  if (length > 1000) {
    return (length / 1000).toFixed(2) + ' km';
  }
  return length.toFixed(2) + ' m';
}

// Calculate polygon area using Shoelace formula
function calculatePolygonArea(latlngs: L.LatLng[]): number {
  if (latlngs.length < 3) return 0;

  let area = 0;
  const n = latlngs.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    // Convert to meters using approximate scale
    const lat1 = latlngs[i].lat * 111320;
    const lng1 = latlngs[i].lng * 111320 * Math.cos(latlngs[i].lat * Math.PI / 180);
    const lat2 = latlngs[j].lat * 111320;
    const lng2 = latlngs[j].lng * 111320 * Math.cos(latlngs[j].lat * Math.PI / 180);

    area += lat1 * lng2;
    area -= lat2 * lng1;
  }

  return Math.abs(area / 2);
}

// Calculate polyline length
function calculatePolylineLength(latlngs: L.LatLng[]): number {
  let length = 0;
  for (let i = 0; i < latlngs.length - 1; i++) {
    length += latlngs[i].distanceTo(latlngs[i + 1]);
  }
  return length;
}

const LeafletDrawing: React.FC<LeafletDrawingProps> = ({
  drawingMode,
  drawingColor,
  vegetationType,
  onDrawEnd,
  onFeaturesChange
}) => {
  const map = useMap();
  const [features, setFeatures] = useState<DrawnFeature[]>([]);
  const [currentPoints, setCurrentPoints] = useState<L.LatLng[]>([]);
  const tempLayerRef = useRef<L.LayerGroup | null>(null);
  const drawnLayerRef = useRef<L.LayerGroup | null>(null);
  const cursorMarkerRef = useRef<L.CircleMarker | null>(null);

  // Initialize layer groups
  useEffect(() => {
    if (!drawnLayerRef.current) {
      drawnLayerRef.current = L.layerGroup().addTo(map);
    }
    if (!tempLayerRef.current) {
      tempLayerRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (drawnLayerRef.current) {
        map.removeLayer(drawnLayerRef.current);
      }
      if (tempLayerRef.current) {
        map.removeLayer(tempLayerRef.current);
      }
    };
  }, [map]);

  // Expose internal API to window (used by MapView)
  useEffect(() => {
    const internalApi = {
      getFeatures: () => features,
      clearAll: () => {
        if (drawnLayerRef.current) {
          drawnLayerRef.current.clearLayers();
        }
        setFeatures([]);
        setCurrentPoints([]);
        if (tempLayerRef.current) {
          tempLayerRef.current.clearLayers();
        }
      },
      deleteLastFeature: () => {
        if (features.length > 0) {
          const lastFeature = features[features.length - 1];
          if (drawnLayerRef.current && lastFeature.layer) {
            drawnLayerRef.current.removeLayer(lastFeature.layer);
          }
          const newFeatures = features.slice(0, -1);
          setFeatures(newFeatures);
          onFeaturesChange?.(newFeatures);
        }
      },
      exportGeoJSON: () => {
        const geojson = {
          type: 'FeatureCollection' as const,
          features: features.map(f => ({
            type: 'Feature' as const,
            geometry: {
              type: f.type,
              coordinates: f.coordinates
            },
            properties: f.properties
          }))
        };
        return geojson;
      }
    };

    // Use a separate internal API name to avoid conflicts with MapView
    (window as any)._leafletDrawingInternal = internalApi;

    return () => {
      delete (window as any)._leafletDrawingInternal;
    };
  }, [features, onFeaturesChange]);

  // Clear temp layer when mode changes
  useEffect(() => {
    if (tempLayerRef.current) {
      tempLayerRef.current.clearLayers();
    }
    setCurrentPoints([]);

    // Change cursor based on drawing mode using CSS class
    const container = map.getContainer();
    if (drawingMode) {
      container.classList.add('drawing-mode');
      console.log('Drawing mode activated:', drawingMode);
    } else {
      container.classList.remove('drawing-mode');
      console.log('Drawing mode deactivated');
    }

    return () => {
      container.classList.remove('drawing-mode');
    };
  }, [drawingMode, map]);

  // Update temp visualization
  useEffect(() => {
    if (!tempLayerRef.current) return;
    tempLayerRef.current.clearLayers();

    if (currentPoints.length === 0) return;

    if (drawingMode === 'LineString' && currentPoints.length >= 1) {
      const polyline = L.polyline(currentPoints, {
        color: drawingColor,
        weight: 3,
        dashArray: '5, 5'
      });
      tempLayerRef.current.addLayer(polyline);
    } else if ((drawingMode === 'Polygon' || drawingMode === 'Rectangle') && currentPoints.length >= 2) {
      const polygon = L.polygon(currentPoints, {
        color: drawingColor,
        fillColor: drawingColor,
        fillOpacity: 0.3,
        weight: 2,
        dashArray: '5, 5'
      });
      tempLayerRef.current.addLayer(polygon);
    }

    // Add markers for each point
    currentPoints.forEach((point, idx) => {
      const marker = L.circleMarker(point, {
        radius: 6,
        color: '#fff',
        fillColor: drawingColor,
        fillOpacity: 1,
        weight: 2
      });
      tempLayerRef.current?.addLayer(marker);
    });
  }, [currentPoints, drawingMode, drawingColor]);

  // Finalize drawing
  const finalizeDrawing = useCallback(() => {
    if (!drawnLayerRef.current) return;
    if (currentPoints.length === 0) return;

    let layer: L.Layer | null = null;
    let coordinates: number[] | number[][] | number[][][] = [];
    let measurement = '';

    if (drawingMode === 'Point' && currentPoints.length === 1) {
      const point = currentPoints[0];
      layer = L.circleMarker(point, {
        radius: 8,
        color: '#fff',
        fillColor: drawingColor,
        fillOpacity: 1,
        weight: 2
      });
      coordinates = [point.lng, point.lat];
      measurement = `Lon: ${point.lng.toFixed(6)}, Lat: ${point.lat.toFixed(6)}`;

      // Add popup
      (layer as L.CircleMarker).bindPopup(`
        <div>
          <strong>${vegetationType || 'Point'}</strong><br/>
          ${measurement}
        </div>
      `);
    } else if (drawingMode === 'LineString' && currentPoints.length >= 2) {
      layer = L.polyline(currentPoints, {
        color: drawingColor,
        weight: 3
      });
      coordinates = currentPoints.map(p => [p.lng, p.lat]);
      const length = calculatePolylineLength(currentPoints);
      measurement = formatLength(length);

      (layer as L.Polyline).bindPopup(`
        <div>
          <strong>${vegetationType || 'Ligne'}</strong><br/>
          Distance: ${measurement}
        </div>
      `);
    } else if ((drawingMode === 'Polygon' || drawingMode === 'Rectangle') && currentPoints.length >= 3) {
      layer = L.polygon(currentPoints, {
        color: drawingColor,
        fillColor: drawingColor,
        fillOpacity: 0.4,
        weight: 2
      });
      coordinates = [currentPoints.map(p => [p.lng, p.lat])];
      // Close the polygon
      (coordinates as number[][][])[0].push((coordinates as number[][][])[0][0]);
      const area = calculatePolygonArea(currentPoints);
      measurement = formatArea(area);

      (layer as L.Polygon).bindPopup(`
        <div>
          <strong>${vegetationType || 'Polygone'}</strong><br/>
          Surface: ${measurement}
        </div>
      `);
    }

    if (layer) {
      drawnLayerRef.current.addLayer(layer);

      const feature: DrawnFeature = {
        id: `feature_${Date.now()}`,
        type: drawingMode === 'Rectangle' ? 'Polygon' : drawingMode!,
        coordinates,
        properties: {
          measurement,
          type_vegetation: vegetationType || undefined,
          color: drawingColor
        },
        layer
      };

      const newFeatures = [...features, feature];
      setFeatures(newFeatures);
      onDrawEnd?.(feature);
      onFeaturesChange?.(newFeatures);
    }

    // Clear temp
    setCurrentPoints([]);
    if (tempLayerRef.current) {
      tempLayerRef.current.clearLayers();
    }
  }, [currentPoints, drawingMode, drawingColor, vegetationType, features, onDrawEnd, onFeaturesChange]);

  // Map event handlers
  useMapEvents({
    click(e) {
      console.log('Map clicked, drawingMode:', drawingMode);
      if (!drawingMode) return;

      const point = e.latlng;
      console.log('Drawing point at:', point.lat, point.lng);

      if (drawingMode === 'Point') {
        // Immediately create and add the point
        if (drawnLayerRef.current) {
          const layer = L.circleMarker(point, {
            radius: 8,
            color: '#fff',
            fillColor: drawingColor,
            fillOpacity: 1,
            weight: 2
          });

          const measurement = `Lon: ${point.lng.toFixed(6)}, Lat: ${point.lat.toFixed(6)}`;
          layer.bindPopup(`
            <div>
              <strong>${vegetationType || 'Point'}</strong><br/>
              ${measurement}
            </div>
          `);

          drawnLayerRef.current.addLayer(layer);
          console.log('Point added to map');

          const feature: DrawnFeature = {
            id: `feature_${Date.now()}`,
            type: 'Point',
            coordinates: [point.lng, point.lat],
            properties: {
              measurement,
              type_vegetation: vegetationType || undefined,
              color: drawingColor
            },
            layer
          };

          setFeatures(prev => {
            const newFeatures = [...prev, feature];
            onFeaturesChange?.(newFeatures);
            return newFeatures;
          });
          onDrawEnd?.(feature);
        }
      } else {
        setCurrentPoints(prev => [...prev, point]);
        console.log('Added point to current drawing');
      }
    },
    dblclick(e) {
      if (!drawingMode || drawingMode === 'Point') return;

      // Prevent zoom on double-click when drawing
      L.DomEvent.stopPropagation(e.originalEvent);
      L.DomEvent.preventDefault(e.originalEvent);

      console.log('Double-click, finalizing drawing');
      // Finalize the drawing
      finalizeDrawing();
    },
    contextmenu(e) {
      if (!drawingMode) return;

      // Right-click to cancel current drawing
      L.DomEvent.stopPropagation(e.originalEvent);
      L.DomEvent.preventDefault(e.originalEvent);

      console.log('Right-click, canceling drawing');
      setCurrentPoints([]);
      if (tempLayerRef.current) {
        tempLayerRef.current.clearLayers();
      }
    },
    mousemove(e) {
      if (!drawingMode || drawingMode === 'Point') return;

      // Update cursor marker position
      if (cursorMarkerRef.current) {
        cursorMarkerRef.current.setLatLng(e.latlng);
      }
    }
  });

  // Handle keyboard events for finishing drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && drawingMode && drawingMode !== 'Point' && currentPoints.length >= 2) {
        finalizeDrawing();
      } else if (e.key === 'Escape') {
        setCurrentPoints([]);
        if (tempLayerRef.current) {
          tempLayerRef.current.clearLayers();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingMode, currentPoints, finalizeDrawing]);

  return null;
};

export default LeafletDrawing;
