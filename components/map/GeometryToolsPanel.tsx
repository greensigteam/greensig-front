import { useState } from 'react';
import {
    Scissors,
    Merge,
    Minimize2,
    Circle,
    CheckCircle,
    AlertTriangle,
    Loader2,
    Info,
    X,
    Ruler,
    Square,
} from 'lucide-react';
import { useGeometryOperations } from '../../hooks/useGeometryOperations';
import { GeoJSONGeometry } from '../../types';

interface GeometryToolsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    selectedGeometry: GeoJSONGeometry | null;
    selectedGeometries: GeoJSONGeometry[];
    onGeometryChange?: (geometry: GeoJSONGeometry) => void;
    onSplitStart?: () => void;
    siteId?: number;
}

type ToolTab = 'transform' | 'validate' | 'measure';

export default function GeometryToolsPanel({
    isOpen,
    onClose,
    selectedGeometry,
    selectedGeometries,
    onGeometryChange,
    onSplitStart,
    siteId,
}: GeometryToolsPanelProps) {
    const [activeTab, setActiveTab] = useState<ToolTab>('transform');
    const [simplifyTolerance, setSimplifyTolerance] = useState(0.0001);
    const [bufferDistance, setBufferDistance] = useState(5);

    const {
        isProcessing,
        lastMetrics,
        validationResult,
        simplify,
        merge,
        validate,
        buffer,
        calculate,
    } = useGeometryOperations({
        onSuccess: (result) => {
            if (result.geometry && onGeometryChange) {
                onGeometryChange(result.geometry);
            }
        },
    });

    // Handle simplify
    const handleSimplify = async () => {
        if (!selectedGeometry) return;
        await simplify(selectedGeometry, simplifyTolerance);
    };

    // Handle merge
    const handleMerge = async () => {
        if (selectedGeometries.length < 2) return;
        const result = await merge(selectedGeometries);
        if (result && onGeometryChange) {
            onGeometryChange(result);
        }
    };

    // Handle buffer
    const handleBuffer = async () => {
        if (!selectedGeometry) return;
        await buffer(selectedGeometry, bufferDistance);
    };

    // Handle validate
    const handleValidate = async () => {
        if (!selectedGeometry) return;
        await validate(selectedGeometry, {
            checkWithinSite: !!siteId,
            siteId,
            checkDuplicates: true,
        });
    };

    // Handle calculate metrics
    const handleCalculate = async () => {
        if (!selectedGeometry) return;
        await calculate(selectedGeometry);
    };

    // Check geometry type for available operations
    const isPolygon =
        selectedGeometry?.type === 'Polygon' || selectedGeometry?.type === 'MultiPolygon';
    const isLine =
        selectedGeometry?.type === 'LineString' || selectedGeometry?.type === 'MultiLineString';
    const canMerge =
        selectedGeometries.length >= 2 &&
        selectedGeometries.every(
            (g) => g.type === 'Polygon' || g.type === 'MultiPolygon'
        );

    if (!isOpen) return null;

    return (
        <div className="absolute right-4 top-20 w-80 bg-white rounded-xl shadow-2xl z-40 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-semibold text-gray-900">Outils géométrie</h3>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                    <X className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
                {[
                    { id: 'transform' as ToolTab, label: 'Transformer' },
                    { id: 'validate' as ToolTab, label: 'Valider' },
                    { id: 'measure' as ToolTab, label: 'Mesurer' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${
                            activeTab === tab.id
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {/* No Selection Warning */}
                {!selectedGeometry && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        Sélectionnez un objet sur la carte
                    </div>
                )}

                {/* Transform Tab */}
                {activeTab === 'transform' && selectedGeometry && (
                    <div className="space-y-4">
                        {/* Simplify */}
                        <div className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Minimize2 className="w-4 h-4 text-blue-600" />
                                    <span className="font-medium text-sm">Simplifier</span>
                                </div>
                                <button
                                    onClick={handleSimplify}
                                    disabled={isProcessing || !isPolygon && !isLine}
                                    className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        'Appliquer'
                                    )}
                                </button>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">
                                    Tolérance: {simplifyTolerance}
                                </label>
                                <input
                                    type="range"
                                    min="0.00001"
                                    max="0.001"
                                    step="0.00001"
                                    value={simplifyTolerance}
                                    onChange={(e) =>
                                        setSimplifyTolerance(parseFloat(e.target.value))
                                    }
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Split (only for polygons) */}
                        {isPolygon && (
                            <div className="border rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Scissors className="w-4 h-4 text-red-600" />
                                        <span className="font-medium text-sm">Diviser</span>
                                    </div>
                                    <button
                                        onClick={onSplitStart}
                                        className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded"
                                    >
                                        Tracer ligne
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Tracez une ligne pour diviser le polygone
                                </p>
                            </div>
                        )}

                        {/* Merge (when multiple polygons selected) */}
                        <div className="border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Merge className="w-4 h-4 text-green-600" />
                                    <span className="font-medium text-sm">Fusionner</span>
                                </div>
                                <button
                                    onClick={handleMerge}
                                    disabled={!canMerge || isProcessing}
                                    className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        'Fusionner'
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {canMerge
                                    ? `${selectedGeometries.length} polygones sélectionnés`
                                    : 'Sélectionnez 2+ polygones'}
                            </p>
                        </div>

                        {/* Buffer */}
                        <div className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Circle className="w-4 h-4 text-purple-600" />
                                    <span className="font-medium text-sm">Zone tampon</span>
                                </div>
                                <button
                                    onClick={handleBuffer}
                                    disabled={isProcessing}
                                    className="px-3 py-1 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        'Créer'
                                    )}
                                </button>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">
                                    Distance: {bufferDistance}m
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="100"
                                    value={bufferDistance}
                                    onChange={(e) =>
                                        setBufferDistance(parseInt(e.target.value))
                                    }
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Validate Tab */}
                {activeTab === 'validate' && selectedGeometry && (
                    <div className="space-y-4">
                        <button
                            onClick={handleValidate}
                            disabled={isProcessing}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CheckCircle className="w-4 h-4" />
                            )}
                            Valider la géométrie
                        </button>

                        {/* Validation Results */}
                        {validationResult && (
                            <div className="space-y-3">
                                {/* Overall Status */}
                                <div
                                    className={`flex items-center gap-2 p-3 rounded-lg ${
                                        validationResult.is_valid
                                            ? 'bg-green-50 text-green-800'
                                            : 'bg-red-50 text-red-800'
                                    }`}
                                >
                                    {validationResult.is_valid ? (
                                        <CheckCircle className="w-5 h-5" />
                                    ) : (
                                        <AlertTriangle className="w-5 h-5" />
                                    )}
                                    <span className="font-medium">
                                        {validationResult.is_valid
                                            ? 'Géométrie valide'
                                            : 'Problèmes détectés'}
                                    </span>
                                </div>

                                {/* Errors */}
                                {validationResult.errors?.length > 0 && (
                                    <div className="border border-red-200 rounded-lg p-3">
                                        <div className="font-medium text-red-700 text-sm mb-2">
                                            Erreurs ({validationResult.errors.length})
                                        </div>
                                        <ul className="text-xs text-red-600 space-y-1">
                                            {validationResult.errors.map((err, i) => (
                                                <li key={i}>• {err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Warnings */}
                                {validationResult.warnings?.length > 0 && (
                                    <div className="border border-yellow-200 rounded-lg p-3">
                                        <div className="font-medium text-yellow-700 text-sm mb-2">
                                            Avertissements ({validationResult.warnings.length})
                                        </div>
                                        <ul className="text-xs text-yellow-600 space-y-1">
                                            {validationResult.warnings.map((warn, i) => (
                                                <li key={i}>• {warn}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Duplicates */}
                                {validationResult.duplicates &&
                                    validationResult.duplicates.length > 0 && (
                                        <div className="border border-orange-200 rounded-lg p-3">
                                            <div className="font-medium text-orange-700 text-sm mb-2">
                                                Doublons potentiels (
                                                {validationResult.duplicates.length})
                                            </div>
                                            <ul className="text-xs text-orange-600 space-y-1">
                                                {validationResult.duplicates.map((dup, i) => (
                                                    <li key={i}>
                                                        • {dup.type} #{dup.id} à {dup.distance.toFixed(1)}m
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>
                )}

                {/* Measure Tab */}
                {activeTab === 'measure' && selectedGeometry && (
                    <div className="space-y-4">
                        <button
                            onClick={handleCalculate}
                            disabled={isProcessing}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Ruler className="w-4 h-4" />
                            )}
                            Calculer les mesures
                        </button>

                        {/* Metrics Results */}
                        {lastMetrics && (
                            <div className="space-y-3">
                                {/* Area */}
                                {lastMetrics.area_m2 !== undefined && lastMetrics.area_m2 > 0 && (
                                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Square className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm font-medium text-blue-900">
                                                Surface
                                            </span>
                                        </div>
                                        <span className="font-bold text-blue-700">
                                            {lastMetrics.area_m2 < 10000
                                                ? `${lastMetrics.area_m2.toFixed(2)} m²`
                                                : `${(lastMetrics.area_hectares || lastMetrics.area_m2 / 10000).toFixed(2)} ha`}
                                        </span>
                                    </div>
                                )}

                                {/* Length/Perimeter */}
                                {lastMetrics.length_m !== undefined && lastMetrics.length_m > 0 && (
                                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Ruler className="w-4 h-4 text-green-600" />
                                            <span className="text-sm font-medium text-green-900">
                                                {isPolygon ? 'Périmètre' : 'Longueur'}
                                            </span>
                                        </div>
                                        <span className="font-bold text-green-700">
                                            {lastMetrics.length_m < 1000
                                                ? `${lastMetrics.length_m.toFixed(2)} m`
                                                : `${(lastMetrics.length_km || lastMetrics.length_m / 1000).toFixed(2)} km`}
                                        </span>
                                    </div>
                                )}

                                {/* Perimeter for polygons */}
                                {isPolygon && lastMetrics.perimeter_m !== undefined && lastMetrics.perimeter_m > 0 && (
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm font-medium text-gray-700">
                                            Périmètre
                                        </span>
                                        <span className="font-bold text-gray-900">
                                            {lastMetrics.perimeter_m < 1000
                                                ? `${lastMetrics.perimeter_m.toFixed(2)} m`
                                                : `${(lastMetrics.perimeter_m / 1000).toFixed(2)} km`}
                                        </span>
                                    </div>
                                )}

                                {/* Centroid */}
                                {lastMetrics.centroid && (
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <div className="text-sm font-medium text-gray-700 mb-1">
                                            Centroïde
                                        </div>
                                        <div className="text-xs text-gray-600 font-mono">
                                            Lat: {lastMetrics.centroid.lat.toFixed(6)}
                                            <br />
                                            Lng: {lastMetrics.centroid.lng.toFixed(6)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Geometry Type Info */}
                        <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                            <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <span className="font-medium">Type:</span> {selectedGeometry.type}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
