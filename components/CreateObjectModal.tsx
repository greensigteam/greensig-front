import React, { useState, useEffect } from 'react';
import {
    Check,
    Loader2,
    MapPin,
    Building2,
    Ruler,
    Route,
    AlertTriangle,
    TreeDeciduous,
    Droplets,
} from 'lucide-react';
import { useDrawing, getObjectTypeById } from '../contexts/DrawingContext';
import { GeoJSONGeometry, GeometryMetrics, ObjectFieldConfig } from '../types';
import { createInventoryItem, detectSiteFromGeometry, DetectedSiteResult } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { FormModal } from './FormModal';

interface CreateObjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (createdObject: any) => void;
    geometry: GeoJSONGeometry | null;
    metrics: GeometryMetrics | null;
    objectType: string | null;
}

// Get category icon based on object category
const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'vegetation':
            return TreeDeciduous;
        case 'hydraulique':
            return Droplets;
        case 'site':
            return Building2;
        default:
            return MapPin;
    }
};

export default function CreateObjectModal({
    isOpen,
    onClose,
    onSuccess,
    geometry,
    metrics,
    objectType,
}: CreateObjectModalProps) {
    const { cancelDrawing } = useDrawing();
    const { showToast } = useToast();

    const [detectedSite, setDetectedSite] = useState<DetectedSiteResult | null>(null);
    const [siteError, setSiteError] = useState<string | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isDetectingSite, setIsDetectingSite] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const typeInfo = objectType ? getObjectTypeById(objectType) : null;
    const CategoryIcon = typeInfo ? getCategoryIcon(typeInfo.category) : MapPin;
    const themeColor = typeInfo?.color || '#10b981';

    // Auto-detect site from geometry when modal opens
    useEffect(() => {
        const detectSite = async () => {
            if (!isOpen || !geometry) return;

            setIsDetectingSite(true);
            setSiteError(null);
            setDetectedSite(null);

            try {
                const result = await detectSiteFromGeometry(geometry as {
                    type: string;
                    coordinates: number[] | number[][] | number[][][];
                });
                setDetectedSite(result);
            } catch (error: any) {
                console.error('Site detection error:', error);
                setSiteError(error.message || 'Aucun site ne contient cette géométrie');
            } finally {
                setIsDetectingSite(false);
            }
        };

        detectSite();
    }, [isOpen, geometry]);

    // Reset form when modal opens/closes or type changes
    useEffect(() => {
        if (isOpen && typeInfo) {
            const initialData: Record<string, any> = {};
            typeInfo.fields.forEach(field => {
                initialData[field.name] = '';
            });
            setFormData(initialData);
            setErrors({});
        }
    }, [isOpen, typeInfo]);

    // Handle field change
    const handleFieldChange = (fieldName: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        // Clear error for this field
        if (errors[fieldName]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldName];
                return newErrors;
            });
        }
    };

    // Validate form
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Site is auto-detected, no need to validate selection
        if (!detectedSite) {
            // This shouldn't happen as the form is blocked, but just in case
            return false;
        }

        typeInfo?.fields.forEach(field => {
            if (field.required && !formData[field.name]) {
                newErrors[field.name] = 'Ce champ est requis';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm() || !geometry || !objectType || !detectedSite) {
            return;
        }

        setIsLoading(true);

        try {
            // Clean up form data: convert empty strings to null for optional fields
            const cleanedProperties: Record<string, any> = {};
            Object.entries(formData).forEach(([key, value]) => {
                // Keep non-empty values, convert empty strings to null
                if (value !== '' && value !== undefined) {
                    cleanedProperties[key] = value;
                } else {
                    // Check if field is required - if not, send null instead of empty string
                    const field = typeInfo?.fields.find(f => f.name === key);
                    if (!field?.required) {
                        cleanedProperties[key] = null;
                    }
                    // Skip required fields that are empty (validation should have caught this)
                }
            });

            const result = await createInventoryItem(objectType, {
                geometry,
                site_id: detectedSite.site.id,
                properties: cleanedProperties,
            });

            showToast(`${typeInfo?.name || 'Objet'} créé avec succès`, 'success');
            onSuccess?.(result);
            cancelDrawing();
            onClose();
        } catch (error: any) {
            console.error('Error creating object:', error);
            showToast(
                error.message || 'Erreur lors de la création',
                'error'
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Handle close
    const handleClose = () => {
        cancelDrawing();
        onClose();
    };

    // Render field input
    const renderField = (field: ObjectFieldConfig) => {
        const value = formData[field.name] || '';
        const error = errors[field.name];

        const baseInputClass = `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
        }`;

        switch (field.type) {
            case 'select':
                return (
                    <select
                        value={value}
                        onChange={e => handleFieldChange(field.name, e.target.value)}
                        className={baseInputClass}
                    >
                        <option value="">Sélectionner...</option>
                        {field.options?.map(option => (
                            <option key={option} value={option}>
                                {option.charAt(0).toUpperCase() + option.slice(1)}
                            </option>
                        ))}
                    </select>
                );

            case 'number':
                return (
                    <input
                        type="number"
                        value={value}
                        onChange={e => handleFieldChange(field.name, e.target.value)}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        placeholder={field.placeholder}
                        className={baseInputClass}
                    />
                );

            case 'textarea':
                return (
                    <textarea
                        value={value}
                        onChange={e => handleFieldChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className={`${baseInputClass} resize-none`}
                    />
                );

            default:
                return (
                    <input
                        type="text"
                        value={value}
                        onChange={e => handleFieldChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className={baseInputClass}
                    />
                );
        }
    };

    if (!isOpen) return null;

    // Custom header with theme color
    const customHeader = (
        <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ backgroundColor: `${themeColor}10` }}
        >
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: themeColor }}
                >
                    <CategoryIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                        Nouveau {typeInfo?.name?.toLowerCase() || 'objet'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        Renseignez les informations de l'objet
                    </p>
                </div>
            </div>
        </div>
    );

    // Content with site detection status
    const modalContent = (
        <>
            {/* Geometry Info */}
            {metrics && (
                <div
                    className="px-4 py-3 border-b flex items-center gap-4 text-sm -mt-2 mb-4"
                    style={{
                        backgroundColor: `${themeColor}08`,
                        color: themeColor
                    }}
                >
                    {metrics.area_m2 !== undefined && (
                        <span className="flex items-center gap-1.5">
                            <Ruler className="w-4 h-4" />
                            {metrics.area_m2 > 10000
                                ? `${metrics.area_hectares?.toFixed(2)} ha`
                                : `${metrics.area_m2.toFixed(1)} m²`}
                        </span>
                    )}
                    {metrics.length_m !== undefined && (
                        <span className="flex items-center gap-1.5">
                            <Route className="w-4 h-4" />
                            {metrics.length_m > 1000
                                ? `${metrics.length_km?.toFixed(2)} km`
                                : `${metrics.length_m.toFixed(1)} m`}
                        </span>
                    )}
                    {metrics.perimeter_m !== undefined && (
                        <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            {metrics.perimeter_m.toFixed(1)} m périmètre
                        </span>
                    )}
                </div>
            )}

            {/* Error state - Object is outside all sites */}
            {siteError ? (
                <div className="p-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-medium text-red-800">
                                    Position invalide
                                </h3>
                                <p className="text-sm text-red-600 mt-1">
                                    {siteError}
                                </p>
                                <p className="text-sm text-red-600 mt-2">
                                    Veuillez dessiner l'objet à l'intérieur d'un site existant.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Auto-detected Site */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            Site (détecté automatiquement)
                        </label>
                        {isDetectingSite ? (
                            <div className="flex items-center gap-2 text-gray-500 py-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Détection du site...</span>
                            </div>
                        ) : detectedSite ? (
                            <div className="w-full px-3 py-2.5 border rounded-lg bg-emerald-50 border-emerald-200">
                                <div className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600" />
                                    <span className="font-medium text-emerald-800">
                                        {detectedSite.site.nom_site}
                                    </span>
                                    <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                                        {detectedSite.site.code_site}
                                    </span>
                                </div>
                                {detectedSite.sous_site && (
                                    <div className="text-sm text-emerald-600 mt-1 ml-6">
                                        Sous-site: {detectedSite.sous_site.nom}
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {/* Dynamic Fields */}
                    {typeInfo?.fields.map(field => (
                        <div key={field.name}>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                {field.label}
                                {field.required && <span className="text-red-500">*</span>}
                            </label>
                            {renderField(field)}
                            {errors[field.name] && (
                                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                                    <AlertTriangle className="w-4 h-4" />
                                    {errors[field.name]}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-auto">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Custom Header */}
                {customHeader}

                {/* Body with scroll */}
                <div className="flex-1 overflow-y-auto p-6">
                    {modalContent}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 shrink-0">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        {siteError ? 'Fermer' : 'Annuler'}
                    </button>
                    {!siteError && (
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || isDetectingSite || !detectedSite}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                backgroundColor: themeColor,
                            }}
                            onMouseEnter={(e) => {
                                if (!isLoading && !isDetectingSite && detectedSite) {
                                    e.currentTarget.style.filter = 'brightness(0.9)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.filter = 'brightness(1)';
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Création...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Créer {typeInfo?.name?.toLowerCase()}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
