import { useEffect, useRef, useCallback } from 'react';
import { Map as OLMap, Feature } from 'ol';
import { DragBox } from 'ol/interaction';
import { platformModifierKeyOnly } from 'ol/events/condition';
import { Geometry } from 'ol/geom';
import { GeoJSON } from 'ol/format';
import { MapObjectDetail, GeoJSONGeometry } from '../types';

interface UseBoxSelectionProps {
    mapInstance: React.MutableRefObject<OLMap | null>;
    isBoxSelectionActive: boolean;
    onFeaturesSelected: (features: MapObjectDetail[]) => void;
    mapReady?: boolean;
}

interface UseBoxSelectionReturn {
    isActive: boolean;
}

/**
 * Hook for box/rectangle selection on the map
 * When active, user can drag to create a selection rectangle
 * All features within the rectangle are selected
 */
export const useBoxSelection = ({
    mapInstance,
    isBoxSelectionActive,
    onFeaturesSelected,
    mapReady = false,
}: UseBoxSelectionProps): UseBoxSelectionReturn => {
    const dragBoxRef = useRef<DragBox | null>(null);
    const geoJSONFormat = useRef(new GeoJSON());

    // Helper to extract geometry from feature
    const extractGeometry = useCallback((feature: Feature<Geometry>): GeoJSONGeometry | undefined => {
        const geom = feature.getGeometry();
        if (!geom) return undefined;
        try {
            return geoJSONFormat.current.writeGeometryObject(geom, {
                featureProjection: 'EPSG:3857',
                dataProjection: 'EPSG:4326',
            }) as GeoJSONGeometry;
        } catch (e) {
            console.error('Error extracting geometry:', e);
            return undefined;
        }
    }, []);

    // Create MapObjectDetail from feature
    const featureToMapObject = useCallback((feature: Feature<Geometry>): MapObjectDetail | null => {
        const props = feature.getProperties();
        const type = props.object_type;

        // Skip if not a valid object or is a Site
        if (!type || type === 'Site') return null;

        const id = props.id;
        if (!id) return null;

        const name = props.nom || props.marque || `${type} #${id}`;

        return {
            id: String(id),
            type: type,
            title: name,
            subtitle: props.site_nom || '',
            attributes: props,
            geometry: extractGeometry(feature),
        };
    }, [extractGeometry]);

    useEffect(() => {
        const map = mapInstance.current;
        if (!map || !mapReady) return;

        // Clean up previous DragBox
        if (dragBoxRef.current) {
            map.removeInteraction(dragBoxRef.current);
            dragBoxRef.current = null;
        }

        if (!isBoxSelectionActive) {
            return;
        }

        // Create DragBox interaction
        const dragBox = new DragBox({
            condition: (evt) => {
                // Allow drag without modifier key when box selection is active
                // Or with Shift key for standard behavior
                return true;
            },
            className: 'ol-dragbox-selection',
        });

        dragBox.on('boxend', () => {
            const extent = dragBox.getGeometry().getExtent();
            const selectedFeatures: MapObjectDetail[] = [];

            // Get all layers and find features within the extent
            map.getLayers().forEach((layer) => {
                // Skip non-vector layers
                if (!('getSource' in layer)) return;

                const source = (layer as any).getSource();
                if (!source || !('forEachFeatureIntersectingExtent' in source)) return;

                // Check if it's a cluster source
                if ('getSource' in source) {
                    // It's a cluster - get the underlying source
                    const underlyingSource = source.getSource();
                    if (underlyingSource && 'forEachFeatureIntersectingExtent' in underlyingSource) {
                        underlyingSource.forEachFeatureIntersectingExtent(extent, (feature: Feature<Geometry>) => {
                            const mapObject = featureToMapObject(feature);
                            if (mapObject && !selectedFeatures.some(f => f.id === mapObject.id)) {
                                selectedFeatures.push(mapObject);
                            }
                        });
                    }
                } else {
                    // Regular vector source
                    source.forEachFeatureIntersectingExtent(extent, (feature: Feature<Geometry>) => {
                        // Check if this is a cluster feature
                        const clusteredFeatures = feature.get('features');
                        if (clusteredFeatures && Array.isArray(clusteredFeatures)) {
                            // It's a cluster - extract individual features
                            clusteredFeatures.forEach((clusterFeature: Feature<Geometry>) => {
                                const mapObject = featureToMapObject(clusterFeature);
                                if (mapObject && !selectedFeatures.some(f => f.id === mapObject.id)) {
                                    selectedFeatures.push(mapObject);
                                }
                            });
                        } else {
                            // Regular feature
                            const mapObject = featureToMapObject(feature);
                            if (mapObject && !selectedFeatures.some(f => f.id === mapObject.id)) {
                                selectedFeatures.push(mapObject);
                            }
                        }
                    });
                }
            });

            console.log('[useBoxSelection] Selected', selectedFeatures.length, 'features');

            if (selectedFeatures.length > 0) {
                onFeaturesSelected(selectedFeatures);
            }
        });

        map.addInteraction(dragBox);
        dragBoxRef.current = dragBox;

        // Change cursor to crosshair when box selection is active
        const mapElement = map.getTargetElement();
        if (mapElement) {
            (mapElement as HTMLElement).style.cursor = 'crosshair';
        }

        return () => {
            if (dragBoxRef.current) {
                map.removeInteraction(dragBoxRef.current);
                dragBoxRef.current = null;
            }
            // Reset cursor
            if (mapElement) {
                (mapElement as HTMLElement).style.cursor = '';
            }
        };
    }, [mapInstance, isBoxSelectionActive, mapReady, featureToMapObject, onFeaturesSelected]);

    return {
        isActive: isBoxSelectionActive,
    };
};
