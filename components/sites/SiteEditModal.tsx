import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, MapPin, Calendar, FileText, ToggleLeft, ToggleRight, Hash, Ruler, Building2 } from 'lucide-react';
import { updateSite, UpdateSiteData, SiteFrontend, calculateGeometryMetrics } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface SiteEditModalProps {
    site: SiteFrontend;
    isOpen: boolean;
    onClose: () => void;
    onSaved?: (updatedSite: SiteFrontend) => void;
}

export default function SiteEditModal({ site, isOpen, onClose, onSaved }: SiteEditModalProps) {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<UpdateSiteData>({
        nom_site: '',
        code_site: '',
        adresse: '',
        superficie_totale: null,
        date_debut_contrat: null,
        date_fin_contrat: null,
        actif: true,
    });

    const themeColor = '#10b981'; // Emerald-500 to match site theme

    // Initialize form data when site changes
    useEffect(() => {
        if (site) {
            setFormData({
                nom_site: site.name || '',
                code_site: site.code_site || '',
                adresse: site.adresse || '',
                superficie_totale: site.superficie_totale || null,
                date_debut_contrat: site.date_debut_contrat || null,
                date_fin_contrat: site.date_fin_contrat || null,
                actif: site.actif !== undefined ? site.actif : true,
            });
        }
    }, [site]);

    const handleChange = (field: keyof UpdateSiteData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleRecalculateArea = async () => {
        if (!site.geometry) {
            showToast("Ce site n'a pas de géométrie définie", 'error');
            return;
        }

        setIsLoading(true);
        try {
            // The site object from GeoJSON API has geometry in 'geometry' field
            const result = await calculateGeometryMetrics(site.geometry);

            if (result.metrics && result.metrics.area_m2) {
                const area = parseFloat(result.metrics.area_m2.toFixed(2));
                handleChange('superficie_totale', area);
                showToast(`Superficie recalculée : ${area} m²`, 'success');
            } else {
                showToast("Impossible de calculer la superficie", 'error');
            }
        } catch (error: any) {
            console.error(error);
            showToast("Erreur lors du calcul", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.nom_site?.trim()) {
            showToast('Le nom du site est obligatoire', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const updatedSite = await updateSite(parseInt(site.id), formData);
            showToast('Site mis à jour avec succès', 'success');
            onSaved?.(updatedSite);
            onClose();
        } catch (error: any) {
            showToast(error.message || 'Erreur lors de la mise à jour', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const baseInputClass = `w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors focus:ring-[${themeColor}]`;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-auto">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4 border-b"
                    style={{ backgroundColor: `${themeColor}10` }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: themeColor }}
                        >
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Modifier le site
                            </h2>
                            <p className="text-sm text-gray-500">
                                ID: {site.id}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full transition-colors"
                        style={{ backgroundColor: 'transparent' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${themeColor}20`}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Nom du site */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            Nom du site <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.nom_site || ''}
                            onChange={(e) => handleChange('nom_site', e.target.value)}
                            className={baseInputClass}
                            style={{ '--tw-ring-color': themeColor } as any}
                            placeholder="Nom du site"
                            required
                        />
                    </div>

                    {/* Code du site */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                            <Hash className="w-4 h-4 text-gray-400" />
                            Code du site
                        </label>
                        <input
                            type="text"
                            value={formData.code_site || ''}
                            onChange={(e) => handleChange('code_site', e.target.value)}
                            className={baseInputClass}
                            style={{ '--tw-ring-color': themeColor } as any}
                            placeholder="Code unique (ex: SITE_001)"
                        />
                    </div>

                    {/* Adresse */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            Adresse
                        </label>
                        <textarea
                            value={formData.adresse || ''}
                            onChange={(e) => handleChange('adresse', e.target.value)}
                            className={baseInputClass}
                            style={{ '--tw-ring-color': themeColor } as any}
                            placeholder="Adresse du site"
                            rows={2}
                        />
                    </div>

                    {/* Superficie */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <Ruler className="w-4 h-4 text-gray-400" />
                                Superficie totale (m²)
                            </label>
                            <button
                                type="button"
                                onClick={handleRecalculateArea}
                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline flex items-center gap-1"
                                title="Recalculer à partir de la géométrie sur la carte"
                            >
                                <Ruler className="w-3 h-3" />
                                Recalculer
                            </button>
                        </div>
                        <input
                            type="number"
                            value={formData.superficie_totale || ''}
                            onChange={(e) => handleChange('superficie_totale', e.target.value ? parseFloat(e.target.value) : null)}
                            className={baseInputClass}
                            style={{ '--tw-ring-color': themeColor } as any}
                            placeholder="Surface en m²"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    {/* Dates de contrat */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                Début contrat
                            </label>
                            <input
                                type="date"
                                value={formData.date_debut_contrat || ''}
                                onChange={(e) => handleChange('date_debut_contrat', e.target.value || null)}
                                className={baseInputClass}
                                style={{ '--tw-ring-color': themeColor } as any}
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                Fin contrat
                            </label>
                            <input
                                type="date"
                                value={formData.date_fin_contrat || ''}
                                onChange={(e) => handleChange('date_fin_contrat', e.target.value || null)}
                                className={baseInputClass}
                                style={{ '--tw-ring-color': themeColor } as any}
                            />
                        </div>
                    </div>

                    {/* Actif toggle */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Site actif
                            </label>
                            <p className="text-xs text-gray-500">
                                Les sites inactifs ne sont pas affichés par défaut
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleChange('actif', !formData.actif)}
                            className={`p-1 rounded-full transition-colors ${formData.actif ? 'text-emerald-600' : 'text-gray-400'
                                }`}
                        >
                            {formData.actif ? (
                                <ToggleRight className="w-8 h-8" />
                            ) : (
                                <ToggleLeft className="w-8 h-8" />
                            )}
                        </button>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={isLoading}
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                        style={{ backgroundColor: themeColor }}
                        onMouseEnter={(e) => !isLoading && (e.currentTarget.style.filter = 'brightness(0.9)')}
                        onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Enregistrement...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Enregistrer
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
