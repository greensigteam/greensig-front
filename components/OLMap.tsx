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
import GeoJSON from 'ol/format/GeoJSON';
import Overlay from 'ol/Overlay';
import { Feature } from 'ol';
import { defaults as defaultControls, ScaleLine } from 'ol/control';

import {
  LayerConfig,
  Coordinates,
  MapSearchResult,
  UserLocation,
  MapObjectDetail,
  OverlayState,
  MapHandle,
  Measurement,
  MeasurementType,
  GeoJSONGeometry,
} from '../types';
import { INITIAL_POSITION, VEG_LEGEND, HYDRO_LEGEND, SITE_LEGEND } from '../constants';
import { TYPE_TO_API } from '../utils/mapHelpers';
import {
  SELECTION_STYLE,
  createClusterStyleForType,
  getReclamationStyle,
  createSiteStyle,
} from '../utils/mapStyles';
import { exportMapCanvas } from '../utils/mapExport';
import { updateClusteredFeatures, updateNonClusteredFeatures } from '../utils/mapClustering';
import { useSearchHighlight } from '../hooks/useSearchHighlight';
import { useUserLocationDisplay } from '../hooks/useUserLocationDisplay';
import { useMapHoverTooltip } from '../hooks/useMapHoverTooltip';
import { useMapClickHandler } from '../hooks/useMapClickHandler';
import { useMeasurementTools } from '../hooks/useMeasurementTools';
import { useDrawingTools } from '../hooks/useDrawingTools';
import { useBoxSelection } from '../hooks/useBoxSelection';
import { useMapContext } from '../contexts/MapContext';
import { useMapSelectionLayer } from '../hooks/useMapSelectionLayer';
import { useHighlightedGeometry } from '../hooks/useHighlightedGeometry';
import { useSelection } from '../contexts/SelectionContext';
import { useDrawing } from '../contexts/DrawingContext';
import logger from '../services/logger';
import { fetchMapData } from '../services/api';
import { fetchReclamationsForMap } from '../services/reclamationsApi';

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
  /**
   * Détail page : géométrie à mettre en surbrillance.
   * Accepte une géométrie GeoJSON brute ou une Feature complète.
   * Le type est large pour rester compatible avec les payloads de l'API.
   */
  highlightedGeometry?:
    | GeoJSONGeometry
    | { type: 'Feature'; geometry: GeoJSONGeometry; properties?: Record<string, unknown> }
    | null;
  // Editing callbacks
  onObjectModify?: (objectId: string, newGeometry: any, objectType: string) => void;
  onObjectDelete?: (objectId: string, objectType: string) => void;
}

const OLMapInternal = (props: OLMapProps, ref: React.ForwardedRef<MapHandle>) => {
  const {
    activeLayer,
    targetLocation,
    userLocation,
    searchResult,
    onMoveEnd,
    onObjectClick,
    overlays,
    clusteringEnabled,
    isMeasuring = false,
    measurementType = 'distance',
    onMeasurementComplete,
    onMeasurementUpdate,
    isMiniMap = false,
    highlightedGeometry,
    onObjectModify,
    onObjectDelete,
  } = props;

  // ✅ USE MAP CONTEXT - Replaces window communication
  const mapContext = useMapContext();
  const { selectedObjects, isBoxSelectionMode, addMultipleToSelection } = useSelection();
  const {
    drawingMode,
    editingMode,
    isDrawing,
    setCurrentGeometry,
    setCalculatedMetrics,
    finishDrawing,
  } = useDrawing();

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

  // ✅ Réclamations layer refs
  const reclamationsLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const reclamationsSourceRef = useRef<VectorSource | null>(null);

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
  const scaleLineRef = useRef<ScaleLine | null>(null);

  // State
  const [mapReady, setMapReady] = useState(false); // ✅ Flag to trigger hooks after map creation
  const [visibleLayers, setVisibleLayers] = useState<string[]>(() =>
    [...SITE_LEGEND, ...VEG_LEGEND, ...HYDRO_LEGEND].map((item) => item.type),
  );

  // ✅ WEB WORKER REF
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialiser le worker
    workerRef.current = new Worker('/workers/geojsonWorker.js');

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // ✅ CUSTOM HOOKS - Extracted logic
  const measurementTools = useMeasurementTools({
    mapInstance,
    isMeasuring,
    measurementType,
    onMeasurementComplete,
    onMeasurementUpdate,
  });

  const searchHighlight = useSearchHighlight({
    mapInstance,
    vectorSourceRef,
    sitesSourceRef,
    searchResult,
  });

  const userLocationDisplay = useUserLocationDisplay({
    mapInstance,
    userLocation,
  });

  // ✅ Disable interactions when in any tool mode (measuring, drawing, editing, box selection)
  const isToolActive =
    isMeasuring ||
    isDrawing ||
    drawingMode !== 'none' ||
    editingMode !== 'none' ||
    isBoxSelectionMode;

  useMapHoverTooltip({
    mapInstance,
    sitesLayerRef,
    dataLayerRef,
    mapReady, // ✅ Trigger hook when map is ready
    isMeasuring: isToolActive, // ✅ Disable hover when any tool is active
  });

  useMapClickHandler({
    mapInstance,
    dataLayerRef,
    sitesLayerRef,
    popupOverlayRef: popupOverlay,
    onObjectClick,
    mapReady, // ✅ Trigger hook when map is ready
    isMeasuring: isToolActive, // ✅ Disable clicks when any tool is active
  });

  // ✅ DRAWING TOOLS HOOK
  const drawingTools = useDrawingTools({
    mapInstance,
    drawingMode,
    editingMode,
    isDrawing,
    selectedObjects,
    onDrawEnd: (geometry, metrics) => {
      // Update context with the drawn geometry - this triggers the form modal in MapPage
      setCurrentGeometry(geometry);
      setCalculatedMetrics(metrics);
      finishDrawing();
    },
    onDrawUpdate: (metrics) => {
      // Live update metrics while drawing
      setCalculatedMetrics(metrics);
    },
    onModifyEnd: (geometry, featureId, objectType) => {
      // Notify parent component about the modification (don't set currentGeometry - that's for new objects)
      if (onObjectModify) {
        onObjectModify(featureId, geometry, objectType);
      }
    },
    onMoveEnd: (geometry, featureId, objectType) => {
      // Notify parent component about the move (don't set currentGeometry - that's for new objects)
      if (onObjectModify) {
        onObjectModify(featureId, geometry, objectType);
      }
    },
    onDeleteClick: (featureId, objectType) => {
      // Notify parent component about the delete request
      if (onObjectDelete) {
        onObjectDelete(featureId, objectType);
      }
    },
  });

  // ✅ BOX SELECTION HOOK
  useBoxSelection({
    mapInstance,
    isBoxSelectionActive: isBoxSelectionMode,
    onFeaturesSelected: (features) => {
      addMultipleToSelection(features);
    },
    mapReady,
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
      return { lat: lat as number, lng: lng as number };
    },
    getMapElement: () => {
      return innerMapRef.current;
    },
    exportCanvas: (): Promise<string> => {
      if (!mapInstance.current) {
        return Promise.reject(new Error('Map not initialized'));
      }
      return exportMapCanvas(mapInstance.current);
    },
    invalidateSize: () => {
      mapInstance.current?.updateSize();
    },
    flyTo: (lat: number, lng: number, zoom: number) => {
      mapInstance.current?.getView().animate({
        center: fromLonLat([lng, lat]),
        zoom: zoom,
        duration: 1500,
      });
    },
    clearMeasurements: measurementTools.clearMeasurements,
  }));

  // Initialize Map
  useEffect(() => {
    if (!innerMapRef.current) return;

    // ✅ Prevent re-creating map in React 19 Strict Mode (double render)
    if (mapInstance.current) {
      return;
    }

    const baseLayer = new TileLayer({
      source: new XYZ({
        url: activeLayer.url,
        maxZoom: activeLayer.maxNativeZoom || 19,
        attributions: activeLayer.attribution,
        crossOrigin: 'anonymous',
      }),
    });

    // Create popup overlay
    const overlay = new Overlay({
      element: popupRef.current!,
      autoPan: {
        animation: { duration: 250 },
      },
    });
    popupOverlay.current = overlay;

    // Sites Layer (polygons)
    const sitesSource = new VectorSource();
    sitesSourceRef.current = sitesSource;

    const sitesLayer = new VectorLayer({
      source: sitesSource,
      zIndex: 1,
      style: (feature) => createSiteStyle(feature as Feature),
    });
    sitesLayerRef.current = sitesLayer;

    // Selection Layer (highlighting selected objects)
    const selectionLayer = new VectorLayer({
      source: new VectorSource(),
      style: SELECTION_STYLE,
      zIndex: 1000,
      visible: true,
    });
    selectionLayerRef.current = selectionLayer;

    // Objects Layer - NO CLUSTERING INITIALLY (will be set up dynamically)
    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    // Single non-clustered data layer (will be used when clustering disabled)
    const dataLayer = new VectorLayer({
      source: vectorSource,
      zIndex: 50,
      style: (feature) => {
        const props = feature.getProperties();
        const type = props.object_type;
        return createClusterStyleForType(feature as Feature, type);
      },
    });
    dataLayerRef.current = dataLayer;

    // ✅ Réclamations Layer - Affiche les réclamations non clôturées avec code couleur
    const reclamationsSource = new VectorSource();
    reclamationsSourceRef.current = reclamationsSource;

    // Reclamations layer - renders all geometry types directly (no clustering)
    const reclamationsLayer = new VectorLayer({
      source: reclamationsSource,
      zIndex: 100, // Au-dessus des objets (50) et des clusters pour être toujours visibles
      style: (feature) => getReclamationStyle(feature as Feature),
    });
    reclamationsLayerRef.current = reclamationsLayer;

    // Create map (without hook layers to avoid "Duplicate item" error)
    const map = new Map({
      target: innerMapRef.current,
      layers: [baseLayer, sitesLayer, dataLayer, reclamationsLayer, selectionLayer], // ✅ Order: sites(1) < objects(50) < reclamations(100) < selection(1000)
      overlays: [overlay], // ✅ Only our own overlay
      view: new View({
        center: fromLonLat([INITIAL_POSITION.lng, INITIAL_POSITION.lat]),
        zoom: INITIAL_POSITION.zoom,
        maxZoom: 22,
        minZoom: 2,
      }),
      controls: defaultControls({ attribution: false, zoom: false }).extend([
        (scaleLineRef.current = new ScaleLine({ units: 'metric' })),
      ]),
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
    // ✅ Add drawing layer
    if (drawingTools.drawingLayerRef.current) {
      map.addLayer(drawingTools.drawingLayerRef.current);
    }
    // ✅ Add editing layer
    if (drawingTools.editingLayerRef.current) {
      map.addLayer(drawingTools.editingLayerRef.current);
    }

    // ✅ Trigger hooks to initialize event handlers
    setMapReady(true);

    // Initial data fetch
    fetchData();
    fetchReclamations();

    // MoveEnd event with debouncing
    map.on('moveend', () => {
      if (onMoveEnd) {
        const view = map.getView();
        const center = toLonLat(view.getCenter()!);
        onMoveEnd({ lat: center[1] as number, lng: center[0] as number }, view.getZoom()!);
      }

      if (fetchDataTimeoutRef.current) {
        clearTimeout(fetchDataTimeoutRef.current);
      }

      fetchDataTimeoutRef.current = setTimeout(() => {
        fetchData();
        fetchReclamations();
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
    // ✅ Skip data fetch for mini-maps (they only display highlighted geometry)
    if (isMiniMap) {
      return;
    }

    if (!mapInstance.current || !dataLayerRef.current || !sitesLayerRef.current) {
      return;
    }

    try {
      const view = mapInstance.current.getView();
      const mapSize = mapInstance.current.getSize();

      // Skip if map size is invalid (not yet rendered)
      if (!mapSize || mapSize[0] === 0 || mapSize[1] === 0) {
        return;
      }

      const extent = view.calculateExtent(mapSize);
      const [west, south, east, north] = transformExtent(extent, 'EPSG:3857', 'EPSG:4326');

      // Skip if bbox contains invalid values (NaN, Infinity)
      if (
        !Number.isFinite(west) ||
        !Number.isFinite(south) ||
        !Number.isFinite(east) ||
        !Number.isFinite(north)
      ) {
        return;
      }

      const zoom = Math.round(view.getZoom() || 10);

      // ✅ Use ref to get current value (avoids stale closure)
      const currentVisibleLayers = visibleLayersRef.current;

      // ✅ Short-circuit: If no layers are visible, clear map and return
      if (currentVisibleLayers.length === 0) {
        sitesSourceRef.current?.clear();
        vectorSourceRef.current?.clear();
        // Clear all cluster sources
        Object.values(clusterSourcesRef.current).forEach((cluster) => cluster.getSource()?.clear());
        return;
      }

      const typesParam = currentVisibleLayers
        .map((layerType) => TYPE_TO_API[layerType] || layerType.toLowerCase())
        .filter(Boolean)
        .join(',');

      const data = await fetchMapData(`${west},${south},${east},${north}`, typesParam, zoom);

      if (data.type !== 'FeatureCollection') throw new Error('Invalid GeoJSON');

      // ✅ UTILISER LE WEB WORKER pour le traitement lourd
      const processedData = await new Promise<any>((resolve, reject) => {
        if (!workerRef.current) return reject('Worker not initialized');

        workerRef.current.onmessage = (e) => {
          if (e.data.success) resolve(e.data);
          else reject(e.data.error);
        };

        workerRef.current.postMessage({ task: 'parse_geojson', data: data });
      });

      const siteFeatures: Feature[] = [];
      const featuresByType: Record<string, Feature[]> = {};
      const geojsonFormat = new GeoJSON();

      // Traitement des features pré-groupées par le worker
      const allFeatures = processedData.features;
      allFeatures.forEach((feat: any) => {
        const feature = geojsonFormat.readFeature(feat, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        }) as Feature;

        const objectType = feature.get('object_type');
        if (objectType === 'Site') {
          siteFeatures.push(feature);
        } else {
          if (!featuresByType[objectType]) {
            featuresByType[objectType] = [];
          }
          featuresByType[objectType].push(feature);
        }
      });

      // Update sites
      sitesSourceRef.current?.clear();
      sitesSourceRef.current?.addFeatures(siteFeatures);

      const clusterRefs = {
        clusterSourcesRef,
        clusterLayersRef,
        vectorSource: vectorSourceRef.current,
        dataLayer: dataLayerRef.current,
        map: mapInstance.current,
      };

      if (clusteringEnabledRef.current) {
        updateClusteredFeatures(featuresByType, clusterRefs);
      } else {
        updateNonClusteredFeatures(featuresByType, clusterRefs);
      }
    } catch (err) {
      logger.error('Error in fetchData:', err);
    }
  };

  // ✅ Fetch Reclamations - Récupère les réclamations pour affichage sur la carte
  const fetchReclamations = async () => {
    // Ne pas charger si la couche n'est pas visible ou si c'est une mini-carte
    if (!overlays?.reclamations || isMiniMap) {
      reclamationsSourceRef.current?.clear();
      return;
    }

    if (!mapInstance.current || !reclamationsSourceRef.current) {
      return;
    }

    try {
      const view = mapInstance.current.getView();
      const mapSize = mapInstance.current.getSize();

      // Skip if map size is invalid (not yet rendered)
      if (!mapSize || mapSize[0] === 0 || mapSize[1] === 0) {
        return;
      }

      const extent = view.calculateExtent(mapSize);
      const [west, south, east, north] = transformExtent(extent, 'EPSG:3857', 'EPSG:4326');

      // Skip if bbox contains invalid values (NaN, Infinity)
      if (
        !Number.isFinite(west) ||
        !Number.isFinite(south) ||
        !Number.isFinite(east) ||
        !Number.isFinite(north)
      ) {
        return;
      }

      const data = await fetchReclamationsForMap({
        bbox: `${west},${south},${east},${north}`,
      });

      if (data.type !== 'FeatureCollection') {
        throw new Error('Invalid GeoJSON');
      }

      const geojsonFormat = new GeoJSON();
      const features: Feature[] = [];

      data.features.forEach((feat) => {
        const feature = geojsonFormat.readFeature(feat, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        }) as Feature;

        // Copier les propriétés importantes
        feature.setId(feat.id);
        feature.set('object_type', 'Reclamation');
        feature.set('statut', feat.properties.statut);
        feature.set('numero_reclamation', feat.properties.numero_reclamation);
        feature.set('statut_display', feat.properties.statut_display);
        feature.set('couleur_statut', feat.properties.couleur_statut);
        feature.set('urgence', feat.properties.urgence);
        feature.set('type_reclamation', feat.properties.type_reclamation);
        feature.set('type_reclamation_symbole', feat.properties.type_reclamation_symbole);
        feature.set('type_reclamation_categorie', feat.properties.type_reclamation_categorie);
        feature.set('description', feat.properties.description);
        feature.set('site', feat.properties.site); // ✅ ID du site (pour filtrage)
        feature.set('site_nom', feat.properties.site_nom);
        feature.set('id', feat.properties.id);

        features.push(feature);
      });

      reclamationsSourceRef.current.clear();
      reclamationsSourceRef.current.addFeatures(features);
    } catch (err) {
      logger.error('Error fetching reclamations:', err);
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
      center: fromLonLat([
        targetLocation.coordinates.lng || 0,
        targetLocation.coordinates.lat || 0,
      ]),
      zoom: targetLocation.zoom || 18,
      duration: 1500,
    });
  }, [targetLocation]);

  useMapSelectionLayer({
    selectionLayerRef,
    dataLayerRef,
    vectorSourceRef,
    sitesSourceRef: sitesSourceRef as any,
    selectedObjects,
    mapReady,
    clusteringEnabled: clusteringEnabled ?? false,
  });

  // ✅ Sync visibleLayers to ref (for moveend callback to access current value)
  useEffect(() => {
    visibleLayersRef.current = visibleLayers;
  }, [visibleLayers]);

  // Visible layers effect
  // Refetch when filters or clustering are toggled
  useEffect(() => {
    if (mapReady && mapInstance.current) {
      fetchData();
    }
  }, [clusteringEnabled, visibleLayers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Toggle réclamations visibility and refetch when overlay changes
  useEffect(() => {
    if (!mapReady || !reclamationsLayerRef.current) return;

    const isVisible = overlays?.reclamations ?? true;
    reclamationsLayerRef.current.setVisible(isVisible);

    if (isVisible) {
      fetchReclamations();
    } else {
      reclamationsSourceRef.current?.clear();
    }
  }, [overlays?.reclamations, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for refresh-map-data event (triggered after object modification/deletion)
  useEffect(() => {
    const handleRefreshMapData = () => {
      if (mapReady && mapInstance.current) {
        fetchData();
      }
    };

    window.addEventListener('refresh-map-data', handleRefreshMapData);
    return () => {
      window.removeEventListener('refresh-map-data', handleRefreshMapData);
    };
  }, [mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Listen for refresh-reclamations event (triggered after reclamation creation/update)
  useEffect(() => {
    const handleRefreshReclamations = () => {
      if (mapReady && mapInstance.current && overlays?.reclamations) {
        fetchReclamations();
      }
    };

    window.addEventListener('refresh-reclamations', handleRefreshReclamations);
    return () => {
      window.removeEventListener('refresh-reclamations', handleRefreshReclamations);
    };
  }, [mapReady, overlays?.reclamations]); // eslint-disable-line react-hooks/exhaustive-deps

  useHighlightedGeometry({
    selectionLayerRef,
    highlightedGeometry,
    mapReady,
  });

  // Clustering is now handled in fetchData function with type-based clusters

  // ✅ Ensure drawing layer is added to map when drawing mode is activated
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;

    const map = mapInstance.current;
    const drawingLayer = drawingTools.drawingLayerRef.current;

    if (drawingLayer && isDrawing) {
      // Check if layer is already on the map
      const layers = map.getLayers().getArray();
      if (!layers.includes(drawingLayer)) {
        map.addLayer(drawingLayer);
      }
    }
  }, [mapReady, isDrawing, drawingTools.drawingLayerRef]);

  // ✅ Ensure editing layer is added to map when editing mode is activated
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;

    const map = mapInstance.current;
    const editingLayer = drawingTools.editingLayerRef.current;

    if (editingLayer && editingMode !== 'none' && selectedObjects.length > 0) {
      // Check if layer is already on the map
      const layers = map.getLayers().getArray();
      if (!layers.includes(editingLayer)) {
        map.addLayer(editingLayer);
      }
    }
  }, [mapReady, editingMode, selectedObjects.length, drawingTools.editingLayerRef]);

  // ✅ Sync local layer visibility with MapContext when changed externally
  useEffect(() => {
    const contextVisibleLayers = mapContext.getVisibleLayers();
    // Convert context format to local format
    const layersList: string[] = Object.entries(contextVisibleLayers)
      .filter(([_, visible]) => visible)
      .map(([layerId, _]) => layerId);
    setVisibleLayers(layersList);
  }, [mapContext.visibleLayers]);

  return (
    <div className="h-full w-full relative">
      <div ref={innerMapRef} className="h-full w-full bg-slate-100" />

      <div
        ref={popupRef}
        className="ol-popup bg-white p-2 rounded shadow-lg border border-gray-200 min-w-[150px]"
      >
        <a
          href="#"
          className="ol-popup-closer absolute top-1 right-2 text-gray-500 font-bold"
          onClick={(e) => {
            e.preventDefault();
            popupOverlay.current?.setPosition(undefined);
          }}
        >
          ✖
        </a>
        <div id="popup-content"></div>
      </div>
    </div>
  );
};

export const OLMap = React.forwardRef<any, OLMapProps>(OLMapInternal);
export default OLMap;
