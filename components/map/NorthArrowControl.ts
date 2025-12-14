import Control from 'ol/control/Control';

/**
 * Simple North Arrow Control for OpenLayers
 * Shows a fixed north arrow on the map
 */
export class NorthArrow extends Control {
  private arrowElement: HTMLElement;

  constructor(options?: { target?: HTMLElement | string, top?: string, right?: string, bottom?: string, left?: string }) {
    const element = document.createElement('div');
    element.className = 'ol-north-arrow ol-unselectable ol-control';

    // Default position (Main Map: bottom-left) vs Custom (Mini Map: top-right)
    const positionStyle = options?.top || options?.right ? `
      top: ${options.top || 'auto'};
      right: ${options.right || 'auto'};
      bottom: ${options.bottom || 'auto'};
      left: ${options.left || 'auto'};
    ` : `
      position: absolute;
      top: 24px;
      right: 24px;
    `;

    element.style.cssText = `
      position: absolute;
      ${positionStyle}
      width: 44px;
      height: 44px;
      display: flex;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      pointer-events: none;
      border: 2px solid rgba(0,0,0,0.1);
      transition: all 0.3s ease;
      z-index: 100;
    `;

    // Simple North Arrow SVG
    element.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <!-- North pointer (red) -->
        <path d="M 20 8 L 24 22 L 20 20 L 16 22 Z" fill="#dc2626" stroke="#991b1b" stroke-width="0.5"/>
        <!-- South pointer (white) -->
        <path d="M 20 32 L 24 18 L 20 20 L 16 18 Z" fill="#ffffff" stroke="#1f2937" stroke-width="0.5"/>
        <!-- Center circle -->
        <circle cx="20" cy="20" r="2" fill="#1f2937"/>
        <!-- North label -->
        <text x="20" y="10" text-anchor="middle" font-size="8" font-weight="bold" fill="#1f2937">N</text>
      </svg>
    `;

    super({
      element: element,
      target: options?.target,
    });

    this.arrowElement = element;
  }

  updatePosition(left: string) {
    this.arrowElement.style.left = left;
  }
}

export default NorthArrow;
