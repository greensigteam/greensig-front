import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { ProduitList, ProduitCreate } from '../types/suiviTaches';

interface EditProduitModalProps {
    isOpen: boolean;
    produit: ProduitList | null;
    onClose: () => void;
    onSubmit: (id: number, data: Partial<ProduitCreate>) => Promise<void>;
}

const EditProduitModal: React.FC<EditProduitModalProps> = ({ isOpen, produit, onClose, onSubmit }) => {
    const [formData, setFormData] = useState<ProduitCreate>({
        nom_produit: '',
        numero_homologation: '',
        date_validite: null,
        cible: '',
        description: '',
        actif: true
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (produit) {
            setFormData({
                nom_produit: produit.nom_produit,
                numero_homologation: produit.numero_homologation || '',
                date_validite: produit.date_validite || null,
                cible: produit.cible || '',
                description: '',
                actif: produit.actif
            });
        }
    }, [produit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (name === 'date_validite') {
            setFormData(prev => ({ ...prev, [name]: value || null }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.nom_produit.trim()) {
            newErrors.nom_produit = 'Le nom du produit est requis';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate() || !produit) return;

        setLoading(true);
        try {
            await onSubmit(produit.id, formData);
            handleClose();
        } catch (error: any) {
            console.error('Erreur modification produit:', error);
            setErrors({ submit: error.message || 'Erreur lors de la modification' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setErrors({});
        onClose();
    };

    if (!isOpen || !produit) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">Modifier le produit</h2>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={loading}
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* Nom du produit */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nom du produit <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="nom_produit"
                                value={formData.nom_produit}
                                onChange={handleChange}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none ${errors.nom_produit ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                disabled={loading}
                            />
                            {errors.nom_produit && (
                                <p className="mt-1 text-sm text-red-600">{errors.nom_produit}</p>
                            )}
                        </div>

                        {/* Numéro d'homologation */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Numéro d'homologation
                            </label>
                            <input
                                type="text"
                                name="numero_homologation"
                                value={formData.numero_homologation}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                disabled={loading}
                            />
                        </div>

                        {/* Date de validité */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date de validité
                            </label>
                            <input
                                type="date"
                                name="date_validite"
                                value={formData.date_validite || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                disabled={loading}
                            />
                        </div>

                        {/* Cible */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cible
                            </label>
                            <input
                                type="text"
                                name="cible"
                                value={formData.cible}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                disabled={loading}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                disabled={loading}
                            />
                        </div>

                        {/* Actif */}
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                name="actif"
                                id="actif-edit"
                                checked={formData.actif}
                                onChange={handleChange}
                                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                disabled={loading}
                            />
                            <label htmlFor="actif-edit" className="text-sm font-medium text-gray-700">
                                Produit actif
                            </label>
                        </div>

                        {/* Error message */}
                        {errors.submit && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">{errors.submit}</p>
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        disabled={loading}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Modification...
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
};

export default EditProduitModal;
