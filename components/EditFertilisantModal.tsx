import React, { useState, useEffect } from 'react';
import { Leaf, Power, FileText } from 'lucide-react';
import {
  FertilisantDetail,
  FertilisantCreate,
  TypeFertilisant,
  FormatFertilisant,
  TYPE_FERTILISANT_LABELS,
  FORMAT_FERTILISANT_LABELS,
} from '../types/suiviTaches';
import { useToast } from '../contexts/ToastContext';
import FormModal, { FormSection, FormGrid } from './FormModal';
import { PremiumInput, PremiumTextarea, PremiumSelect } from './modals/PremiumFormComponents';

interface EditFertilisantModalProps {
  isOpen: boolean;
  fertilisant: FertilisantDetail;
  onClose: () => void;
  onSubmit: (data: Partial<FertilisantCreate>) => Promise<void>;
}

const EditFertilisantModal: React.FC<EditFertilisantModalProps> = ({
  isOpen,
  fertilisant,
  onClose,
  onSubmit,
}) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<FertilisantCreate>({
    nom: '',
    type_fertilisant: 'CHIMIQUE',
    format_fertilisant: 'GRANULE',
    description: '',
    actif: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fertilisant) {
      setFormData({
        nom: fertilisant.nom,
        type_fertilisant: fertilisant.type_fertilisant,
        format_fertilisant: fertilisant.format_fertilisant,
        description: fertilisant.description || '',
        actif: fertilisant.actif,
      });
    }
  }, [fertilisant]);

  const handleChange = (field: keyof FertilisantCreate, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nom.trim()) {
      setError('Le nom du fertilisant est obligatoire');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la mise a jour';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = Object.entries(TYPE_FERTILISANT_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const formatOptions = Object.entries(FORMAT_FERTILISANT_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Modifier le fertilisant"
      subtitle={fertilisant.nom}
      icon={<Leaf className="w-5 h-5 text-green-600" />}
      size="lg"
      loading={loading}
      error={error}
      submitLabel="Enregistrer"
      cancelLabel="Annuler"
      useGradientHeader={true}
    >
      <FormSection
        title="Informations du fertilisant"
        description="Details et caracteristiques du fertilisant"
      >
        <FormGrid columns={1}>
          <PremiumInput
            type="text"
            value={formData.nom}
            onChange={(value) => handleChange('nom', value)}
            label="Nom du fertilisant"
            placeholder="Ex: Engrais NPK 15-15-15"
            icon={<Leaf className="w-4 h-4" />}
            disabled={loading}
            required
            variant="outlined"
            size="md"
          />
        </FormGrid>

        <FormGrid columns={2}>
          <PremiumSelect
            value={formData.type_fertilisant}
            onChange={(value) => handleChange('type_fertilisant', value as TypeFertilisant)}
            label="Type de fertilisant"
            options={typeOptions}
            disabled={loading}
            required
            variant="outlined"
            size="md"
          />

          <PremiumSelect
            value={formData.format_fertilisant}
            onChange={(value) => handleChange('format_fertilisant', value as FormatFertilisant)}
            label="Format"
            options={formatOptions}
            disabled={loading}
            required
            variant="outlined"
            size="md"
          />
        </FormGrid>

        <FormGrid columns={1}>
          <PremiumTextarea
            value={formData.description || ''}
            onChange={(value) => handleChange('description', value)}
            label="Description"
            placeholder="Description detaillee du fertilisant..."
            icon={<FileText className="w-4 h-4" />}
            rows={4}
            disabled={loading}
            variant="outlined"
            size="md"
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Statut" description="Disponibilite du fertilisant dans le systeme">
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
                {formData.actif ? 'Fertilisant actif' : 'Fertilisant inactif'}
              </p>
              <p className="text-sm text-slate-500">
                {formData.actif
                  ? 'Le fertilisant est disponible pour utilisation'
                  : 'Le fertilisant est masque et non disponible'}
              </p>
            </div>
          </div>

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

export default EditFertilisantModal;
