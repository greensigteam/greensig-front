
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
import { SITES } from "../data/sites";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

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

    const dataLayerRef = useRef<VectorLayer<VectorSource> | null>(null); // For clusters/markers
    const sitesLayerRef = useRef<VectorLayer<VectorSource> | null>(null); // For static sites
    const vectorSourceRef = useRef<VectorSource | null>(null); // Raw vector source for data
    const clusterSourceRef = useRef<Cluster | null>(null); // Cluster source wrapper
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
                attributions: activeLayer.attribution
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

        // Single vector source for all data (sites + API data)
        const vectorSource = new VectorSource();
        vectorSourceRef.current = vectorSource;

        // Add static sites to the vector source
        SITES.forEach(site => {
            const feature = new Feature({
                geometry: new Point(fromLonLat([site.coordinates.lng, site.coordinates.lat])),
                name: site.name,
                description: site.description,
                category: site.category,
                color: site.color,
                object_type: 'Site',
                site_id: site.id
            });
            feature.setId(site.id);
            vectorSource.addFeature(feature);
        });

        // Cluster source wrapping the vector source
        const clusterSource = new Cluster({
            distance: clusteringEnabled ? 50 : 0, // Use prop value
            source: vectorSource
        });
        clusterSourceRef.current = clusterSource;

        const dataLayer = new VectorLayer({
            source: clusterSource,
            zIndex: 50,
            style: (feature) => {
                const features = feature.get('features');
                if (!features || features.length === 0) {
                    return new Style({
                        image: new CircleStyle({
                            radius: 6,
                            fill: new Fill({ color: '#6b7280' }),
                            stroke: new Stroke({ color: '#fff', width: 2 })
                        })
                    });
                }

                // Filter features based on visibility
                const visibleLayersList = (window as any).getVisibleLayers?.() || [];
                const visibleFeatures = features.filter((f: Feature) => {
                    const type = f.get('object_type');
                    return visibleLayersList.includes(type);
                });

                // If no visible features, return empty style (hidden)
                if (visibleFeatures.length === 0) {
                    return new Style({});
                }

                const size = visibleFeatures.length;

                if (size > 1) {
                    // CLUSTER: Multiple features grouped together
                    // Count sites vs other types
                    let siteCount = 0;
                    let otherCount = 0;
                    let dominantColor = '#3b82f6';

                    visibleFeatures.forEach((f: Feature) => {
                        if (f.get('object_type') === 'Site') {
                            siteCount++;
                            dominantColor = f.get('color') || '#3b82f6';
                        } else {
                            otherCount++;
                            const type = f.get('object_type');
                            if (type && OBJECT_COLORS[type]) dominantColor = OBJECT_COLORS[type];
                        }
                    });

                    // If mostly sites, use site color
                    if (siteCount > otherCount) {
                        dominantColor = '#3b82f6'; // Blue for sites cluster
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
                    // SINGLE FEATURE: Show individual marker
                    const originalFeature = visibleFeatures[0];
                    const type = originalFeature.get('object_type');

                    // Check if it's a Site
                    if (type === 'Site') {
                        const color = originalFeature.get('color') || '#3b82f6';
                        const isHovered = originalFeature.get('hovered') === true;

                        return new Style({
                            image: new Icon({
                                src: createMarkerIcon(color, isHovered),
                                anchor: [0.5, 1],
                                anchorXUnits: 'fraction',
                                anchorYUnits: 'fraction',
                                scale: isHovered ? 1.1 : 1
                            })
                        });
                    }

                    // Other types (vegetation, hydrology, etc.)
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
            layers: [baseLayer, dataLayer],
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

        // Track last hovered feature for cleanup
        let lastHoveredFeature: Feature | null = null;

        // Pointer move event for hover effect on sites
        map.on('pointermove', (evt) => {
            if (evt.dragging) {
              return;
            }
            const pixel = map.getEventPixel(evt.originalEvent);
            const hit = map.hasFeatureAtPixel(pixel, {
                layerFilter: (l) => l === dataLayerRef.current
            });
            map.getTargetElement().style.cursor = hit ? 'pointer' : '';

            // Find cluster feature at pixel
            const clusterFeature = map.forEachFeatureAtPixel(pixel, (feat) => feat as Feature, {
                layerFilter: (l) => l === dataLayerRef.current
            });

            let currentHoveredFeature: Feature | null = null;
            if (clusterFeature) {
                const featuresInCluster = clusterFeature.get('features');
                if (featuresInCluster && featuresInCluster.length === 1) {
                    const singleFeature = featuresInCluster[0];
                    if (singleFeature.get('object_type') === 'Site') {
                        currentHoveredFeature = singleFeature;
                    }
                }
            }

            if (lastHoveredFeature && lastHoveredFeature !== currentHoveredFeature) {
                lastHoveredFeature.set('hovered', false);
            }

            if (currentHoveredFeature) {
                currentHoveredFeature.set('hovered', true);
                const name = currentHoveredFeature.get('name');
                const description = currentHoveredFeature.get('description');
                const category = currentHoveredFeature.get('category');
                const color = currentHoveredFeature.get('color');

                // Category labels
                const categoryLabels: Record<string, string> = {
                    'RECHERCHE': 'Recherche',
                    'INFRASTRUCTURE': 'Infrastructure',
                    'RESIDENCE': 'Résidence',
                    'SANTE': 'Santé',
                    'HOTELLERIE': 'Hôtellerie'
                };

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
                                ${name}
                            </div>
                            <div style="font-size: 11px; color: ${color}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                                ${categoryLabels[category] || category}
                            </div>
                            <div style="font-size: 12px; color: #6b7280; line-height: 1.4;">
                                ${description}
                            </div>
                        </div>
                    </div>
                `;

                // Use the geometry of the parent cluster for positioning
                const geometry = clusterFeature.getGeometry() as Point;
                hoverOverlay.setPosition(geometry.getCoordinates());
                hoverTooltip.style.opacity = '1';
                hoverTooltip.style.transform = 'translateY(0)';
                setHoveredSiteId(currentHoveredFeature.get('site_id'));
            } else {
                hoverTooltip.style.opacity = '0';
                hoverTooltip.style.transform = 'translateY(-10px)';
                hoverOverlay.setPosition(undefined);
                setHoveredSiteId(null);
            }

            lastHoveredFeature = currentHoveredFeature;
            // Force redraw to apply hover style change
            dataLayerRef.current?.changed();
        });

        // Hide tooltip when mouse leaves map
        map.getTargetElement().addEventListener('mouseleave', () => {
            if (lastHoveredFeature) {
                lastHoveredFeature.set('hovered', false);
                lastHoveredFeature = null;
                dataLayerRef.current?.changed();
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
            const feature = map.forEachFeatureAtPixel(evt.pixel, (feat) => feat as Feature);

            if (!feature) {
                return;
            }

            const featuresInCluster = feature.get('features');
            if (!featuresInCluster || featuresInCluster.length === 0) {
                return;
            }

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
                // Click on a single feature
                const singleFeature = featuresInCluster[0];
                const props = singleFeature.getProperties();

                if (props.object_type === 'Site') {
                    const siteData = SITES.find(s => s.id === props.site_id);
                    if (onObjectClick && siteData) {
                         const categoryLabels: Record<string, string> = {
                            'RECHERCHE': 'Recherche',
                            'INFRASTRUCTURE': 'Infrastructure',
                            'RESIDENCE': 'Résidence',
                            'SANTE': 'Santé',
                            'HOTELLERIE': 'Hôtellerie'
                        };
                        onObjectClick({
                            id: siteData.id,
                            type: 'Site',
                            title: siteData.name,
                            subtitle: siteData.description,
                            attributes: {
                                'Catégorie': categoryLabels[siteData.category] || siteData.category,
                                'Description': siteData.description,
                                'Latitude': siteData.coordinates.lat.toFixed(6),
                                'Longitude': siteData.coordinates.lng.toFixed(6),
                                'Google Maps': siteData.googleMapsUrl,
                                'Couleur': siteData.color
                            }
                        });
                    }
                    // Do not call showPopup for sites.
                } else {
                    // For other objects from API
                    if (onObjectClick) {
                        const name = props.nom || props.nom_site || props.marque || `${props.object_type} #${props.id}`;
                        onObjectClick({
                            id: props.id,
                            type: props.object_type,
                            title: name,
                            subtitle: props.site_nom || '',
                            attributes: props
                        });
                    }
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
                attributions: activeLayer.attribution
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

    // Fetch Data Function
    const fetchData = async () => {
        if (!mapInstance.current || !dataLayerRef.current) return;

        const view = mapInstance.current.getView();
        const zoom = view.getZoom()!;
        const extent = view.calculateExtent(mapInstance.current.getSize());
        const bbox = transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
        // format: west,south,east,north
        const bboxStr = `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`;

        const apiTypes = visibleLayers.length > 0
            ? visibleLayers.map(type => TYPE_TO_API[type] || type.toLowerCase()).join(',')
            : '';
        const types = apiTypes ? `&types=${apiTypes}` : '';

        try {
            const response = await fetch(`${API_BASE_URL}/map/?bbox=${bboxStr}&zoom=${zoom}${types}`);
            if (response.ok) {
                const data = await response.json();
                const geojsonFormat = new GeoJSON();
                // Read features and transform to map projection
                const features = geojsonFormat.readFeatures(data, {
                    featureProjection: 'EPSG:3857'
                });

                // Update source directly using the ref
                if (vectorSourceRef.current) {
                    vectorSourceRef.current.clear();

                    // Re-add static sites if they should be visible
                    const showSites = visibleLayers.includes('Site');
                    if (showSites) {
                        SITES.forEach(site => {
                            const feature = new Feature({
                                geometry: new Point(fromLonLat([site.coordinates.lng, site.coordinates.lat])),
                                name: site.name,
                                description: site.description,
                                category: site.category,
                                color: site.color,
                                object_type: 'Site',
                                site_id: site.id
                            });
                            feature.setId(site.id);
                            vectorSourceRef.current?.addFeature(feature);
                        });
                    }

                    vectorSourceRef.current.addFeatures(features);
                }
            }
        } catch (err) {
            console.error("Error fetching map data", err);
        }
    };

    // Re-fetch when layers change
    useEffect(() => {
        fetchData();
    }, [visibleLayers]);

    // Expose visibleLayers to window for style function to access
    useEffect(() => {
        (window as any).getVisibleLayers = () => visibleLayers;
        // Force re-render of the data layer when visibility changes
        if (dataLayerRef.current) {
            dataLayerRef.current.changed();
        }
        return () => { delete (window as any).getVisibleLayers; };
    }, [visibleLayers]);

    // Handle clustering toggle
    useEffect(() => {
        if (!dataLayerRef.current || !vectorSourceRef.current || !clusterSourceRef.current) return;

        if (clusteringEnabled) {
            // Enable clustering - set cluster source with distance
            clusterSourceRef.current.setDistance(40);
        } else {
            // Disable clustering - set distance to 0 (no clustering)
            clusterSourceRef.current.setDistance(0);
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
