import React, { useState } from 'react';
import { Calendar, User, FileText } from 'lucide-react';
import { TypeAbsence, TYPE_ABSENCE_LABELS, OperateurList } from '../types/users';
import { createAbsence } from '../services/usersApi';
import { FormModal, FormGrid } from '../components/FormModal';
import {
  PremiumInput,
  PremiumSelect,
  PremiumTextarea,
} from '../components/modals/PremiumFormComponents';

// ============================================================================
// TYPES
// ============================================================================

interface CreateAbsenceModalProps {
  operateurs: OperateurList[];
  onClose: () => void;
  onCreated: () => void;
  preselectedOperateur?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

const CreateAbsenceModal: React.FC<CreateAbsenceModalProps> = ({
  operateurs,
  onClose,
  onCreated,
  preselectedOperateur,
}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [form, setForm] = useState({
    operateur: preselectedOperateur || 0,
    typeAbsence: '' as TypeAbsence | '',
    dateDebut: '',
    dateFin: '',
    motif: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleChange = (field: keyof typeof form, value: string | number) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!form.operateur) {
      return 'Veuillez sélectionner un opérateur';
    }
    if (!form.typeAbsence) {
      return "Veuillez sélectionner un type d'absence";
    }
    if (!form.dateDebut) {
      return 'La date de début est requise';
    }
    if (!form.dateFin) {
      return 'La date de fin est requise';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(form.dateDebut);
    if (startDate < today) {
      return 'La date de début ne peut pas être dans le passé';
    }
    if (new Date(form.dateFin) < new Date(form.dateDebut)) {
      return 'La date de fin doit être postérieure à la date de début';
    }
    return null;
  };

  const handleSubmit = async () => {
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await createAbsence({
        operateur: form.operateur,
        typeAbsence: form.typeAbsence as TypeAbsence,
        dateDebut: form.dateDebut,
        dateFin: form.dateFin,
        motif: form.motif || undefined,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      if (err.data) {
        const messages: string[] = [];
        for (const [field, value] of Object.entries(err.data)) {
          if (Array.isArray(value)) {
            messages.push(`${field}: ${value.join(', ')}`);
          } else if (typeof value === 'string') {
            messages.push(value);
          }
        }
        setError(
          messages.length > 0 ? messages.join('\n') : err.message || 'Erreur lors de la création',
        );
      } else {
        setError(err.message || "Erreur lors de la création de l'absence");
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // COMPUTED
  // ============================================================================

  const calculateDuration = (): number | null => {
    if (!form.dateDebut || !form.dateFin) return null;
    const start = new Date(form.dateDebut);
    const end = new Date(form.dateFin);
    if (end < start) return null;
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const duration = calculateDuration();

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <FormModal
      isOpen={true}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Nouvelle absence"
      subtitle="Déclarer une absence pour un opérateur"
      icon={<Calendar className="w-5 h-5 text-blue-600" />}
      size="lg"
      loading={loading}
      error={error}
      submitLabel="Créer"
    >
      <div className="space-y-4">
        {/* Opérateur */}
        <PremiumSelect
          value={form.operateur ? form.operateur.toString() : ''}
          onChange={(value) => handleChange('operateur', Number(value))}
          options={operateurs
            .filter((o) => o.actif)
            .map((op) => ({
              value: op.id.toString(),
              label: `${op.fullName} (${op.numeroImmatriculation})`,
            }))}
          label="Opérateur"
          placeholder="Sélectionner un opérateur"
          icon={<User className="w-4 h-4" />}
          required
          variant="outlined"
          size="md"
        />

        {/* Type d'absence */}
        <PremiumSelect
          value={form.typeAbsence}
          onChange={(value) => handleChange('typeAbsence', value)}
          options={(Object.keys(TYPE_ABSENCE_LABELS) as TypeAbsence[]).map((type) => ({
            value: type,
            label: TYPE_ABSENCE_LABELS[type],
          }))}
          label="Type d'absence"
          placeholder="Sélectionner un type"
          icon={<FileText className="w-4 h-4" />}
          required
          variant="outlined"
          size="md"
        />

        {/* Dates */}
        <FormGrid columns={2}>
          <PremiumInput
            type="date"
            value={form.dateDebut}
            onChange={(value) => handleChange('dateDebut', value)}
            label="Date de début"
            icon={<Calendar className="w-4 h-4" />}
            required
            variant="outlined"
            size="md"
          />

          <PremiumInput
            type="date"
            value={form.dateFin}
            onChange={(value) => handleChange('dateFin', value)}
            label="Date de fin"
            icon={<Calendar className="w-4 h-4" />}
            required
            variant="outlined"
            size="md"
          />
        </FormGrid>

        {/* Duration indicator */}
        {duration !== null && duration > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              Durée:{' '}
              <span className="font-semibold">
                {duration} jour{duration > 1 ? 's' : ''}
              </span>
            </p>
          </div>
        )}

        {/* Motif */}
        <PremiumTextarea
          value={form.motif}
          onChange={(value) => handleChange('motif', value)}
          label="Motif"
          placeholder="Description ou raison de l'absence (optionnel)"
          rows={3}
          variant="outlined"
          size="md"
          hint="Description ou raison de l'absence (optionnel)"
        />
      </div>
    </FormModal>
  );
};

export default CreateAbsenceModal;
