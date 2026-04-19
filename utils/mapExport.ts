import type Map from 'ol/Map';

export function exportMapCanvas(map: Map): Promise<string> {
  return new Promise((resolve, reject) => {
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
        const ctx = mapCanvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        const mapViewport = map.getViewport();
        const canvases = mapViewport.querySelectorAll('canvas');

        canvases.forEach((canvas) => {
          if (canvas.width > 0) {
            const opacity = (canvas.parentNode as HTMLElement)?.style?.opacity || '1';
            ctx.globalAlpha = parseFloat(opacity);

            const transform = canvas.style.transform;
            const matrix = transform
              .match(/matrix\(([^)]+)\)/)?.[1]
              ?.split(',')
              .map(Number) || [1, 0, 0, 1, 0, 0];

            ctx.setTransform(
              matrix[0] || 1,
              matrix[1] || 0,
              matrix[2] || 0,
              matrix[3] || 1,
              matrix[4] || 0,
              matrix[5] || 0,
            );

            ctx.drawImage(canvas, 0, 0);
          }
        });

        ctx.globalAlpha = 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        resolve(mapCanvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    });

    map.renderSync();
  });
}
