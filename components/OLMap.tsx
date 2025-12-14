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
import { Point } from 'ol/geom';
import { defaults as defaultControls, ScaleLine } from 'ol/control';
import { NorthArrow } from './map/NorthArrowControl';

import { LayerConfig, Coordinates, MapSearchResult, UserLocation, MapObjectDetail, OverlayState, MapHandle, Measurement, MeasurementType } from "../types";
import { INITIAL_POSITION, VEG_LEGEND, HYDRO_LEGEND, SITE_LEGEND } from "../constants";
import { createMarkerIcon, createSiteIcon, OBJECT_COLORS, TYPE_TO_API } from '../utils/mapHelpers';
import { useSearchHighlight } from '../hooks/useSearchHighlight';
import { useUserLocationDisplay } from '../hooks/useUserLocationDisplay';
import { useMapHoverTooltip } from '../hooks/useMapHoverTooltip';
import { useMapClickHandler } from '../hooks/useMapClickHandler';
import { useMeasurementTools } from '../hooks/useMeasurementTools';
import { useMapContext } from '../contexts/MapContext';
import { useSelection } from '../contexts/SelectionContext';
import logger from '../services/logger';
import { apiFetch } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// ✅ SELECTION VISUAL STYLE (Yellow Highlight)
const SELECTION_STYLE = new Style({
  stroke: new Stroke({
    color: '#FFD700', // Gold/Yellow
    width: 4, // Thicker border
  }),
  fill: new Fill({
    color: 'rgba(255, 215, 0, 0.2)', // Transparent Gold
  }),
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({ color: 'rgba(255, 215, 0, 0.4)' }),
    stroke: new Stroke({ color: '#FFD700', width: 3 }),
  }),
  zIndex: 1000 // Always on top
});

interface OLMapProps {
  activeLayer: LayerConfig;
  targetLocation: { coordinates: Coordinates; zoom?: number } | null;
  userLocation?: UserLocation | null;
  searchResult?: MapSearchResult | null;
  onMoveEnd?: (center: Coordinates, zoom: number) => void;
  onObjectClick?: (object: MapObjectDetail | null) => void;
  onToggleLayer?: (layerId: string, visible: boolean) => void;
  overlays?: OverlayState;
  clusteringEnabled?: boolean;
  isRouting?: boolean;
  isSidebarCollapsed?: boolean;
  isMeasuring?: boolean;
  measurementType?: MeasurementType;
  currentMeasurement?: Measurement | null;
  onMeasurementComplete?: (measurement: Measurement) => void;
  onMeasurementUpdate?: (measurement: Measurement | null) => void;
  isMiniMap?: boolean; // New prop for mini-map mode
  highlightedGeometry?: any; // New prop for detailed object highlight (GeoJSON/Geometry)
}

const OLMapInternal = (props: OLMapProps, ref: React.ForwardedRef<MapHandle>) => {
  const {
    activeLayer,
    targetLocation,
    userLocation,
    searchResult,
    onMoveEnd,
    onObjectClick,
    clusteringEnabled,
    isMeasuring = false,
    measurementType = 'distance',
    onMeasurementComplete,
    onMeasurementUpdate,
    isRouting,
    isSidebarCollapsed,
    isMiniMap = false,
    highlightedGeometry
  } = props;

  // ✅ USE MAP CONTEXT - Replaces window communication
  const mapContext = useMapContext();
  const { selectedObjects } = useSelection();

  // Map and layer refs
  const innerMapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const selectionLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const dataLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const sitesLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const sitesSourceRef = useRef<VectorSource | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const clusterSourcesRef = useRef<Record<string, Cluster>>({}); // ✅ Clusters by type
  const clusterLayersRef = useRef<Record<string, VectorLayer<VectorSource>>>({});

  // ✅ Refs for state accessed in event listeners (prevent stale closures)
  const clusteringEnabledRef = useRef(clusteringEnabled);
  const visibleLayersRef = useRef<string[]>([]);

  // Update refs when props change
  useEffect(() => {
    clusteringEnabledRef.current = clusteringEnabled;
  }, [clusteringEnabled]);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupOverlay = useRef<Overlay | null>(null);
  const fetchDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const northArrowRef = useRef<NorthArrow | null>(null);
  const scaleLineRef = useRef<ScaleLine | null>(null);

  // State
  const [mapReady, setMapReady] = useState(false); // ✅ Flag to trigger hooks after map creation
  const [visibleLayers, setVisibleLayers] = useState<string[]>(() =>
    [...SITE_LEGEND, ...VEG_LEGEND, ...HYDRO_LEGEND].map(item => item.type)
  );

  // ✅ CUSTOM HOOKS - Extracted logic
  const measurementTools = useMeasurementTools({
    mapInstance,
    isMeasuring,
    measurementType,
    onMeasurementComplete,
    onMeasurementUpdate
  });

  const searchHighlight = useSearchHighlight({
    mapInstance,
    vectorSourceRef,
    sitesSourceRef,
    searchResult
  });

  const userLocationDisplay = useUserLocationDisplay({
    mapInstance,
    userLocation
  });

  useMapHoverTooltip({
    mapInstance,
    sitesLayerRef,
    dataLayerRef,
    mapReady, // ✅ Trigger hook when map is ready
    isMeasuring // ✅ Disable hover when measuring
  });

  useMapClickHandler({
    mapInstance,
    dataLayerRef,
    sitesLayerRef,
    popupOverlayRef: popupOverlay,
    onObjectClick,
    mapReady, // ✅ Trigger hook when map is ready
    isMeasuring // ✅ Disable clicks when measuring
  });

  // Expose ref methods
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

        map.once('rendercomplete', () => {
          try {
            const mapCanvas = document.createElement('canvas');
            const size = map.getSize();
            if (!size) {
              reject(new Error('Map size not available'));
              return;
            }

            mapCanvas.width = size[0] || 0;
            mapCanvas.height = size[1] || 0;
            const mapContext = mapCanvas.getContext('2d');

            if (!mapContext) {
              reject(new Error('Could not get canvas context'));
              return;
            }

            const mapViewport = map.getViewport();
            const canvases = mapViewport.querySelectorAll('canvas');

            canvases.forEach((canvas) => {
              if (canvas.width > 0) {
                const opacity = (canvas.parentNode as HTMLElement)?.style?.opacity || '1';
                mapContext.globalAlpha = parseFloat(opacity);

                const transform = canvas.style.transform;
                const matrix = transform
                  .match(/matrix\(([^)]+)\)/)?.[1]
                  ?.split(',')
                  .map(Number) || [1, 0, 0, 1, 0, 0];

                mapContext.setTransform(
                  matrix[0] || 1, matrix[1] || 0, matrix[2] || 0,
                  matrix[3] || 1, matrix[4] || 0, matrix[5] || 0
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
    },
    clearMeasurements: measurementTools.clearMeasurements
  }));

  // Initialize Map
  useEffect(() => {
    if (!innerMapRef.current) return;

    // ✅ Prevent re-creating map in React 19 Strict Mode (double render)
    if (mapInstance.current) {
      console.log('Map already exists, skipping recreation');
      return;
    }

    const baseLayer = new TileLayer({
      source: new XYZ({
        url: activeLayer.url,
        maxZoom: activeLayer.maxNativeZoom || 19,
        attributions: activeLayer.attribution,
        crossOrigin: 'anonymous'
      })
    });

    // Create popup overlay
    const overlay = new Overlay({
      element: popupRef.current!,
      autoPan: {
        animation: { duration: 250 }
      }
    });
    popupOverlay.current = overlay;

    // Sites Layer (polygons)
    const sitesSource = new VectorSource();
    sitesSourceRef.current = sitesSource;

    const sitesLayer = new VectorLayer({
      source: sitesSource,
      zIndex: 1,
      style: (feature) => {
        const type = feature.get('object_type');
        if (type !== 'Site') return undefined;

        const siteId = feature.get('site_id');
        const isHovered = feature.get('hovered') === true;

        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
        const colorIndex = siteId ? Math.abs(String(siteId).split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)) % colors.length : 0;
        const color = colors[colorIndex];

        return new Style({
          fill: new Fill({
            color: isHovered ? `${color}33` : `${color}1A`
          }),
          stroke: new Stroke({
            color: color,
            width: isHovered ? 3 : 2
          })
        });
      }
    });
    sitesLayerRef.current = sitesLayer;

    // Selection Layer (highlighting selected objects)
    const selectionLayer = new VectorLayer({
      source: new VectorSource(),
      style: SELECTION_STYLE,
      zIndex: 1000,
      visible: true
    });
    selectionLayerRef.current = selectionLayer;

    // Objects Layer - NO CLUSTERING INITIALLY (will be set up dynamically)
    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    // Helper function to create cluster style for a specific type
    const createClusterStyleForType = (feature: Feature, objectType: string): Style => {
      const features = feature.get('features');
      const size = features ? features.length : 1;
      const color = OBJECT_COLORS[objectType] || '#10b981';

      if (size > 1) {
        // Cluster bubble with type-specific color
        return new Style({
          image: new CircleStyle({
            radius: Math.min(15 + size * 2, 30),
            fill: new Fill({ color: `${color}CC` }), // Type color with opacity
            stroke: new Stroke({ color: '#fff', width: 3 })
          }),
          text: new Text({
            text: size.toString(),
            fill: new Fill({ color: '#fff' }),
            font: 'bold 14px sans-serif'
          })
        });
      }

      // Single feature - normal styled marker
      const singleFeature = features ? features[0] : feature;
      const geom = singleFeature.getGeometry();

      if (geom instanceof Point) {
        return new Style({
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: color }),
            stroke: new Stroke({ color: '#fff', width: 2 })
          })
        });
      } else {
        return new Style({
          fill: new Fill({ color: `${color}66` }),
          stroke: new Stroke({ color: color, width: 2 })
        });
      }
    };

    // Single non-clustered data layer (will be used when clustering disabled)
    const dataLayer = new VectorLayer({
      source: vectorSource,
      zIndex: 50,
      style: (feature) => {
        const props = feature.getProperties();
        const type = props.object_type;
        return createClusterStyleForType(feature, type);
      }
    });
    dataLayerRef.current = dataLayer;

    // Create map (without hook layers to avoid "Duplicate item" error)
    const map = new Map({
      target: innerMapRef.current,
      layers: [baseLayer, sitesLayer, dataLayer, selectionLayer], // ✅ Only our own layers
      overlays: [overlay], // ✅ Only our own overlay
      view: new View({
        center: fromLonLat([INITIAL_POSITION.lng, INITIAL_POSITION.lat]),
        zoom: INITIAL_POSITION.zoom,
        maxZoom: 22,
        minZoom: 2
      }),
      controls: defaultControls({ attribution: false, zoom: false }).extend([
        scaleLineRef.current = new ScaleLine({ units: 'metric' }),
        northArrowRef.current = new NorthArrow(isMiniMap ? { top: '10px', right: '10px' } : undefined)
      ])
    });

    mapInstance.current = map;

    // ✅ Add hook layers AFTER map creation to prevent duplication
    if (measurementTools.measureLayerRef.current) {
      map.addLayer(measurementTools.measureLayerRef.current);
    }
    if (searchHighlight.highlightLayerRef.current) {
      map.addLayer(searchHighlight.highlightLayerRef.current);
    }
    if (userLocationDisplay.userLocationLayerRef.current) {
      map.addLayer(userLocationDisplay.userLocationLayerRef.current);
    }

    // ✅ Trigger hooks to initialize event handlers
    setMapReady(true);

    // Initial data fetch
    fetchData();

    // MoveEnd event with debouncing
    map.on('moveend', () => {
      if (onMoveEnd) {
        const view = map.getView();
        const center = toLonLat(view.getCenter()!);
        onMoveEnd({ lat: center[1], lng: center[0] }, view.getZoom()!);
      }

      if (fetchDataTimeoutRef.current) {
        clearTimeout(fetchDataTimeoutRef.current);
      }

      fetchDataTimeoutRef.current = setTimeout(() => {
        fetchData();
      }, 300);
    });

    return () => {
      // ✅ Complete cleanup to prevent "Duplicate item" error in React 19 Strict Mode
      if (fetchDataTimeoutRef.current) {
        clearTimeout(fetchDataTimeoutRef.current);
      }

      // Remove all layers from map before disposing
      map.getLayers().clear();

      // Remove all overlays
      map.getOverlays().clear();

      // Dispose of the map completely
      map.setTarget(undefined);
      map.dispose();

      // Reset refs and state to allow recreation
      mapInstance.current = null;
      setMapReady(false); // ✅ Reset flag for cleanup
    };
  }, [isMiniMap]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch Data Function - Unified endpoint with bbox
  const fetchData = async () => {
    console.log('=== fetchData START (UNIFIED ENDPOINT) ===');

    if (!mapInstance.current || !dataLayerRef.current || !sitesLayerRef.current) {
      return;
    }

    try {
      const view = mapInstance.current.getView();
      const extent = view.calculateExtent(mapInstance.current.getSize());
      const [west, south, east, north] = transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
      const zoom = Math.round(view.getZoom() || 10);

      // ✅ Use ref to get current value (avoids stale closure)
      const currentVisibleLayers = visibleLayersRef.current;

      // ✅ Short-circuit: If no layers are visible, clear map and return
      if (currentVisibleLayers.length === 0) {
        console.log('⚠️ No visible layers - clearing map data');
        sitesSourceRef.current?.clear();
        vectorSourceRef.current?.clear();
        // Clear all cluster sources
        Object.values(clusterSourcesRef.current).forEach(cluster => cluster.getSource()?.clear());
        return;
      }

      const typesParam = currentVisibleLayers
        .map(layerType => TYPE_TO_API[layerType] || layerType.toLowerCase())
        .filter(Boolean)
        .join(',');

      const url = `${API_BASE_URL}/map/?bbox=${west},${south},${east},${north}&types=${typesParam}&zoom=${zoom}`;

      const response = await apiFetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.type !== 'FeatureCollection') throw new Error('Invalid GeoJSON');

      const siteFeatures: Feature[] = [];
      const featuresByType: Record<string, Feature[]> = {};

      const geojsonFormat = new GeoJSON();

      data.features.forEach((feat: any) => {
        const feature = geojsonFormat.readFeature(feat, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        }) as Feature;

        const objectType = feature.get('object_type');
        if (objectType === 'Site') {
          siteFeatures.push(feature);
        } else {
          // ✅ Group features by type for type-based clustering
          if (!featuresByType[objectType]) {
            featuresByType[objectType] = [];
          }
          featuresByType[objectType].push(feature);
        }
      });

      // Update sites
      sitesSourceRef.current?.clear();
      sitesSourceRef.current?.addFeatures(siteFeatures);

      // ✅ Update type-based clusters
      if (clusteringEnabledRef.current) {
        // Separate Point features (for clustering) from non-Point features (polygons, lines)
        const pointFeaturesByType: Record<string, Feature[]> = {};
        const nonPointFeatures: Feature[] = [];

        Object.entries(featuresByType).forEach(([type, features]) => {
          features.forEach(feature => {
            const geom = feature.getGeometry();
            if (geom?.getType() === 'Point') {
              if (!pointFeaturesByType[type]) {
                pointFeaturesByType[type] = [];
              }
              pointFeaturesByType[type].push(feature);
            } else {
              // Polygons, LineStrings, etc. - keep in dataLayer
              nonPointFeatures.push(feature);
            }
          });
        });

        // Update vectorSource with non-Point features (always visible)
        vectorSourceRef.current?.clear();
        vectorSourceRef.current?.addFeatures(nonPointFeatures);

        // Create/update cluster layers for Point features only
        Object.entries(pointFeaturesByType).forEach(([type, features]) => {
          // Get or create cluster source for this type
          if (!clusterSourcesRef.current[type]) {
            const typeSource = new VectorSource();
            const typeCluster = new Cluster({
              distance: 50,
              // minDistance: 20, // REMOVED: Potentially causing instability
              source: typeSource,
              geometryFunction: (feature) => {
                const geom = feature.getGeometry();
                return geom?.getType() === 'Point' ? geom : null;
              }
            });
            clusterSourcesRef.current[type] = typeCluster;

            // Create cluster layer for this type
            const typeColor = OBJECT_COLORS[type] || '#10b981';
            const clusterLayer = new VectorLayer({
              source: typeCluster,
              zIndex: 50 + Object.keys(clusterSourcesRef.current).indexOf(type),
              style: (feature) => {
                const features = feature.get('features');
                const size = features ? features.length : 1;

                if (size > 1) {
                  return new Style({
                    image: new CircleStyle({
                      radius: Math.min(15 + size * 2, 30),
                      fill: new Fill({ color: `${typeColor}CC` }),
                      stroke: new Stroke({ color: '#fff', width: 3 })
                    }),
                    text: new Text({
                      text: size.toString(),
                      fill: new Fill({ color: '#fff' }),
                      font: 'bold 14px sans-serif'
                    })
                  });
                }

                const singleFeature = features ? features[0] : feature;
                const geom = singleFeature.getGeometry();
                if (geom instanceof Point) {
                  return new Style({
                    image: new CircleStyle({
                      radius: 6,
                      fill: new Fill({ color: typeColor }),
                      stroke: new Stroke({ color: '#fff', width: 2 })
                    })
                  });
                } else {
                  return new Style({
                    fill: new Fill({ color: `${typeColor}66` }),
                    stroke: new Stroke({ color: typeColor, width: 2 })
                  });
                }
              }
            });

            clusterLayersRef.current[type] = clusterLayer;
            mapInstance.current?.addLayer(clusterLayer);
          }

          // Update features for this type's cluster
          const typeSource = clusterSourcesRef.current[type].getSource();
          if (typeSource) {
            typeSource.clear();
            if (features.length > 0) {
              typeSource.addFeatures(features);
            }
          }
          // Force redraw of the layer to ensure cluster calculation updates
          clusterLayersRef.current[type]?.changed();
        });

        // Remove clusters for types that no longer have Point features
        Object.keys(clusterSourcesRef.current).forEach(type => {
          if (!pointFeaturesByType[type]) {
            const clusterLayer = clusterLayersRef.current[type];
            if (clusterLayer) {
              mapInstance.current?.removeLayer(clusterLayer);
              delete clusterLayersRef.current[type];
            }
            delete clusterSourcesRef.current[type];
          }
        });

        // Keep dataLayer visible for non-Point features
        dataLayerRef.current?.setVisible(true);
      } else {
        // Non-clustered mode - use single layer
        const allObjects = Object.values(featuresByType).flat();
        vectorSourceRef.current?.clear();
        vectorSourceRef.current?.addFeatures(allObjects);

        // Hide all cluster layers - Force REMOVE to ensure they are gone
        Object.keys(clusterLayersRef.current).forEach(type => {
          const layer = clusterLayersRef.current[type];
          if (layer) {
            mapInstance.current?.removeLayer(layer);
          }
        });
        clusterLayersRef.current = {}; // Reset tracking
        clusterSourcesRef.current = {};

        dataLayerRef.current?.setVisible(true);
      }

      const totalObjects = Object.values(featuresByType).reduce((sum, arr) => sum + arr.length, 0);
      console.log(`✅ Loaded ${siteFeatures.length} sites, ${totalObjects} objects (${Object.keys(featuresByType).length} types)`);
    } catch (err) {
      logger.error('Error in fetchData:', err);
    }
  };

  // Base layer update
  useEffect(() => {
    if (!mapInstance.current) return;

    const layers = mapInstance.current.getLayers().getArray();
    const baseLayer = layers[0] as TileLayer<XYZ>;

    if (baseLayer) {
      const source = baseLayer.getSource();
      if (source) {
        source.setUrl(activeLayer.url);
        source.refresh();
      }
    }
  }, [activeLayer]);

  // Target location (fly to)
  useEffect(() => {
    if (!targetLocation || !mapInstance.current) return;

    const view = mapInstance.current.getView();
    view.animate({
      center: fromLonLat([targetLocation.coordinates.lng || 0, targetLocation.coordinates.lat || 0]),
      zoom: targetLocation.zoom || 18,
      duration: 1500
    });
  }, [targetLocation]);

  // ✅ Update Selection Layer based on selectedObjects
  useEffect(() => {
    if (!selectionLayerRef.current || !mapInstance.current) return;

    const source = selectionLayerRef.current.getSource();
    if (!source) return;

    source.clear();

    if (selectedObjects.length === 0) return;

    // Helper to find feature by ID
    const findFeatureById = (id: string): Feature | undefined => {
      // 1. Check Data Layer (non-clustered)
      if (dataLayerRef.current) {
        const dSource = dataLayerRef.current.getSource();
        if (dSource) {
          const feat = dSource.getFeatureById(id);
          if (feat) return feat as Feature;

          const features = dSource.getFeatures();
          const found = features.find(f => f.get('id') === id || f.getId() === id);
          if (found) return found as Feature;
        }
      }

      // 2. Check Vector Source (original points)
      if (vectorSourceRef.current) {
        const feat = vectorSourceRef.current.getFeatureById(id);
        if (feat) return feat as Feature;

        const features = vectorSourceRef.current.getFeatures();
        const found = features.find(f => f.get('id') === id || f.getId() === id);
        if (found) return found as Feature;
      }

      // 3. Check Sites Source
      if (sitesSourceRef.current) {
        const feat = sitesSourceRef.current.getFeatureById(id);
        if (feat) return feat as Feature;

        const features = sitesSourceRef.current.getFeatures();
        const found = features.find(f => f.get('id') === id || f.getId() === id || (f.get('object_type') === 'Site' && f.get('site_id') === id));
        if (found) return found as Feature;
      }

      return undefined;
    };

    selectedObjects.forEach(obj => {
      const originalFeature = findFeatureById(obj.id);

      if (originalFeature) {
        const clonedFeature = originalFeature.clone();
        clonedFeature.setId(obj.id);

        const geom = clonedFeature.getGeometry();

        // Handling Points (Sites, Trees, Furniture) differently to keep icon visible
        if (geom && geom instanceof Point) {
          const type = obj.type as string;
          const color = OBJECT_COLORS[type] || '#10b981';

          // 1. Highlight Halo (Yellow Circle)
          const highlightStyle = new Style({
            image: new CircleStyle({
              radius: 28,
              fill: new Fill({ color: 'rgba(255, 215, 0, 0.5)' }),
              stroke: new Stroke({ color: '#FFD700', width: 4 })
            }),
            zIndex: 999
          });

          // 2. Original Icon (Recreated)
          let iconSrc;
          if (type === 'Site') {
            const category = originalFeature.get('site_categorie') || 'INFRASTRUCTURE';
            iconSrc = createSiteIcon(color, category, true);
          } else {
            iconSrc = createMarkerIcon(color, true);
          }

          const iconStyle = new Style({
            image: new Icon({
              src: iconSrc,
              anchor: [0.5, 1],
              anchorXUnits: 'fraction',
              anchorYUnits: 'fraction'
            }),
            zIndex: 1000
          });

          clonedFeature.setStyle([highlightStyle, iconStyle]);

        } else {
          // Polygons / Lines
          clonedFeature.setStyle(SELECTION_STYLE);
        }

        source.addFeature(clonedFeature);
      }
    });

  }, [selectedObjects, mapReady, clusteringEnabled]);

  // ✅ Sync visibleLayers to ref (for moveend callback to access current value)
  useEffect(() => {
    visibleLayersRef.current = visibleLayers;
  }, [visibleLayers]);

  // Visible layers effect
  // Refetch when clustering is toggled
  useEffect(() => {
    if (mapReady && mapInstance.current) {
      fetchData();
    }
  }, [clusteringEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ New Effect: Handle specific highlightedGeometry (from Detail Page)
  useEffect(() => {
    if (!mapReady || !selectionLayerRef.current) return;

    // Clear previous selection if new highlight is provided or emptied
    const source = selectionLayerRef.current.getSource();
    if (!source) return;

    // We only clear if we are in "detail mode" (highlightedGeometry is present)
    // to avoid conflicting with global selection context
    if (highlightedGeometry) {
      source.clear();

      try {
        const geojsonFormat = new GeoJSON();
        // If it's a raw geometry object (coordinates, type), wrap in Feature
        // If it's already a Feature, read it directly
        let feature;

        if (highlightedGeometry.type === 'Feature') {
          feature = geojsonFormat.readFeature(highlightedGeometry, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
          });
        } else {
          // Assume it's a raw geometry or property object mimicking a feature
          feature = new Feature({
            geometry: new GeoJSON().readGeometry(highlightedGeometry, {
              dataProjection: 'EPSG:4326',
              featureProjection: 'EPSG:3857'
            })
          });
        }

        if (feature) {
          // Create a STRONG highlight style
          const highlightStyle = new Style({
            stroke: new Stroke({
              color: '#00ffff', // Cyan for high visibility
              width: 5,
            }),
            fill: new Fill({
              color: 'rgba(0, 255, 255, 0.2)',
            }),
            image: new CircleStyle({
              radius: 12,
              fill: new Fill({ color: '#00ffff' }),
              stroke: new Stroke({ color: '#fff', width: 3 }),
            }),
            zIndex: 10000
          });

          if (!Array.isArray(feature)) { // Ensure it's a single feature
            feature.setStyle(highlightStyle);
            source.addFeature(feature);
          }

          // Centre map if not already handled by targetLocation
          // optional: mapInstance.current?.getView().fit(source.getExtent(), { padding: [50, 50, 50, 50], maxZoom: 20 });
        }
      } catch (e) {
        console.error("Error adding highlighted geometry:", e);
      }
    }
  }, [highlightedGeometry, mapReady]);

  // Clustering is now handled in fetchData function with type-based clusters


  // ✅ Sync local layer visibility with MapContext when changed externally
  useEffect(() => {
    const contextVisibleLayers = mapContext.getVisibleLayers();
    // Convert context format to local format
    const layersList: string[] = Object.entries(contextVisibleLayers)
      .filter(([_, visible]) => visible)
      .map(([layerId, _]) => layerId);
    setVisibleLayers(layersList);
  }, [mapContext.visibleLayers]);

  // ✅ Update map controls position based on sidebar state
  useEffect(() => {
    const leftPosition = isSidebarCollapsed ? '88px' : '276px'; // Match MapZoomControls
    // if (northArrowRef.current) northArrowRef.current.updatePosition(leftPosition); // REMOVED: Keep North Arrow on Right
    const scaleEl = document.querySelector('.ol-scale-line') as HTMLElement;
    if (scaleEl) {
      scaleEl.style.left = 'auto'; // Remove left positioning
      scaleEl.style.right = '24px'; // Align to Right
      scaleEl.style.bottom = '8px';
      scaleEl.style.top = 'auto';
      // scaleEl.style.transition = 'left 0.3s ease'; // No transition needed for fixed right pos
    }
  }, [isSidebarCollapsed]);

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
};

export const OLMap = React.forwardRef<any, OLMapProps>(OLMapInternal);
export default OLMap;
