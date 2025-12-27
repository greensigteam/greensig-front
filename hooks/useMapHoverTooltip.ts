import { useRef, useEffect, useState } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Overlay from 'ol/Overlay';
import type Map from 'ol/Map';
import { Feature } from 'ol';
import type { MapBrowserEvent } from '../types';
import { useSelection } from '../contexts/SelectionContext';
import { VEG_LEGEND, HYDRO_LEGEND } from '../constants';

export interface UseMapHoverTooltipOptions {
  mapInstance: React.RefObject<Map | null>;
  sitesLayerRef: React.RefObject<VectorLayer<VectorSource> | null>;
  dataLayerRef: React.RefObject<VectorLayer<VectorSource> | null>;
  mapReady?: boolean; // ✅ Flag to trigger hook after map creation
  isMeasuring?: boolean; // ✅ Disable hover when measuring
}

export interface UseMapHoverTooltipReturn {
  hoverOverlayRef: React.RefObject<Overlay | null>;
  hoveredSiteId: string | null;
}

/**
 * Custom hook for hover tooltip on site features
 *
 * Features:
 * - Shows site name, code, and surface area on hover
 * - Color-coded dot based on site ID
 * - Smooth fade-in/fade-out animation
 * - Cursor pointer on hover
 * - Priority to sites layer over objects layer
 * - Auto-cleanup on unmount
 *
 * @param options - Configuration options
 * @returns Hover overlay ref and hovered site ID state
 */
export function useMapHoverTooltip(options: UseMapHoverTooltipOptions): UseMapHoverTooltipReturn {
  const { mapInstance, sitesLayerRef, dataLayerRef, mapReady = false, isMeasuring = false } = options;

  const { isSelectionMode } = useSelection();

  const hoverOverlayRef = useRef<Overlay | null>(null);
  const [hoveredSiteId, setHoveredSiteId] = useState<string | null>(null);

  // Initialize hover tooltip overlay
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Create hover tooltip element
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

    // Create overlay for tooltip
    const hoverOverlay = new Overlay({
      element: hoverTooltip,
      positioning: 'bottom-center',
      offset: [0, -15],
      stopEvent: false
    });
    hoverOverlayRef.current = hoverOverlay;
    map.addOverlay(hoverOverlay);

    let lastHoveredFeature: Feature | null = null;

    // Pointer move event for hover effect on sites and objects
    const pointerMoveHandler = (evt: MapBrowserEvent<UIEvent>) => {
      // ✅ Don't show tooltip if measuring
      if (isMeasuring) {
        // Hide tooltip and reset cursor
        if (hoverOverlay.getPosition()) {
          hoverTooltip.style.opacity = '0';
          hoverOverlay.setPosition(undefined);
        }
        map.getTargetElement().style.cursor = '';
        return;
      }

      // ✅ Don't show tooltip if in selection mode
      if (isSelectionMode) {
        if (hoverOverlay.getPosition()) {
          hoverTooltip.style.opacity = '0';
          hoverOverlay.setPosition(undefined);
        }
        map.getTargetElement().style.cursor = '';
        return;
      }

      if (evt.dragging) {
        return;
      }
      const pixel = map.getEventPixel(evt.originalEvent);

      // ✅ Check all layers (including cluster layers) for cursor change
      const hitFeature = map.hasFeatureAtPixel(pixel);
      map.getTargetElement().style.cursor = hitFeature ? 'pointer' : '';

      // ✅ Check for objects FIRST (points, lines), then sites (polygons)
      // This allows objects inside sites to be detected properly
      let currentHoveredFeature: Feature | null = null;

      // 1. Check for objects layer first (vegetation, hydraulic) - Priority to small objects
      // ✅ Don't filter by layer - this allows detecting both dataLayer and clusterLayers
      const objectFeature = map.forEachFeatureAtPixel(pixel, (feat) => {
        // First check if it's a clustered feature
        const features = feat.get('features');
        if (features && features.length > 0) {
          // Only show tooltip for single features, not multi-object clusters
          if (features.length === 1) {
            const singleFeat = features[0];
            const type = singleFeat.get('object_type');
            // Exclude Sites - they have lower priority
            return type && type !== 'Site' ? singleFeat : undefined;
          }
          return undefined; // Skip multi-object clusters - continue searching
        }

        // Non-clustered feature
        const type = feat.get('object_type');
        return type && type !== 'Site' ? (feat as Feature) : undefined;
      });

      if (objectFeature) {
        currentHoveredFeature = objectFeature;
      } else {
        // 2. Check for site feature only if no object found (fallback to polygons)
        const siteFeature = map.forEachFeatureAtPixel(pixel, (feat) => feat as Feature, {
          layerFilter: (l) => l === sitesLayerRef.current
        });

        if (siteFeature && siteFeature.get('object_type') === 'Site') {
          currentHoveredFeature = siteFeature;
        }
      }

      if (lastHoveredFeature && lastHoveredFeature !== currentHoveredFeature) {
        lastHoveredFeature.set('hovered', false);
      }

      if (currentHoveredFeature) {
        currentHoveredFeature.set('hovered', true);
        const objectType = currentHoveredFeature.get('object_type');

        // Generate tooltip content based on object type
        let tooltipContent = '';
        let featureId: string | null = null;

        if (objectType === 'Site') {
          // Site tooltip
          const name = currentHoveredFeature.get('nom_site');
          const code = currentHoveredFeature.get('code_site');
          const superficie = currentHoveredFeature.get('superficie_totale');
          const siteId = currentHoveredFeature.get('site_id');
          featureId = siteId;

          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
          const colorIndex = siteId ? Math.abs(String(siteId).split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)) % colors.length : 0;
          const color = colors[colorIndex];

          tooltipContent = `
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
        } else {
          // Object tooltip (vegetation, hydraulic)
          const nom = currentHoveredFeature.get('nom');
          const famille = currentHoveredFeature.get('famille');
          const taille = currentHoveredFeature.get('taille');
          const densite = currentHoveredFeature.get('densite');
          const marque = currentHoveredFeature.get('marque');
          const type = currentHoveredFeature.get('type');
          const diametre = currentHoveredFeature.get('diametre');
          const profondeur = currentHoveredFeature.get('profondeur');
          const debit = currentHoveredFeature.get('debit');
          const siteName = currentHoveredFeature.get('site_nom');

          // Object type colors - Built from VEG_LEGEND and HYDRO_LEGEND constants
          const objectColors: Record<string, string> = {};
          VEG_LEGEND.forEach(item => {
            objectColors[item.type] = item.color;
          });
          HYDRO_LEGEND.forEach(item => {
            objectColors[item.type] = item.color;
          });
          const color = objectColors[objectType] || '#10b981';

          // Get additional properties
          const etat = currentHoveredFeature.get('etat');
          const materiau = currentHoveredFeature.get('materiau');
          const pression = currentHoveredFeature.get('pression');
          const puissance = currentHoveredFeature.get('puissance');
          const capacite = currentHoveredFeature.get('capacite');
          const longueur = currentHoveredFeature.get('longueur');
          const portee = currentHoveredFeature.get('portee');
          const lastIntervention = currentHoveredFeature.get('last_intervention_date');

          // Build details array based on object type
          const details: string[] = [];

          // Vegetation properties
          if (famille) details.push(`Famille: ${famille}`);
          if (taille) details.push(`Taille: ${taille}`);
          if (densite) details.push(`Densité: ${densite}`);

          // Hydraulic properties
          if (marque) details.push(`Marque: ${marque}`);
          if (type) details.push(`Type: ${type}`);
          if (diametre) details.push(`⌀ ${diametre} mm`);
          if (profondeur) details.push(`Prof.: ${profondeur} m`);
          if (debit) details.push(`Débit: ${debit} L/h`);
          if (pression) details.push(`Pression: ${pression} bar`);
          if (puissance) details.push(`Puissance: ${puissance} kW`);
          if (capacite) details.push(`Capacité: ${capacite} L`);
          if (longueur) details.push(`Longueur: ${longueur} m`);
          if (portee) details.push(`Portée: ${portee} m`);
          if (materiau) details.push(`Matériau: ${materiau}`);
          if (etat) details.push(`État: ${etat}`);

          tooltipContent = `
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
                  ${nom || objectType}
                </div>
                <div style="font-size: 11px; color: ${color}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                  ${objectType}
                </div>
                ${siteName ? `<div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">
                  📍 ${siteName}
                </div>` : ''}
                ${details.length > 0 ? `<div style="font-size: 11px; color: #6b7280; line-height: 1.6; margin-top: 4px;">
                  ${details.slice(0, 5).map(d => `<div style="padding: 2px 0;">• ${d}</div>`).join('')}
                  ${details.length > 5 ? `<div style="color: #9ca3af; font-style: italic; margin-top: 2px;">+${details.length - 5} autre${details.length - 5 > 1 ? 's' : ''}...</div>` : ''}
                </div>` : ''}
              </div>
            </div>
          `;
        }

        // Update tooltip content
        hoverTooltip.innerHTML = tooltipContent;

        // Position tooltip at event coordinate
        hoverOverlay.setPosition(evt.coordinate);
        hoverTooltip.style.opacity = '1';
        hoverTooltip.style.transform = 'translateY(0)';
        setHoveredSiteId(featureId);

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
    };

    map.on('pointermove', pointerMoveHandler);

    // Hide tooltip when mouse leaves map
    const handleMouseLeave = () => {
      hoverTooltip.style.opacity = '0';
      hoverTooltip.style.transform = 'translateY(-10px)';
      hoverOverlay.setPosition(undefined);
      setHoveredSiteId(null);
      if (lastHoveredFeature) {
        lastHoveredFeature.set('hovered', false);
        sitesLayerRef.current?.changed();
        lastHoveredFeature = null;
      }
    };

    const mapElement = map.getTargetElement();
    mapElement.addEventListener('mouseleave', handleMouseLeave);

    // Cleanup on unmount
    return () => {
      map.un('pointermove', pointerMoveHandler);
      mapElement.removeEventListener('mouseleave', handleMouseLeave);
      if (hoverOverlay && map) {
        map.removeOverlay(hoverOverlay);
      }
      if (hoverTooltip) {
        hoverTooltip.remove();
      }
    };
  }, [mapInstance, sitesLayerRef, dataLayerRef, mapReady, isMeasuring]); // ✅ Re-run when measuring state changes

  return {
    hoverOverlayRef,
    hoveredSiteId
  };
}
