import { useCallback } from 'react';
import { useExport } from '../contexts/ExportContext';
import { useMapContext } from '../contexts/MapContext';
import { useToast } from '../contexts/ToastContext';
import { exportPDF, downloadBlob, SiteFrontend } from '../services/api';
import logger from '../services/logger';
import type { Coordinates, MapObjectDetail } from '../types';

interface UseMapPdfExportOptions {
  exportMapCanvas?: () => Promise<string | null>;
  getMapCenter?: () => Coordinates | null;
  getCurrentZoom: () => number;
  sites: SiteFrontend[];
  selectedObject?: MapObjectDetail | null;
}

export function useMapPdfExport({
  exportMapCanvas,
  getMapCenter,
  getCurrentZoom,
  sites,
  selectedObject,
}: UseMapPdfExportOptions) {
  const { startExport, endExport, isExportRunning } = useExport();
  const mapContext = useMapContext();
  const { showToast } = useToast();

  const isExporting = isExportRunning('map-pdf');

  const handleExportPDF = useCallback(async () => {
    try {
      startExport('map-pdf', 'Export carte PDF', { blocking: true });

      const btn = document.activeElement as HTMLElement;
      if (btn) btn.blur();

      const mapImageBase64 = await exportMapCanvas?.();
      if (!mapImageBase64) {
        throw new Error("Impossible d'exporter l'image de la carte");
      }

      const center = getMapCenter?.() || { lat: 32.219, lng: -7.934 };
      const zoom = getCurrentZoom();

      const contextVisibleLayers = mapContext.getVisibleLayers();
      const visibleLayers: Record<string, boolean> = {};
      const layerMapping: Record<string, string> = {
        Site: 'sites',
        Arbre: 'arbres',
        Gazon: 'gazons',
        Palmier: 'palmiers',
        Arbuste: 'arbustes',
        Vivace: 'vivaces',
        Cactus: 'cactus',
        Graminee: 'graminees',
        Puit: 'puits',
        Pompe: 'pompes',
        Vanne: 'vannes',
        Clapet: 'clapets',
        Canalisation: 'canalisations',
        Aspersion: 'aspersions',
        Goutte: 'gouttes',
        Ballon: 'ballons',
      };

      Object.entries(contextVisibleLayers).forEach(([key, value]) => {
        const backendKey = layerMapping[key] || key.toLowerCase().replace(/\s+/g, '');
        visibleLayers[backendKey] = value;
      });

      const siteNames: string[] = [];

      if (selectedObject && selectedObject.type === 'Site' && selectedObject.title) {
        siteNames.push(selectedObject.title);
      } else if (sites.length > 0 && zoom >= 12) {
        const viewportSize = 0.16 / Math.pow(2, zoom - 12);

        const bounds = {
          north: center.lat + viewportSize / 2,
          south: center.lat - viewportSize / 2,
          east: center.lng + viewportSize / 2,
          west: center.lng - viewportSize / 2,
        };

        const sitesInViewport = sites
          .filter((site) => {
            if (!site.coordinates) return false;
            return (
              site.coordinates.lat >= bounds.south &&
              site.coordinates.lat <= bounds.north &&
              site.coordinates.lng >= bounds.west &&
              site.coordinates.lng <= bounds.east
            );
          })
          .slice(0, 5);

        if (sitesInViewport.length > 0) {
          siteNames.push(...sitesInViewport.map((s) => s.name));
        }
      }

      const pdfBlob = await exportPDF({
        mapImageBase64,
        visibleLayers,
        center: [center.lng, center.lat],
        zoom,
        siteNames,
      });

      const date = new Date().toISOString().split('T')[0];
      downloadBlob(pdfBlob, `greensig_carte_${date}.pdf`);
      showToast(`PDF exporté avec succès: greensig_carte_${date}.pdf`, 'success');
    } catch (error) {
      logger.error("Erreur lors de l'export PDF:", error);
      showToast(
        'Erreur lors de la génération du PDF. Vérifiez que le serveur backend est accessible.',
        'error',
        7000,
      );
    } finally {
      endExport('map-pdf');
    }
  }, [
    exportMapCanvas,
    getMapCenter,
    getCurrentZoom,
    sites,
    selectedObject,
    mapContext,
    startExport,
    endExport,
    showToast,
  ]);

  return { isExporting, handleExportPDF };
}
