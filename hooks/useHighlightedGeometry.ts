import { useEffect, type RefObject } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Feature } from 'ol';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { GeoJSONGeometry } from '../types';
import logger from '../services/logger';

type HighlightedGeometryInput =
  | GeoJSONGeometry
  | { type: 'Feature'; geometry: GeoJSONGeometry; properties?: Record<string, unknown> }
  | null
  | undefined;

interface UseHighlightedGeometryParams {
  selectionLayerRef: RefObject<VectorLayer<VectorSource> | null>;
  highlightedGeometry: HighlightedGeometryInput;
  mapReady: boolean;
}

function hexToRgba(hex: string, alpha: number = 0.2): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `rgba(${parseInt(result[1]!, 16)}, ${parseInt(result[2]!, 16)}, ${parseInt(result[3]!, 16)}, ${alpha})`
    : `rgba(0, 255, 255, ${alpha})`;
}

export function useHighlightedGeometry({
  selectionLayerRef,
  highlightedGeometry,
  mapReady,
}: UseHighlightedGeometryParams) {
  useEffect(() => {
    if (!mapReady || !selectionLayerRef.current) return;

    const source = selectionLayerRef.current.getSource();
    if (!source) return;

    if (highlightedGeometry) {
      source.clear();

      try {
        const geojsonFormat = new GeoJSON();
        let feature: Feature | undefined;

        if (highlightedGeometry.type === 'Feature') {
          const read = geojsonFormat.readFeature(highlightedGeometry, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
          });
          feature = Array.isArray(read) ? read[0] : read;
        } else {
          feature = new Feature({
            geometry: new GeoJSON().readGeometry(highlightedGeometry, {
              dataProjection: 'EPSG:4326',
              featureProjection: 'EPSG:3857',
            }),
          });
        }

        if (feature) {
          const properties = feature.getProperties();
          const customColor = properties?.couleur_statut || properties?.color || '#00ffff';

          const highlightStyle = new Style({
            stroke: new Stroke({
              color: customColor,
              width: 5,
            }),
            fill: new Fill({
              color: hexToRgba(customColor, 0.2),
            }),
            image: new CircleStyle({
              radius: 12,
              fill: new Fill({ color: customColor }),
              stroke: new Stroke({ color: '#fff', width: 3 }),
            }),
            zIndex: 10000,
          });

          if (!Array.isArray(feature)) {
            feature.setStyle(highlightStyle);
            source.addFeature(feature);
          }
        }
      } catch (e) {
        logger.error('Error adding highlighted geometry:', e);
      }
    }
  }, [highlightedGeometry, mapReady]);
}
