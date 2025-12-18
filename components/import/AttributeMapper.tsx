import React, { useState, useEffect } from 'react';
import {
    ArrowRight,
    HelpCircle,
    AlertCircle,
    Loader2,
    MapPin,
    Crosshair,
} from 'lucide-react';
import { AttributeMapping, fetchAllSites, SiteFrontend } from '../../services/api';
import { OBJECT_TYPES, getObjectTypesByGeometry } from '../../contexts/DrawingContext';
import { ObjectTypeInfo } from '../../types';

interface AttributeMapperProps {
    sourceProperties: string[];
    geometryTypes: string[];
    mapping: AttributeMapping;
    onMappingChange: (mapping: AttributeMapping) => void;
    targetType: string;
    onTargetTypeChange: (type: string) => void;
    siteId: number | null;
    onSiteIdChange: (siteId: number | null) => void;
    autoDetectSite: boolean;
    onAutoDetectSiteChange: (autoDetect: boolean) => void;
}

export default function AttributeMapper({
    sourceProperties,
    geometryTypes,
    mapping,
    onMappingChange,
    targetType,
    onTargetTypeChange,
    siteId,
    onSiteIdChange,
    autoDetectSite,
    onAutoDetectSiteChange,
}: AttributeMapperProps) {
    const [sites, setSites] = useState<SiteFrontend[]>([]);
    const [isLoadingSites, setIsLoadingSites] = useState(true);

    // Load sites
    useEffect(() => {
        const loadSites = async () => {
            setIsLoadingSites(true);
            try {
                const data = await fetchAllSites();
                setSites(data);
            } catch (error) {
                console.error('Error loading sites:', error);
            } finally {
                setIsLoadingSites(false);
            }
        };
        loadSites();
    }, []);

    // Get compatible object types based on geometry types
    const compatibleTypes: ObjectTypeInfo[] = React.useMemo(() => {
        const allCompatible: ObjectTypeInfo[] = [];

        geometryTypes.forEach(geomType => {
            let olGeomType: 'Point' | 'LineString' | 'Polygon';

            if (geomType.includes('Point')) {
                olGeomType = 'Point';
            } else if (geomType.includes('Line')) {
                olGeomType = 'LineString';
            } else {
                olGeomType = 'Polygon';
            }

            const types = getObjectTypesByGeometry(olGeomType);
            types.forEach(t => {
                if (!allCompatible.find(c => c.id === t.id)) {
                    allCompatible.push(t);
                }
            });
        });

        return allCompatible;
    }, [geometryTypes]);

    // Get selected type info
    const selectedTypeInfo = OBJECT_TYPES.find(t => t.id === targetType);

    // Handle mapping change for a field
    const handleFieldMapping = (targetField: string, sourceField: string | null) => {
        onMappingChange({
            ...mapping,
            [targetField]: sourceField,
        });
    };

    // Auto-suggest mapping based on field names
    const autoSuggestMapping = () => {
        if (!selectedTypeInfo) return;

        const newMapping: AttributeMapping = {};

        selectedTypeInfo.fields.forEach(field => {
            // Try to find a matching source property
            const fieldNameLower = field.name.toLowerCase();
            const labelLower = field.label.toLowerCase();

            const match = sourceProperties.find(prop => {
                const propLower = prop.toLowerCase();
                return (
                    propLower === fieldNameLower ||
                    propLower === labelLower ||
                    propLower.includes(fieldNameLower) ||
                    fieldNameLower.includes(propLower)
                );
            });

            newMapping[field.name] = match || null;
        });

        onMappingChange(newMapping);
    };

    // Check if target type requires a site (Site objects don't need a parent site)
    const requiresSite = targetType !== 'Site';

    return (
        <div className="space-y-6">
            {/* Object Type Selection - First, so we know if we need site */}
            <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type d'objet à créer <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {compatibleTypes.map(type => (
                        <button
                            key={type.id}
                            onClick={() => onTargetTypeChange(type.id)}
                            className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                                targetType === type.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: `${type.color}20` }}
                            >
                                <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: type.color }}
                                />
                            </div>
                            <div className="text-left">
                                <div className="font-medium text-sm">{type.name}</div>
                                <div className="text-xs text-gray-500">{type.geometryType}</div>
                            </div>
                        </button>
                    ))}
                </div>
                {compatibleTypes.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                        <p>Aucun type d'objet compatible avec les géométries importées</p>
                    </div>
                )}
            </div>

            {/* Site Selection - Only show if target type requires a site */}
            {requiresSite && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <label className="block text-sm font-medium text-gray-700">
                        Site de destination <span className="text-red-500">*</span>
                    </label>

                    {/* Auto-detect toggle */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                onAutoDetectSiteChange(true);
                                onSiteIdChange(null);
                            }}
                            className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                                autoDetectSite
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                autoDetectSite ? 'bg-emerald-100' : 'bg-gray-100'
                            }`}>
                                <Crosshair className={`w-5 h-5 ${autoDetectSite ? 'text-emerald-600' : 'text-gray-500'}`} />
                            </div>
                            <div className="text-left">
                                <div className={`font-medium text-sm ${autoDetectSite ? 'text-emerald-700' : 'text-gray-700'}`}>
                                    Détection automatique
                                </div>
                                <div className="text-xs text-gray-500">
                                    Assigne chaque objet au site contenant sa géométrie
                                </div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => onAutoDetectSiteChange(false)}
                            className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                                !autoDetectSite
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                !autoDetectSite ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                                <MapPin className={`w-5 h-5 ${!autoDetectSite ? 'text-blue-600' : 'text-gray-500'}`} />
                            </div>
                            <div className="text-left">
                                <div className={`font-medium text-sm ${!autoDetectSite ? 'text-blue-700' : 'text-gray-700'}`}>
                                    Site unique
                                </div>
                                <div className="text-xs text-gray-500">
                                    Tous les objets seront assignés au même site
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Auto-detect info */}
                    {autoDetectSite && (
                        <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
                            <Crosshair className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium">Mode détection automatique</p>
                                <p className="text-emerald-600">
                                    Chaque objet sera automatiquement assigné au site dont l'emprise contient sa géométrie.
                                    Les objets hors de tout site seront signalés comme erreurs.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Manual site selection */}
                    {!autoDetectSite && (
                        <>
                            {isLoadingSites ? (
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Chargement des sites...
                                </div>
                            ) : sites.length === 0 ? (
                                <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                                    <AlertCircle className="w-5 h-5" />
                                    <span>Aucun site disponible. Importez d'abord un fichier de Sites.</span>
                                </div>
                            ) : (
                                <select
                                    value={siteId || ''}
                                    onChange={(e) => onSiteIdChange(e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Sélectionner un site...</option>
                                    {sites.map(site => (
                                        <option key={site.id} value={site.id}>
                                            {site.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Info message for Site import */}
            {targetType === 'Site' && (
                <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
                    <HelpCircle className="w-5 h-5 flex-shrink-0" />
                    <span>Les Sites sont des objets racines et n'ont pas besoin de site parent.</span>
                </div>
            )}

            {/* Attribute Mapping */}
            {selectedTypeInfo && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">
                            Mapping des attributs
                        </h3>
                        <button
                            onClick={autoSuggestMapping}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Suggestion automatique
                        </button>
                    </div>

                    <div className="border rounded-lg divide-y">
                        {/* Header */}
                        <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 text-sm font-medium text-gray-500">
                            <div className="w-1/3">Attribut source</div>
                            <div className="w-8 flex justify-center">
                                <ArrowRight className="w-4 h-4" />
                            </div>
                            <div className="flex-1">Champ cible</div>
                        </div>

                        {/* Mapping Rows */}
                        {selectedTypeInfo.fields.map(field => (
                            <div
                                key={field.name}
                                className="flex items-center gap-4 px-4 py-3"
                            >
                                {/* Source Selector */}
                                <div className="w-1/3">
                                    <select
                                        value={mapping[field.name] || ''}
                                        onChange={(e) =>
                                            handleFieldMapping(
                                                field.name,
                                                e.target.value || null
                                            )
                                        }
                                        className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- Non mappé --</option>
                                        {sourceProperties.map(prop => (
                                            <option key={prop} value={prop}>
                                                {prop}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Arrow */}
                                <div className="w-8 flex justify-center">
                                    <ArrowRight
                                        className={`w-4 h-4 ${
                                            mapping[field.name]
                                                ? 'text-green-600'
                                                : 'text-gray-300'
                                        }`}
                                    />
                                </div>

                                {/* Target Field */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">
                                            {field.label}
                                        </span>
                                        {field.required && (
                                            <span className="text-xs text-red-500">*</span>
                                        )}
                                        <span className="text-xs text-gray-400">
                                            ({field.type})
                                        </span>
                                    </div>
                                    {field.type === 'select' && field.options && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            Options: {field.options.join(', ')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Help Text */}
                    <div className="flex items-start gap-2 text-sm text-gray-500 bg-blue-50 rounded-lg p-3">
                        <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-blue-700">Conseil</p>
                            <p>
                                Les attributs non mappés seront laissés vides. Les champs marqués
                                d'un <span className="text-red-500">*</span> sont recommandés
                                mais pas obligatoires - une valeur par défaut sera générée.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Warning if no type selected */}
            {!targetType && (
                <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                    <AlertCircle className="w-5 h-5" />
                    <span>Veuillez sélectionner un type d'objet pour configurer le mapping</span>
                </div>
            )}
        </div>
    );
}
