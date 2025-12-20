import React, { useState } from 'react';
import { X, MapPin, Calendar, Circle, Pentagon, Target } from 'lucide-react';
import { TypeReclamation, Urgence, ReclamationCreate, Reclamation } from '../../types/reclamations';
import { GeoJSONGeometry } from '../../types';
import { createReclamation, uploadPhoto } from '../../services/reclamationsApi';
import { PhotoUpload } from '../shared/PhotoUpload';

interface ReclamationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (reclamation: Reclamation) => void;
    geometry?: GeoJSONGeometry;
    types: TypeReclamation[];
    urgences: Urgence[];
    preSelectedSiteId?: number;
    preSelectedSiteName?: string;
}

export const ReclamationFormModal: React.FC<ReclamationFormModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    geometry,
    types,
    urgences,
    preSelectedSiteId,
    preSelectedSiteName,
}) => {
    const [formData, setFormData] = useState<Partial<ReclamationCreate>>({
        site: preSelectedSiteId,
    });
    const [photos, setPhotos] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    // Determine geometry type label
    const getGeometryLabel = () => {
        if (!geometry) return null;
        switch (geometry.type) {
            case 'Point':
                return { icon: Target, label: 'Point', color: 'blue' };
            case 'Polygon':
                // Check if it's a circle (approximated as polygon)
                const coords = geometry.coordinates as number[][][];
                if (coords[0] && coords[0].length >= 60) {
                    return { icon: Circle, label: 'Cercle', color: 'purple' };
                }
                return { icon: Pentagon, label: 'Zone', color: 'emerald' };
            default:
                return { icon: MapPin, label: geometry.type, color: 'gray' };
        }
    };

    // Calculate area for polygons
    const calculateArea = (): string | null => {
        if (!geometry || geometry.type !== 'Polygon') return null;

        // Simple area calculation using shoelace formula
        const coords = geometry.coordinates as number[][][];
        if (!coords[0]) return null;

        const ring = coords[0];
        let area = 0;
        for (let i = 0; i < ring.length - 1; i++) {
            area += ring[i][0] * ring[i + 1][1];
            area -= ring[i + 1][0] * ring[i][1];
        }
        area = Math.abs(area / 2);

        // Convert from degrees^2 to approximate m^2 (rough estimate at ~45 lat)
        const metersPerDegree = 111320;
        const areaM2 = area * metersPerDegree * metersPerDegree * Math.cos(ring[0][1] * Math.PI / 180);

        if (areaM2 > 10000) {
            return `${(areaM2 / 10000).toFixed(2)} ha`;
        }
        return `${areaM2.toFixed(0)} m²`;
    };

    const geometryInfo = getGeometryLabel();
    const areaDisplay = calculateArea();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!formData.type_reclamation || !formData.urgence || !formData.description || !formData.date_constatation) {
            setError('Veuillez remplir tous les champs obligatoires (*)');
            return;
        }

        setIsSubmitting(true);

        try {
            // Build payload with geometry
            const payload: ReclamationCreate = {
                type_reclamation: formData.type_reclamation,
                urgence: formData.urgence,
                description: formData.description,
                date_constatation: formData.date_constatation,
                site: formData.site,
                localisation: geometry, // Include drawn geometry
            };

            // Create reclamation
            const newReclamation = await createReclamation(payload);

            // Upload photos if any
            if (photos.length > 0) {
                const uploadPromises = photos.map(file => {
                    const fd = new FormData();
                    fd.append('fichier', file);
                    fd.append('type_photo', 'RECLAMATION');
                    fd.append('reclamation', String(newReclamation.id));
                    fd.append('legende', 'Photo jointe');
                    return uploadPhoto(fd);
                });
                await Promise.all(uploadPromises);
            }

            // Déclencher le rafraîchissement des réclamations sur la carte
            window.dispatchEvent(new Event('refresh-reclamations'));

            onSuccess(newReclamation);
        } catch (err: any) {
            console.error('Error creating reclamation:', err);
            setError(err.message || "Une erreur est survenue lors de la création.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800">
                        Signaler un Problème
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        {/* Error message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        {/* Geometry indicator */}
                        {geometryInfo && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <geometryInfo.icon className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-orange-800">
                                        Zone délimitée : {geometryInfo.label}
                                    </span>
                                    {areaDisplay && (
                                        <p className="text-xs text-orange-600">
                                            Surface approximative : {areaDisplay}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Pre-selected site indicator */}
                        {preSelectedSiteName && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-blue-800">
                                    Site: <strong>{preSelectedSiteName}</strong>
                                </span>
                            </div>
                        )}

                        {/* Type de problème */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Type de problème <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={formData.type_reclamation || ''}
                                className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                onChange={e => setFormData({ ...formData, type_reclamation: Number(e.target.value) })}
                            >
                                <option value="">Sélectionner un type...</option>
                                {types.map(t => (
                                    <option key={t.id} value={t.id}>{t.nom_reclamation}</option>
                                ))}
                            </select>
                        </div>

                        {/* Urgence */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Urgence <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {urgences.map(u => (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, urgence: u.id })}
                                        className={`
                                            flex items-center justify-center p-2 rounded-lg border text-sm font-medium transition-all
                                            ${formData.urgence === u.id
                                                ? 'border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-600'}
                                        `}
                                    >
                                        {u.niveau_urgence}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                required
                                rows={4}
                                value={formData.description || ''}
                                className="w-full rounded-lg border-gray-300 border p-3 focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                                placeholder="Décrivez le problème rencontré..."
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        {/* Date de constatation */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date de constatation <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.date_constatation ? formData.date_constatation.slice(0, 16) : ''}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border-gray-300 border focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                    onChange={e => setFormData({
                                        ...formData,
                                        date_constatation: e.target.value ? new Date(e.target.value).toISOString() : undefined
                                    })}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Date et heure où le problème a été constaté</p>
                        </div>

                        {/* Photos */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Photos (optionnel)
                            </label>
                            <PhotoUpload
                                photos={photos}
                                onChange={setPhotos}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 shrink-0 bg-gray-50 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Création...
                                </>
                            ) : (
                                'Signaler'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReclamationFormModal;
