import { useEffect, useRef, useState } from 'react';
import { Map, Feature } from 'ol';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import { Draw } from 'ol/interaction';
import { Overlay } from 'ol';
import { LineString, Polygon } from 'ol/geom';
import { getLength, getArea } from 'ol/sphere';
import { unByKey } from 'ol/Observable';
import { Measurement, MeasurementType } from '../types';

interface UseMeasurementToolsProps {
    mapInstance: React.MutableRefObject<Map | null>;
    isMeasuring: boolean;
    measurementType: MeasurementType;
    onMeasurementComplete?: (measurement: Measurement) => void;
    onMeasurementUpdate?: (measurement: Measurement | null) => void;
}

export const useMeasurementTools = ({
    mapInstance,
    isMeasuring,
    measurementType,
    onMeasurementComplete,
    onMeasurementUpdate
}: UseMeasurementToolsProps) => {
    const measureSourceRef = useRef<VectorSource | null>(null);
    const measureLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const sketchFeatureRef = useRef<Feature | null>(null);
    const helpTooltipElementRef = useRef<HTMLElement | null>(null);
    const helpTooltipOverlayRef = useRef<Overlay | null>(null);
    const measureTooltipElementRef = useRef<HTMLElement | null>(null);
    const measureTooltipOverlayRef = useRef<Overlay | null>(null);
    const drawInteractionRef = useRef<Draw | null>(null);
    const overlaysRef = useRef<Overlay[]>([]);

    // Initialize source and layer
    useEffect(() => {
        const source = new VectorSource();
        const layer = new VectorLayer({
            source: source,
            style: new Style({
                fill: new Fill({
                    color: 'rgba(255, 255, 255, 0.2)',
                }),
                stroke: new Stroke({
                    color: '#ffcc33',
                    width: 2,
                }),
                image: new CircleStyle({
                    radius: 7,
                    fill: new Fill({
                        color: '#ffcc33',
                    }),
                }),
            }),
            zIndex: 100, // Always on top
        });

        measureSourceRef.current = source;
        measureLayerRef.current = layer;

        return () => {
            // Cleanup happens via map removal logic in parent
        };
    }, []);

    // Handle Interactions
    useEffect(() => {
        const map = mapInstance.current;
        if (!map || !measureSourceRef.current) return;

        // cleanup previous interactions
        if (drawInteractionRef.current) {
            map.removeInteraction(drawInteractionRef.current);
            drawInteractionRef.current = null;
        }

        if (helpTooltipOverlayRef.current) {
            map.removeOverlay(helpTooltipOverlayRef.current);
            helpTooltipOverlayRef.current = null;
        }

        if (!isMeasuring) {
            return;
        }

        createHelpTooltip(map);

        const type = measurementType === 'area' ? 'Polygon' : 'LineString';
        const draw = new Draw({
            source: measureSourceRef.current,
            type: type,
            style: new Style({
                fill: new Fill({
                    color: 'rgba(255, 255, 255, 0.2)',
                }),
                stroke: new Stroke({
                    color: 'rgba(0, 0, 0, 0.5)',
                    lineDash: [10, 10],
                    width: 2,
                }),
                image: new CircleStyle({
                    radius: 5,
                    stroke: new Stroke({
                        color: 'rgba(0, 0, 0, 0.7)',
                    }),
                    fill: new Fill({
                        color: 'rgba(255, 255, 255, 0.2)',
                    }),
                }),
            }),
        });

        let listener: any;

        draw.on('drawstart', (evt) => {
            // set sketch
            sketchFeatureRef.current = evt.feature;

            // create tooltip for current measurement
            createMeasureTooltip(map);

            let tooltipCoord = evt.coordinate;

            listener = sketchFeatureRef.current.getGeometry()?.on('change', (evt) => {
                const geom = evt.target;
                let output = '';
                let tooltipPosition = null;

                if (geom instanceof Polygon) {
                    const area = getArea(geom);
                    output = formatArea(area);
                    tooltipPosition = geom.getInteriorPoint().getCoordinates();

                    if (onMeasurementUpdate) {
                        onMeasurementUpdate({
                            id: 'current',
                            type: 'area',
                            value: output,
                            timestamp: Date.now()
                        })
                    }

                } else if (geom instanceof LineString) {
                    const length = getLength(geom);
                    output = formatLength(length);
                    tooltipPosition = geom.getLastCoordinate();

                    if (onMeasurementUpdate) {
                        onMeasurementUpdate({
                            id: 'current',
                            type: 'distance',
                            value: output,
                            timestamp: Date.now()
                        })
                    }
                }

                if (measureTooltipElementRef.current) {
                    measureTooltipElementRef.current.innerHTML = output;
                }

                if (measureTooltipOverlayRef.current && tooltipPosition) {
                    measureTooltipOverlayRef.current.setPosition(tooltipPosition);
                }
            });
        });

        draw.on('drawend', (evt) => {
            if (measureTooltipElementRef.current) {
                measureTooltipElementRef.current.className = 'ol-tooltip ol-tooltip-static';
                measureTooltipOverlayRef.current?.setOffset([0, -7]);
            }

            const geom = evt.feature.getGeometry();
            let output = '';
            if (geom instanceof Polygon) {
                output = formatArea(getArea(geom));
            } else if (geom instanceof LineString) {
                output = formatLength(getLength(geom));
            }

            if (onMeasurementComplete) {
                onMeasurementComplete({
                    id: Date.now().toString(),
                    type: measurementType,
                    value: output,
                    timestamp: Date.now()
                });
            }

            // unset sketch
            sketchFeatureRef.current = null;
            if (measureTooltipElementRef.current) {
                // Keep the element ref to avoid clearing it, push to managed overlays
                if (measureTooltipOverlayRef.current) {
                    overlaysRef.current.push(measureTooltipOverlayRef.current);
                }
            }

            measureTooltipElementRef.current = null;
            createMeasureTooltip(map);
            unByKey(listener);
        });

        map.addInteraction(draw);
        drawInteractionRef.current = draw;

        // Pointer move handler for help tooltip
        const pointerMoveHandler = (evt: any) => {
            if (evt.dragging) {
                return;
            }
            let helpMsg = 'Cliquez pour commencer la mesure';

            if (sketchFeatureRef.current) {
                const geom = sketchFeatureRef.current.getGeometry();
                if (geom instanceof Polygon) {
                    helpMsg = 'Double-cliquez pour terminer le polygone';
                } else if (geom instanceof LineString) {
                    helpMsg = 'Double-cliquez pour terminer la ligne';
                }
            }

            if (helpTooltipElementRef.current) {
                helpTooltipElementRef.current.innerHTML = helpMsg;
                helpTooltipOverlayRef.current?.setPosition(evt.coordinate);
                helpTooltipElementRef.current.classList.remove('hidden');
            }
        };

        map.on('pointermove', pointerMoveHandler);
        map.getViewport().addEventListener('mouseout', () => {
            if (helpTooltipElementRef.current) {
                helpTooltipElementRef.current.classList.add('hidden');
            }
        });

        return () => {
            map.removeInteraction(draw);
            map.un('pointermove', pointerMoveHandler);
            drawInteractionRef.current = null;
            if (helpTooltipOverlayRef.current) {
                map.removeOverlay(helpTooltipOverlayRef.current);
            }
        };
    }, [mapInstance, isMeasuring, measurementType]);

    // Utility functions
    const createHelpTooltip = (map: Map) => {
        if (helpTooltipElementRef.current) {
            if (helpTooltipElementRef.current.parentNode) {
                helpTooltipElementRef.current.parentNode.removeChild(helpTooltipElementRef.current);
            }
        }
        helpTooltipElementRef.current = document.createElement('div');
        helpTooltipElementRef.current.className = 'ol-tooltip hidden';

        helpTooltipOverlayRef.current = new Overlay({
            element: helpTooltipElementRef.current,
            offset: [15, 0],
            positioning: 'center-left',
        });
        map.addOverlay(helpTooltipOverlayRef.current);
    };

    const createMeasureTooltip = (map: Map) => {
        if (measureTooltipElementRef.current) {
            // Do not remove it, it stays on map as static result
        }
        measureTooltipElementRef.current = document.createElement('div');
        measureTooltipElementRef.current.className = 'ol-tooltip ol-tooltip-measure';

        measureTooltipOverlayRef.current = new Overlay({
            element: measureTooltipElementRef.current,
            offset: [0, -15],
            positioning: 'bottom-center',
            stopEvent: false,
            insertFirst: false,
        });
        map.addOverlay(measureTooltipOverlayRef.current);
    };

    const formatLength = (length: number) => {
        if (length > 100) {
            return Math.round((length / 1000) * 100) / 100 + ' ' + 'km';
        } else {
            return Math.round(length * 100) / 100 + ' ' + 'm';
        }
    };

    const formatArea = (area: number) => {
        if (area > 10000) {
            return Math.round((area / 1000000) * 100) / 100 + ' ' + 'km²';
        } else {
            return Math.round(area * 100) / 100 + ' ' + 'm²';
        }
    };

    const clearMeasurements = () => {
        measureSourceRef.current?.clear();
        const map = mapInstance.current;
        if (!map) return;

        overlaysRef.current.forEach(overlay => {
            map.removeOverlay(overlay);
        });
        overlaysRef.current = [];

        if (measureTooltipOverlayRef.current) {
            map.removeOverlay(measureTooltipOverlayRef.current);
            measureTooltipOverlayRef.current = null;
        }

        // Reset current help tooltips
        createMeasureTooltip(map);
    };

    return {
        measureLayerRef,
        clearMeasurements
    };
};
