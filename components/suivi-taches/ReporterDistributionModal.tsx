import React, { useState } from 'react';
import { X, CalendarClock, AlertCircle } from 'lucide-react';
import {
  MotifDistribution,
  MOTIF_DISTRIBUTION_LABELS,
  DistributionCharge,
} from '../../types/planning';

interface ReporterDistributionModalProps {
  isOpen: boolean;
  distribution: DistributionCharge | null;
  onClose: () => void;
  onConfirm: (nouvelleDate: string, motif: MotifDistribution, commentaire: string) => void;
  isLoading?: boolean;
}

export const ReporterDistributionModal: React.FC<ReporterDistributionModalProps> = ({
  isOpen,
  distribution,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [nouvelleDate, setNouvelleDate] = useState('');
  const [motif, setMotif] = useState<MotifDistribution>('METEO');
  const [commentaire, setCommentaire] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !distribution) return null;

  const today = new Date().toISOString().split('T')[0]!;
  const dateOrigine = new Date(distribution.date);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nouvelleDate) {
      setError('Veuillez sélectionner une nouvelle date');
      return;
    }

    if (nouvelleDate <= today) {
      setError('La nouvelle date doit être dans le futur');
      return;
    }

    onConfirm(nouvelleDate, motif, commentaire);
  };

  const handleClose = () => {
    setNouvelleDate('');
    setMotif('METEO');
    setCommentaire('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-purple-50">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-slate-800">Reporter la distribution</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Info distribution originale */}
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm text-slate-600">
              <span className="font-medium">Distribution du:</span>{' '}
              {dateOrigine.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-medium">Heures planifiées:</span>{' '}
              {distribution.heures_planifiees?.toFixed(2) || '0.00'}h
            </p>
          </div>

          {/* Nombre de reports dans la chaîne */}
          {distribution.nombre_reports && distribution.nombre_reports > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Attention: Cette distribution a déjà été reportée {distribution.nombre_reports}{' '}
                  fois
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Maximum autorisé: 5 reports consécutifs
                </p>
              </div>
            </div>
          )}

          {/* Nouvelle date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nouvelle date *</label>
            <input
              type="date"
              value={nouvelleDate}
              onChange={(e) => setNouvelleDate(e.target.value)}
              min={today}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          {/* Motif */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Motif du report *
            </label>
            <select
              value={motif}
              onChange={(e) => setMotif(e.target.value as MotifDistribution)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            >
              {Object.entries(MOTIF_DISTRIBUTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Commentaire */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Commentaire (optionnel)
            </label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Détails supplémentaires..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Erreur */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading || !nouvelleDate}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Report en cours...
                </>
              ) : (
                <>
                  <CalendarClock className="w-4 h-4" />
                  Reporter
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReporterDistributionModal;
