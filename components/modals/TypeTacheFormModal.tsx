import React, { useState } from 'react';
import { FileText, Info } from 'lucide-react';
import FormModal, { FormSection, FormGrid } from '../FormModal';
import { PremiumInput, PremiumTextarea } from './PremiumFormComponents';
import { TypeTache, TypeTacheCreate } from '../../types/planning';
import { useToast } from '../../contexts/ToastContext';

// ============================================================================
// TYPES
// ============================================================================

interface TypeTacheFormModalProps {
  /** Type de tâche à modifier (null pour création) */
  initial?: TypeTache | null;
  /** Objets compatibles existants (pour édition) */
  existingCompatibleObjects?: string[];
  /** Callback de fermeture */
  onClose: () => void;
  /** Callback après sauvegarde réussie */
  onSaved: (data: TypeTacheCreate, compatibleObjects: string[]) => Promise<void>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VEGETATION_TYPES = ['Arbre', 'Palmier', 'Gazon', 'Arbuste', 'Vivace', 'Cactus', 'Graminee'];
const HYDRAULIQUE_TYPES = [
  'Puit',
  'Pompe',
  'Vanne',
  'Clapet',
  'Ballon',
  'Canalisation',
  'Aspersion',
  'Goutte',
];

// ============================================================================
// CHECKBOX GRID COMPONENT
// ============================================================================

interface ObjectTypeCheckboxGridProps {
  title: string;
  titleColor: string;
  types: string[];
  selectedTypes: Set<string>;
  onToggle: (type: string) => void;
  disabled?: boolean;
}

const ObjectTypeCheckboxGrid: React.FC<ObjectTypeCheckboxGridProps> = ({
  title,
  titleColor,
  types,
  selectedTypes,
  onToggle,
  disabled = false,
}) => {
  const selectedCount = types.filter((t) => selectedTypes.has(t)).length;

  return (
    <div>
      <h4
        className={`text-xs font-semibold ${titleColor} uppercase tracking-wide mb-2 flex items-center gap-2`}
      >
        {title}
        <span className="font-normal opacity-75">
          ({selectedCount}/{types.length})
        </span>
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2">
        {types.map((typeObjet) => (
          <label
            key={typeObjet}
            className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg border cursor-pointer transition-all ${
              selectedTypes.has(typeObjet)
                ? 'bg-white border-emerald-300 shadow-sm'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="checkbox"
              checked={selectedTypes.has(typeObjet)}
              onChange={() => !disabled && onToggle(typeObjet)}
              disabled={disabled}
              className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 shrink-0"
            />
            <span
              className={`text-xs sm:text-sm font-medium truncate ${
                selectedTypes.has(typeObjet) ? 'text-slate-800' : 'text-slate-500'
              }`}
            >
              {typeObjet}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TypeTacheFormModal: React.FC<TypeTacheFormModalProps> = ({
  initial = null,
  existingCompatibleObjects = [],
  onClose,
  onSaved,
}) => {
  const { showToast } = useToast();

  // Form state
  const [form, setForm] = useState<TypeTacheCreate>({
    nom_tache: initial?.nom_tache || '',
    symbole: initial?.symbole || '',
    description: initial?.description || '',
  });

  // Compatible objects state
  const [compatibleObjects, setCompatibleObjects] = useState<Set<string>>(
    new Set(existingCompatibleObjects),
  );

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleToggleObject = (typeObjet: string) => {
    setCompatibleObjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(typeObjet)) {
        newSet.delete(typeObjet);
      } else {
        newSet.add(typeObjet);
      }
      return newSet;
    });
  };

  const toggleCategory = (category: 'vegetation' | 'hydraulique', enable: boolean) => {
    const types = category === 'vegetation' ? VEGETATION_TYPES : HYDRAULIQUE_TYPES;
    setCompatibleObjects((prev) => {
      const newSet = new Set(prev);
      types.forEach((t) => {
        if (enable) {
          newSet.add(t);
        } else {
          newSet.delete(t);
        }
      });
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!form.nom_tache.trim()) {
      setError('Le nom de la tâche est obligatoire');
      return;
    }

    if (compatibleObjects.size === 0) {
      setError("Sélectionnez au moins un type d'objet compatible");
      return;
    }

    setLoading(true);
    try {
      await onSaved(form, Array.from(compatibleObjects));
      showToast(
        initial ? 'Type de tâche modifié avec succès' : 'Type de tâche créé avec succès',
        'success',
      );
      onClose();
    } catch (err: any) {
      const errorMessage = err?.message || "Erreur lors de l'enregistrement";
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <FormModal
      isOpen={true}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={initial ? 'Modifier le type de tâche' : 'Nouveau type de tâche'}
      subtitle={initial ? initial.nom_tache : 'Définir un nouveau type de tâche'}
      icon={<FileText className="w-5 h-5 text-emerald-600" />}
      size="lg"
      loading={loading}
      error={error}
      submitLabel={loading ? 'Enregistrement...' : 'Enregistrer'}
      cancelLabel="Annuler"
      useGradientHeader={true}
    >
      {/* Section: Informations générales */}
      <FormSection
        title="Informations générales"
        description="Définissez les informations de base du type de tâche"
      >
        <FormGrid columns={2}>
          <PremiumInput
            type="text"
            value={form.nom_tache}
            onChange={(value) => setForm({ ...form, nom_tache: value })}
            label="Nom de la tâche"
            placeholder="Ex: Arrosage, Taille de formation..."
            icon={<FileText className="w-4 h-4" />}
            disabled={loading}
            required
            variant="outlined"
            size="md"
          />
          <PremiumInput
            type="text"
            value={form.symbole || ''}
            onChange={(value) => setForm({ ...form, symbole: value.toUpperCase() })}
            label="Symbole (code court)"
            placeholder="Ex: ARR, TFO..."
            disabled={loading}
            variant="outlined"
            size="md"
          />
        </FormGrid>

        <FormGrid columns={1}>
          <PremiumTextarea
            value={form.description || ''}
            onChange={(value) => setForm({ ...form, description: value })}
            label="Description"
            placeholder="Décrivez ce type de tâche..."
            rows={2}
            disabled={loading}
            variant="outlined"
            size="md"
          />
        </FormGrid>
      </FormSection>

      {/* Section: Objets compatibles */}
      <FormSection
        title="Objets compatibles"
        description="Sélectionnez les types d'objets sur lesquels cette tâche peut être réalisée"
      >
        {/* Quick toggle buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-slate-600">
            <span className="font-semibold text-emerald-600">{compatibleObjects.size}</span>{' '}
            sélectionné{compatibleObjects.size > 1 ? 's' : ''}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => toggleCategory('vegetation', true)}
            disabled={loading}
            className="text-xs px-2.5 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
          >
            + Végétation
          </button>
          <button
            type="button"
            onClick={() => toggleCategory('hydraulique', true)}
            disabled={loading}
            className="text-xs px-2.5 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            + Hydraulique
          </button>
          <button
            type="button"
            onClick={() => setCompatibleObjects(new Set())}
            disabled={loading}
            className="text-xs px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Effacer tout
          </button>
        </div>

        {/* Vegetation grid */}
        <ObjectTypeCheckboxGrid
          title="Végétation"
          titleColor="text-green-700"
          types={VEGETATION_TYPES}
          selectedTypes={compatibleObjects}
          onToggle={handleToggleObject}
          disabled={loading}
        />

        {/* Hydraulique grid */}
        <div className="mt-4">
          <ObjectTypeCheckboxGrid
            title="Hydraulique"
            titleColor="text-blue-700"
            types={HYDRAULIQUE_TYPES}
            selectedTypes={compatibleObjects}
            onToggle={handleToggleObject}
            disabled={loading}
          />
        </div>

        {/* Info box */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Ratios de productivité</span> : configurez-les ensuite
            dans l'onglet "Ratios de productivité".
          </div>
        </div>
      </FormSection>
    </FormModal>
  );
};

export default TypeTacheFormModal;
