import { VEG_LEGEND, HYDRO_LEGEND, SITE_LEGEND } from '../constants';

export interface SymbologyConfig {
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWidth: number;
}

export function createDefaultSymbology(): Record<string, SymbologyConfig> {
  const config: Record<string, SymbologyConfig> = {};

  SITE_LEGEND.forEach((item) => {
    config[item.type] = {
      fillColor: item.color,
      fillOpacity: 0.2,
      strokeColor: item.color,
      strokeWidth: 3,
    };
  });

  VEG_LEGEND.forEach((item) => {
    config[item.type] = {
      fillColor: item.color,
      fillOpacity: 0.6,
      strokeColor: item.color,
      strokeWidth: 2,
    };
  });

  HYDRO_LEGEND.forEach((item) => {
    config[item.type] = {
      fillColor: item.color,
      fillOpacity: 0.8,
      strokeColor: item.color,
      strokeWidth: 2,
    };
  });

  return config;
}
