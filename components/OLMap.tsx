
import React, { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import Cluster from 'ol/source/Cluster';
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj';
import { Circle as CircleStyle, Fill, Stroke, Style, Text, Icon } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';

import Overlay from 'ol/Overlay';
import { Feature } from 'ol';
import { Point, LineString, Polygon } from 'ol/geom';
import { defaults as defaultControls, ScaleLine } from 'ol/control';

import { LayerConfig, Coordinates } from "../types";
import { INITIAL_POSITION, VEG_LEGEND, HYDRO_LEGEND, SITE_LEGEND } from "../constants";
// Note: Les sites sont maintenant chargés dynamiquement depuis l'API dans fetchData()

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// SVG Icons for site categories
const createSiteIcon = (color: string, category: string, isHovered: boolean = false): string => {
    const size = isHovered ? 48 : 40;
    const iconSize = isHovered ? 24 : 20;

    // Icon paths for each category
    const iconPaths: Record<string, string> = {
        'RECHERCHE': `<path d="M${size / 2 - iconSize / 4} ${size / 2 - iconSize / 4} l${iconSize / 2} 0 l0 ${iconSize / 2} l-${iconSize / 2} 0 z M${size / 2 - iconSize / 6} ${size / 2 + iconSize / 4} l${iconSize / 3} ${iconSize / 3}" stroke="white" stroke-width="2" fill="none"/>`, // Microscope/Lab
        'INFRASTRUCTURE': `<path d="M${size / 2 - iconSize / 3} ${size / 2 + iconSize / 4} L${size / 2} ${size / 2 - iconSize / 3} L${size / 2 + iconSize / 3} ${size / 2 + iconSize / 4} Z" stroke="white" stroke-width="2" fill="none"/>`, // Building
        'RESIDENCE': `<path d="M${size / 2 - iconSize / 3} ${size / 2 + iconSize / 5} L${size / 2} ${size / 2 - iconSize / 4} L${size / 2 + iconSize / 3} ${size / 2 + iconSize / 5} L${size / 2 + iconSize / 3} ${size / 2 + iconSize / 3} L${size / 2 - iconSize / 3} ${size / 2 + iconSize / 3} Z" stroke="white" stroke-width="2" fill="none"/>`, // House
        'SANTE': `<path d="M${size / 2 - iconSize / 6} ${size / 2 - iconSize / 3} v${iconSize * 2 / 3} M${size / 2 - iconSize / 3} ${size / 2} h${iconSize * 2 / 3}" stroke="white" stroke-width="3" fill="none"/>`, // Cross
        'HOTELLERIE': `<path d="M${size / 2 - iconSize / 3} ${size / 2 + iconSize / 4} v-${iconSize / 2} h${iconSize * 2 / 3} v${iconSize / 2} M${size / 2 - iconSize / 4} ${size / 2 - iconSize / 4} h${iconSize / 2}" stroke="white" stroke-width="2" fill="none"/>` // Bed
    };

    const shadowOffset = isHovered ? 4 : 2;
    const glowRadius = isHovered ? 8 : 0;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 12}" viewBox="0 0 ${size} ${size + 12}">
            <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="${shadowOffset}" stdDeviation="3" flood-color="rgba(0,0,0,0.4)"/>
                </filter>
                ${isHovered ? `<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="${glowRadius}" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>` : ''}
            </defs>
            <!-- Pin shape -->
            <g filter="url(#shadow)" ${isHovered ? 'filter="url(#glow)"' : ''}>
                <path d="M${size / 2} ${size + 8}
                         C${size / 2} ${size + 8} ${size / 2 - 6} ${size / 2 + 12} ${size / 2 - size / 2 + 4} ${size / 2}
                         A${size / 2 - 4} ${size / 2 - 4} 0 1 1 ${size - 4} ${size / 2}
                         C${size - 4} ${size / 2 + 8} ${size / 2 + 6} ${size + 8} ${size / 2} ${size + 8} Z"
                      fill="${color}" stroke="white" stroke-width="2"/>
                <!-- Category icon -->
                <circle cx="${size / 2}" cy="${size / 2}" r="${iconSize / 2 + 2}" fill="rgba(255,255,255,0.2)"/>
                ${iconPaths[category] || iconPaths['INFRASTRUCTURE']}
            </g>
        </svg>
    `)}`;
};

// Simpler marker icon
const createMarkerIcon = (color: string, isHovered: boolean = false): string => {
    const size = isHovered ? 44 : 36;
    const pinHeight = isHovered ? 56 : 48;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${pinHeight}" viewBox="0 0 ${size} ${pinHeight}">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${color};stop-opacity:0.8" />
                </linearGradient>
                <filter id="shadow">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
                </filter>
            </defs>
            <g filter="url(#shadow)">
                <!-- Pin body -->
                <path d="M${size / 2} ${pinHeight - 4}
                         L${size / 2 - 8} ${size / 2 + 4}
                         A${size / 2 - 4} ${size / 2 - 4} 0 1 1 ${size / 2 + 8} ${size / 2 + 4}
                         Z"
                      fill="url(#grad)" stroke="white" stroke-width="${isHovered ? 3 : 2}"/>
                <!-- Inner circle -->
                <circle cx="${size / 2}" cy="${size / 2 - 2}" r="${isHovered ? 10 : 8}" fill="white" opacity="0.9"/>
                <circle cx="${size / 2}" cy="${size / 2 - 2}" r="${isHovered ? 6 : 4}" fill="${color}"/>
            </g>
        </svg>
    `)}`;
};

// Create mapping of colors
const OBJECT_COLORS: Record<string, string> = {
    ...Object.fromEntries(VEG_LEGEND.map(item => [item.type, item.color])),
    ...Object.fromEntries(HYDRO_LEGEND.map(item => [item.type, item.color])),
    ...Object.fromEntries(SITE_LEGEND.map(item => [item.type, item.color]))
};

// Mapping frontend types to API types
const TYPE_TO_API: Record<string, string> = {
    'Site': 'sites',
    'Arbre': 'arbres',
    'Gazon': 'gazons',
    'Palmier': 'palmiers',
    'Arbuste': 'arbustes',
    'Vivace': 'vivaces',
    'Cactus': 'cactus',
    'Graminee': 'graminees',
    'Puit': 'puits',
    'Pompe': 'pompes',
    'Vanne': 'vannes',
    'Clapet': 'clapets',
    'Canalisation': 'canalisations',
    'Aspersion': 'aspersions',
    'Goutte': 'gouttes',
    'Ballon': 'ballons'
};

interface OLMapProps {
    activeLayer: LayerConfig;
    targetLocation: { coordinates: Coordinates; zoom?: number } | null;
    userLocation?: Coordinates | null;
    onMoveEnd?: (center: Coordinates, zoom: number) => void;
    onObjectClick?: (object: any) => void;
    isSidebarCollapsed?: boolean;
    mapRef?: any;
    overlays?: any;
    isMeasuring?: boolean;
    measurePoints?: any;
    onMeasureClick?: any;
    isRouting?: boolean;
    clusteringEnabled?: boolean;
    onToggleLayer?: (layerId: string, visible: boolean) => void;
}

export const OLMap = React.forwardRef<any, OLMapProps>(({
    activeLayer,
    targetLocation,
    userLocation,
    onMoveEnd,
    onObjectClick,
    isSidebarCollapsed = true,
    // Props kept for compatibility but might need implementation
    overlays,
    isMeasuring,
    measurePoints,
    onMeasureClick,
    isRouting,
    clusteringEnabled,
    onToggleLayer
}, ref) => {
    const innerMapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<Map | null>(null);

    const dataLayerRef = useRef<VectorLayer<VectorSource> | null>(null); // For clusters/markers (objects)
    const sitesLayerRef = useRef<VectorLayer<VectorSource> | null>(null); // For site boundaries (containers)
    const sitesSourceRef = useRef<VectorSource | null>(null); // Source for sites polygons
    const vectorSourceRef = useRef<VectorSource | null>(null); // Raw vector source for objects
    const clusterSourceRef = useRef<Cluster | null>(null); // Cluster source wrapper for objects
    const popupRef = useRef<HTMLDivElement>(null);
    const popupOverlay = useRef<Overlay | null>(null);

    React.useImperativeHandle(ref, () => ({
        zoomIn: () => {
            if (mapInstance.current) {
                const view = mapInstance.current.getView();
                view.animate({ zoom: (view.getZoom() || 0) + 1, duration: 250 });
            }
        },
        zoomOut: () => {
            if (mapInstance.current) {
                const view = mapInstance.current.getView();
                view.animate({ zoom: (view.getZoom() || 0) - 1, duration: 250 });
            }
        },
        getZoom: () => {
            return mapInstance.current?.getView().getZoom() || 0;
        },
        getCenter: (): Coordinates | null => {
            if (!mapInstance.current) return null;
            const center = mapInstance.current.getView().getCenter();
            if (!center) return null;
            const [lng, lat] = toLonLat(center);
            return { lat, lng };
        },
        getMapElement: () => {
            return innerMapRef.current;
        },
        exportCanvas: (): Promise<string> => {
            return new Promise((resolve, reject) => {
                if (!mapInstance.current) {
                    reject(new Error('Map not initialized'));
                    return;
                }

                const map = mapInstance.current;

                // Force a render and wait for completion
                map.once('rendercomplete', () => {
                    try {
                        const mapCanvas = document.createElement('canvas');
                        const size = map.getSize();
                        if (!size) {
                            reject(new Error('Map size not available'));
                            return;
                        }

                        mapCanvas.width = size[0];
                        mapCanvas.height = size[1];
                        const mapContext = mapCanvas.getContext('2d');

                        if (!mapContext) {
                            reject(new Error('Could not get canvas context'));
                            return;
                        }

                        // Get all canvas elements from the map viewport
                        const mapViewport = map.getViewport();
                        const canvases = mapViewport.querySelectorAll('canvas');

                        canvases.forEach((canvas) => {
                            if (canvas.width > 0) {
                                const opacity = (canvas.parentNode as HTMLElement)?.style?.opacity || '1';
                                mapContext.globalAlpha = parseFloat(opacity);

                                // Get the transform from the canvas style
                                const transform = canvas.style.transform;
                                const matrix = transform
                                    .match(/matrix\(([^)]+)\)/)?.[1]
                                    ?.split(',')
                                    .map(Number) || [1, 0, 0, 1, 0, 0];

                                mapContext.setTransform(
                                    matrix[0], matrix[1], matrix[2],
                                    matrix[3], matrix[4], matrix[5]
                                );

                                mapContext.drawImage(canvas, 0, 0);
                            }
                        });

                        mapContext.globalAlpha = 1;
                        mapContext.setTransform(1, 0, 0, 1, 0, 0);

                        resolve(mapCanvas.toDataURL('image/png'));
                    } catch (err) {
                        reject(err);
                    }
                });

                // Trigger render
                map.renderSync();
            });
        },
        invalidateSize: () => {
            mapInstance.current?.updateSize();
        },
        flyTo: (lat: number, lng: number, zoom: number) => {
            mapInstance.current?.getView().animate({
                center: fromLonLat([lng, lat]),
                zoom: zoom,
                duration: 1500
            });
        }
    }));


    // Drawing interactions


    // State - Initialize with all layer types visible
    const [visibleLayers, setVisibleLayers] = useState<string[]>(() =>
        [...SITE_LEGEND, ...VEG_LEGEND, ...HYDRO_LEGEND].map(item => item.type)
    );
    const [symbologyConfig, setSymbologyConfig] = useState<any>({});
    const [hoveredSiteId, setHoveredSiteId] = useState<string | null>(null);
    const hoverOverlayRef = useRef<Overlay | null>(null);

    // Initialize Map
    useEffect(() => {
        if (!innerMapRef.current) return;

        const baseLayer = new TileLayer({
            source: new XYZ({
                url: activeLayer.url,
                maxZoom: activeLayer.maxNativeZoom || 19,
                attributions: activeLayer.attribution,
                crossOrigin: 'anonymous'
            })
        });



        // Create hover tooltip overlay
        const hoverTooltip = document.createElement('div');
        hoverTooltip.id = 'site-hover-tooltip';
        hoverTooltip.className = 'site-tooltip';
        hoverTooltip.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 12px 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2), 0 2px 10px rgba(0,0,0,0.1);
            pointer-events: none;
            min-width: 180px;
            max-width: 280px;
            border: 1px solid rgba(0,0,0,0.05);
            transform: translateY(-10px);
            opacity: 0;
            transition: opacity 0.2s, transform 0.2s;
            z-index: 9999 !important;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        document.body.appendChild(hoverTooltip);

        const hoverOverlay = new Overlay({
            element: hoverTooltip,
            positioning: 'bottom-center',
            offset: [0, -60],
            stopEvent: false
        });
        hoverOverlayRef.current = hoverOverlay;

        // ================================================================
        // SITES LAYER - Separate layer for site boundaries (containers)
        // ================================================================
        const sitesSource = new VectorSource();
        sitesSourceRef.current = sitesSource;

        const sitesLayer = new VectorLayer({
            source: sitesSource,
            zIndex: 10, // Below objects layer
            style: (feature) => {
                const isVisible = (window as any).getVisibleLayers?.()?.includes('Site') ?? true;
                if (!isVisible) {
                    return new Style({});
                }

                const isHovered = feature.get('hovered') === true;
                const isSelected = feature.get('selected') === true;
                const siteId = feature.get('site_id');

                // Generate a consistent color based on site ID
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
                const colorIndex = siteId ? Math.abs(String(siteId).split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length : 0;
                const baseColor = colors[colorIndex];

                return new Style({
                    fill: new Fill({
                        color: isSelected ? baseColor + '40' : baseColor + '20' // 25% or 12% opacity
                    }),
                    stroke: new Stroke({
                        color: baseColor,
                        width: isHovered ? 4 : isSelected ? 3 : 2,
                        lineDash: isSelected ? [] : [8, 4] // Dashed when not selected
                    }),
                    text: new Text({
                        text: feature.get('nom_site') || '',
                        font: isHovered ? 'bold 14px sans-serif' : '12px sans-serif',
                        fill: new Fill({ color: '#1f2937' }),
                        stroke: new Stroke({ color: '#ffffff', width: 3 }),
                        overflow: true,
                        placement: 'point'
                    })
                });
            }
        });
        sitesLayerRef.current = sitesLayer;

        // ================================================================
        // OBJECTS LAYER - For vegetation and hydraulic objects
        // ================================================================
        const vectorSource = new VectorSource();
        vectorSourceRef.current = vectorSource;

        // Cluster source wrapping the vector source (for objects only, not sites)
        // Only used when clustering is enabled
        const clusterSource = new Cluster({
            distance: clusteringEnabled ? 50 : 0,
            source: vectorSource,
            geometryFunction: (feature) => {
                const geometry = feature.getGeometry();
                if (!geometry) return null;

                const geomType = geometry.getType();

                if (geomType === 'Point') {
                    return geometry as Point;
                } else if (geomType === 'Polygon') {
                    const polygon = geometry as Polygon;
                    const extent = polygon.getExtent();
                    const centerX = (extent[0] + extent[2]) / 2;
                    const centerY = (extent[1] + extent[3]) / 2;
                    return new Point([centerX, centerY]);
                } else if (geomType === 'LineString') {
                    const line = geometry as LineString;
                    const coords = line.getCoordinates();
                    if (coords.length > 0) {
                        const midIndex = Math.floor(coords.length / 2);
                        return new Point(coords[midIndex]);
                    }
                    return null;
                } else if (geomType === 'MultiPolygon' || geomType === 'MultiLineString' || geomType === 'MultiPoint') {
                    const extent = geometry.getExtent();
                    const centerX = (extent[0] + extent[2]) / 2;
                    const centerY = (extent[1] + extent[3]) / 2;
                    return new Point([centerX, centerY]);
                }

                return null;
            }
        });
        clusterSourceRef.current = clusterSource;

        // Use cluster source only if clustering is enabled, otherwise use raw vector source
        const dataLayer = new VectorLayer({
            source: clusteringEnabled ? clusterSource : vectorSource,
            zIndex: 50, // Above sites layer (zIndex: 10)
            style: (feature) => {
                const visibleLayersList = (window as any).getVisibleLayers?.() || [];

                // Check if this is a clustered feature or a raw feature
                const clusterFeatures = feature.get('features');

                if (clusterFeatures && clusterFeatures.length > 0) {
                    // ============================================
                    // CLUSTERED MODE: Feature comes from ClusterSource
                    // ============================================

                    // Filter features based on visibility
                    const visibleFeatures = clusterFeatures.filter((f: Feature) => {
                        const type = f.get('object_type');
                        return type !== 'Site' && visibleLayersList.includes(type);
                    });

                    // If no visible features, return empty style (hidden)
                    if (visibleFeatures.length === 0) {
                        return new Style({});
                    }

                    const size = visibleFeatures.length;

                    if (size > 1) {
                        // CLUSTER: Multiple objects grouped together
                        let dominantColor = '#22c55e'; // Default green for vegetation
                        let vegCount = 0;
                        let hydroCount = 0;

                        visibleFeatures.forEach((f: Feature) => {
                            const type = f.get('object_type');
                            if (['Arbre', 'Palmier', 'Gazon', 'Arbuste', 'Vivace', 'Cactus', 'Graminee'].includes(type)) {
                                vegCount++;
                            } else {
                                hydroCount++;
                            }
                            if (type && OBJECT_COLORS[type]) dominantColor = OBJECT_COLORS[type];
                        });

                        // Use vegetation or hydraulic color based on majority
                        if (hydroCount > vegCount) {
                            dominantColor = '#0ea5e9'; // Blue for hydraulic
                        } else {
                            dominantColor = '#22c55e'; // Green for vegetation
                        }

                        return new Style({
                            image: new CircleStyle({
                                radius: 18 + Math.min(size * 2, 20),
                                stroke: new Stroke({ color: '#fff', width: 3 }),
                                fill: new Fill({ color: dominantColor })
                            }),
                            text: new Text({
                                text: size.toString(),
                                fill: new Fill({ color: '#fff' }),
                                font: 'bold 14px sans-serif'
                            })
                        });
                    } else {
                        // SINGLE FEATURE in cluster: Show individual object marker
                        const originalFeature = visibleFeatures[0];
                        const type = originalFeature.get('object_type');
                        const color = OBJECT_COLORS[type] || '#6b7280';
                        const symbolConfig = (window as any).getSymbologyConfig?.()?.[type];

                        if (originalFeature.getGeometry()?.getType() === 'Point') {
                            return new Style({
                                image: new CircleStyle({
                                    radius: 8,
                                    fill: new Fill({ color: symbolConfig?.fillColor || color }),
                                    stroke: new Stroke({ color: '#fff', width: 2 })
                                })
                            });
                        } else {
                            return new Style({
                                fill: new Fill({
                                    color: symbolConfig?.fillColor
                                        ? symbolConfig.fillColor + Math.round((symbolConfig.fillOpacity || 0.5) * 255).toString(16).padStart(2, '0')
                                        : color + '4d'
                                }),
                                stroke: new Stroke({
                                    color: symbolConfig?.strokeColor || color,
                                    width: symbolConfig?.strokeWidth || 2
                                })
                            });
                        }
                    }
                } else {
                    // ============================================
                    // NON-CLUSTERED MODE: Raw feature from VectorSource
                    // ============================================
                    const type = feature.get('object_type');

                    // Check visibility
                    if (!type || type === 'Site' || !visibleLayersList.includes(type)) {
                        return new Style({});
                    }

                    const color = OBJECT_COLORS[type] || '#6b7280';
                    const symbolConfig = (window as any).getSymbologyConfig?.()?.[type];
                    const geomType = feature.getGeometry()?.getType();

                    if (geomType === 'Point') {
                        return new Style({
                            image: new CircleStyle({
                                radius: 8,
                                fill: new Fill({ color: symbolConfig?.fillColor || color }),
                                stroke: new Stroke({ color: '#fff', width: 2 })
                            })
                        });
                    } else if (geomType === 'LineString' || geomType === 'MultiLineString') {
                        return new Style({
                            stroke: new Stroke({
                                color: symbolConfig?.strokeColor || color,
                                width: symbolConfig?.strokeWidth || 3
                            })
                        });
                    } else {
                        // Polygon
                        return new Style({
                            fill: new Fill({
                                color: symbolConfig?.fillColor
                                    ? symbolConfig.fillColor + Math.round((symbolConfig.fillOpacity || 0.5) * 255).toString(16).padStart(2, '0')
                                    : color + '4d'
                            }),
                            stroke: new Stroke({
                                color: symbolConfig?.strokeColor || color,
                                width: symbolConfig?.strokeWidth || 2
                            })
                        });
                    }
                }
            }
        });
        dataLayerRef.current = dataLayer;

        // Overlay for popups
        const overlay = new Overlay({
            element: popupRef.current!,
            autoPan: {
                animation: {
                    duration: 250,
                },
            },
        });
        popupOverlay.current = overlay;

        const map = new Map({
            target: innerMapRef.current,
            layers: [baseLayer, sitesLayer, dataLayer], // Sites below objects
            view: new View({
                center: fromLonLat([
                    INITIAL_POSITION?.lng ?? -6.8498,
                    INITIAL_POSITION?.lat ?? 33.9716
                ]),
                zoom: INITIAL_POSITION?.zoom ?? 6
            }),
            controls: defaultControls().extend([new ScaleLine()])
        });

        map.addOverlay(overlay);
        map.addOverlay(hoverOverlay);

        mapInstance.current = map;

        // Initial data fetch after map is ready
        // Use setTimeout to ensure map is fully rendered
        setTimeout(() => {
            fetchData();
        }, 500);

        // Track last hovered feature for cleanup
        let lastHoveredFeature: Feature | null = null;

        // Pointer move event for hover effect on sites and objects
        map.on('pointermove', (evt) => {
            if (evt.dragging) {
              return;
            }
            const pixel = map.getEventPixel(evt.originalEvent);

            // Check both sites and objects layers
            const hitSites = map.hasFeatureAtPixel(pixel, {
                layerFilter: (l) => l === sitesLayerRef.current
            });
            const hitObjects = map.hasFeatureAtPixel(pixel, {
                layerFilter: (l) => l === dataLayerRef.current
            });
            map.getTargetElement().style.cursor = (hitSites || hitObjects) ? 'pointer' : '';

            // Check for site feature first (priority to sites layer)
            let currentHoveredFeature: Feature | null = null;

            const siteFeature = map.forEachFeatureAtPixel(pixel, (feat) => feat as Feature, {
                layerFilter: (l) => l === sitesLayerRef.current
            });

            if (siteFeature && siteFeature.get('object_type') === 'Site') {
                currentHoveredFeature = siteFeature;
            }

            if (lastHoveredFeature && lastHoveredFeature !== currentHoveredFeature) {
                lastHoveredFeature.set('hovered', false);
            }

            if (currentHoveredFeature) {
                currentHoveredFeature.set('hovered', true);
                const name = currentHoveredFeature.get('nom_site');
                const code = currentHoveredFeature.get('code_site');
                const superficie = currentHoveredFeature.get('superficie_totale');
                const siteId = currentHoveredFeature.get('site_id');

                // Generate color based on site ID
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
                const colorIndex = siteId ? Math.abs(String(siteId).split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)) % colors.length : 0;
                const color = colors[colorIndex];

                // Update tooltip content
                hoverTooltip.innerHTML = `
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <div style="
                            width: 10px;
                            height: 10px;
                            border-radius: 50%;
                            background: ${color};
                            margin-top: 5px;
                            flex-shrink: 0;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        "></div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 700; font-size: 14px; color: #1f2937; margin-bottom: 2px; line-height: 1.3;">
                                ${name || 'Site'}
                            </div>
                            <div style="font-size: 11px; color: ${color}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                                ${code || ''}
                            </div>
                            ${superficie ? `<div style="font-size: 12px; color: #6b7280; line-height: 1.4;">
                                Surface: ${Number(superficie).toLocaleString('fr-FR')} m²
                            </div>` : ''}
                        </div>
                    </div>
                `;

                // Position tooltip at event coordinate
                hoverOverlay.setPosition(evt.coordinate);
                hoverTooltip.style.opacity = '1';
                hoverTooltip.style.transform = 'translateY(0)';
                setHoveredSiteId(siteId);

                // Force redraw of sites layer
                sitesLayerRef.current?.changed();
            } else {
                hoverTooltip.style.opacity = '0';
                hoverTooltip.style.transform = 'translateY(-10px)';
                hoverOverlay.setPosition(undefined);
                setHoveredSiteId(null);

                // Force redraw if we un-hovered a site
                if (lastHoveredFeature) {
                    sitesLayerRef.current?.changed();
                }
            }

            lastHoveredFeature = currentHoveredFeature;
        });

        // Hide tooltip when mouse leaves map
        map.getTargetElement().addEventListener('mouseleave', () => {
            if (lastHoveredFeature) {
                lastHoveredFeature.set('hovered', false);
                lastHoveredFeature = null;
                sitesLayerRef.current?.changed();
            }
            hoverTooltip.style.opacity = '0';
            hoverTooltip.style.transform = 'translateY(-10px)';
            hoverOverlay.setPosition(undefined);
            setHoveredSiteId(null);
        });

        // Event listeners
        map.on('moveend', () => {
            if (onMoveEnd) {
                const view = map.getView();
                const center = toLonLat(view.getCenter()!);
                onMoveEnd({ lat: center[1], lng: center[0] }, view.getZoom()!);
            }
            fetchData();
        });

        map.on('click', (evt) => {
            popupOverlay.current?.setPosition(undefined); // Close popup on any click first

            // FIRST: Check for object click (data layer) - priority over sites
            const feature = map.forEachFeatureAtPixel(evt.pixel, (feat) => feat as Feature, {
                layerFilter: (l) => l === dataLayerRef.current
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
            const siteFeature = map.forEachFeatureAtPixel(evt.pixel, (feat) => feat as Feature, {
                layerFilter: (l) => l === sitesLayerRef.current
            });

            if (siteFeature && siteFeature.get('object_type') === 'Site') {
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
        });

        return () => {
            map.setTarget(null);
            // Clean up hover tooltip
            const tooltip = document.getElementById('site-hover-tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        };
    }, []);

    // Update Base Layer if changed
    useEffect(() => {
        if (mapInstance.current) {
            const layers = mapInstance.current.getLayers();
            const baseLayer = layers.item(0) as TileLayer<XYZ>;
            baseLayer.setSource(new XYZ({
                url: activeLayer.url,
                maxZoom: activeLayer.maxNativeZoom || 19,
                attributions: activeLayer.attribution,
                crossOrigin: 'anonymous'
            }));
        }
    }, [activeLayer]);

    // Handle Target Location (flyTo)
    useEffect(() => {
        if (mapInstance.current && targetLocation?.coordinates) {
            const view = mapInstance.current.getView();
            const { lat, lng } = targetLocation.coordinates;
            if (!isNaN(lat) && !isNaN(lng)) {
                view.animate({
                    center: fromLonLat([lng, lat]),
                    zoom: targetLocation.zoom || 16,
                    duration: 1500
                });
            }
        }
    }, [targetLocation]);

    // Fetch Data Function - Fetches sites and objects separately
    const fetchData = async () => {
        console.log('=== fetchData START ===');

        if (!mapInstance.current || !dataLayerRef.current || !sitesLayerRef.current) {
            console.log('Early return - refs not ready');
            return;
        }

        const geojsonFormat = new GeoJSON();
        const objectFeatures: Feature[] = [];
        const siteFeatures: Feature[] = [];

        // Helper function to fetch and process a single endpoint
        const fetchEndpoint = async (endpoint: string, objectType: string): Promise<Feature[]> => {
            try {
                const url = `${API_BASE_URL}/${endpoint}/`;
                const response = await fetch(url);

                if (response.ok) {
                    const data = await response.json();

                    // DRF GeoFeatureModelSerializer with pagination returns:
                    // { count, next, previous, results: { type: 'FeatureCollection', features: [...] } }
                    let featureCollection = null;

                    if (data.results && data.results.type === 'FeatureCollection') {
                        featureCollection = data.results;
                    } else if (data.type === 'FeatureCollection') {
                        featureCollection = data;
                    }

                    if (featureCollection && featureCollection.features) {
                        console.log(`${endpoint}: ${featureCollection.features.length} features`);

                        const features = geojsonFormat.readFeatures(featureCollection, {
                            dataProjection: 'EPSG:4326',
                            featureProjection: 'EPSG:3857'
                        });

                        features.forEach((feature, index) => {
                            feature.set('object_type', objectType);
                            const objId = feature.get('id') || index;
                            feature.setId(`${objectType}-${objId}`);

                            // For sites, also set site_id for color generation
                            if (objectType === 'Site') {
                                feature.set('site_id', objId);
                            }
                        });

                        return features;
                    }
                } else {
                    console.warn(`API ${endpoint} error:`, response.status);
                }
            } catch (err) {
                console.warn(`Error fetching ${endpoint}:`, err);
            }
            return [];
        };

        // ================================================================
        // FETCH SITES (separate layer - always fetch if Site is visible)
        // ================================================================
        if (visibleLayers.includes('Site')) {
            const sites = await fetchEndpoint('sites', 'Site');
            siteFeatures.push(...sites);
        }

        // Update sites source
        if (sitesSourceRef.current) {
            sitesSourceRef.current.clear();
            sitesSourceRef.current.addFeatures(siteFeatures);
            console.log('Sites in source:', sitesSourceRef.current.getFeatures().length);
        }

        // ================================================================
        // FETCH OBJECTS (clustered layer - all types except Site)
        // ================================================================
        const objectTypes = visibleLayers.filter(t => t !== 'Site');
        const fetchPromises = objectTypes.map(layerType => {
            const endpoint = TYPE_TO_API[layerType];
            if (endpoint) {
                return fetchEndpoint(endpoint, layerType);
            }
            return Promise.resolve([]);
        });

        const results = await Promise.all(fetchPromises);
        results.forEach(features => objectFeatures.push(...features));

        console.log('Total objects fetched:', objectFeatures.length);

        // Update objects source
        if (vectorSourceRef.current) {
            vectorSourceRef.current.clear();
            vectorSourceRef.current.addFeatures(objectFeatures);
            console.log('Objects in source:', vectorSourceRef.current.getFeatures().length);
        }
    };

    // Expose visibleLayers to window for style function to access AND fetch data
    useEffect(() => {
        // IMPORTANT: Set getVisibleLayers BEFORE fetching data
        // The style function uses this to filter visible features
        (window as any).getVisibleLayers = () => visibleLayers;

        // Now fetch data (style function will have access to visibleLayers)
        fetchData();

        // Force re-render of both layers when visibility changes
        if (dataLayerRef.current) {
            dataLayerRef.current.changed();
        }
        if (sitesLayerRef.current) {
            sitesLayerRef.current.changed();
        }

        return () => { delete (window as any).getVisibleLayers; };
    }, [visibleLayers]);

    // Handle clustering toggle - switch between cluster source and raw vector source
    useEffect(() => {
        if (!dataLayerRef.current || !vectorSourceRef.current || !clusterSourceRef.current) return;

        if (clusteringEnabled) {
            // Enable clustering - use cluster source with distance
            clusterSourceRef.current.setDistance(50);
            dataLayerRef.current.setSource(clusterSourceRef.current);
        } else {
            // Disable clustering - use raw vector source directly (no clustering at all)
            dataLayerRef.current.setSource(vectorSourceRef.current);
        }

        // Force layer refresh
        dataLayerRef.current.changed();
    }, [clusteringEnabled]);

    // Expose API to Window for MapPage
    useEffect(() => {
        (window as any).updateLayerSymbology = (type: string, config: any) => {
            setSymbologyConfig(prev => ({ ...prev, [type]: config }));
            // Force redraw by toggling layer visibility or triggering render
            if (dataLayerRef.current) {
                dataLayerRef.current.changed();
            }
        };

        return () => {
            delete (window as any).updateLayerSymbology;
        }
    }, []);

    // Popup logic
    const showPopup = (coordinate: any, properties: any) => {
        if (!popupRef.current) return;

        const content = document.getElementById('popup-content');
        if (content) {
            content.innerHTML = `
            <div style="padding: 5px;">
               <strong>${properties.nom || properties.object_type || 'Objet'}</strong><br/>
               <small>${properties.object_type}</small>
            </div>
          `;
        }
        popupOverlay.current?.setPosition(coordinate);
    };

    // Handle layer toggle from parent (MapPage)
    const handleToggleLayer = React.useCallback((id: string, visible: boolean) => {
        setVisibleLayers(prev => {
            if (visible) return prev.includes(id) ? prev : [...prev, id];
            return prev.filter(l => l !== id);
        });
        // Also call parent callback if provided
        if (onToggleLayer) onToggleLayer(id, visible);
    }, [onToggleLayer]);

    // Expose handleToggleLayer to window for MapPage to use
    useEffect(() => {
        (window as any).toggleMapLayer = handleToggleLayer;
        return () => { delete (window as any).toggleMapLayer; };
    }, [handleToggleLayer]);

    return (
        <div className="h-full w-full relative">
            <div ref={innerMapRef} className="h-full w-full bg-slate-100" />

            <div ref={popupRef} className="ol-popup bg-white p-2 rounded shadow-lg border border-gray-200 min-w-[150px]">
                <a href="#" className="ol-popup-closer absolute top-1 right-2 text-gray-500 font-bold" onClick={(e) => {
                    e.preventDefault();
                    popupOverlay.current?.setPosition(undefined);
                }}>✖</a>
                <div id="popup-content"></div>
            </div>
        </div>
    );
});

export default OLMap;
