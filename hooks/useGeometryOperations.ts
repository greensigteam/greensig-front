import { useState, useCallback } from 'react';
import {
    simplifyGeometry,
    mergePolygons,
    splitPolygon,
    validateGeometry,
    bufferGeometry,
    calculateGeometryMetrics,
    GeometryOperationResult,
} from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { GeoJSONGeometry, GeometryMetrics } from '../types';

interface UseGeometryOperationsOptions {
    onSuccess?: (result: GeometryOperationResult) => void;
    onError?: (error: Error) => void;
}

interface UseGeometryOperationsReturn {
    // State
    isProcessing: boolean;
    lastResult: GeometryOperationResult | null;
    lastMetrics: GeometryMetrics | null;
    validationResult: ValidationResult | null;

    // Operations
    simplify: (geometry: GeoJSONGeometry, tolerance: number, preserveTopology?: boolean) => Promise<GeoJSONGeometry | null>;
    merge: (polygons: GeoJSONGeometry[]) => Promise<GeoJSONGeometry | null>;
    split: (polygon: GeoJSONGeometry, splitLine: GeoJSONGeometry) => Promise<GeoJSONGeometry[] | null>;
    validate: (geometry: GeoJSONGeometry, options?: ValidateOptions) => Promise<ValidationResult | null>;
    buffer: (geometry: GeoJSONGeometry, distanceMeters: number) => Promise<GeoJSONGeometry | null>;
    calculate: (geometry: GeoJSONGeometry) => Promise<GeometryMetrics | null>;

    // Helpers
    clearResults: () => void;
}

interface ValidateOptions {
    checkWithinSite?: boolean;
    siteId?: number;
    checkDuplicates?: boolean;
    objectType?: string;
}

interface ValidationResult {
    is_valid: boolean;
    geometry_valid: boolean;
    within_site?: boolean;
    errors: string[];
    warnings: string[];
    duplicates?: Array<{
        id: number;
        distance: number;
        type: string;
    }>;
}

/**
 * Hook for performing geometry operations via backend API
 */
export function useGeometryOperations(
    options: UseGeometryOperationsOptions = {}
): UseGeometryOperationsReturn {
    const { onSuccess, onError } = options;
    const { showToast } = useToast();

    const [isProcessing, setIsProcessing] = useState(false);
    const [lastResult, setLastResult] = useState<GeometryOperationResult | null>(null);
    const [lastMetrics, setLastMetrics] = useState<GeometryMetrics | null>(null);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

    // Simplify geometry
    const simplify = useCallback(async (
        geometry: GeoJSONGeometry,
        tolerance: number,
        preserveTopology: boolean = true
    ): Promise<GeoJSONGeometry | null> => {
        setIsProcessing(true);
        try {
            const result = await simplifyGeometry(geometry, tolerance, preserveTopology);
            setLastResult(result);

            if (result.success && result.geometry) {
                showToast('Géométrie simplifiée avec succès', 'success');
                onSuccess?.(result);
                return result.geometry;
            } else {
                showToast(result.error || 'Erreur lors de la simplification', 'error');
                return null;
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(error.message || 'Unknown error');
            showToast(err.message, 'error');
            onError?.(err);
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, [showToast, onSuccess, onError]);

    // Merge polygons
    const merge = useCallback(async (
        polygons: GeoJSONGeometry[]
    ): Promise<GeoJSONGeometry | null> => {
        if (polygons.length < 2) {
            showToast('Sélectionnez au moins 2 polygones à fusionner', 'error');
            return null;
        }

        setIsProcessing(true);
        try {
            const result = await mergePolygons(polygons);
            setLastResult(result);

            if (result.success && result.geometry) {
                showToast(`${polygons.length} polygones fusionnés avec succès`, 'success');
                onSuccess?.(result);
                return result.geometry;
            } else {
                showToast(result.error || 'Erreur lors de la fusion', 'error');
                return null;
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(error.message || 'Unknown error');
            showToast(err.message, 'error');
            onError?.(err);
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, [showToast, onSuccess, onError]);

    // Split polygon with line
    const split = useCallback(async (
        polygon: GeoJSONGeometry,
        splitLine: GeoJSONGeometry
    ): Promise<GeoJSONGeometry[] | null> => {
        if (polygon.type !== 'Polygon' && polygon.type !== 'MultiPolygon') {
            showToast('Seuls les polygones peuvent être divisés', 'error');
            return null;
        }

        if (splitLine.type !== 'LineString' && splitLine.type !== 'MultiLineString') {
            showToast('La ligne de découpe doit être une LineString', 'error');
            return null;
        }

        setIsProcessing(true);
        try {
            const result = await splitPolygon(polygon, splitLine);
            setLastResult(result);

            if (result.success && result.geometries) {
                showToast(`Polygone divisé en ${result.geometries.length} parties`, 'success');
                onSuccess?.(result);
                return result.geometries;
            } else {
                showToast(result.error || 'Erreur lors de la division', 'error');
                return null;
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(error.message || 'Unknown error');
            showToast(err.message, 'error');
            onError?.(err);
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, [showToast, onSuccess, onError]);

    // Validate geometry
    const validate = useCallback(async (
        geometry: GeoJSONGeometry,
        validateOptions: ValidateOptions = {}
    ): Promise<ValidationResult | null> => {
        setIsProcessing(true);
        try {
            const result = await validateGeometry(geometry, validateOptions);
            setValidationResult(result);

            if (result.is_valid) {
                showToast('Géométrie valide', 'success');
            } else {
                const errorCount = result.errors?.length || 0;
                showToast(`${errorCount} erreur(s) détectée(s)`, 'error');
            }

            return result;
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(error.message || 'Unknown error');
            showToast(err.message, 'error');
            onError?.(err);
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, [showToast, onError]);

    // Buffer geometry
    const buffer = useCallback(async (
        geometry: GeoJSONGeometry,
        distanceMeters: number
    ): Promise<GeoJSONGeometry | null> => {
        if (distanceMeters <= 0) {
            showToast('La distance de tampon doit être positive', 'error');
            return null;
        }

        setIsProcessing(true);
        try {
            const result = await bufferGeometry(geometry, distanceMeters);
            setLastResult(result);

            if (result.success && result.geometry) {
                showToast(`Zone tampon de ${distanceMeters}m créée`, 'success');
                onSuccess?.(result);
                return result.geometry;
            } else {
                showToast(result.error || 'Erreur lors de la création du tampon', 'error');
                return null;
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(error.message || 'Unknown error');
            showToast(err.message, 'error');
            onError?.(err);
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, [showToast, onSuccess, onError]);

    // Calculate geometry metrics
    const calculate = useCallback(async (
        geometry: GeoJSONGeometry
    ): Promise<GeometryMetrics | null> => {
        setIsProcessing(true);
        try {
            const result = await calculateGeometryMetrics(geometry);

            if (result.success && result.metrics) {
                setLastMetrics(result.metrics);
                return result.metrics;
            } else {
                showToast(result.error || 'Erreur lors du calcul', 'error');
                return null;
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(error.message || 'Unknown error');
            showToast(err.message, 'error');
            onError?.(err);
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, [showToast, onError]);

    // Clear all results
    const clearResults = useCallback(() => {
        setLastResult(null);
        setLastMetrics(null);
        setValidationResult(null);
    }, []);

    return {
        isProcessing,
        lastResult,
        lastMetrics,
        validationResult,
        simplify,
        merge,
        split,
        validate,
        buffer,
        calculate,
        clearResults,
    };
}

/**
 * Hook for geometry simplification with preview
 */
export function useSimplifyWithPreview() {
    const [originalGeometry, setOriginalGeometry] = useState<GeoJSONGeometry | null>(null);
    const [previewGeometry, setPreviewGeometry] = useState<GeoJSONGeometry | null>(null);
    const [tolerance, setTolerance] = useState(0.0001);
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    const { simplify, isProcessing } = useGeometryOperations();

    const startPreview = useCallback((geometry: GeoJSONGeometry) => {
        setOriginalGeometry(geometry);
        setPreviewGeometry(null);
        setIsPreviewMode(true);
    }, []);

    const updatePreview = useCallback(async (newTolerance: number) => {
        if (!originalGeometry) return;
        setTolerance(newTolerance);
        const result = await simplify(originalGeometry, newTolerance);
        if (result) {
            setPreviewGeometry(result);
        }
    }, [originalGeometry, simplify]);

    const applySimplification = useCallback(() => {
        const result = previewGeometry;
        setIsPreviewMode(false);
        setOriginalGeometry(null);
        setPreviewGeometry(null);
        return result;
    }, [previewGeometry]);

    const cancelPreview = useCallback(() => {
        setIsPreviewMode(false);
        setOriginalGeometry(null);
        setPreviewGeometry(null);
    }, []);

    return {
        originalGeometry,
        previewGeometry,
        tolerance,
        isPreviewMode,
        isProcessing,
        startPreview,
        updatePreview,
        applySimplification,
        cancelPreview,
    };
}
