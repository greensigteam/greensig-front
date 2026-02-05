import React, { useState } from 'react';
import {
    Edit2, Tag, Activity, TreeDeciduous, Ruler, Maximize2,
    ArrowDown, Circle, Zap, Droplets, Gauge as GaugeIcon,
    Package, Calendar, FileText
} from 'lucide-react';
import { updateInventoryItem, ApiError } from '../services/api';
import { FormModal } from './FormModal';
import { PremiumInput, PremiumSelect, PremiumTextarea } from './modals/PremiumFormComponents';

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
                    <PremiumInput
                        type="text"
                        value={getValue('nom')}
                        onChange={(value) => handleChange('nom', value)}
                        label="Nom"
                        placeholder="Nom de l'objet..."
                        icon={<Tag className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>
            );
        }

        if (['vanne', 'clapet', 'canalisation', 'aspersion', 'ballon'].includes(type)) {
            fields.push(
                <div key="marque" className="col-span-2">
                    <PremiumInput
                        type="text"
                        value={getValue('marque')}
                        onChange={(value) => handleChange('marque', value)}
                        label="Marque"
                        placeholder="Marque de l'équipement..."
                        icon={<Tag className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>
            );
        }

        // État (all types)
        fields.push(
            <div key="etat">
                <PremiumSelect
                    value={getValue('etat')}
                    onChange={(value) => handleChange('etat', value)}
                    label="État"
                    options={[
                        { value: 'bon', label: 'Bon' },
                        { value: 'moyen', label: 'Moyen' },
                        { value: 'mauvais', label: 'Mauvais' },
                        { value: 'critique', label: 'Critique' }
                    ]}
                    icon={<Activity className="w-4 h-4" />}
                    variant="outlined"
                    size="md"
                />
            </div>
        );

        // Vegetation-specific fields
        if (['arbre', 'palmier', 'gazon', 'arbuste', 'vivace', 'cactus', 'graminee'].includes(type)) {
            fields.push(
                <div key="famille">
                    <PremiumInput
                        type="text"
                        value={getValue('famille')}
                        onChange={(value) => handleChange('famille', value)}
                        label="Famille"
                        placeholder="Famille botanique..."
                        icon={<TreeDeciduous className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>
            );
        }

        if (['arbre', 'palmier'].includes(type)) {
            fields.push(
                <div key="taille">
                    <PremiumSelect
                        value={getValue('taille')}
                        onChange={(value) => handleChange('taille', value)}
                        label="Taille"
                        options={[
                            { value: '', label: '-' },
                            { value: 'Petit', label: 'Petit' },
                            { value: 'Moyen', label: 'Moyen' },
                            { value: 'Grand', label: 'Grand' }
                        ]}
                        icon={<Ruler className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>
            );
        }

        if (type === 'gazon') {
            fields.push(
                <div key="area_sqm">
                    <PremiumInput
                        type="number"
                        value={getValue('area_sqm')}
                        onChange={(value) => handleChange('area_sqm', parseFloat(value) || 0)}
                        label="Surface (m²)"
                        placeholder="Surface en m²..."
                        icon={<Maximize2 className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>
            );
        }

        if (['arbuste', 'vivace', 'cactus', 'graminee'].includes(type)) {
            fields.push(
                <div key="densite">
                    <PremiumInput
                        type="number"
                        value={getValue('densite')}
                        onChange={(value) => handleChange('densite', parseFloat(value) || 0)}
                        label="Densité"
                        placeholder="Densité..."
                        icon={<Maximize2 className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>
            );
        }

        // Hydraulic-specific fields
        if (type === 'puit') {
            fields.push(
                <div key="profondeur">
                    <PremiumInput
                        type="number"
                        value={getValue('profondeur')}
                        onChange={(value) => handleChange('profondeur', parseFloat(value) || 0)}
                        label="Profondeur (m)"
                        placeholder="Profondeur en mètres..."
                        icon={<ArrowDown className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>,
                <div key="diametre_puit">
                    <PremiumInput
                        type="number"
                        value={getValue('diametre')}
                        onChange={(value) => handleChange('diametre', parseFloat(value) || 0)}
                        label="Diamètre (mm)"
                        placeholder="Diamètre en mm..."
                        icon={<Circle className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>,
                <div key="niveau_statique">
                    <PremiumInput
                        type="number"
                        value={getValue('niveau_statique')}
                        onChange={(value) => handleChange('niveau_statique', parseFloat(value) || 0)}
                        label="Niveau statique (m)"
                        placeholder="Niveau statique..."
                        icon={<ArrowDown className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>,
                <div key="niveau_dynamique">
                    <PremiumInput
                        type="number"
                        value={getValue('niveau_dynamique')}
                        onChange={(value) => handleChange('niveau_dynamique', parseFloat(value) || 0)}
                        label="Niveau dynamique (m)"
                        placeholder="Niveau dynamique..."
                        icon={<ArrowDown className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>
            );
        }

        if (type === 'pompe') {
            fields.push(
                <div key="type_pompe">
                    <PremiumInput
                        type="text"
                        value={getValue('type')}
                        onChange={(value) => handleChange('type', value)}
                        label="Type"
                        placeholder="Type de pompe..."
                        icon={<Tag className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>,
                <div key="diametre_pompe">
                    <PremiumInput
                        type="number"
                        value={getValue('diametre')}
                        onChange={(value) => handleChange('diametre', parseFloat(value) || 0)}
                        label="Diamètre (mm)"
                        placeholder="Diamètre en mm..."
                        icon={<Circle className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>,
                <div key="puissance">
                    <PremiumInput
                        type="number"
                        value={getValue('puissance')}
                        onChange={(value) => handleChange('puissance', parseFloat(value) || 0)}
                        label="Puissance (kW)"
                        placeholder="Puissance en kW..."
                        icon={<Zap className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>,
                <div key="debit">
                    <PremiumInput
                        type="number"
                        value={getValue('debit')}
                        onChange={(value) => handleChange('debit', parseFloat(value) || 0)}
                        label="Débit (L/h)"
                        placeholder="Débit en L/h..."
                        icon={<Droplets className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>
            );
        }

        if (['vanne', 'clapet', 'canalisation', 'aspersion', 'goutte'].includes(type)) {
            fields.push(
                <div key={`type_${type}`}>
                    <PremiumInput
                        type="text"
                        value={getValue('type')}
                        onChange={(value) => handleChange('type', value)}
                        label="Type"
                        placeholder="Type d'équipement..."
                        icon={<Tag className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>,
                <div key={`diametre_${type}`}>
                    <PremiumInput
                        type="number"
                        value={getValue('diametre')}
                        onChange={(value) => handleChange('diametre', parseFloat(value) || 0)}
                        label="Diamètre (mm)"
                        placeholder="Diamètre en mm..."
                        icon={<Circle className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>,
                <div key="materiau">
                    <PremiumInput
                        type="text"
                        value={getValue('materiau')}
                        onChange={(value) => handleChange('materiau', value)}
                        label="Matériau"
                        placeholder="Matériau..."
                        icon={<Package className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>,
                <div key="pression">
                    <PremiumInput
                        type="number"
                        value={getValue('pression')}
                        onChange={(value) => handleChange('pression', parseFloat(value) || 0)}
                        label="Pression (bar)"
                        placeholder="Pression en bar..."
                        icon={<GaugeIcon className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>
            );
        }

        if (type === 'ballon') {
            fields.push(
                <div key="volume">
                    <PremiumInput
                        type="number"
                        value={getValue('volume')}
                        onChange={(value) => handleChange('volume', parseFloat(value) || 0)}
                        label="Volume (L)"
                        placeholder="Volume en litres..."
                        icon={<Package className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>
            );
        }

        // Last intervention date (most types)
        if (!['vanne', 'clapet', 'canalisation', 'aspersion', 'goutte', 'ballon'].includes(type)) {
            fields.push(
                <div key="last_intervention_date">
                    <PremiumInput
                        type="date"
                        value={getValue('last_intervention_date')}
                        onChange={(value) => handleChange('last_intervention_date', value)}
                        label="Dernière intervention"
                        icon={<Calendar className="w-4 h-4" />}
                        variant="outlined"
                        size="md"
                    />
                </div>
            );
        }

        // Observation (all types)
        fields.push(
            <div key="observation" className="col-span-2">
                <PremiumTextarea
                    value={getValue('observation')}
                    onChange={(value) => handleChange('observation', value)}
                    label="Observation"
                    placeholder="Observations et notes..."
                    rows={3}
                    icon={<FileText className="w-4 h-4" />}
                    variant="outlined"
                    size="md"
                />
            </div>
        );

        return fields;
    };

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            title={`Modifier ${objectType}`}
            icon={<Edit2 className="w-5 h-5" />}
            size="2xl"
            loading={isSubmitting}
            error={error}
            submitLabel={isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            cancelLabel="Annuler"
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderFields()}
            </div>
        </FormModal>
    );
};
