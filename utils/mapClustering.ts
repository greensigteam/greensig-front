import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Cluster from 'ol/source/Cluster';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import type Map from 'ol/Map';
import type { MutableRefObject } from 'react';
import { OBJECT_COLORS } from './mapHelpers';
import { createClusterLayerStyle } from './mapStyles';

interface ClusterRefs {
  clusterSourcesRef: MutableRefObject<Record<string, Cluster>>;
  clusterLayersRef: MutableRefObject<Record<string, VectorLayer<VectorSource>>>;
  vectorSource: VectorSource | null;
  dataLayer: VectorLayer<VectorSource> | null;
  map: Map | null;
}

export function updateClusteredFeatures(
  featuresByType: Record<string, Feature[]>,
  refs: ClusterRefs,
): void {
  const pointFeaturesByType: Record<string, Feature[]> = {};
  const nonPointFeatures: Feature[] = [];

  Object.entries(featuresByType).forEach(([type, features]) => {
    features.forEach((feature) => {
      const geom = feature.getGeometry();
      if (geom?.getType() === 'Point') {
        if (!pointFeaturesByType[type]) {
          pointFeaturesByType[type] = [];
        }
        pointFeaturesByType[type].push(feature);
      } else {
        nonPointFeatures.push(feature);
      }
    });
  });

  refs.vectorSource?.clear();
  refs.vectorSource?.addFeatures(nonPointFeatures);

  Object.entries(pointFeaturesByType).forEach(([type, features]) => {
    if (!refs.clusterSourcesRef.current[type]) {
      const typeSource = new VectorSource();
      const typeCluster = new Cluster({
        distance: 50,
        source: typeSource,
        geometryFunction: (feature) => {
          const geom = feature.getGeometry();
          return (geom?.getType() === 'Point' ? geom : null) as Point;
        },
      });
      refs.clusterSourcesRef.current[type] = typeCluster;

      const typeColor = OBJECT_COLORS[type] || '#10b981';
      const clusterLayer = new VectorLayer({
        source: typeCluster,
        zIndex: 50 + Object.keys(refs.clusterSourcesRef.current).indexOf(type),
        style: createClusterLayerStyle(typeColor) as any,
      });

      refs.clusterLayersRef.current[type] = clusterLayer;
      refs.map?.addLayer(clusterLayer);
    }

    const typeSource = refs.clusterSourcesRef.current[type].getSource();
    if (typeSource) {
      typeSource.clear();
      if (features.length > 0) {
        typeSource.addFeatures(features);
      }
    }
    refs.clusterLayersRef.current[type]?.changed();
  });

  Object.keys(refs.clusterSourcesRef.current).forEach((type) => {
    if (!pointFeaturesByType[type]) {
      const clusterLayer = refs.clusterLayersRef.current[type];
      if (clusterLayer) {
        refs.map?.removeLayer(clusterLayer);
        delete refs.clusterLayersRef.current[type];
      }
      delete refs.clusterSourcesRef.current[type];
    }
  });

  refs.dataLayer?.setVisible(true);
}

export function updateNonClusteredFeatures(
  featuresByType: Record<string, Feature[]>,
  refs: ClusterRefs,
): void {
  const allObjects = Object.values(featuresByType).flat();
  refs.vectorSource?.clear();
  refs.vectorSource?.addFeatures(allObjects);

  Object.keys(refs.clusterLayersRef.current).forEach((type) => {
    const layer = refs.clusterLayersRef.current[type];
    if (layer) {
      refs.map?.removeLayer(layer);
    }
  });
  refs.clusterLayersRef.current = {};
  refs.clusterSourcesRef.current = {};

  refs.dataLayer?.setVisible(true);
}
