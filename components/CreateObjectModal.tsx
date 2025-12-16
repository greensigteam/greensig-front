import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, AlertCircle, Check, Loader2 } from 'lucide-react';
import { useDrawing, getObjectTypeById } from '../contexts/DrawingContext';
import { GeoJSONGeometry, GeometryMetrics, ObjectFieldConfig } from '../types';
import { createInventoryItem, fetchAllSites, SiteFrontend } from '../services/api';
import { useToast } from '../contexts/ToastContext';

interface CreateObjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (createdObject: any) => void;
    geometry: GeoJSONGeometry | null;
    metrics: GeometryMetrics | null;
    objectType: string | null;
}

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

    const [sites, setSites] = useState<SiteFrontend[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<string>('');
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingSites, setIsLoadingSites] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const typeInfo = objectType ? getObjectTypeById(objectType) : null;

    // Load sites on mount
    useEffect(() => {
        const loadSites = async () => {
            setIsLoadingSites(true);
            try {
                const sitesData = await fetchAllSites();
                setSites(sitesData);
                // Auto-select first site if only one
                if (sitesData.length === 1) {
                    setSelectedSiteId(sitesData[0].id);
                }
            } catch (error) {
                console.error('Error loading sites:', error);
                showToast('Erreur lors du chargement des sites', 'error');
            } finally {
                setIsLoadingSites(false);
            }
        };

        if (isOpen) {
            loadSites();
        }
    }, [isOpen, showToast]);

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

        if (!selectedSiteId) {
            newErrors.site = 'Veuillez sélectionner un site';
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

        if (!validateForm() || !geometry || !objectType) {
            return;
        }

        setIsLoading(true);

        try {
            const result = await createInventoryItem(objectType, {
                geometry,
                site_id: parseInt(selectedSiteId),
                properties: formData,
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

        const baseInputClass = `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
            error ? 'border-red-500' : 'border-gray-300'
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
                        className={baseInputClass}
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

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-auto">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-3">
                        {typeInfo && (
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: `${typeInfo.color}20` }}
                            >
                                <MapPin
                                    className="w-5 h-5"
                                    style={{ color: typeInfo.color }}
                                />
                            </div>
                        )}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Créer {typeInfo?.name || 'un objet'}
                            </h2>
                            <p className="text-sm text-gray-500">
                                Renseignez les informations de l'objet
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-4">
                        {/* Geometry Info */}
                        {metrics && (
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="text-sm font-medium text-gray-700 mb-2">
                                    Géométrie
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    {metrics.area_m2 !== undefined && (
                                        <div>
                                            <span className="text-gray-500">Surface:</span>{' '}
                                            <span className="font-medium">
                                                {metrics.area_m2 > 10000
                                                    ? `${metrics.area_hectares?.toFixed(2)} ha`
                                                    : `${metrics.area_m2.toFixed(1)} m²`}
                                            </span>
                                        </div>
                                    )}
                                    {metrics.length_m !== undefined && (
                                        <div>
                                            <span className="text-gray-500">Longueur:</span>{' '}
                                            <span className="font-medium">
                                                {metrics.length_m > 1000
                                                    ? `${metrics.length_km?.toFixed(2)} km`
                                                    : `${metrics.length_m.toFixed(1)} m`}
                                            </span>
                                        </div>
                                    )}
                                    {metrics.perimeter_m !== undefined && (
                                        <div>
                                            <span className="text-gray-500">Périmètre:</span>{' '}
                                            <span className="font-medium">
                                                {metrics.perimeter_m.toFixed(1)} m
                                            </span>
                                        </div>
                                    )}
                                    {metrics.centroid && (
                                        <div className="col-span-2">
                                            <span className="text-gray-500">Centre:</span>{' '}
                                            <span className="font-mono text-xs">
                                                {metrics.centroid.lat.toFixed(6)}, {metrics.centroid.lng.toFixed(6)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Site Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Site <span className="text-red-500">*</span>
                            </label>
                            {isLoadingSites ? (
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Chargement des sites...</span>
                                </div>
                            ) : (
                                <select
                                    value={selectedSiteId}
                                    onChange={e => setSelectedSiteId(e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                                        errors.site ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                >
                                    <option value="">Sélectionner un site...</option>
                                    {sites.map(site => (
                                        <option key={site.id} value={site.id}>
                                            {site.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {errors.site && (
                                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.site}
                                </p>
                            )}
                        </div>

                        {/* Dynamic Fields */}
                        {typeInfo?.fields.map(field => (
                            <div key={field.name}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {field.label}
                                    {field.required && <span className="text-red-500"> *</span>}
                                </label>
                                {renderField(field)}
                                {errors[field.name] && (
                                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        {errors[field.name]}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Création...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Créer {typeInfo?.name}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
