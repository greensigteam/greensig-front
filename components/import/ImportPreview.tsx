import React, { useState, useMemo } from 'react';
import {
    MapPin,
    Minus,
    Pentagon,
    Check,
    X,
    Eye,
    EyeOff,
    Filter,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { ImportPreviewResponse, ImportFeature } from '../../services/api';

interface ImportPreviewProps {
    data: ImportPreviewResponse;
    selectedFeatures: ImportFeature[];
    onFeaturesChange: (features: ImportFeature[]) => void;
}

const GEOMETRY_ICONS: Record<string, React.ReactNode> = {
    'Point': <MapPin className="w-4 h-4" />,
    'MultiPoint': <MapPin className="w-4 h-4" />,
    'LineString': <Minus className="w-4 h-4" />,
    'MultiLineString': <Minus className="w-4 h-4" />,
    'Polygon': <Pentagon className="w-4 h-4" />,
    'MultiPolygon': <Pentagon className="w-4 h-4" />,
};

const GEOMETRY_COLORS: Record<string, string> = {
    'Point': 'text-green-600 bg-green-100',
    'MultiPoint': 'text-green-600 bg-green-100',
    'LineString': 'text-blue-600 bg-blue-100',
    'MultiLineString': 'text-blue-600 bg-blue-100',
    'Polygon': 'text-purple-600 bg-purple-100',
    'MultiPolygon': 'text-purple-600 bg-purple-100',
};

export default function ImportPreview({
    data,
    selectedFeatures,
    onFeaturesChange,
}: ImportPreviewProps) {
    const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
    const [filterGeomType, setFilterGeomType] = useState<string | null>(null);
    const [showOnlySelected, setShowOnlySelected] = useState(false);

    // Filter features
    const filteredFeatures = useMemo(() => {
        let features = data.features;

        if (filterGeomType) {
            features = features.filter(f => f.geometry.type === filterGeomType);
        }

        if (showOnlySelected) {
            const selectedIndices = new Set(selectedFeatures.map(f => f.index));
            features = features.filter(f => selectedIndices.has(f.index));
        }

        return features;
    }, [data.features, filterGeomType, showOnlySelected, selectedFeatures]);

    // Check if feature is selected
    const isSelected = (feature: ImportFeature): boolean => {
        return selectedFeatures.some(f => f.index === feature.index);
    };

    // Toggle feature selection
    const toggleFeature = (feature: ImportFeature) => {
        if (isSelected(feature)) {
            onFeaturesChange(selectedFeatures.filter(f => f.index !== feature.index));
        } else {
            onFeaturesChange([...selectedFeatures, feature]);
        }
    };

    // Select all visible
    const selectAllVisible = () => {
        const currentIndices = new Set(selectedFeatures.map(f => f.index));
        const newFeatures = [...selectedFeatures];

        filteredFeatures.forEach(feature => {
            if (!currentIndices.has(feature.index)) {
                newFeatures.push(feature);
            }
        });

        onFeaturesChange(newFeatures);
    };

    // Deselect all visible
    const deselectAllVisible = () => {
        const visibleIndices = new Set(filteredFeatures.map(f => f.index));
        onFeaturesChange(selectedFeatures.filter(f => !visibleIndices.has(f.index)));
    };

    // Count by geometry type
    const countByType = useMemo(() => {
        const counts: Record<string, number> = {};
        data.features.forEach(f => {
            counts[f.geometry.type] = (counts[f.geometry.type] || 0) + 1;
        });
        return counts;
    }, [data.features]);

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold text-gray-900">
                            {data.feature_count}
                        </div>
                        <div className="text-sm text-gray-500">Objets trouvés</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-blue-600">
                            {selectedFeatures.length}
                        </div>
                        <div className="text-sm text-gray-500">Sélectionnés</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">
                            {data.geometry_types.length}
                        </div>
                        <div className="text-sm text-gray-500">Type(s) de géométrie</div>
                    </div>
                </div>
            </div>

            {/* Geometry Type Badges */}
            <div className="flex flex-wrap gap-2">
                {data.geometry_types.map(type => (
                    <button
                        key={type}
                        onClick={() => setFilterGeomType(filterGeomType === type ? null : type)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            filterGeomType === type
                                ? 'ring-2 ring-blue-500 ring-offset-1'
                                : ''
                        } ${GEOMETRY_COLORS[type] || 'text-gray-600 bg-gray-100'}`}
                    >
                        {GEOMETRY_ICONS[type]}
                        <span>{type}</span>
                        <span className="text-xs opacity-75">({countByType[type] || 0})</span>
                    </button>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={selectAllVisible}
                        className="text-sm text-blue-600 hover:underline"
                    >
                        Tout sélectionner
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                        onClick={deselectAllVisible}
                        className="text-sm text-gray-600 hover:underline"
                    >
                        Tout désélectionner
                    </button>
                </div>
                <button
                    onClick={() => setShowOnlySelected(!showOnlySelected)}
                    className={`flex items-center gap-1 text-sm ${
                        showOnlySelected ? 'text-blue-600' : 'text-gray-600'
                    }`}
                >
                    {showOnlySelected ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {showOnlySelected ? 'Afficher tout' : 'Sélectionnés uniquement'}
                </button>
            </div>

            {/* Features List */}
            <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                {filteredFeatures.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        Aucune feature à afficher
                    </div>
                ) : (
                    filteredFeatures.map(feature => (
                        <div
                            key={feature.index}
                            className={`transition-colors ${
                                isSelected(feature) ? 'bg-blue-50' : 'hover:bg-gray-50'
                            }`}
                        >
                            <div
                                className="flex items-center gap-3 p-3 cursor-pointer"
                                onClick={() => toggleFeature(feature)}
                            >
                                {/* Checkbox */}
                                <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                        isSelected(feature)
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'border-gray-300'
                                    }`}
                                >
                                    {isSelected(feature) && (
                                        <Check className="w-3 h-3 text-white" />
                                    )}
                                </div>

                                {/* Geometry Icon */}
                                <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                        GEOMETRY_COLORS[feature.geometry.type] || 'bg-gray-100'
                                    }`}
                                >
                                    {GEOMETRY_ICONS[feature.geometry.type]}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900">
                                        Feature #{feature.index + 1}
                                    </div>
                                    <div className="text-sm text-gray-500 truncate">
                                        {Object.entries(feature.properties)
                                            .slice(0, 2)
                                            .map(([k, v]) => `${k}: ${v}`)
                                            .join(' | ')}
                                    </div>
                                </div>

                                {/* Expand Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedFeature(
                                            expandedFeature === feature.index ? null : feature.index
                                        );
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded"
                                >
                                    {expandedFeature === feature.index ? (
                                        <ChevronUp className="w-4 h-4 text-gray-500" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                    )}
                                </button>
                            </div>

                            {/* Expanded Properties */}
                            {expandedFeature === feature.index && (
                                <div className="px-12 pb-3">
                                    <div className="bg-gray-100 rounded-lg p-3 text-sm">
                                        <div className="font-medium text-gray-700 mb-2">
                                            Propriétés
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(feature.properties).map(([key, value]) => (
                                                <div key={key}>
                                                    <span className="text-gray-500">{key}:</span>{' '}
                                                    <span className="text-gray-900">
                                                        {value !== null && value !== undefined
                                                            ? String(value)
                                                            : '-'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Sample Properties */}
            {data.sample_properties.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                        Attributs disponibles ({data.sample_properties.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {data.sample_properties.map(prop => (
                            <span
                                key={prop}
                                className="px-2 py-1 bg-white border rounded text-sm text-gray-700"
                            >
                                {prop}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
