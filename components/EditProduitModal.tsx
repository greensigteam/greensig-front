import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { ProduitList, ProduitCreate } from '../types/suiviTaches';
import FormModal, { FormField, FormInput, FormTextarea, FormCheckbox } from './FormModal';

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
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

        if (!validate() || !produit) {
            if (!produit) {
                setError('Aucun produit sélectionné');
            } else {
                setError('Veuillez corriger les erreurs dans le formulaire');
            }
            return;
        }

        setLoading(true);
        try {
            await onSubmit(produit.id, formData);
            handleClose();
        } catch (err: any) {
            console.error('Erreur modification produit:', err);
            setError(err.message || 'Erreur lors de la modification');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFieldErrors({});
        setError(null);
        onClose();
    };

    if (!isOpen || !produit) return null;

    return (
        <FormModal
            isOpen={isOpen}
            onClose={handleClose}
            onSubmit={handleSubmit}
            title="Modifier le produit"
            subtitle={`ID: ${produit.id}`}
            icon={<Package className="w-5 h-5" />}
            size="2xl"
            loading={loading}
            error={error}
            submitLabel="Enregistrer"
            cancelLabel="Annuler"
        >
            {/* Nom du produit */}
            <FormField label="Nom du produit" required error={fieldErrors.nom_produit}>
                <FormInput
                    type="text"
                    name="nom_produit"
                    value={formData.nom_produit}
                    onChange={handleChange}
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
                    disabled={loading}
                />
            </FormField>

            {/* Date de validité */}
            <FormField label="Date de validité">
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

export default EditProduitModal;
