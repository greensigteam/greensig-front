import { PDF_SATELLITE_TILE_URL_TEMPLATE, PDF_IMAGE_LOAD_TIMEOUT_MS } from '../constants';

const ARCGIS_WORLD_IMAGERY_TILE_URL = PDF_SATELLITE_TILE_URL_TEMPLATE.replace('/{z}/{y}/{x}', '');

const TILE_FETCH_TIMEOUT_MS = PDF_IMAGE_LOAD_TIMEOUT_MS;

export function loadArcgisTile(
  zoom: number,
  tx: number,
  ty: number,
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let settled = false;
    const done = (value: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => done(null), TILE_FETCH_TIMEOUT_MS);
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = `${ARCGIS_WORLD_IMAGERY_TILE_URL}/${zoom}/${ty}/${tx}`;
  });
}

export function lngToTileX(lng: number, z: number): number {
  return ((lng + 180) / 360) * Math.pow(2, z);
}

export function latToTileY(lat: number, z: number): number {
  const latRad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, z);
}

export interface BBox {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export function computeBBox(rings: number[][][]): BBox | null {
  let minLng = Infinity,
    maxLng = -Infinity;
  let minLat = Infinity,
    maxLat = -Infinity;
  let hasPoints = false;

  for (const ring of rings) {
    for (const coord of ring) {
      const lng = coord[0]!;
      const lat = coord[1]!;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      hasPoints = true;
    }
  }

  return hasPoints ? { minLng, maxLng, minLat, maxLat } : null;
}

export function padBBox(bbox: BBox, padding = 0.3): BBox {
  const lngPad = (bbox.maxLng - bbox.minLng) * padding || 0.001;
  const latPad = (bbox.maxLat - bbox.minLat) * padding || 0.001;
  return {
    minLng: bbox.minLng - lngPad,
    maxLng: bbox.maxLng + lngPad,
    minLat: bbox.minLat - latPad,
    maxLat: bbox.maxLat + latPad,
  };
}

export function findOptimalZoom(padded: BBox, canvasWidth: number): number {
  for (let z = 18; z >= 1; z--) {
    const widthInPx = (lngToTileX(padded.maxLng, z) - lngToTileX(padded.minLng, z)) * 256;
    if (widthInPx <= canvasWidth * 1.5) return z;
  }
  return 1;
}

export interface TileGrid {
  tileXMin: number;
  tileXMax: number;
  tileYMin: number;
  tileYMax: number;
  tilesX: number;
  tilesY: number;
}

export function computeTileGrid(padded: BBox, zoom: number): TileGrid {
  const tileXMin = Math.floor(lngToTileX(padded.minLng, zoom));
  const tileXMax = Math.floor(lngToTileX(padded.maxLng, zoom));
  const tileYMin = Math.floor(latToTileY(padded.maxLat, zoom));
  const tileYMax = Math.floor(latToTileY(padded.minLat, zoom));
  return {
    tileXMin,
    tileXMax,
    tileYMin,
    tileYMax,
    tilesX: tileXMax - tileXMin + 1,
    tilesY: tileYMax - tileYMin + 1,
  };
}

export async function loadAndCompositeTiles(
  grid: TileGrid,
  zoom: number,
): Promise<HTMLCanvasElement | null> {
  const tilePromises: Promise<{ img: HTMLImageElement | null; tx: number; ty: number }>[] = [];
  for (let tx = grid.tileXMin; tx <= grid.tileXMax; tx++) {
    for (let ty = grid.tileYMin; ty <= grid.tileYMax; ty++) {
      tilePromises.push(loadArcgisTile(zoom, tx, ty).then((img) => ({ img, tx, ty })));
    }
  }
  const tiles = await Promise.all(tilePromises);

  const fullWidth = grid.tilesX * 256;
  const fullHeight = grid.tilesY * 256;
  const canvas = document.createElement('canvas');
  canvas.width = fullWidth;
  canvas.height = fullHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  for (const tile of tiles) {
    if (tile.img) {
      ctx.drawImage(
        tile.img,
        (tile.tx - grid.tileXMin) * 256,
        (tile.ty - grid.tileYMin) * 256,
        256,
        256,
      );
    }
  }
  return canvas;
}

export function makeGeoToPixel(zoom: number, tileXMin: number, tileYMin: number) {
  return (lng: number, lat: number): [number, number] => [
    (lngToTileX(lng, zoom) - tileXMin) * 256,
    (latToTileY(lat, zoom) - tileYMin) * 256,
  ];
}

export function drawPolygonRing(
  ctx: CanvasRenderingContext2D,
  ring: number[][],
  geoToPixel: (lng: number, lat: number) => [number, number],
  fillColor = 'rgba(16, 185, 129, 0.25)',
  strokeColor = 'rgba(16, 185, 129, 0.9)',
  lineWidth = 3,
): void {
  ctx.beginPath();
  const [startX, startY] = geoToPixel(ring[0]![0]!, ring[0]![1]!);
  ctx.moveTo(startX, startY);
  for (let i = 1; i < ring.length; i++) {
    const [px, py] = geoToPixel(ring[i]![0]!, ring[i]![1]!);
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

export function cropCanvas(
  canvas: HTMLCanvasElement,
  geoToPixel: (lng: number, lat: number) => [number, number],
  padded: BBox,
): string | null {
  const [cropX1, cropY1] = geoToPixel(padded.minLng, padded.maxLat);
  const [cropX2, cropY2] = geoToPixel(padded.maxLng, padded.minLat);
  const cropX = Math.max(0, Math.floor(cropX1));
  const cropY = Math.max(0, Math.floor(cropY1));
  const cropW = Math.min(canvas.width - cropX, Math.ceil(cropX2 - cropX1));
  const cropH = Math.min(canvas.height - cropY, Math.ceil(cropY2 - cropY1));

  if (cropW <= 0 || cropH <= 0) return null;

  const cropped = document.createElement('canvas');
  cropped.width = cropW;
  cropped.height = cropH;
  const ctx = cropped.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return cropped.toDataURL('image/jpeg', 0.85);
}
