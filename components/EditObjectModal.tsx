import React, { useState } from 'react';
import { X } from 'lucide-react';
import { updateInventoryItem, ApiError } from '../services/api';

interface EditObjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    objectType: string;
    objectId: string;
    currentData: any;
    onSuccess: () => void;
}

export const EditObjectModal: React.FC<EditObjectModalProps> = ({
    isOpen,
    onClose,
    objectType,
    objectId,
    currentData,
    onSuccess
}) => {
    const [formData, setFormData] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await updateInventoryItem(objectType, objectId, formData);
            onSuccess();
            onClose();
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Erreur lors de la mise à jour');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get current value with fallback
    const getValue = (field: string) => {
        if (formData[field] !== undefined) return formData[field];
        const props = currentData.properties || currentData;
        return props[field] || '';
    };

    // Render fields based on object type
    const renderFields = () => {
        const type = objectType.toLowerCase();
        const fields: JSX.Element[] = [];

        // Common fields
        if (['arbre', 'palmier', 'gazon', 'arbuste', 'vivace', 'cactus', 'graminee', 'puit', 'pompe'].includes(type)) {
            fields.push(
                <div key="nom" className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                    <input
                        type="text"
                        value={getValue('nom')}
                        onChange={(e) => handleChange('nom', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring=2 focus:ring-emerald-500"
                    />
                </div>
            );
        }

        if (['vanne', 'clapet', 'canalisation', 'aspersion', 'ballon'].includes(type)) {
            fields.push(
                <div key="marque" className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
                    <input
                        type="text"
                        value={getValue('marque')}
                        onChange={(e) => handleChange('marque', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            );
        }

        // État (all types)
        fields.push(
            <div key="etat">
                <label className="block text-sm font-medium text-gray-700 mb-1">État</label>
                <select
                    value={getValue('etat')}
                    onChange={(e) => handleChange('etat', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="bon">Bon</option>
                    <option value="moyen">Moyen</option>
                    <option value="mauvais">Mauvais</option>
                    <option value="critique">Critique</option>
                </select>
            </div>
        );

        // Vegetation-specific fields
        if (['arbre', 'palmier', 'gazon', 'arbuste', 'vivace', 'cactus', 'graminee'].includes(type)) {
            fields.push(
                <div key="famille">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Famille</label>
                    <input
                        type="text"
                        value={getValue('famille')}
                        onChange={(e) => handleChange('famille', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            );
        }

        if (['arbre', 'palmier'].includes(type)) {
            fields.push(
                <div key="taille">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Taille</label>
                    <select
                        value={getValue('taille')}
                        onChange={(e) => handleChange('taille', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">-</option>
                        <option value="Petit">Petit</option>
                        <option value="Moyen">Moyen</option>
                        <option value="Grand">Grand</option>
                    </select>
                </div>
            );
        }

        if (type === 'gazon') {
            fields.push(
                <div key="area_sqm">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Surface (m²)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={getValue('area_sqm')}
                        onChange={(e) => handleChange('area_sqm', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            );
        }

        if (['arbuste', 'vivace', 'cactus', 'graminee'].includes(type)) {
            fields.push(
                <div key="densite">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Densité</label>
                    <input
                        type="number"
                        step="0.01"
                        value={getValue('densite')}
                        onChange={(e) => handleChange('densite', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            );
        }

        // Hydraulic-specific fields
        if (type === 'puit') {
            fields.push(
                <div key="profondeur">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Profondeur (m)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={getValue('profondeur')}
                        onChange={(e) => handleChange('profondeur', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>,
                <div key="diametre_puit">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Diamètre (mm)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={getValue('diametre')}
                        onChange={(e) => handleChange('diametre', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>,
                <div key="niveau_statique">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Niveau statique (m)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={getValue('niveau_statique')}
                        onChange={(e) => handleChange('niveau_statique', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>,
                <div key="niveau_dynamique">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Niveau dynamique (m)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={getValue('niveau_dynamique')}
                        onChange={(e) => handleChange('niveau_dynamique', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            );
        }

        if (type === 'pompe') {
            fields.push(
                <div key="type_pompe">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <input
                        type="text"
                        value={getValue('type')}
                        onChange={(e) => handleChange('type', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>,
                <div key="diametre_pompe">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Diamètre (mm)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={getValue('diametre')}
                        onChange={(e) => handleChange('diametre', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>,
                <div key="puissance">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Puissance (kW)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={getValue('puissance')}
                        onChange={(e) => handleChange('puissance', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>,
                <div key="debit">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Débit (L/h)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={getValue('debit')}
                        onChange={(e) => handleChange('debit', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            );
        }

        if (['vanne', 'clapet', 'canalisation', 'aspersion', 'goutte'].includes(type)) {
            fields.push(
                <div key={`type_${type}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <input
                        type="text"
                        value={getValue('type')}
                        onChange={(e) => handleChange('type', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>,
                <div key={`diametre_${type}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Diamètre (mm)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={getValue('diametre')}
                        onChange={(e) => handleChange('diametre', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>,
                <div key="materiau">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Matériau</label>
                    <input
                        type="text"
                        value={getValue('materiau')}
                        onChange={(e) => handleChange('materiau', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>,
                <div key="pression">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pression (bar)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={getValue('pression')}
                        onChange={(e) => handleChange('pression', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            );
        }

        if (type === 'ballon') {
            fields.push(
                <div key="volume">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Volume (L)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={getValue('volume')}
                        onChange={(e) => handleChange('volume', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            );
        }

        // Last intervention date (most types)
        if (!['vanne', 'clapet', 'canalisation', 'aspersion', 'goutte', 'ballon'].includes(type)) {
            fields.push(
                <div key="last_intervention_date">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dernière intervention</label>
                    <input
                        type="date"
                        value={getValue('last_intervention_date')}
                        onChange={(e) => handleChange('last_intervention_date', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            );
        }

        // Observation (all types)
        fields.push(
            <div key="observation" className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observation</label>
                <textarea
                    value={getValue('observation')}
                    onChange={(e) => handleChange('observation', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
            </div>
        );

        return fields;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900">
                        Modifier {objectType}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {renderFields()}
                    </div>
                </form>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
                        disabled={isSubmitting}
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                </div>
            </div>
        </div>
    );
};
