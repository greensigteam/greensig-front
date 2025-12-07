import L from "leaflet";
import { useMap } from "react-leaflet";
import "leaflet-routing-machine";
import { useEffect } from "react";
import { createLogger } from "../services/logger";

const RoutingMachine = () => {
  const map = useMap();

  const logger = createLogger('RoutingMachine');

  useEffect(() => {
    if (!map) {
      logger.warn('No map instance available in RoutingMachine useEffect');
      return;
    }

    logger.info('Initializing RoutingMachine', {
      center: map.getCenter ? map.getCenter() : null,
      zoom: map.getZoom ? map.getZoom() : null,
    });

    const scrollEnabled = (map as any).scrollWheelZoom?.enabled?.() ?? false;
    const draggingEnabled = (map as any).dragging?.enabled?.() ?? false;
    logger.debug('Current map interaction state', { scrollEnabled, draggingEnabled });

    const routingControl = L.Routing.control(({
      waypoints: [
        L.latLng(32.216569, -7.932506), // Phénotypage
        L.latLng(32.219075, -7.931137)  // Tech Park
      ],
      routeWhileDragging: true,
      lineOptions: {
        styles: [{ color: '#62A7E6', opacity: 0.8, weight: 6 }],
        extendToWaypoints: true,
        missingRouteTolerance: 10
      } as any,
      show: true,
      addWaypoints: true,
      draggableWaypoints: true,
      fitSelectedRoutes: true,
      showAlternatives: false
    } as any)).addTo(map);

    logger.info('Routing control added to map', { waypoints: (routingControl as any).getWaypoints?.() });

    // Map event listeners for robust logging
    const onMoveStart = () => logger.debug('movestart', { center: map.getCenter?.() });
    const onMoveEnd = () => logger.debug('moveend', { center: map.getCenter?.(), zoom: map.getZoom?.() });
    const onZoomStart = () => logger.debug('zoomstart', { zoom: map.getZoom?.() });
    const onZoomEnd = () => logger.debug('zoomend', { zoom: map.getZoom?.() });
    const onWheel = (ev: any) => logger.debug('wheel event', { type: ev?.type, originalEvent: ev?.originalEvent?.type });

    map.on('movestart', onMoveStart);
    map.on('moveend', onMoveEnd);
    map.on('zoomstart', onZoomStart);
    map.on('zoomend', onZoomEnd);
    map.on('wheel', onWheel);

    // Routing-machine events (guarded)
    try {
      const rc: any = routingControl;
      if (rc && rc.on) {
        rc.on('routesfound', (e: any) => logger.info('routesfound', e));
        rc.on('routingerror', (e: any) => logger.error('routingerror', e));
        rc.on('routeselected', (e: any) => logger.info('routeselected', e));
      }
    } catch (e) {
      logger.warn('Failed to attach routing-control events', e);
    }

    return () => {
      logger.info('Cleaning up RoutingMachine: removing control and listeners');
      map.off('movestart', onMoveStart);
      map.off('moveend', onMoveEnd);
      map.off('zoomstart', onZoomStart);
      map.off('zoomend', onZoomEnd);
      map.off('wheel', onWheel);
      try {
        const rc: any = routingControl;
        if (rc && rc.off) {
          rc.off('routesfound');
          rc.off('routingerror');
          rc.off('routeselected');
        }
      } catch (e) {
        logger.warn('Failed to detach routing-control events during cleanup', e);
      }
      map.removeControl(routingControl);
      logger.info('RoutingMachine cleanup complete');
    };
  }, [map]);

  return null;
};

export default RoutingMachine;
