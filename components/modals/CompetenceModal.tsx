import React, { useState } from 'react';
import { Award, Tag, FileText } from 'lucide-react';
import { Competence, CategorieCompetence, CATEGORIE_COMPETENCE_LABELS } from '../../types/users';
import { createCompetence, updateCompetence } from '../../services/usersApi';
import { useToast } from '../../contexts/ToastContext';
import FormModal, { FormSection, FormGrid } from '../FormModal';
import { PremiumInput, PremiumSelect, PremiumTextarea } from './PremiumFormComponents';

interface CompetenceModalProps {
  initial?: Competence | null;
  onClose: () => void;
  onSaved: () => void;
}

const CompetenceModal: React.FC<CompetenceModalProps> = ({ initial = null, onClose, onSaved }) => {
  const { showToast } = useToast();
  const [form, setForm] = useState<{
    nomCompetence: string;
    categorie: CategorieCompetence;
    description: string;
    ordreAffichage: number;
  }>({
    nomCompetence: initial?.nomCompetence || '',
    categorie: (initial?.categorie as CategorieCompetence) || 'TECHNIQUE',
    description: initial?.description || '',
    ordreAffichage: initial?.ordreAffichage || 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.nomCompetence.trim()) {
      setError('Le nom est requis');
      return;
    }
    if (!form.categorie) {
      setError('La catégorie est requise');
      return;
    }

    setLoading(true);
    try {
      if (initial && initial.id) {
        await updateCompetence(initial.id, form);
        showToast('Compétence mise à jour avec succès', 'success');
      } else {
        await createCompetence(form);
        showToast('Compétence créée avec succès', 'success');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      const errorMessage = err?.message || "Erreur lors de l'enregistrement";
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Préparer les options pour le select de catégorie
  const categorieOptions = Object.entries(CATEGORIE_COMPETENCE_LABELS).map(([key, label]) => ({
    value: key,
    label: label,
  }));

  return (
    <FormModal
      isOpen={true}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={initial ? 'Modifier la compétence' : 'Nouvelle compétence'}
      subtitle={initial ? initial.nomCompetence : 'Ajouter une compétence au référentiel'}
      icon={<Award className="w-5 h-5 text-emerald-600" />}
      size="md"
      loading={loading}
      error={error}
      submitLabel={loading ? 'Enregistrement...' : 'Enregistrer'}
      cancelLabel="Annuler"
      useGradientHeader={true}
    >
      <FormSection
        title="Informations de la compétence"
        description="Définissez les détails de cette compétence"
      >
        <FormGrid columns={1}>
          <PremiumInput
            type="text"
            value={form.nomCompetence}
            onChange={(value) => setForm({ ...form, nomCompetence: value })}
            label="Nom de la compétence"
            placeholder="Ex: Taille des arbres"
            icon={<Tag className="w-4 h-4" />}
            disabled={loading}
            required
            variant="outlined"
            size="md"
          />
        </FormGrid>

        <FormGrid columns={1}>
          <PremiumSelect
            value={form.categorie}
            onChange={(value) => setForm({ ...form, categorie: value as CategorieCompetence })}
            options={categorieOptions}
            label="Catégorie"
            placeholder="Sélectionner une catégorie"
            icon={<Award className="w-4 h-4" />}
            disabled={loading}
            required
            variant="outlined"
            size="md"
          />
        </FormGrid>

        <FormGrid columns={1}>
          <PremiumTextarea
            value={form.description}
            onChange={(value) => setForm({ ...form, description: value })}
            label="Description"
            placeholder="Décrivez cette compétence..."
            icon={<FileText className="w-4 h-4" />}
            rows={3}
            disabled={loading}
            variant="outlined"
            size="md"
          />
        </FormGrid>
      </FormSection>
    </FormModal>
  );
};

export default CompetenceModal;
