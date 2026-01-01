import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import {
  TypeAbsence,
  TYPE_ABSENCE_LABELS,
  OperateurList
} from '../types/users';
import { createAbsence } from '../services/usersApi';
import {
  FormModal,
  FormField,
  FormGrid,
  FormSelect,
  FormInput,
  FormTextarea
} from '../components/FormModal';

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
  preselectedOperateur
}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [form, setForm] = useState({
    operateur: preselectedOperateur || 0,
    typeAbsence: '' as TypeAbsence | '',
    dateDebut: '',
    dateFin: '',
    motif: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleChange = (field: keyof typeof form, value: string | number) => {
    setForm(f => ({ ...f, [field]: value }));
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
        motif: form.motif || undefined
      });
      onCreated();
      onClose();
    } catch (err: any) {
      console.error('Erreur création absence:', err);
      if (err.data) {
        const messages: string[] = [];
        for (const [field, value] of Object.entries(err.data)) {
          if (Array.isArray(value)) {
            messages.push(`${field}: ${value.join(', ')}`);
          } else if (typeof value === 'string') {
            messages.push(value);
          }
        }
        setError(messages.length > 0 ? messages.join('\n') : err.message || 'Erreur lors de la création');
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

  const operateurOptions = [
    { value: 0, label: 'Sélectionner un opérateur' },
    ...operateurs
      .filter(o => o.actif)
      .map(op => ({
        value: op.id,
        label: `${op.fullName} (${op.numeroImmatriculation})`
      }))
  ];

  const typeAbsenceOptions = [
    { value: '', label: 'Sélectionner un type' },
    ...(Object.keys(TYPE_ABSENCE_LABELS) as TypeAbsence[]).map(type => ({
      value: type,
      label: TYPE_ABSENCE_LABELS[type]
    }))
  ];

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
        <FormField label="Opérateur" required>
          <FormSelect
            value={form.operateur}
            onChange={(value) => handleChange('operateur', Number(value))}
            options={operateurOptions}
            required
          />
        </FormField>

        {/* Type d'absence */}
        <FormField label="Type d'absence" required>
          <FormSelect
            value={form.typeAbsence}
            onChange={(value) => handleChange('typeAbsence', value)}
            options={typeAbsenceOptions}
            required
          />
        </FormField>

        {/* Dates */}
        <FormGrid columns={2}>
          <FormField label="Date de début" required>
            <FormInput
              type="date"
              value={form.dateDebut}
              onChange={(value) => handleChange('dateDebut', value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              required
            />
          </FormField>

          <FormField label="Date de fin" required>
            <FormInput
              type="date"
              value={form.dateFin}
              onChange={(value) => handleChange('dateFin', value)}
              min={form.dateDebut || undefined}
              required
            />
          </FormField>
        </FormGrid>

        {/* Duration indicator */}
        {duration !== null && duration > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              Durée: <span className="font-semibold">{duration} jour{duration > 1 ? 's' : ''}</span>
            </p>
          </div>
        )}

        {/* Motif */}
        <FormField
          label="Motif"
          hint="Description ou raison de l'absence (optionnel)"
        >
          <FormTextarea
            value={form.motif}
            onChange={(value) => handleChange('motif', value)}
            rows={3}
            placeholder="Description ou raison de l'absence (optionnel)"
          />
        </FormField>
      </div>
    </FormModal>
  );
};

export default CreateAbsenceModal;
