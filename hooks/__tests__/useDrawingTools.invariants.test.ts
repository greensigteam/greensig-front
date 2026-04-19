import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Sprint 6 — invariants statiques sur les hooks de carte.
 *
 * Monter OL en happy-dom coûte cher et masque la vraie régression visée :
 * réapparition d'un `(map as any)._xxxHandler` qui survit au démontage du
 * composant. On garde un test source-level — plus rapide, plus ciblé, et
 * cassé dès que quelqu'un recommence à patcher `map` directement.
 */

function loadHook(name: string): string {
  return readFileSync(resolve(__dirname, '..', name), 'utf-8');
}

describe('map hooks — forbidden patterns', () => {
  it('useDrawingTools does not mutate the OL Map instance with custom fields', () => {
    const src = loadHook('useDrawingTools.ts');

    // Property assignment : `(map as any)._foo = ...`
    expect(src).not.toMatch(/\(map as any\)\._[a-zA-Z]+\s*=/);
    // Property read : `(map as any)._foo` (hors commentaires / JSDoc)
    const codeLines = src
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('//'))
      .filter((line) => !line.trimStart().startsWith('*'))
      .join('\n');
    expect(codeLines).not.toMatch(/\(map as any\)\._[a-zA-Z]+/);
  });

  it('useBoxSelection does not rely on `as any` to read layer sources', () => {
    const src = loadHook('useBoxSelection.ts');
    expect(src).not.toMatch(/\(layer as any\)\.getSource/);
  });

  it('useDrawingTools cleans up click handlers via a local ref, not via a map-attached property', () => {
    const src = loadHook('useDrawingTools.ts');

    // Le ref doit exister…
    expect(src).toMatch(/deleteClickHandlerRef\s*=\s*useRef/);
    // …et être utilisé pour détacher l'handler (symétrique à map.on('click', ...))
    expect(src).toMatch(/map\.un\('click',\s*deleteClickHandlerRef\.current\)/);
  });
});
