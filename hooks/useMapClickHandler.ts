import { useEffect } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Point } from 'ol/geom';
import Overlay from 'ol/Overlay';
import type Map from 'ol/Map';
import type { Feature } from 'ol';
import type { MapObjectDetail, MapBrowserEvent } from '../types';
import { useSelection } from '../contexts/SelectionContext'; // Added this import

export interface UseMapClickHandlerOptions {
  mapInstance: React.RefObject<Map | null>;
  dataLayerRef: React.RefObject<VectorLayer<VectorSource> | null>;
  sitesLayerRef: React.RefObject<VectorLayer<VectorSource> | null>;
  popupOverlayRef: React.RefObject<Overlay | null>;
  onObjectClick?: (object: MapObjectDetail | null) => void;
  mapReady?: boolean; // ✅ Flag to trigger hook after map creation
  isMeasuring?: boolean; // ✅ Disable click handling when measuring
  onSiteClick?: (site: MapObjectDetail) => void; // Added this line
}

/**
 * Custom hook for map click event handling
 *
 * Features:
 * - Handles clicks on objects (vegetation, hydraulic)
 * - Handles clicks on sites (polygons)
 * - Cluster zoom-in on multi-feature clusters
 * - Single feature detail display
 * - Priority: objects > sites
 * - Closes popup on any click
 * - Auto-cleanup on unmount
 *
 * @param options - Configuration options
 */
export function useMapClickHandler(options: UseMapClickHandlerOptions): void {
  const {
    mapInstance,
    dataLayerRef,
    sitesLayerRef,
    popupOverlayRef,
    onObjectClick,
    onSiteClick, // Added this
    mapReady = false,
    isMeasuring = false
  } = options;

  // ✅ Call useSelection at hook level, NOT inside useEffect
  const { isSelectionMode, toggleObjectSelection } = useSelection();

  useEffect(() => {
    const map = mapInstance.current;

    if (!map) return;

    if (isMeasuring) {
      // Don't register click handler if measuring
      return;
    }

    const handleMapClick = (evt: MapBrowserEvent<UIEvent>) => {
      // Close popup on any click first
      popupOverlayRef.current?.setPosition(undefined);

      // FIRST: Check for object click (any layer including clusters) - priority over sites
      // ✅ Don't filter by layer - allows detecting both dataLayer and clusterLayers
      const feature = map.forEachFeatureAtPixel(evt.pixel, (feat) => {
        // Check if it's a cluster or direct feature
        const features = feat.get('features');
        if (features && features.length > 0) {
          // It's from a cluster - return it if it's not a Site
          const firstFeat = features[0];
          const type = firstFeat.get('object_type');
          return type && type !== 'Site' ? (feat as Feature) : undefined;
        }
        // Direct feature - return it if it's not a Site
        const type = feat.get('object_type');
        return type && type !== 'Site' ? (feat as Feature) : undefined;
      });

      if (feature) {
        // Check if this is a clustered feature or a raw feature
        const featuresInCluster = feature.get('features');

        if (featuresInCluster && featuresInCluster.length > 0) {
          // CLUSTERED MODE
          if (featuresInCluster.length > 1) {
            // Click on a cluster: zoom in
            const view = map.getView();
            if (view.getZoom()! < 19) {
              view.animate({
                center: (feature.getGeometry() as Point).getCoordinates(),
                zoom: view.getZoom()! + 2,
                duration: 500
              });
            }
          } else {
            // Click on a single object feature in cluster
            const singleFeature = featuresInCluster[0];
            const props = singleFeature.getProperties();

            // ✅ SELECTION MODE: Toggle selection instead of showing modal
            if (isSelectionMode) {
              const name = props.nom || props.marque || `${props.object_type} #${props.id}`;
              toggleObjectSelection({
                id: props.id,
                type: props.object_type,
                title: name,
                subtitle: props.site_nom || '',
                attributes: props
              });
              return; // Don't show modal
            }

            // Normal mode: Show object detail modal
            if (onObjectClick) {
              const name = props.nom || props.marque || `${props.object_type} #${props.id}`;
              onObjectClick({
                id: props.id,
                type: props.object_type,
                title: name,
                subtitle: props.site_nom || '',
                attributes: props
              });
            }
          }
          return; // Object found, don't check sites
        } else {
          // NON-CLUSTERED MODE: Raw feature
          const props = feature.getProperties();
          const type = props.object_type;

          // Only handle non-Site objects here
          if (type && type !== 'Site') {
            // ✅ SELECTION MODE: Toggle selection
            if (isSelectionMode) {
              const name = props.nom || props.marque || `${type} #${props.id}`;
              toggleObjectSelection({
                id: props.id,
                type: type,
                title: name,
                subtitle: props.site_nom || '',
                attributes: props
              });
              return; // Don't show modal
            }

            // Normal mode: Show object detail modal
            if (onObjectClick) {
              const name = props.nom || props.marque || `${type} #${props.id}`;
              onObjectClick({
                id: props.id,
                type: type,
                title: name,
                subtitle: props.site_nom || '',
                attributes: props
              });
            }
            return; // Object found, don't check sites
          }
        }
      }

      // THEN: Check for site click (sites layer) - only if no object was clicked
      const siteFeature = map.forEachFeatureAtPixel(evt.pixel, (feat) => {
        const type = feat.get('object_type');
        return type === 'Site' ? (feat as Feature) : undefined;
      });

      if (siteFeature) {
        const props = siteFeature.getProperties();
        if (onObjectClick) {
          onObjectClick({
            id: props.id || props.site_id,
            type: 'Site',
            title: props.nom_site || 'Site',
            subtitle: props.code_site || '',
            attributes: {
              'Code': props.code_site,
              'Adresse': props.adresse || '-',
              'Surface totale': props.superficie_totale ? `${Number(props.superficie_totale).toLocaleString('fr-FR')} m²` : '-',
              'Date début contrat': props.date_debut_contrat || '-',
              'Date fin contrat': props.date_fin_contrat || '-',
              'Actif': props.actif ? 'Oui' : 'Non'
            }
          });
        }
      }
    };

    map.on('click', handleMapClick);

    // Cleanup on unmount
    return () => {
      map.un('click', handleMapClick);
    };
  }, [mapInstance, dataLayerRef, sitesLayerRef, popupOverlayRef, onObjectClick, onSiteClick, mapReady, isMeasuring, isSelectionMode, toggleObjectSelection]);
}
