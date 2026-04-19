import React, { useState } from 'react';
import { X, XCircle, AlertCircle } from 'lucide-react';
import { MotifAnnulationTache, MOTIF_ANNULATION_TACHE_LABELS, Tache } from '../../types/planning';

interface AnnulerTacheModalProps {
  isOpen: boolean;
  tache: Tache | null;
  onClose: () => void;
  onConfirm: (motif: MotifAnnulationTache, commentaire: string) => void;
  isLoading?: boolean;
}

export const AnnulerTacheModal: React.FC<AnnulerTacheModalProps> = ({
  isOpen,
  tache,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [motif, setMotif] = useState<MotifAnnulationTache>('CLIENT');
  const [commentaire, setCommentaire] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !tache) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!motif) {
      setError('Veuillez sélectionner un motif');
      return;
    }

    onConfirm(motif, commentaire);
  };

  const handleClose = () => {
    setMotif('CLIENT');
    setCommentaire('');
    setError(null);
    onClose();
  };

  // Nombre de distributions qui seront annulées
  const nbDistributions = tache.distributions_charge?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-red-50">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-slate-800">Annuler la tâche</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-red-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Avertissement */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Justification obligatoire</p>
              <p className="text-xs text-amber-700 mt-1">
                Veuillez indiquer le motif d'annulation de cette tâche.
                {nbDistributions > 0 && (
                  <span className="block mt-1">
                    {nbDistributions} distribution(s) seront également annulées.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Info tâche */}
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm text-slate-600">
              <span className="font-medium">Tâche:</span>{' '}
              {tache.type_tache_detail?.nom_tache || 'N/A'}
              {tache.reference && ` (${tache.reference})`}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-medium">Période:</span>{' '}
              {new Date(tache.date_debut_planifiee).toLocaleDateString('fr-FR')}
              {tache.date_fin_planifiee !== tache.date_debut_planifiee && (
                <> - {new Date(tache.date_fin_planifiee).toLocaleDateString('fr-FR')}</>
              )}
            </p>
            {tache.site_nom && (
              <p className="text-sm text-slate-600">
                <span className="font-medium">Site:</span> {tache.site_nom}
              </p>
            )}
          </div>

          {/* Motif */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Motif de l'annulation *
            </label>
            <select
              value={motif}
              onChange={(e) => setMotif(e.target.value as MotifAnnulationTache)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            >
              {Object.entries(MOTIF_ANNULATION_TACHE_LABELS).map(([value, label]) => (
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
              placeholder="Raison détaillée de l'annulation..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
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
              Retour
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Annulation...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Confirmer l'annulation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnnulerTacheModal;
