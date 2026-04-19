import { createContext, useContext } from 'react';
import type { RefObject, Dispatch, SetStateAction } from 'react';
import type {
  User,
  MapLayerType,
  OverlayState,
  MapObjectDetail,
  UserLocation,
  Measurement,
  MeasurementType,
  TargetLocation,
} from '../types';
import type { GeoJSONGeometry } from '../types';

export interface AppStateContextValue {
  // Auth
  user: User;
  onLogout: () => void;
  // Sidebar / layout
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  isMobile: boolean;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: Dispatch<SetStateAction<boolean>>;
  // Map ref
  mapRef: RefObject<any>;
  // Map state
  activeLayerId: MapLayerType;
  setActiveLayerId: Dispatch<SetStateAction<MapLayerType>>;
  targetLocation: TargetLocation | null;
  setTargetLocation: Dispatch<SetStateAction<TargetLocation | null>>;
  userLocation: UserLocation | null;
  setUserLocation: Dispatch<SetStateAction<UserLocation | null>>;
  overlays: OverlayState;
  setOverlays: Dispatch<SetStateAction<OverlayState>>;
  selectedMapObject: MapObjectDetail | null;
  setSelectedMapObject: Dispatch<SetStateAction<MapObjectDetail | null>>;
  isRouting: boolean;
  setIsRouting: Dispatch<SetStateAction<boolean>>;
  clusteringEnabled: boolean;
  setClusteringEnabled: Dispatch<SetStateAction<boolean>>;
  // Measurement
  isMeasuring: boolean;
  measurementType: MeasurementType;
  measurements: Measurement[];
  currentMeasurement: Measurement | null;
  handleToggleMeasure: (active: boolean, type?: MeasurementType) => void;
  handleMeasurementComplete: (measurement: Measurement) => void;
  handleMeasurementUpdate: (measurement: Measurement | null) => void;
  handleClearMeasurements: () => void;
  handleRemoveMeasurement: (id: string) => void;
  // Object edit/delete
  handleObjectModify: (
    objectId: string,
    newGeometry: GeoJSONGeometry,
    objectType: string,
  ) => Promise<void>;
  handleObjectDelete: (objectId: string, objectType: string) => void;
  executeObjectDelete: () => Promise<void>;
  itemToDelete: { id: string; type: string } | null;
  setItemToDelete: Dispatch<SetStateAction<{ id: string; type: string } | null>>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);
export default AppStateContext;

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateContext.Provider');
  return ctx;
}
