import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Circle, Pentagon, Target, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { TypeReclamation, Urgence, ReclamationCreate, Reclamation } from '../../types/reclamations';
import { GeoJSONGeometry } from '../../types';
import { createReclamation, uploadPhoto, detectSiteFromGeometry, DetectedSiteInfo } from '../../services/reclamationsApi';
import { PhotoUpload } from '../shared/PhotoUpload';
import { FormModal } from '../FormModal';

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

    // État pour la détection du site
    const [detectedSite, setDetectedSite] = useState<DetectedSiteInfo | null>(null);
    const [isDetectingSite, setIsDetectingSite] = useState(false);
    const [siteDetectionError, setSiteDetectionError] = useState<string | null>(null);

    // Détecter le site quand le modal s'ouvre avec une géométrie
    useEffect(() => {
        const detectSite = async () => {
            if (!isOpen || !geometry) return;

            // Si on a déjà un site pré-sélectionné, pas besoin de détecter
            if (preSelectedSiteId) {
                setDetectedSite({
                    site_id: preSelectedSiteId,
                    site_nom: preSelectedSiteName || null,
                    zone_id: null,
                    zone_nom: null
                });
                return;
            }

            const geom = geometry;
            if (!geom) return;

            setIsDetectingSite(true);
            setSiteDetectionError(null);

            try {
                const result = await detectSiteFromGeometry({
                    type: geom.type,
                    coordinates: geom.coordinates
                });

                setDetectedSite(result);

                if (!result.site_id) {
                    setSiteDetectionError("La zone indiquée ne correspond à aucun site connu. Veuillez dessiner à l'intérieur d'un site.");
                } else {
                    // Mettre à jour le formData avec le site détecté
                    setFormData(prev => ({ ...prev, site: result.site_id! }));
                }
            } catch (err: any) {
                console.error('Error detecting site:', err);
                setSiteDetectionError("Erreur lors de la détection du site.");
            } finally {
                setIsDetectingSite(false);
            }
        };

        detectSite();
    }, [isOpen, geometry, preSelectedSiteId, preSelectedSiteName]);

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
        if (!coords || !coords[0] || coords[0].length < 3) return null;

        const ring = coords[0];
        const firstPoint = ring[0];
        if (!firstPoint || firstPoint.length < 2) return null;

        let area = 0;
        for (let i = 0; i < ring.length - 1; i++) {
            const p1 = ring[i];
            const p2 = ring[i + 1];
            if (p1 && p1.length >= 2 && p2 && p2.length >= 2) {
                area += (p1[0] ?? 0) * (p2[1] ?? 0);
                area -= (p2[0] ?? 0) * (p1[1] ?? 0);
            }
        }
        area = Math.abs(area / 2);

        // Convert from degrees^2 to approximate m^2 (rough estimate at ~45 lat)
        const metersPerDegree = 111320;
        const latitude = firstPoint[1] ?? 0;
        const areaM2 = area * metersPerDegree * metersPerDegree * Math.cos(latitude * Math.PI / 180);

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
                type_reclamation: formData.type_reclamation!,
                urgence: formData.urgence!,
                description: formData.description!,
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
                    fd.append('reclamation', newReclamation.id.toString());
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

    if (!isOpen) return null;

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            title="Signaler une Réclamation"
            icon={<AlertTriangle className="w-5 h-5" />}
            size="lg"
            loading={isSubmitting}
            error={error}
            submitLabel={isSubmitting ? 'Création...' : 'Signaler'}
            submitVariant="danger"
            cancelLabel="Annuler"
            submitDisabled={isSubmitting || isDetectingSite || !!siteDetectionError}
        >
            {/* Geometry indicator */}
            {geometryInfo && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-3 -mt-2 mb-4">
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

            {/* Indicateur de site détecté */}
            {isDetectingSite ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-3 mb-4">
                    <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                    <span className="text-sm text-slate-600">
                        Détection du site en cours...
                    </span>
                </div>
            ) : siteDetectionError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                        <span className="text-sm font-medium text-red-800">
                            Aucun site détecté
                        </span>
                        <p className="text-xs text-red-600 mt-0.5">
                            {siteDetectionError}
                        </p>
                    </div>
                </div>
            ) : detectedSite?.site_id ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                        <span className="text-sm font-medium text-emerald-800">
                            Site: {detectedSite.site_nom}
                        </span>
                        {detectedSite.zone_nom && (
                            <p className="text-xs text-emerald-600 mt-0.5">
                                Zone: {detectedSite.zone_nom}
                            </p>
                        )}
                    </div>
                    <MapPin className="w-4 h-4 text-emerald-500" />
                </div>
            ) : null}

            <div className="space-y-4">
                {/* Type de réclamation */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type de réclamation <span className="text-red-500">*</span>
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
        </FormModal>
    );
};

export default ReclamationFormModal;
