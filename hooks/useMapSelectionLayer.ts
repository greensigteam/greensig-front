import { useEffect, type RefObject } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapObjectDetail } from '../types';
import {
  SELECTION_STYLE,
  POINT_HIGHLIGHT_STYLE,
  POINT_HIGHLIGHT_STYLE_SMALL,
} from '../utils/mapStyles';
import { OBJECT_COLORS } from '../utils/mapHelpers';
import logger from '../services/logger';

interface UseMapSelectionLayerParams {
  selectionLayerRef: RefObject<VectorLayer<VectorSource> | null>;
  dataLayerRef: RefObject<VectorLayer<VectorSource> | null>;
  vectorSourceRef: RefObject<VectorSource | null>;
  sitesSourceRef: RefObject<VectorSource | null>;
  selectedObjects: MapObjectDetail[];
  mapReady: boolean;
  clusteringEnabled: boolean;
}

export function useMapSelectionLayer({
  selectionLayerRef,
  dataLayerRef,
  vectorSourceRef,
  sitesSourceRef,
  selectedObjects,
  mapReady,
  clusteringEnabled,
}: UseMapSelectionLayerParams) {
  useEffect(() => {
    if (!selectionLayerRef.current) return;

    const source = selectionLayerRef.current.getSource();
    if (!source) return;

    source.clear();

    if (selectedObjects.length === 0) return;

    const findFeatureById = (id: string): Feature | undefined => {
      if (dataLayerRef.current) {
        const dSource = dataLayerRef.current.getSource();
        if (dSource) {
          const feat = dSource.getFeatureById(id);
          if (feat) return feat as Feature;
          const found = dSource.getFeatures().find((f) => f.get('id') === id || f.getId() === id);
          if (found) return found as Feature;
        }
      }

      if (vectorSourceRef.current) {
        const feat = vectorSourceRef.current.getFeatureById(id);
        if (feat) return feat as Feature;
        const found = vectorSourceRef.current
          .getFeatures()
          .find((f) => f.get('id') === id || f.getId() === id);
        if (found) return found as Feature;
      }

      if (sitesSourceRef.current) {
        const feat = sitesSourceRef.current.getFeatureById(id);
        if (feat) return feat as Feature;
        const found = sitesSourceRef.current
          .getFeatures()
          .find(
            (f) =>
              f.get('id') === id ||
              f.getId() === id ||
              (f.get('object_type') === 'Site' && f.get('site_id') === id),
          );
        if (found) return found as Feature;
      }

      return undefined;
    };

    selectedObjects.forEach((obj) => {
      const originalFeature = findFeatureById(obj.id);

      if (originalFeature) {
        const clonedFeature = originalFeature.clone();
        clonedFeature.setId(obj.id);
        const geom = clonedFeature.getGeometry();

        if (geom && geom instanceof Point) {
          clonedFeature.setStyle(POINT_HIGHLIGHT_STYLE);
        } else {
          clonedFeature.setStyle(SELECTION_STYLE);
        }

        source.addFeature(clonedFeature);
      } else if (obj.geometry) {
        try {
          const type = obj.type as string;
          const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
          void (OBJECT_COLORS[normalizedType] || OBJECT_COLORS[type] || '#10b981');

          let newFeature: Feature;

          if (obj.geometry.type === 'Point') {
            const coords = obj.geometry.coordinates as [number, number];
            newFeature = new Feature({
              geometry: new Point(fromLonLat(coords)),
              id: obj.id,
              object_type: type,
              title: obj.title,
            });
            newFeature.setId(obj.id);
            newFeature.setStyle(POINT_HIGHLIGHT_STYLE_SMALL);
            source.addFeature(newFeature);
          } else {
            const geoJsonFormat = new GeoJSON();
            const geojsonFeature = {
              type: 'Feature' as const,
              geometry: obj.geometry,
              properties: { id: obj.id, object_type: type },
            };
            newFeature = geoJsonFormat.readFeature(geojsonFeature, {
              featureProjection: 'EPSG:3857',
            }) as Feature;
            newFeature.setId(obj.id);
            newFeature.setStyle(SELECTION_STYLE);
            source.addFeature(newFeature);
          }

          logger.debug(`Created selection feature from geometry for object ${obj.id} (${type})`);
        } catch (error) {
          logger.error(
            `Failed to create selection feature from geometry for object ${obj.id}:`,
            error,
          );
        }
      }
    });
  }, [selectedObjects, mapReady, clusteringEnabled]);
}
