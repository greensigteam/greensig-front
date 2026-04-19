import React, { useState, useEffect } from 'react';
import { X, Play, Calendar, AlertCircle } from 'lucide-react';
import { DistributionCharge } from '../../types/planning';

interface DemarrerDistributionModalProps {
  isOpen: boolean;
  distribution: DistributionCharge | null;
  onClose: () => void;
  onConfirm: (data: { heure_debut_reelle?: string; date_debut_reelle?: string }) => void;
  isLoading?: boolean;
}

export const DemarrerDistributionModal: React.FC<DemarrerDistributionModalProps> = ({
  isOpen,
  distribution,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [heureDebutReelle, setHeureDebutReelle] = useState('');
  const [dateDebutReelle, setDateDebutReelle] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Initialiser avec l'heure planifiée et la date de la distribution
  useEffect(() => {
    if (distribution) {
      const heureDebut = distribution.heure_debut?.substring(0, 5) || '08:00';
      setHeureDebutReelle(heureDebut);
      // Initialiser la date avec aujourd'hui (date réelle de démarrage)
      setDateDebutReelle(new Date().toISOString().split('T')[0]!);
      setError(null);
    }
  }, [distribution]);

  if (!isOpen || !distribution) return null;

  const dateDistribution = new Date(distribution.date);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Préparer les données
    const data: { heure_debut_reelle?: string; date_debut_reelle?: string } = {};

    if (heureDebutReelle) {
      data.heure_debut_reelle = heureDebutReelle;
    }

    if (dateDebutReelle) {
      data.date_debut_reelle = dateDebutReelle;
    }

    onConfirm(data);
  };

  const handleClose = () => {
    setHeureDebutReelle('');
    setDateDebutReelle('');
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
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-orange-50">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-slate-800">Démarrer la distribution</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-orange-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Info distribution */}
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm text-slate-600">
              <span className="font-medium">Distribution du:</span>{' '}
              {dateDistribution.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-medium">Heures planifiées:</span>{' '}
              {distribution.heures_planifiees?.toFixed(2) || '0.00'}h
              {distribution.heure_debut && distribution.heure_fin && (
                <span className="text-slate-500 ml-1">
                  ({distribution.heure_debut.substring(0, 5)} -{' '}
                  {distribution.heure_fin.substring(0, 5)})
                </span>
              )}
            </p>
          </div>

          {/* Date et heure de début réelles */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                Date et heure de début réelles (terrain)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Date de début réelle */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Date de début
                </label>
                <input
                  type="date"
                  value={dateDebutReelle}
                  onChange={(e) => setDateDebutReelle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Heure de début réelle */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Heure de début
                </label>
                <input
                  type="time"
                  value={heureDebutReelle}
                  onChange={(e) => setHeureDebutReelle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* Info */}
          <p className="text-xs text-slate-500 italic">
            La date est pré-remplie avec aujourd'hui. Modifiez-la si le travail a commencé un autre
            jour.
          </p>

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
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Démarrage...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Démarrer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DemarrerDistributionModal;
