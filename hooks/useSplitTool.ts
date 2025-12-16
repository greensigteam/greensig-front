import { useState, useCallback, useRef, useEffect } from 'react';
import { Map } from 'ol';
import { Draw } from 'ol/interaction';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Feature } from 'ol';
import { Geometry, LineString, Polygon } from 'ol/geom';
import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import { splitPolygon } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { GeoJSONGeometry } from '../types';

interface UseSplitToolOptions {
    onSplitComplete?: (originalFeature: Feature, resultGeometries: GeoJSONGeometry[]) => void;
    onCancel?: () => void;
}

interface UseSplitToolReturn {
    // State
    isActive: boolean;
    isSplitting: boolean;
    targetFeature: Feature | null;
    splitLine: Feature<LineString> | null;

    // Actions
    startSplit: (feature: Feature<Polygon>) => void;
    confirmSplit: () => Promise<GeoJSONGeometry[] | null>;
    cancelSplit: () => void;

    // Layer for rendering
    splitLayer: VectorLayer<VectorSource> | null;
}

// Style for the split line
const splitLineStyle = new Style({
    stroke: new Stroke({
        color: '#ef4444',
        width: 3,
        lineDash: [10, 10],
    }),
});

// Style for the target polygon being split
const targetPolygonStyle = new Style({
    stroke: new Stroke({
        color: '#ef4444',
        width: 2,
    }),
    fill: new Fill({
        color: 'rgba(239, 68, 68, 0.2)',
    }),
});

// Style for drawing vertices
const vertexStyle = new Style({
    image: new CircleStyle({
        radius: 6,
        fill: new Fill({
            color: '#ef4444',
        }),
        stroke: new Stroke({
            color: '#ffffff',
            width: 2,
        }),
    }),
});

/**
 * Hook for splitting polygons with a drawn line
 */
export function useSplitTool(
    map: Map | null,
    options: UseSplitToolOptions = {}
): UseSplitToolReturn {
    const { onSplitComplete, onCancel } = options;
    const { showToast } = useToast();

    const [isActive, setIsActive] = useState(false);
    const [isSplitting, setIsSplitting] = useState(false);
    const [targetFeature, setTargetFeature] = useState<Feature | null>(null);
    const [splitLine, setSplitLine] = useState<Feature<LineString> | null>(null);

    // Refs for OpenLayers objects
    const splitSourceRef = useRef<VectorSource>(new VectorSource());
    const splitLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const drawInteractionRef = useRef<Draw | null>(null);
    const geoJSONFormat = useRef(new GeoJSON());

    // Initialize split layer
    useEffect(() => {
        if (!map) return;

        // Create split layer if not exists
        if (!splitLayerRef.current) {
            splitLayerRef.current = new VectorLayer({
                source: splitSourceRef.current,
                style: (feature) => {
                    const geom = feature.getGeometry();
                    if (geom instanceof LineString) {
                        return [splitLineStyle, vertexStyle];
                    }
                    return targetPolygonStyle;
                },
                zIndex: 1000,
            });
            map.addLayer(splitLayerRef.current);
        }

        return () => {
            if (splitLayerRef.current && map) {
                map.removeLayer(splitLayerRef.current);
                splitLayerRef.current = null;
            }
        };
    }, [map]);

    // Start split mode for a polygon
    const startSplit = useCallback((feature: Feature<Polygon>) => {
        if (!map) {
            showToast('Carte non disponible', 'error');
            return;
        }

        const geometry = feature.getGeometry();
        if (!geometry || !(geometry instanceof Polygon)) {
            showToast('Veuillez sélectionner un polygone', 'error');
            return;
        }

        // Clear previous state
        splitSourceRef.current.clear();
        setSplitLine(null);

        // Add target polygon to split layer
        const targetClone = feature.clone();
        splitSourceRef.current.addFeature(targetClone);
        setTargetFeature(feature);

        // Create draw interaction for line
        const draw = new Draw({
            source: splitSourceRef.current,
            type: 'LineString',
            style: [splitLineStyle, vertexStyle],
        });

        draw.on('drawend', (event) => {
            const drawnFeature = event.feature as Feature<LineString>;
            setSplitLine(drawnFeature);

            // Remove draw interaction after line is drawn
            if (map && drawInteractionRef.current) {
                map.removeInteraction(drawInteractionRef.current);
                drawInteractionRef.current = null;
            }

            showToast('Ligne de découpe tracée. Cliquez sur "Confirmer" pour diviser.', 'info');
        });

        map.addInteraction(draw);
        drawInteractionRef.current = draw;
        setIsActive(true);

        showToast('Tracez une ligne pour diviser le polygone', 'info');
    }, [map, showToast]);

    // Confirm and execute the split
    const confirmSplit = useCallback(async (): Promise<GeoJSONGeometry[] | null> => {
        if (!targetFeature || !splitLine) {
            showToast('Tracez d\'abord une ligne de découpe', 'error');
            return null;
        }

        const targetGeom = targetFeature.getGeometry();
        const lineGeom = splitLine.getGeometry();

        if (!targetGeom || !lineGeom) {
            showToast('Géométries invalides', 'error');
            return null;
        }

        setIsSplitting(true);

        try {
            // Convert to GeoJSON
            const polygonGeoJSON = JSON.parse(
                geoJSONFormat.current.writeGeometry(targetGeom, {
                    featureProjection: 'EPSG:3857',
                    dataProjection: 'EPSG:4326',
                })
            ) as GeoJSONGeometry;

            const lineGeoJSON = JSON.parse(
                geoJSONFormat.current.writeGeometry(lineGeom, {
                    featureProjection: 'EPSG:3857',
                    dataProjection: 'EPSG:4326',
                })
            ) as GeoJSONGeometry;

            // Call API
            const result = await splitPolygon(polygonGeoJSON, lineGeoJSON);

            if (result.success && result.geometries && result.geometries.length > 1) {
                showToast(`Polygone divisé en ${result.geometries.length} parties`, 'success');

                // Callback with results
                onSplitComplete?.(targetFeature, result.geometries);

                // Clean up
                cancelSplit();

                return result.geometries;
            } else {
                showToast(
                    result.error || 'La ligne ne divise pas correctement le polygone',
                    'error'
                );
                return null;
            }
        } catch (error: any) {
            showToast(error.message || 'Erreur lors de la division', 'error');
            return null;
        } finally {
            setIsSplitting(false);
        }
    }, [targetFeature, splitLine, showToast, onSplitComplete]);

    // Cancel split mode
    const cancelSplit = useCallback(() => {
        // Remove draw interaction
        if (map && drawInteractionRef.current) {
            map.removeInteraction(drawInteractionRef.current);
            drawInteractionRef.current = null;
        }

        // Clear split layer
        splitSourceRef.current.clear();

        // Reset state
        setIsActive(false);
        setTargetFeature(null);
        setSplitLine(null);

        onCancel?.();
    }, [map, onCancel]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (map && drawInteractionRef.current) {
                map.removeInteraction(drawInteractionRef.current);
            }
        };
    }, [map]);

    return {
        isActive,
        isSplitting,
        targetFeature,
        splitLine,
        startSplit,
        confirmSplit,
        cancelSplit,
        splitLayer: splitLayerRef.current,
    };
}

/**
 * Helper to check if a line properly crosses a polygon for splitting
 */
export function validateSplitLine(
    polygon: Polygon,
    line: LineString
): { valid: boolean; message: string } {
    const lineCoords = line.getCoordinates();

    if (lineCoords.length < 2) {
        return { valid: false, message: 'La ligne doit avoir au moins 2 points' };
    }

    // Check if line starts and ends outside the polygon
    const firstPoint = lineCoords[0];
    const lastPoint = lineCoords[lineCoords.length - 1];

    const startsInside = polygon.intersectsCoordinate(firstPoint);
    const endsInside = polygon.intersectsCoordinate(lastPoint);

    // Ideally, line should cross through the polygon
    // This is a basic check - the backend does proper validation

    if (startsInside && endsInside) {
        return {
            valid: false,
            message: 'La ligne doit traverser le polygone de part en part',
        };
    }

    return { valid: true, message: '' };
}
