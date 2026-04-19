import { describe, expect, it } from 'vitest';
import { formatInventoryStats, type InventoryStats } from '../clientInventoryService';

function makeStats(
  vegByType: Record<string, number>,
  hydroByType: Record<string, number>,
): InventoryStats {
  const vegTotal = Object.values(vegByType).reduce((a, b) => a + b, 0);
  const hydroTotal = Object.values(hydroByType).reduce((a, b) => a + b, 0);
  return {
    totalObjets: vegTotal + hydroTotal,
    vegetation: { total: vegTotal, byType: vegByType },
    hydraulique: { total: hydroTotal, byType: hydroByType },
  };
}

describe('formatInventoryStats', () => {
  it('returns empty arrays when no types are present', () => {
    const { vegetationFormatted, hydrauliqueFormatted } = formatInventoryStats(makeStats({}, {}));
    expect(vegetationFormatted).toEqual([]);
    expect(hydrauliqueFormatted).toEqual([]);
  });

  it('translates known type keys to French labels', () => {
    const { vegetationFormatted, hydrauliqueFormatted } = formatInventoryStats(
      makeStats({ arbres: 3 }, { puits: 1 }),
    );
    expect(vegetationFormatted).toEqual([{ label: 'Arbres', count: 3 }]);
    expect(hydrauliqueFormatted).toEqual([{ label: 'Puits', count: 1 }]);
  });

  it('falls back to the raw type key when no label mapping exists', () => {
    const { vegetationFormatted } = formatInventoryStats(makeStats({ mystery: 7 }, {}));
    expect(vegetationFormatted).toEqual([{ label: 'mystery', count: 7 }]);
  });

  it('sorts by count descending within each category', () => {
    const { vegetationFormatted, hydrauliqueFormatted } = formatInventoryStats(
      makeStats({ arbres: 2, gazons: 10, palmiers: 5 }, { pompes: 1, vannes: 8, puits: 3 }),
    );
    expect(vegetationFormatted.map((r) => r.label)).toEqual(['Gazons', 'Palmiers', 'Arbres']);
    expect(hydrauliqueFormatted.map((r) => r.label)).toEqual(['Vannes', 'Puits', 'Pompes']);
  });

  it('handles all 15 documented object type translations', () => {
    const veg = {
      arbres: 1,
      gazons: 1,
      palmiers: 1,
      arbustes: 1,
      vivaces: 1,
      cactus: 1,
      graminees: 1,
    };
    const hydro = {
      puits: 1,
      pompes: 1,
      vannes: 1,
      clapets: 1,
      canalisations: 1,
      aspersions: 1,
      gouttes: 1,
      ballons: 1,
    };
    const { vegetationFormatted, hydrauliqueFormatted } = formatInventoryStats(
      makeStats(veg, hydro),
    );
    expect(vegetationFormatted).toHaveLength(7);
    expect(hydrauliqueFormatted).toHaveLength(8);
    // None should fall back to the raw key
    for (const { label } of [...vegetationFormatted, ...hydrauliqueFormatted]) {
      expect(label[0]).toBe(label[0]?.toUpperCase());
    }
  });
});
