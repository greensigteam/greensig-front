import React, { useState } from 'react';
import { X, Calendar, AlertCircle, Save } from 'lucide-react';
import {
  TypeAbsence,
  TYPE_ABSENCE_LABELS,
  OperateurList
} from '../types/users';
import { createAbsence } from '../services/usersApi';

interface CreateAbsenceModalProps {
  operateurs: OperateurList[];
  onClose: () => void;
  onCreated: () => void;
  preselectedOperateur?: number;
}

const CreateAbsenceModal: React.FC<CreateAbsenceModalProps> = ({
  operateurs,
  onClose,
  onCreated,
  preselectedOperateur
}) => {
  const [form, setForm] = useState({
    operateur: preselectedOperateur || 0,
    typeAbsence: '' as TypeAbsence | '',
    dateDebut: '',
    dateFin: '',
    motif: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(f => ({
      ...f,
      [name]: name === 'operateur' ? Number(value) : value
    }));
  };

  const validateForm = (): string | null => {
    if (!form.operateur) {
      return 'Veuillez selectionner un operateur';
    }
    if (!form.typeAbsence) {
      return "Veuillez selectionner un type d'absence";
    }
    if (!form.dateDebut) {
      return 'La date de debut est requise';
    }
    if (!form.dateFin) {
      return 'La date de fin est requise';
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
      console.error('Erreur creation absence:', err);
      if (err.data) {
        const messages: string[] = [];
        for (const [field, value] of Object.entries(err.data)) {
          if (Array.isArray(value)) {
            messages.push(`${field}: ${value.join(', ')}`);
          } else if (typeof value === 'string') {
            messages.push(value);
          }
        }
        setError(messages.length > 0 ? messages.join('\n') : err.message || 'Erreur lors de la creation');
      } else {
        setError(err.message || "Erreur lors de la creation de l'absence");
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
              <h2 className="text-xl font-bold text-gray-900">Nouvelle absence</h2>
              <p className="text-sm text-gray-500">Declarer une absence pour un operateur</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm whitespace-pre-line">{error}</span>
              </div>
            )}

            {/* Operateur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operateur <span className="text-red-500">*</span>
              </label>
              <select
                name="operateur"
                value={form.operateur}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value={0}>Selectionner un operateur</option>
                {operateurs.filter(o => o.actif).map((op) => (
                  <option key={op.utilisateur} value={op.utilisateur}>
                    {op.fullName} ({op.numeroImmatriculation})
                  </option>
                ))}
              </select>
            </div>

            {/* Type d'absence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type d'absence <span className="text-red-500">*</span>
              </label>
              <select
                name="typeAbsence"
                value={form.typeAbsence}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Selectionner un type</option>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
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
                value={form.motif}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Description ou raison de l'absence (optionnel)"
              />
            </div>
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
                  Creer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAbsenceModal;
