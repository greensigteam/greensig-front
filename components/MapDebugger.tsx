import React, { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import { createLogger } from '../services/logger';

const dbg = createLogger('MapDebugger');

const boxStyle: React.CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 8,
  zIndex: 1400,
  background: 'rgba(255,255,255,0.92)',
  color: '#111827',
  padding: '6px 8px',
  borderRadius: 6,
  fontSize: 12,
  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
  pointerEvents: 'auto'
};

export const MapDebugger: React.FC = () => {
  const map: any = useMap();
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [draggingEnabled, setDraggingEnabled] = useState<boolean>(false);
  const [scrollEnabled, setScrollEnabled] = useState<boolean>(false);
  const [containerStyle, setContainerStyle] = useState<string>('');

  useEffect(() => {
    if (!map) return;
    try {
      setCenter(map.getCenter ? { lat: map.getCenter().lat, lng: map.getCenter().lng } : null);
      setZoom(map.getZoom ? map.getZoom() : null);
      setDraggingEnabled(Boolean(map.dragging && map.dragging.enabled && map.dragging.enabled()))
      setScrollEnabled(Boolean(map.scrollWheelZoom && map.scrollWheelZoom.enabled && map.scrollWheelZoom.enabled()));

      const container = map.getContainer && map.getContainer();
      if (container) {
        const cs = window.getComputedStyle(container);
        setContainerStyle(`pointer-events:${cs.pointerEvents}; touch-action:${cs.touchAction}`);
      }
    } catch (e) {
      dbg.warn('Error reading initial map debug state', e);
    }

    const onMoveEnd = () => {
      try { setCenter({ lat: map.getCenter().lat, lng: map.getCenter().lng }); } catch (e) {}
      try { setZoom(map.getZoom()); } catch (e) {}
    };
    const onToggle = () => {
      try { setDraggingEnabled(Boolean(map.dragging && map.dragging.enabled && map.dragging.enabled())); } catch (e) {}
      try { setScrollEnabled(Boolean(map.scrollWheelZoom && map.scrollWheelZoom.enabled && map.scrollWheelZoom.enabled())); } catch (e) {}
    };

    map.on('moveend', onMoveEnd);
    map.on('zoomend', onMoveEnd);
    // wheel and mousedown/up could indicate interaction changes
    map.on('wheel', onToggle);
    map.on('mousedown', onToggle);

    return () => {
      map.off('moveend', onMoveEnd);
      map.off('zoomend', onMoveEnd);
      map.off('wheel', onToggle);
      map.off('mousedown', onToggle);
    };
  }, [map]);

  return (
    <div style={boxStyle} aria-hidden>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Map Debug</div>
      <div>Center: {center ? `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}` : '—'}</div>
      <div>Zoom: {zoom ?? '—'}</div>
      <div>Dragging: {draggingEnabled ? 'yes' : 'no'}</div>
      <div>Wheel zoom: {scrollEnabled ? 'yes' : 'no'}</div>
      <div style={{ marginTop: 4, fontSize: 11, color: '#374151' }}>{containerStyle}</div>
    </div>
  );
};

export default MapDebugger;
