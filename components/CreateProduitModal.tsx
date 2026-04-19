import React, { useState } from 'react';
import { Package, Hash, Calendar, Target, FileText, Power } from 'lucide-react';
import { ProduitCreate } from '../types/suiviTaches';
import { useToast } from '../contexts/ToastContext';
import FormModal, { FormSection, FormGrid } from './FormModal';
import { PremiumInput, PremiumTextarea } from './modals/PremiumFormComponents';

interface CreateProduitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProduitCreate) => Promise<void>;
}

const CreateProduitModal: React.FC<CreateProduitModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<ProduitCreate>({
    nom_produit: '',
    numero_homologation: '',
    date_validite: null,
    cible: '',
    description: '',
    actif: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof ProduitCreate, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.nom_produit.trim()) {
      setError('Le nom du produit est obligatoire');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      showToast('Produit créé avec succès', 'success');
      handleClose();
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la création';
      setError(errorMessage);
      showToast(errorMessage, 'error');
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
      actif: true,
    });
    setError(null);
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      onSubmit={handleSubmit}
      title="Nouveau produit"
      subtitle="Ajouter un produit phytosanitaire au catalogue"
      icon={<Package className="w-5 h-5 text-emerald-600" />}
      size="lg"
      loading={loading}
      error={error}
      submitLabel="Créer le produit"
      cancelLabel="Annuler"
      useGradientHeader={true}
    >
      {/* Section Informations générales */}
      <FormSection
        title="Informations du produit"
        description="Détails et identification du produit phytosanitaire"
      >
        <FormGrid columns={1}>
          <PremiumInput
            type="text"
            value={formData.nom_produit}
            onChange={(value) => handleChange('nom_produit', value)}
            label="Nom du produit"
            placeholder="Ex: Herbicide XYZ"
            icon={<Package className="w-4 h-4" />}
            disabled={loading}
            required
            variant="outlined"
            size="md"
          />
        </FormGrid>

        <FormGrid columns={2}>
          <PremiumInput
            type="text"
            value={formData.numero_homologation ?? ''}
            onChange={(value) => handleChange('numero_homologation', value)}
            label="Numéro d'homologation"
            placeholder="Ex: AMM-2024-001"
            icon={<Hash className="w-4 h-4" />}
            disabled={loading}
            variant="outlined"
            size="md"
          />

          <PremiumInput
            type="date"
            value={formData.date_validite || ''}
            onChange={(value) => handleChange('date_validite', value || null)}
            label="Date de validité"
            icon={<Calendar className="w-4 h-4" />}
            disabled={loading}
            variant="outlined"
            size="md"
            hint="Laisser vide si pas de date d'expiration"
          />
        </FormGrid>

        <FormGrid columns={1}>
          <PremiumInput
            type="text"
            value={formData.cible ?? ''}
            onChange={(value) => handleChange('cible', value)}
            label="Cible"
            placeholder="Ex: Mauvaises herbes à feuilles larges"
            icon={<Target className="w-4 h-4" />}
            disabled={loading}
            variant="outlined"
            size="md"
          />
        </FormGrid>

        <FormGrid columns={1}>
          <PremiumTextarea
            value={formData.description ?? ''}
            onChange={(value) => handleChange('description', value)}
            label="Description"
            placeholder="Description détaillée du produit..."
            icon={<FileText className="w-4 h-4" />}
            rows={4}
            disabled={loading}
            variant="outlined"
            size="md"
          />
        </FormGrid>
      </FormSection>

      {/* Section Statut */}
      <FormSection title="Statut" description="Disponibilité du produit dans le système">
        <div
          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
            formData.actif
              ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
          }`}
          onClick={() => !loading && handleChange('actif', !formData.actif)}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                formData.actif ? 'bg-emerald-100' : 'bg-slate-200'
              }`}
            >
              <Power
                className={`w-6 h-6 ${formData.actif ? 'text-emerald-600' : 'text-slate-400'}`}
              />
            </div>
            <div>
              <p
                className={`font-semibold ${formData.actif ? 'text-emerald-900' : 'text-slate-700'}`}
              >
                {formData.actif ? 'Produit actif' : 'Produit inactif'}
              </p>
              <p className="text-sm text-slate-500">
                {formData.actif
                  ? 'Le produit est disponible pour utilisation'
                  : 'Le produit est masqué et non disponible'}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!loading) handleChange('actif', !formData.actif);
            }}
            disabled={loading}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              formData.actif
                ? 'bg-emerald-500 focus:ring-emerald-500'
                : 'bg-slate-300 focus:ring-slate-500'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                formData.actif ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </FormSection>
    </FormModal>
  );
};

export default CreateProduitModal;
