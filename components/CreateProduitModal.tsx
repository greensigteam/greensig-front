import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { ProduitCreate } from '../types/suiviTaches';
import FormModal, { FormField, FormInput, FormTextarea, FormCheckbox } from './FormModal';

interface CreateProduitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ProduitCreate) => Promise<void>;
}

const CreateProduitModal: React.FC<CreateProduitModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState<ProduitCreate>({
        nom_produit: '',
        numero_homologation: '',
        date_validite: null,
        cible: '',
        description: '',
        actif: true
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

        // Clear field error
        if (fieldErrors[name]) {
            setFieldErrors(prev => {
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

        setFieldErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validate()) {
            setError('Veuillez corriger les erreurs dans le formulaire');
            return;
        }

        setLoading(true);
        try {
            await onSubmit(formData);
            handleClose();
        } catch (err: any) {
            console.error('Erreur création produit:', err);
            setError(err.message || 'Erreur lors de la création');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            nom_produit: '',
            numero_homologation: '',
            date_validite: null,
            cible: '',
            description: '',
            actif: true
        });
        setFieldErrors({});
        setError(null);
        onClose();
    };

    return (
        <FormModal
            isOpen={isOpen}
            onClose={handleClose}
            onSubmit={handleSubmit}
            title="Nouveau produit"
            icon={<Package className="w-5 h-5" />}
            size="2xl"
            loading={loading}
            error={error}
            submitLabel="Créer le produit"
            cancelLabel="Annuler"
        >
            {/* Nom du produit */}
            <FormField label="Nom du produit" required error={fieldErrors.nom_produit}>
                <FormInput
                    type="text"
                    name="nom_produit"
                    value={formData.nom_produit}
                    onChange={handleChange}
                    placeholder="Ex: Herbicide XYZ"
                    disabled={loading}
                />
            </FormField>

            {/* Numéro d'homologation */}
            <FormField label="Numéro d'homologation">
                <FormInput
                    type="text"
                    name="numero_homologation"
                    value={formData.numero_homologation}
                    onChange={handleChange}
                    placeholder="Ex: AMM-2024-001"
                    disabled={loading}
                />
            </FormField>

            {/* Date de validité */}
            <FormField
                label="Date de validité"
                hint="Laisser vide si le produit n'a pas de date d'expiration"
            >
                <FormInput
                    type="date"
                    name="date_validite"
                    value={formData.date_validite || ''}
                    onChange={handleChange}
                    disabled={loading}
                />
            </FormField>

            {/* Cible */}
            <FormField label="Cible">
                <FormInput
                    type="text"
                    name="cible"
                    value={formData.cible}
                    onChange={handleChange}
                    placeholder="Ex: Mauvaises herbes à feuilles larges"
                    disabled={loading}
                />
            </FormField>

            {/* Description */}
            <FormField label="Description">
                <FormTextarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Description détaillée du produit..."
                    disabled={loading}
                />
            </FormField>

            {/* Actif */}
            <FormCheckbox
                name="actif"
                label="Produit actif"
                checked={formData.actif}
                onChange={handleChange}
                disabled={loading}
            />
        </FormModal>
    );
};

export default CreateProduitModal;
