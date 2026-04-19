import logger from './logger';
import { apiFetch, handleResponse } from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// ==============================================================================
// TYPES
// ==============================================================================

export interface GeometryOperationResult {
  success?: boolean;
  geometry?: any;
  geometries?: any[];
  stats?: Record<string, any>;
  metrics?: Record<string, any>;
  error?: string;
}

export interface ObjectInGeometry {
  id: number;
  objet_id: number;
  type: string;
  nom?: string;
  site_id?: number;
  site_nom?: string;
  sous_site_id?: number;
  sous_site_nom?: string;
}

export interface ObjectsInGeometryResponse {
  objects: ObjectInGeometry[];
  count: number;
  by_type: Record<string, number>;
}

// ==============================================================================
// OPERATIONS
// ==============================================================================

export async function simplifyGeometry(
  geometry: any,
  tolerance: number = 0.0001,
  preserveTopology: boolean = true,
): Promise<GeometryOperationResult> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/geometry/simplify/`, {
      method: 'POST',
      body: JSON.stringify({
        geometry,
        tolerance,
        preserve_topology: preserveTopology,
      }),
    });
    return handleResponse<GeometryOperationResult>(response);
  } catch (error) {
    logger.error('Error simplifying geometry:', error);
    throw error;
  }
}

export async function calculateGeometryMetrics(geometry: any): Promise<GeometryOperationResult> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/geometry/calculate/`, {
      method: 'POST',
      body: JSON.stringify({ geometry }),
    });
    return handleResponse<GeometryOperationResult>(response);
  } catch (error) {
    logger.error('Error calculating geometry metrics:', error);
    throw error;
  }
}

export async function validateGeometry(
  geometry: any,
  options?: {
    targetType?: string;
    siteId?: number;
    checkDuplicates?: boolean;
    checkWithinSite?: boolean;
  },
): Promise<any> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/geometry/validate/`, {
      method: 'POST',
      body: JSON.stringify({
        geometry,
        target_type: options?.targetType,
        site_id: options?.siteId,
        check_duplicates: options?.checkDuplicates,
        check_within_site: options?.checkWithinSite,
      }),
    });
    return handleResponse<any>(response);
  } catch (error) {
    logger.error('Error validating geometry:', error);
    throw error;
  }
}

export async function bufferGeometry(
  geometry: any,
  distanceMeters: number,
): Promise<GeometryOperationResult> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/geometry/buffer/`, {
      method: 'POST',
      body: JSON.stringify({
        geometry,
        distance: distanceMeters,
      }),
    });
    return handleResponse<GeometryOperationResult>(response);
  } catch (error) {
    logger.error('Error creating buffer:', error);
    throw error;
  }
}

export async function mergePolygons(polygons: any[]): Promise<GeometryOperationResult> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/geometry/merge/`, {
      method: 'POST',
      body: JSON.stringify({ polygons }),
    });
    return handleResponse<GeometryOperationResult>(response);
  } catch (error) {
    logger.error('Error merging polygons:', error);
    throw error;
  }
}

export async function splitPolygon(polygon: any, splitLine: any): Promise<GeometryOperationResult> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/geometry/split/`, {
      method: 'POST',
      body: JSON.stringify({
        polygon,
        split_line: splitLine,
      }),
    });
    return handleResponse<GeometryOperationResult>(response);
  } catch (error) {
    logger.error('Error splitting polygon:', error);
    throw error;
  }
}

export async function getObjectsInGeometry(
  geometry: any,
  options?: {
    site_id?: number;
    object_types?: string[];
  },
): Promise<ObjectsInGeometryResponse> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/objects-in-geometry/`, {
      method: 'POST',
      body: JSON.stringify({
        geometry,
        site_id: options?.site_id,
        object_types: options?.object_types,
      }),
    });
    return handleResponse<ObjectsInGeometryResponse>(response);
  } catch (error) {
    logger.error('Error getting objects in geometry:', error);
    throw error;
  }
}
