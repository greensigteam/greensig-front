import { useMemo } from 'react';
import type { RatioProductivite } from '../types/planning';

export interface ChargePreviewDetail {
  type: string;
  count: number;
  superficie?: number;
  ratio: RatioProductivite | null;
  heures: number;
}

export interface ChargePreview {
  totalHeures: number;
  details: ChargePreviewDetail[];
  hasUnconfiguredTypes: boolean;
}

interface ChargeableObject {
  type: string;
  superficie?: number;
}

export function useChargePreview(
  taskTypeId: number | undefined,
  selectedObjects: ChargeableObject[],
  ratios: RatioProductivite[],
): ChargePreview | null {
  return useMemo(() => {
    if (!taskTypeId || selectedObjects.length === 0 || ratios.length === 0) {
      return null;
    }

    const objectsByType = selectedObjects.reduce(
      (acc, obj) => {
        if (!acc[obj.type]) {
          acc[obj.type] = { count: 0, superficie: 0 };
        }
        acc[obj.type]!.count += 1;
        acc[obj.type]!.superficie += obj.superficie || 0;
        return acc;
      },
      {} as Record<string, { count: number; superficie: number }>,
    );

    let totalHeures = 0;
    const details: ChargePreviewDetail[] = [];

    for (const [type, data] of Object.entries(objectsByType)) {
      const ratio = ratios.find(
        (r) => r.id_type_tache === taskTypeId && r.type_objet.toLowerCase() === type.toLowerCase(),
      );

      if (ratio) {
        let heures = 0;

        if (ratio.unite_mesure === 'm2' && data.superficie > 0) {
          heures = data.superficie / ratio.ratio;
        } else if (ratio.unite_mesure === 'ml') {
          heures = data.count / ratio.ratio;
        } else {
          heures = data.count / ratio.ratio;
        }

        totalHeures += heures;
        details.push({
          type,
          count: data.count,
          superficie: data.superficie > 0 ? data.superficie : undefined,
          ratio,
          heures,
        });
      } else {
        details.push({ type, count: data.count, ratio: null, heures: 0 });
      }
    }

    return {
      totalHeures: Math.round(totalHeures * 100) / 100,
      details,
      hasUnconfiguredTypes: details.some((d) => d.ratio === null),
    };
  }, [taskTypeId, selectedObjects, ratios]);
}
