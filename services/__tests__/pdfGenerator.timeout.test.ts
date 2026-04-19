import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { loadImageAsBase64 } from '../pdfGenerator';

/**
 * Sprint 7 — régression : sans timeout, une tuile PDF qui ne répond pas bloque
 * `loadImageAsBase64` indéfiniment (ni `onload` ni `onerror` ne tirent) et la
 * génération reste suspendue. Le contrat : résoudre à `null` après le timeout.
 *
 * On évite `vi.useFakeTimers()` parce qu'il entre en conflit avec MSW chargé
 * par `vitest.setup.ts`. On utilise donc des vrais timers avec des délais très
 * courts (< 100 ms) — pas idéal mais robuste.
 */

interface MockImage {
  onload: (() => void) | null;
  onerror: (() => void) | null;
  crossOrigin: string;
  src: string;
  width: number;
  height: number;
}

describe('loadImageAsBase64 — timeout', () => {
  let instances: MockImage[] = [];
  let originalImage: typeof Image;

  beforeEach(() => {
    instances = [];
    originalImage = globalThis.Image;

    class FakeImage implements MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      crossOrigin = '';
      src = '';
      width = 256;
      height = 256;

      constructor() {
        instances.push(this);
      }
    }
    // @ts-expect-error — test override
    globalThis.Image = FakeImage;
  });

  afterEach(() => {
    globalThis.Image = originalImage;
  });

  it('resolves to null when the image never loads (respects timeoutMs)', async () => {
    const result = await loadImageAsBase64('https://example.com/tile.png', false, 30);
    expect(result).toBeNull();
  });

  it('clears the src to cancel the in-flight request on timeout', async () => {
    await loadImageAsBase64('https://example.com/tile.png', false, 30);
    const img = instances[0];
    expect(img?.src).toBe('');
  });

  it('does not take the timeout path when onerror fires early', async () => {
    const start = Date.now();
    const promise = loadImageAsBase64('https://example.com/tile.png', false, 5000);

    // Simulate the browser reporting a 404 quickly.
    await new Promise((r) => setTimeout(r, 10));
    const img = instances[0];
    expect(img).toBeDefined();
    img!.onerror?.();

    const result = await promise;
    const elapsed = Date.now() - start;

    expect(result).toBeNull();
    expect(elapsed).toBeLessThan(200);
  });
});
