import React, { useState } from 'react';
import { X, Calendar, AlertCircle, Save } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-blue-100">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Modifier l'absence</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">{absence.operateurNom}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statutColors.bg} ${statutColors.text}`}>
                  {STATUT_ABSENCE_LABELS[absence.statut]}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {!canEdit && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2 text-yellow-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">
                  Cette absence est {STATUT_ABSENCE_LABELS[absence.statut].toLowerCase()} et ne peut plus etre modifiee.
                </span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm whitespace-pre-line">{error}</span>
              </div>
            )}

            {/* Type d'absence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type d'absence <span className="text-red-500">*</span>
              </label>
              <select
                name="typeAbsence"
                value={form.typeAbsence}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
                disabled={!canEdit}
              >
                {(Object.keys(TYPE_ABSENCE_LABELS) as TypeAbsence[]).map((type) => (
                  <option key={type} value={type}>
                    {TYPE_ABSENCE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de debut <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dateDebut"
                  value={form.dateDebut}
                  onChange={handleChange}
                  min={canEdit ? new Date().toISOString().split('T')[0] : undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                  disabled={!canEdit}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dateFin"
                  value={form.dateFin}
                  onChange={handleChange}
                  min={form.dateDebut || undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                  disabled={!canEdit}
                />
              </div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motif
              </label>
              <textarea
                name="motif"
                value={form.motif || ''}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Description ou raison de l'absence (optionnel)"
                disabled={!canEdit}
              />
            </div>

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
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-gray-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Annuler
            </button>
            {canEdit && (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAbsenceModal;
