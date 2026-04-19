import React, { useState } from 'react';
import { Gauge, FileText, Layers, Info } from 'lucide-react';
import FormModal, { FormSection, FormGrid } from '../FormModal';
import { PremiumInput, PremiumSelect, PremiumTextarea } from './PremiumFormComponents';
import {
  RatioProductivite,
  RatioProductiviteCreate,
  TypeTache,
  UNITE_MESURE_LABELS,
  TYPES_OBJETS,
  UniteMesure,
} from '../../types/planning';
import { useToast } from '../../contexts/ToastContext';

// ============================================================================
// TYPES
// ============================================================================

interface RatioFormModalProps {
  /** Ratio à modifier (undefined pour création) */
  ratio?: RatioProductivite;
  /** Liste des types de tâches disponibles */
  typesTaches: TypeTache[];
  /** Callback de fermeture */
  onClose: () => void;
  /** Callback après sauvegarde réussie */
  onSubmit: (data: RatioProductiviteCreate) => Promise<void>;
}

// ============================================================================
// COMPONENT
// ============================================================================

const RatioFormModal: React.FC<RatioFormModalProps> = ({
  ratio,
  typesTaches,
  onClose,
  onSubmit,
}) => {
  const { showToast } = useToast();

  // Form state
  const [formData, setFormData] = useState<RatioProductiviteCreate>({
    id_type_tache: ratio?.id_type_tache || 0,
    type_objet: ratio?.type_objet || '',
    unite_mesure: ratio?.unite_mesure || 'unite',
    ratio: ratio?.ratio || 1,
    description: ratio?.description || '',
    actif: ratio?.actif ?? true,
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  // Get compatible objects for selected task type
  const compatibleObjects: readonly string[] = TYPES_OBJETS;

  // Build options for selects
  const typeTacheOptions = [
    { value: 0, label: 'Sélectionner un type de tâche' },
    ...typesTaches.map((t: TypeTache) => ({ value: t.id, label: t.nom_tache })),
  ];

  const typeObjetOptions = [
    { value: '', label: "Sélectionner un type d'objet" },
    ...compatibleObjects.map((t: string) => ({ value: t, label: t })),
  ];

  const uniteMesureOptions = Object.entries(UNITE_MESURE_LABELS).map(([key, label]) => ({
    value: key,
    label: label,
  }));

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.id_type_tache) {
      setError('Veuillez sélectionner un type de tâche');
      return;
    }

    if (!formData.type_objet) {
      setError("Veuillez sélectionner un type d'objet");
      return;
    }

    if (formData.ratio <= 0) {
      setError('Le ratio doit être supérieur à 0');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      showToast(ratio ? 'Ratio modifié avec succès' : 'Ratio créé avec succès', 'success');
      onClose();
    } catch (err: any) {
      const errorMessage = err?.message || "Erreur lors de l'enregistrement";
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeTacheChange = (value: string) => {
    const newTypeTacheId = Number(value);
    setFormData((prev) => ({
      ...prev,
      id_type_tache: newTypeTacheId,
      // Reset type_objet if it's not compatible with new task type
      type_objet: '',
    }));
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <FormModal
      isOpen={true}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={ratio ? 'Modifier le ratio' : 'Nouveau ratio de productivité'}
      subtitle={
        ratio ? `${ratio.type_tache_nom} - ${ratio.type_objet}` : 'Définir un ratio de productivité'
      }
      icon={<Gauge className="w-5 h-5 text-emerald-600" />}
      size="md"
      loading={loading}
      error={error}
      submitLabel={loading ? 'Enregistrement...' : 'Enregistrer'}
      cancelLabel="Annuler"
      useGradientHeader={true}
    >
      {/* Section: Configuration du ratio */}
      <FormSection
        title="Configuration"
        description="Définissez le type de tâche et l'objet concerné"
      >
        <FormGrid columns={2}>
          <PremiumSelect
            value={formData.id_type_tache}
            onChange={handleTypeTacheChange}
            options={typeTacheOptions}
            label="Type de tâche"
            icon={<FileText className="w-4 h-4" />}
            disabled={loading}
            required
            variant="outlined"
            size="md"
          />
          <PremiumSelect
            value={formData.type_objet}
            onChange={(value) => setFormData({ ...formData, type_objet: value })}
            options={typeObjetOptions}
            label="Type d'objet"
            icon={<Layers className="w-4 h-4" />}
            disabled={loading || !formData.id_type_tache}
            required
            variant="outlined"
            size="md"
            hint={!formData.id_type_tache ? "Sélectionnez d'abord un type de tâche" : undefined}
          />
        </FormGrid>
      </FormSection>

      {/* Section: Valeur du ratio */}
      <FormSection title="Valeur du ratio" description="Définissez la productivité horaire">
        <FormGrid columns={2}>
          <PremiumInput
            type="number"
            value={formData.ratio}
            onChange={(value) => setFormData({ ...formData, ratio: parseFloat(value) || 0 })}
            label="Ratio"
            placeholder="Ex: 50"
            icon={<Gauge className="w-4 h-4" />}
            disabled={loading}
            required
            variant="outlined"
            size="md"
            min={0.1}
            step={0.1}
          />
          <PremiumSelect
            value={formData.unite_mesure}
            onChange={(value) => setFormData({ ...formData, unite_mesure: value as UniteMesure })}
            options={uniteMesureOptions}
            label="Unité de mesure"
            disabled={loading}
            required
            variant="outlined"
            size="md"
          />
        </FormGrid>

        {/* Explanation box */}
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Interprétation :</span> Un opérateur peut traiter{' '}
            <strong>{formData.ratio || 0}</strong>{' '}
            {formData.unite_mesure === 'm2'
              ? 'm²'
              : formData.unite_mesure === 'ml'
                ? 'mètres linéaires'
                : 'unités'}{' '}
            par heure.
          </div>
        </div>
      </FormSection>

      {/* Section: Options */}
      <FormSection title="Options" description="Description et statut du ratio">
        <FormGrid columns={1}>
          <PremiumTextarea
            value={formData.description || ''}
            onChange={(value) => setFormData({ ...formData, description: value })}
            label="Description (optionnel)"
            placeholder="Notes ou conditions particulières..."
            rows={2}
            disabled={loading}
            variant="outlined"
            size="md"
          />
        </FormGrid>

        {/* Active checkbox */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <input
            type="checkbox"
            id="ratio-actif"
            checked={formData.actif}
            onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
            disabled={loading}
            className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
          />
          <label htmlFor="ratio-actif" className="text-sm text-slate-700 cursor-pointer">
            <span className="font-medium">Ratio actif</span>
            <span className="text-slate-500 ml-1">- utilisé dans les calculs de charge</span>
          </label>
        </div>
      </FormSection>
    </FormModal>
  );
};

export default RatioFormModal;
