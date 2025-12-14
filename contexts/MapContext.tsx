import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { SITE_LEGEND, VEG_LEGEND, HYDRO_LEGEND } from '../constants';

/**
 * MapContext - Provides map state and control methods throughout the app
 *
 * Replaces window-based communication (anti-pattern) with proper React Context.
 *
 * Features:
 * - Layer visibility control (toggle, get visible layers)
 * - Symbology configuration management
 * - Type-safe API instead of (window as any)
 */

// ========== TYPES ==========

interface SymbologyConfig {
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWidth: number;
}

interface MapContextValue {
  // Layer visibility
  visibleLayers: Record<string, boolean>;
  toggleMapLayer: (layerId: string, visible: boolean) => void;
  setAllLayersVisibility: (visible: boolean) => void;
  getVisibleLayers: () => Record<string, boolean>;

  // Symbology configuration
  symbologyConfig: Record<string, SymbologyConfig>;
  updateLayerSymbology: (type: string, config: Partial<SymbologyConfig>) => void;
  getSymbologyConfig: () => Record<string, SymbologyConfig>;
}

// ========== CONTEXT ==========

const MapContext = createContext<MapContextValue | null>(null);

// ========== PROVIDER ==========

interface MapProviderProps {
  children: ReactNode;
}

export const MapProvider: React.FC<MapProviderProps> = ({ children }) => {
  // State for layer visibility - Initialize all layers as visible by default
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    [...SITE_LEGEND, ...VEG_LEGEND, ...HYDRO_LEGEND].forEach(item => {
      initial[item.type] = true;
    });
    return initial;
  });

  // State for symbology configuration
  const [symbologyConfig, setSymbologyConfig] = useState<Record<string, SymbologyConfig>>({});

  // Toggle map layer visibility
  const toggleMapLayer = useCallback((layerId: string, visible: boolean) => {
    setVisibleLayers(prev => ({
      ...prev,
      [layerId]: visible
    }));
  }, []);

  // Set all layers visibility at once (for "Select All" / "Deselect All")
  const setAllLayersVisibility = useCallback((visible: boolean) => {
    setVisibleLayers(prev => {
      // Create completely new object
      const newVisibility = Object.fromEntries(
        Object.keys(prev).map(key => [key, visible])
      );
      return newVisibility;
    });
  }, []);

  // Get visible layers
  const getVisibleLayers = useCallback(() => {
    return visibleLayers;
  }, [visibleLayers]);

  // Update layer symbology
  const updateLayerSymbology = useCallback((type: string, config: Partial<SymbologyConfig>) => {
    setSymbologyConfig(prev => ({
      ...prev,
      [type]: { ...prev[type], ...config }
    }));
  }, []);

  // Get symbology config
  const getSymbologyConfig = useCallback(() => {
    return symbologyConfig;
  }, [symbologyConfig]);

  const value: MapContextValue = {
    visibleLayers,
    toggleMapLayer,
    setAllLayersVisibility,
    getVisibleLayers,
    symbologyConfig,
    updateLayerSymbology,
    getSymbologyConfig
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};

// ========== HOOK ==========

/**
 * Custom hook to access MapContext
 *
 * @throws Error if used outside MapProvider
 *
 * @example
 * const { toggleMapLayer, symbologyConfig } = useMapContext();
 * toggleMapLayer('arbres', true);
 */
export const useMapContext = (): MapContextValue => {
  const context = useContext(MapContext);

  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }

  return context;
};

// ========== EXPORTS ==========

export type { MapContextValue, SymbologyConfig };
