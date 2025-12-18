import { useEffect, useRef, useCallback } from 'react';
import { Map as OLMap, Feature, Collection } from 'ol';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import { Draw, Modify, Snap, Translate, Select } from 'ol/interaction';
import { Overlay } from 'ol';
import { Point, LineString, Polygon, Geometry } from 'ol/geom';
import { getLength, getArea } from 'ol/sphere';
import { unByKey } from 'ol/Observable';
import { GeoJSON } from 'ol/format';
import { DrawingMode, EditingMode, GeoJSONGeometry, GeometryMetrics, MapObjectDetail } from '../types';

interface UseDrawingToolsProps {
    mapInstance: React.MutableRefObject<OLMap | null>;
    drawingMode: DrawingMode;
    editingMode: EditingMode;
    isDrawing: boolean;
    selectedObjects?: MapObjectDetail[];
    onDrawStart?: () => void;
    onDrawEnd?: (geometry: GeoJSONGeometry, metrics: GeometryMetrics) => void;
    onDrawUpdate?: (metrics: GeometryMetrics) => void;
    onModifyEnd?: (geometry: GeoJSONGeometry, featureId: string, objectType: string) => void;
    onMoveEnd?: (geometry: GeoJSONGeometry, featureId: string, objectType: string) => void;
    onDeleteClick?: (featureId: string, objectType: string) => void;
}

interface UseDrawingToolsReturn {
    drawingLayerRef: React.MutableRefObject<VectorLayer<VectorSource> | null>;
    drawingSourceRef: React.MutableRefObject<VectorSource | null>;
    editingLayerRef: React.MutableRefObject<VectorLayer<VectorSource> | null>;
    clearDrawing: () => void;
    setFeatureForEditing: (geojson: GeoJSONGeometry, featureId: string) => void;
    removeEditingFeature: () => void;
    loadFeaturesForEditing: (objects: MapObjectDetail[]) => void;
}

// Style for drawing
const drawingStyle = new Style({
    fill: new Fill({
        color: 'rgba(34, 197, 94, 0.2)',
    }),
    stroke: new Stroke({
        color: '#22c55e',
        width: 3,
        lineDash: [5, 5],
    }),
    image: new CircleStyle({
        radius: 7,
        fill: new Fill({
            color: '#22c55e',
        }),
        stroke: new Stroke({
            color: '#ffffff',
            width: 2,
        }),
    }),
});

// Style for completed features
const completedStyle = new Style({
    fill: new Fill({
        color: 'rgba(34, 197, 94, 0.3)',
    }),
    stroke: new Stroke({
        color: '#16a34a',
        width: 3,
    }),
    image: new CircleStyle({
        radius: 8,
        fill: new Fill({
            color: '#16a34a',
        }),
        stroke: new Stroke({
            color: '#ffffff',
            width: 2,
        }),
    }),
});

// Style for vertices during modification
const modifyStyle = new Style({
    image: new CircleStyle({
        radius: 5,
        fill: new Fill({
            color: '#3b82f6',
        }),
        stroke: new Stroke({
            color: '#ffffff',
            width: 2,
        }),
    }),
});

// Style for features being edited (highlight)
const editingStyle = new Style({
    fill: new Fill({
        color: 'rgba(59, 130, 246, 0.3)',
    }),
    stroke: new Stroke({
        color: '#3b82f6',
        width: 3,
    }),
    image: new CircleStyle({
        radius: 8,
        fill: new Fill({
            color: '#3b82f6',
        }),
        stroke: new Stroke({
            color: '#ffffff',
            width: 2,
        }),
    }),
});

// Style for delete mode (red highlight on hover)
const deleteStyle = new Style({
    fill: new Fill({
        color: 'rgba(239, 68, 68, 0.3)',
    }),
    stroke: new Stroke({
        color: '#ef4444',
        width: 3,
    }),
    image: new CircleStyle({
        radius: 8,
        fill: new Fill({
            color: '#ef4444',
        }),
        stroke: new Stroke({
            color: '#ffffff',
            width: 2,
        }),
    }),
});

export const useDrawingTools = ({
    mapInstance,
    drawingMode,
    editingMode,
    isDrawing,
    selectedObjects = [],
    onDrawStart,
    onDrawEnd,
    onDrawUpdate,
    onModifyEnd,
    onMoveEnd,
    onDeleteClick,
}: UseDrawingToolsProps): UseDrawingToolsReturn => {
    const drawingSourceRef = useRef<VectorSource | null>(null);
    const drawingLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const editingSourceRef = useRef<VectorSource | null>(null);
    const editingLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const drawInteractionRef = useRef<Draw | null>(null);
    const modifyInteractionRef = useRef<Modify | null>(null);
    const snapInteractionRef = useRef<Snap | null>(null);
    const translateInteractionRef = useRef<Translate | null>(null);
    const selectInteractionRef = useRef<Select | null>(null);
    const helpTooltipRef = useRef<Overlay | null>(null);
    const helpTooltipElementRef = useRef<HTMLDivElement | null>(null);
    const measureTooltipRef = useRef<Overlay | null>(null);
    const measureTooltipElementRef = useRef<HTMLDivElement | null>(null);
    const sketchFeatureRef = useRef<Feature | null>(null);
    const geoJSONFormat = useRef(new GeoJSON());
    const editingFeatureIdRef = useRef<string | null>(null);
    const editingFeaturesRef = useRef<Map<string, Feature>>(new Map());

    // Store callbacks in refs to prevent effect re-triggering on every render
    const onDrawStartRef = useRef(onDrawStart);
    const onDrawEndRef = useRef(onDrawEnd);
    const onDrawUpdateRef = useRef(onDrawUpdate);
    const onModifyEndRef = useRef(onModifyEnd);
    const onMoveEndRef = useRef(onMoveEnd);
    const onDeleteClickRef = useRef(onDeleteClick);

    // Update refs when callbacks change
    useEffect(() => {
        onDrawStartRef.current = onDrawStart;
        onDrawEndRef.current = onDrawEnd;
        onDrawUpdateRef.current = onDrawUpdate;
        onModifyEndRef.current = onModifyEnd;
        onMoveEndRef.current = onMoveEnd;
        onDeleteClickRef.current = onDeleteClick;
    }, [onDrawStart, onDrawEnd, onDrawUpdate, onModifyEnd, onMoveEnd, onDeleteClick]);

    // Initialize source and layer
    useEffect(() => {
        // Drawing layer (for new features)
        const source = new VectorSource();
        const layer = new VectorLayer({
            source: source,
            style: completedStyle,
            zIndex: 200,
        });

        drawingSourceRef.current = source;
        drawingLayerRef.current = layer;

        // Editing layer (for existing features being modified)
        const editingSource = new VectorSource();
        const editingLayer = new VectorLayer({
            source: editingSource,
            style: editingStyle,
            zIndex: 250,
        });

        editingSourceRef.current = editingSource;
        editingLayerRef.current = editingLayer;

        return () => {
            // Cleanup
            editingFeaturesRef.current.clear();
        };
    }, []);

    // Calculate metrics from geometry
    const calculateMetrics = useCallback((geom: Point | LineString | Polygon): GeometryMetrics => {
        const metrics: GeometryMetrics = {};

        if (geom instanceof Polygon) {
            const area = getArea(geom);
            metrics.area_m2 = Math.round(area * 100) / 100;
            metrics.area_hectares = Math.round((area / 10000) * 10000) / 10000;

            // Calculate perimeter
            const coords = geom.getLinearRing(0)?.getCoordinates();
            if (coords) {
                const perimeterLine = new LineString(coords);
                metrics.perimeter_m = Math.round(getLength(perimeterLine) * 100) / 100;
            }
        } else if (geom instanceof LineString) {
            const length = getLength(geom);
            metrics.length_m = Math.round(length * 100) / 100;
            metrics.length_km = Math.round((length / 1000) * 10000) / 10000;
        }

        // Calculate centroid
        const extent = geom.getExtent();
        metrics.centroid = {
            lng: (extent[0] + extent[2]) / 2,
            lat: (extent[1] + extent[3]) / 2,
        };

        return metrics;
    }, []);

    // Format area for display
    const formatArea = (area: number): string => {
        if (area > 10000) {
            return `${(area / 10000).toFixed(2)} ha`;
        }
        return `${area.toFixed(1)} m²`;
    };

    // Format length for display
    const formatLength = (length: number): string => {
        if (length > 1000) {
            return `${(length / 1000).toFixed(2)} km`;
        }
        return `${length.toFixed(1)} m`;
    };

    // Create help tooltip
    const createHelpTooltip = useCallback((map: OLMap) => {
        if (helpTooltipElementRef.current) {
            helpTooltipElementRef.current.parentNode?.removeChild(helpTooltipElementRef.current);
        }

        helpTooltipElementRef.current = document.createElement('div');
        helpTooltipElementRef.current.className = 'ol-tooltip ol-tooltip-help';

        helpTooltipRef.current = new Overlay({
            element: helpTooltipElementRef.current,
            offset: [15, 0],
            positioning: 'center-left',
        });

        map.addOverlay(helpTooltipRef.current);
    }, []);

    // Create measure tooltip
    const createMeasureTooltip = useCallback((map: OLMap) => {
        measureTooltipElementRef.current = document.createElement('div');
        measureTooltipElementRef.current.className = 'ol-tooltip ol-tooltip-measure';

        measureTooltipRef.current = new Overlay({
            element: measureTooltipElementRef.current,
            offset: [0, -15],
            positioning: 'bottom-center',
            stopEvent: false,
        });

        map.addOverlay(measureTooltipRef.current);
    }, []);

    // Handle drawing interactions
    useEffect(() => {
        const map = mapInstance.current;
        if (!map || !drawingSourceRef.current) return;

        // Remove previous interactions
        if (drawInteractionRef.current) {
            map.removeInteraction(drawInteractionRef.current);
            drawInteractionRef.current = null;
        }
        if (modifyInteractionRef.current) {
            map.removeInteraction(modifyInteractionRef.current);
            modifyInteractionRef.current = null;
        }
        if (snapInteractionRef.current) {
            map.removeInteraction(snapInteractionRef.current);
            snapInteractionRef.current = null;
        }
        if (helpTooltipRef.current) {
            map.removeOverlay(helpTooltipRef.current);
            helpTooltipRef.current = null;
        }
        if (measureTooltipRef.current) {
            map.removeOverlay(measureTooltipRef.current);
            measureTooltipRef.current = null;
        }

        if (!isDrawing || drawingMode === 'none') {
            return;
        }

        // Map drawing mode to OL type
        const typeMap: Record<DrawingMode, 'Point' | 'LineString' | 'Polygon' | undefined> = {
            'point': 'Point',
            'line': 'LineString',
            'polygon': 'Polygon',
            'none': undefined,
        };

        const drawType = typeMap[drawingMode];
        if (!drawType) return;

        // Create tooltips
        createHelpTooltip(map);
        if (drawType !== 'Point') {
            createMeasureTooltip(map);
        }

        // Create draw interaction
        const draw = new Draw({
            source: drawingSourceRef.current,
            type: drawType,
            style: drawingStyle,
        });

        let changeListener: any;

        draw.on('drawstart', (evt) => {
            sketchFeatureRef.current = evt.feature;
            onDrawStartRef.current?.();

            // For lines and polygons, show live measurements
            if (drawType !== 'Point') {
                changeListener = evt.feature.getGeometry()?.on('change', (e) => {
                    const geom = e.target;
                    let output = '';
                    let tooltipPosition: number[] | undefined;

                    if (geom instanceof Polygon) {
                        const area = getArea(geom);
                        output = formatArea(area);
                        tooltipPosition = geom.getInteriorPoint().getCoordinates();

                        const metrics = calculateMetrics(geom);
                        onDrawUpdateRef.current?.(metrics);
                    } else if (geom instanceof LineString) {
                        const length = getLength(geom);
                        output = formatLength(length);
                        tooltipPosition = geom.getLastCoordinate();

                        const metrics = calculateMetrics(geom);
                        onDrawUpdateRef.current?.(metrics);
                    }

                    if (measureTooltipElementRef.current) {
                        measureTooltipElementRef.current.innerHTML = output;
                    }
                    if (measureTooltipRef.current && tooltipPosition) {
                        measureTooltipRef.current.setPosition(tooltipPosition);
                    }
                });
            }
        });

        draw.on('drawend', (evt) => {
            const feature = evt.feature;
            const geom = feature.getGeometry();

            if (geom) {
                // Convert to GeoJSON
                const geoJSONGeom = geoJSONFormat.current.writeGeometryObject(geom, {
                    featureProjection: 'EPSG:3857',
                    dataProjection: 'EPSG:4326',
                }) as GeoJSONGeometry;

                // Calculate metrics
                const metrics = calculateMetrics(geom as Point | LineString | Polygon);

                // Style the completed feature
                feature.setStyle(completedStyle);

                // Notify parent
                onDrawEndRef.current?.(geoJSONGeom, metrics);
            }

            // Cleanup
            sketchFeatureRef.current = null;
            if (changeListener) {
                unByKey(changeListener);
            }

            // Make tooltip static
            if (measureTooltipElementRef.current) {
                measureTooltipElementRef.current.className = 'ol-tooltip ol-tooltip-static';
            }
        });

        // Add snap interaction for better precision
        const snap = new Snap({ source: drawingSourceRef.current });

        map.addInteraction(draw);
        map.addInteraction(snap);

        drawInteractionRef.current = draw;
        snapInteractionRef.current = snap;

        // Pointer move handler for help tooltip
        const pointerMoveHandler = (evt: any) => {
            if (evt.dragging) return;

            let helpMsg = '';
            if (drawType === 'Point') {
                helpMsg = 'Cliquez pour placer le point';
            } else if (drawType === 'LineString') {
                helpMsg = sketchFeatureRef.current
                    ? 'Cliquez pour continuer, double-cliquez pour terminer'
                    : 'Cliquez pour commencer la ligne';
            } else if (drawType === 'Polygon') {
                helpMsg = sketchFeatureRef.current
                    ? 'Cliquez pour continuer, double-cliquez pour fermer'
                    : 'Cliquez pour commencer le polygone';
            }

            if (helpTooltipElementRef.current) {
                helpTooltipElementRef.current.innerHTML = helpMsg;
                helpTooltipRef.current?.setPosition(evt.coordinate);
                helpTooltipElementRef.current.classList.remove('hidden');
            }
        };

        map.on('pointermove', pointerMoveHandler);

        const mouseOutHandler = () => {
            if (helpTooltipElementRef.current) {
                helpTooltipElementRef.current.classList.add('hidden');
            }
        };
        map.getViewport().addEventListener('mouseout', mouseOutHandler);

        return () => {
            map.removeInteraction(draw);
            map.removeInteraction(snap);
            map.un('pointermove', pointerMoveHandler);
            map.getViewport().removeEventListener('mouseout', mouseOutHandler);

            if (helpTooltipRef.current) {
                map.removeOverlay(helpTooltipRef.current);
            }
            if (measureTooltipRef.current) {
                map.removeOverlay(measureTooltipRef.current);
            }
        };
    }, [mapInstance, drawingMode, isDrawing, calculateMetrics, createHelpTooltip, createMeasureTooltip]);

    // Clear drawing
    const clearDrawing = useCallback(() => {
        drawingSourceRef.current?.clear();

        const map = mapInstance.current;
        if (map) {
            if (measureTooltipRef.current) {
                map.removeOverlay(measureTooltipRef.current);
                measureTooltipRef.current = null;
            }
        }
    }, [mapInstance]);

    // Set feature for editing (used when editing existing objects)
    const setFeatureForEditing = useCallback((geojson: GeoJSONGeometry, featureId: string) => {
        if (!drawingSourceRef.current) return;

        // Clear existing features
        drawingSourceRef.current.clear();

        // Create feature from GeoJSON
        const feature = geoJSONFormat.current.readFeature(
            { type: 'Feature', geometry: geojson, properties: {} },
            {
                featureProjection: 'EPSG:3857',
                dataProjection: 'EPSG:4326',
            }
        ) as Feature<Geometry>;

        feature.setId(featureId);
        feature.setStyle(completedStyle);
        drawingSourceRef.current.addFeature(feature);
        editingFeatureIdRef.current = featureId;

        // Add modify interaction
        const map = mapInstance.current;
        if (map) {
            if (modifyInteractionRef.current) {
                map.removeInteraction(modifyInteractionRef.current);
            }

            const modify = new Modify({
                source: drawingSourceRef.current,
                style: modifyStyle,
            });

            modify.on('modifyend', (evt) => {
                const modifiedFeature = evt.features.getArray()[0];
                if (modifiedFeature) {
                    const geom = modifiedFeature.getGeometry();
                    const objectType = modifiedFeature.get('objectType') || 'Arbre';
                    if (geom) {
                        const updatedGeoJSON = geoJSONFormat.current.writeGeometryObject(geom, {
                            featureProjection: 'EPSG:3857',
                            dataProjection: 'EPSG:4326',
                        }) as GeoJSONGeometry;

                        onModifyEndRef.current?.(updatedGeoJSON, editingFeatureIdRef.current || '', objectType);
                    }
                }
            });

            map.addInteraction(modify);
            modifyInteractionRef.current = modify;
        }
    }, [mapInstance]);

    // Remove editing feature
    const removeEditingFeature = useCallback(() => {
        drawingSourceRef.current?.clear();
        editingFeatureIdRef.current = null;

        const map = mapInstance.current;
        if (map && modifyInteractionRef.current) {
            map.removeInteraction(modifyInteractionRef.current);
            modifyInteractionRef.current = null;
        }
    }, [mapInstance]);

    // Load multiple features for editing (from selected objects)
    const loadFeaturesForEditing = useCallback((objects: MapObjectDetail[]) => {
        console.log('[useDrawingTools] loadFeaturesForEditing called with:', objects.length, 'objects');

        if (!editingSourceRef.current) {
            console.warn('[useDrawingTools] No editing source available');
            return;
        }

        // Clear existing editing features
        editingSourceRef.current.clear();
        editingFeaturesRef.current.clear();

        let loadedCount = 0;
        objects.forEach(obj => {
            console.log('[useDrawingTools] Processing object:', obj.id, obj.type, 'has geometry:', !!obj.geometry);
            if (obj.geometry) {
                try {
                    const feature = geoJSONFormat.current.readFeature(
                        { type: 'Feature', geometry: obj.geometry, properties: { objectType: obj.type } },
                        {
                            featureProjection: 'EPSG:3857',
                            dataProjection: 'EPSG:4326',
                        }
                    ) as Feature<Geometry>;
                    feature.setId(obj.id);
                    feature.set('objectType', obj.type);
                    feature.set('objectId', obj.id);
                    editingSourceRef.current?.addFeature(feature);
                    editingFeaturesRef.current.set(obj.id, feature as Feature);
                    loadedCount++;
                } catch (e) {
                    console.error('Error loading feature for editing:', obj.id, e);
                }
            }
        });

        console.log('[useDrawingTools] Loaded', loadedCount, 'features for editing');
    }, []);

    // Handle editing mode interactions (modify, move, delete)
    useEffect(() => {
        const map = mapInstance.current;
        console.log('[useDrawingTools] Editing effect triggered:', {
            editingMode,
            selectedObjectsCount: selectedObjects.length,
            hasMap: !!map,
            hasEditingSource: !!editingSourceRef.current
        });

        if (!map || !editingSourceRef.current) return;

        // Clean up previous editing interactions
        const cleanupInteractions = () => {
            if (modifyInteractionRef.current) {
                map.removeInteraction(modifyInteractionRef.current);
                modifyInteractionRef.current = null;
            }
            if (translateInteractionRef.current) {
                map.removeInteraction(translateInteractionRef.current);
                translateInteractionRef.current = null;
            }
            if (selectInteractionRef.current) {
                map.removeInteraction(selectInteractionRef.current);
                selectInteractionRef.current = null;
            }
        };

        // If no editing mode or no selected objects, cleanup and return
        if (editingMode === 'none' || selectedObjects.length === 0) {
            cleanupInteractions();
            editingSourceRef.current.clear();
            editingFeaturesRef.current.clear();
            return;
        }

        // Load selected objects into editing layer
        loadFeaturesForEditing(selectedObjects);

        // Make sure editing layer is on the map
        const layers = map.getLayers().getArray();
        if (editingLayerRef.current && !layers.includes(editingLayerRef.current)) {
            map.addLayer(editingLayerRef.current);
        }

        // Setup interactions based on editing mode
        if (editingMode === 'modify') {
            // MODIFY MODE - Edit vertices
            const modify = new Modify({
                source: editingSourceRef.current,
                style: modifyStyle,
            });

            modify.on('modifyend', (evt) => {
                evt.features.forEach((feature) => {
                    const geom = feature.getGeometry();
                    const featureId = feature.getId() as string || feature.get('objectId');
                    const objectType = feature.get('objectType') || 'Arbre';
                    if (geom && featureId) {
                        const updatedGeoJSON = geoJSONFormat.current.writeGeometryObject(geom, {
                            featureProjection: 'EPSG:3857',
                            dataProjection: 'EPSG:4326',
                        }) as GeoJSONGeometry;
                        onModifyEndRef.current?.(updatedGeoJSON, featureId, objectType);
                    }
                });
            });

            map.addInteraction(modify);
            modifyInteractionRef.current = modify;

            // Add snap for better precision
            const snap = new Snap({ source: editingSourceRef.current });
            map.addInteraction(snap);
            snapInteractionRef.current = snap;

        } else if (editingMode === 'move') {
            // MOVE MODE - Translate entire features
            const features = editingSourceRef.current.getFeatures();
            const featuresCollection = new Collection<Feature<Geometry>>();
            features.forEach(f => featuresCollection.push(f));

            const translate = new Translate({
                features: featuresCollection,
            });

            translate.on('translateend', (evt) => {
                evt.features.forEach((feature) => {
                    const geom = feature.getGeometry();
                    const featureId = feature.getId() as string || feature.get('objectId');
                    const objectType = feature.get('objectType') || 'Arbre';
                    if (geom && featureId) {
                        const updatedGeoJSON = geoJSONFormat.current.writeGeometryObject(geom, {
                            featureProjection: 'EPSG:3857',
                            dataProjection: 'EPSG:4326',
                        }) as GeoJSONGeometry;
                        onMoveEndRef.current?.(updatedGeoJSON, featureId, objectType);
                    }
                });
            });

            map.addInteraction(translate);
            translateInteractionRef.current = translate;

        } else if (editingMode === 'delete') {
            // DELETE MODE - Click to select and delete
            // Style features in red to indicate delete mode
            editingLayerRef.current?.setStyle(deleteStyle);

            // Click handler for delete
            const deleteClickHandler = (evt: any) => {
                map.forEachFeatureAtPixel(evt.pixel, (feature) => {
                    const featureId = feature.getId() as string || feature.get('objectId');
                    const objectType = feature.get('objectType');
                    if (featureId && onDeleteClickRef.current) {
                        onDeleteClickRef.current(featureId, objectType);
                    }
                    return true; // Stop at first feature
                }, {
                    layerFilter: (layer) => layer === editingLayerRef.current
                });
            };

            map.on('click', deleteClickHandler);

            // Store handler reference for cleanup
            (map as any)._deleteClickHandler = deleteClickHandler;
        }

        return () => {
            cleanupInteractions();
            // Cleanup delete click handler
            if ((map as any)._deleteClickHandler) {
                map.un('click', (map as any)._deleteClickHandler);
                delete (map as any)._deleteClickHandler;
            }
            // Reset style
            if (editingLayerRef.current) {
                editingLayerRef.current.setStyle(editingStyle);
            }
            if (snapInteractionRef.current) {
                map.removeInteraction(snapInteractionRef.current);
                snapInteractionRef.current = null;
            }
        };
    }, [mapInstance, editingMode, selectedObjects, loadFeaturesForEditing]);

    return {
        drawingLayerRef,
        drawingSourceRef,
        editingLayerRef,
        clearDrawing,
        setFeatureForEditing,
        removeEditingFeature,
        loadFeaturesForEditing,
    };
};
