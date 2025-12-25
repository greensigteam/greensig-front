import React, { useState } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import {
  Absence,
  AbsenceUpdate,
  TypeAbsence,
  TYPE_ABSENCE_LABELS,
  STATUT_ABSENCE_LABELS,
  STATUT_ABSENCE_COLORS,
  getBadgeColors
} from '../types/users';
import { updateAbsence } from '../services/usersApi';
import FormModal, { FormField, FormInput, FormSelect, FormTextarea } from '../components/FormModal';

interface EditAbsenceModalProps {
  absence: Absence;
  onClose: () => void;
  onUpdated: () => void;
}

const EditAbsenceModal: React.FC<EditAbsenceModalProps> = ({
  absence,
  onClose,
  onUpdated
}) => {
  const [form, setForm] = useState<AbsenceUpdate>({
    typeAbsence: absence.typeAbsence,
    dateDebut: absence.dateDebut,
    dateFin: absence.dateFin,
    motif: absence.motif || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const validateForm = (): string | null => {
    if (!form.typeAbsence) {
      return "Veuillez selectionner un type d'absence";
    }
    if (!form.dateDebut) {
      return 'La date de debut est requise';
    }
    if (!form.dateFin) {
      return 'La date de fin est requise';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(form.dateDebut);
    if (startDate < today && canEdit) {
      return 'La date de debut ne peut pas etre dans le passe';
    }
    if (new Date(form.dateFin) < new Date(form.dateDebut)) {
      return 'La date de fin doit etre posterieure a la date de debut';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await updateAbsence(absence.id, form);
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error('Erreur modification absence:', err);
      if (err.data) {
        const messages: string[] = [];
        for (const [field, value] of Object.entries(err.data)) {
          if (Array.isArray(value)) {
            messages.push(`${field}: ${value.join(', ')}`);
          } else if (typeof value === 'string') {
            messages.push(value);
          }
        }
        setError(messages.length > 0 ? messages.join('\n') : err.message || 'Erreur lors de la modification');
      } else {
        setError(err.message || "Erreur lors de la modification de l'absence");
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate duration in days
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
  const statutColors = getBadgeColors(STATUT_ABSENCE_COLORS, absence.statut);

  // Verifier si l'absence peut etre modifiee (seulement DEMANDEE ou VALIDEE)
  const canEdit = absence.statut === 'DEMANDEE' || absence.statut === 'VALIDEE';

  // Subtitle avec badge de statut
  const subtitleContent = (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">{absence.operateurNom}</span>
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statutColors.bg} ${statutColors.text}`}>
        {STATUT_ABSENCE_LABELS[absence.statut]}
      </span>
    </div>
  );

  return (
    <FormModal
      isOpen={true}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Modifier l'absence"
      subtitle={subtitleContent}
      icon={<Calendar className="w-5 h-5" />}
      size="lg"
      loading={loading}
      error={error}
      submitLabel="Enregistrer"
      cancelLabel="Annuler"
      submitDisabled={!canEdit}
    >
      {/* Warning si non éditable */}
      {!canEdit && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2 text-yellow-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">
            Cette absence est {STATUT_ABSENCE_LABELS[absence.statut].toLowerCase()} et ne peut plus etre modifiee.
          </span>
        </div>
      )}

      {/* Type d'absence */}
      <FormField label="Type d'absence" required>
        <FormSelect
          name="typeAbsence"
          value={form.typeAbsence}
          onChange={handleChange}
          required
          disabled={!canEdit}
          options={(Object.keys(TYPE_ABSENCE_LABELS) as TypeAbsence[]).map((type) => ({
            value: type,
            label: TYPE_ABSENCE_LABELS[type]
          }))}
        />
      </FormField>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Date de debut" required>
          <FormInput
            type="date"
            name="dateDebut"
            value={form.dateDebut}
            onChange={handleChange}
            min={canEdit ? new Date().toISOString().split('T')[0] : undefined}
            required
            disabled={!canEdit}
          />
        </FormField>

        <FormField label="Date de fin" required>
          <FormInput
            type="date"
            name="dateFin"
            value={form.dateFin}
            onChange={handleChange}
            min={form.dateDebut || undefined}
            required
            disabled={!canEdit}
          />
        </FormField>
      </div>

      {/* Duration indicator */}
      {duration !== null && duration > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            Duree: <span className="font-semibold">{duration} jour{duration > 1 ? 's' : ''}</span>
          </p>
        </div>
      )}

      {/* Motif */}
      <FormField label="Motif">
        <FormTextarea
          name="motif"
          value={form.motif || ''}
          onChange={handleChange}
          rows={3}
          placeholder="Description ou raison de l'absence (optionnel)"
          disabled={!canEdit}
        />
      </FormField>

      {/* Info validation */}
      {absence.dateValidation && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Valide par:</span> {absence.valideeParNom || '-'}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Le:</span> {new Date(absence.dateValidation).toLocaleDateString('fr-FR')}
          </p>
          {absence.commentaire && (
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Commentaire:</span> {absence.commentaire}
            </p>
          )}
        </div>
      )}
    </FormModal>
  );
};

export default EditAbsenceModal;
