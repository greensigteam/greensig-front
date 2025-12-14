import { VEG_LEGEND, HYDRO_LEGEND, SITE_LEGEND } from '../constants';

/**
 * Map Utility Functions
 * Extracted from OLMap.tsx for better organization
 */

// ==============================================================================
// COLOR & TYPE MAPPINGS
// ==============================================================================

/** Create mapping of colors from legend constants */
export const OBJECT_COLORS: Record<string, string> = {
  ...Object.fromEntries(VEG_LEGEND.map(item => [item.type, item.color])),
  ...Object.fromEntries(HYDRO_LEGEND.map(item => [item.type, item.color])),
  ...Object.fromEntries(SITE_LEGEND.map(item => [item.type, item.color]))
};

/** Mapping frontend types to API endpoint names */
export const TYPE_TO_API: Record<string, string> = {
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

// ==============================================================================
// SVG ICON GENERATION
// ==============================================================================

/**
 * Create an SVG icon for site markers with category-specific designs
 * @param color - Hex color for the pin
 * @param category - Site category (RECHERCHE, INFRASTRUCTURE, etc.)
 * @param isHovered - Whether the marker is currently hovered
 * @returns Data URI string for SVG icon
 */
export const createSiteIcon = (color: string, category: string, isHovered: boolean = false): string => {
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

/**
 * Create a simpler marker icon for objects (vegetation, hydraulic)
 * @param color - Hex color for the pin
 * @param isHovered - Whether the marker is currently hovered
 * @returns Data URI string for SVG icon
 */
export const createMarkerIcon = (color: string, isHovered: boolean = false): string => {
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
