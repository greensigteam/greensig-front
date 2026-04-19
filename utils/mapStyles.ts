import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { RECLAMATION_STATUS_COLORS } from '../constants';
import { OBJECT_COLORS } from './mapHelpers';

export const SELECTION_STYLE = new Style({
  stroke: new Stroke({
    color: '#FFD700',
    width: 2,
  }),
  fill: new Fill({
    color: 'rgba(255, 215, 0, 0.2)',
  }),
  image: new CircleStyle({
    radius: 2,
    fill: new Fill({ color: 'rgba(255, 215, 0, 0.5)' }),
    stroke: new Stroke({ color: '#FFD700', width: 2 }),
  }),
  zIndex: 1000,
});

export const POINT_HIGHLIGHT_STYLE = new Style({
  image: new CircleStyle({
    radius: 12,
    fill: new Fill({ color: 'rgba(255, 215, 0, 0.35)' }),
    stroke: new Stroke({ color: '#FFD700', width: 2 }),
  }),
  zIndex: 999,
});

export const POINT_HIGHLIGHT_STYLE_SMALL = new Style({
  image: new CircleStyle({
    radius: 10,
    fill: new Fill({ color: 'rgba(255, 215, 0, 0.35)' }),
    stroke: new Stroke({ color: '#FFD700', width: 2 }),
  }),
  zIndex: 999,
});

export function createClusterStyleForType(feature: Feature, objectType: string): Style {
  const features = feature.get('features');
  const size = features ? features.length : 1;
  const color = OBJECT_COLORS[objectType] || '#10b981';

  if (size > 1) {
    return new Style({
      image: new CircleStyle({
        radius: Math.min(15 + size * 2, 30),
        fill: new Fill({ color: `${color}CC` }),
        stroke: new Stroke({ color: '#fff', width: 3 }),
      }),
      text: new Text({
        text: size.toString(),
        fill: new Fill({ color: '#fff' }),
        font: 'bold 14px sans-serif',
      }),
    });
  }

  const singleFeature = features ? features[0] : feature;
  const geom = singleFeature.getGeometry();

  if (geom instanceof Point) {
    return new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: '#fff', width: 2 }),
      }),
    });
  } else {
    return new Style({
      fill: new Fill({ color: `${color}66` }),
      stroke: new Stroke({ color, width: 2 }),
    });
  }
}

export function getReclamationStyle(feature: Feature): Style {
  const props = feature.getProperties();
  const statut = props.statut || 'NOUVELLE';
  const color = RECLAMATION_STATUS_COLORS[statut] || '#ef4444';
  const geomType = feature.getGeometry()?.getType();

  if (geomType === 'Point') {
    return new Style({
      image: new CircleStyle({
        radius: 12,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: '#ffffff', width: 3 }),
      }),
      text: new Text({
        text: '!',
        font: 'bold 14px sans-serif',
        fill: new Fill({ color: '#ffffff' }),
        offsetY: 1,
      }),
    });
  } else {
    return new Style({
      fill: new Fill({ color: `${color}40` }),
      stroke: new Stroke({
        color,
        width: 3,
        lineDash: [8, 4],
      }),
    });
  }
}

const SITE_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

export function createSiteStyle(feature: Feature): Style | undefined {
  if (feature.get('object_type') !== 'Site') return undefined;

  const siteId = feature.get('site_id');
  const isHovered = feature.get('hovered') === true;
  const colorIndex = siteId
    ? Math.abs(
        String(siteId)
          .split('')
          .reduce((a: number, b: string) => a + b.charCodeAt(0), 0),
      ) % SITE_COLORS.length
    : 0;
  const color = SITE_COLORS[colorIndex];

  return new Style({
    fill: new Fill({ color: isHovered ? `${color}33` : `${color}1A` }),
    stroke: new Stroke({ color: color!, width: isHovered ? 3 : 2 }),
  });
}

export function createClusterLayerStyle(typeColor: string) {
  return (feature: Feature): Style => {
    const features = feature.get('features');
    const size = features ? features.length : 1;

    if (size > 1) {
      return new Style({
        image: new CircleStyle({
          radius: Math.min(15 + size * 2, 30),
          fill: new Fill({ color: `${typeColor}CC` }),
          stroke: new Stroke({ color: '#fff', width: 3 }),
        }),
        text: new Text({
          text: size.toString(),
          fill: new Fill({ color: '#fff' }),
          font: 'bold 14px sans-serif',
        }),
      });
    }

    const singleFeature = features ? features[0] : feature;
    const geom = singleFeature.getGeometry();
    if (geom instanceof Point) {
      return new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: typeColor }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
        }),
      });
    } else {
      return new Style({
        fill: new Fill({ color: `${typeColor}66` }),
        stroke: new Stroke({ color: typeColor, width: 2 }),
      });
    }
  };
}
