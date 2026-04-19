import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Calendar, AlertCircle } from 'lucide-react';
import { DistributionCharge } from '../../types/planning';

interface TerminerDistributionModalProps {
  isOpen: boolean;
  distribution: DistributionCharge | null;
  onClose: () => void;
  onConfirm: (data: {
    heure_debut_reelle?: string;
    heure_fin_reelle?: string;
    heures_reelles?: number;
    date_fin_reelle?: string;
  }) => void;
  isLoading?: boolean;
}

export const TerminerDistributionModal: React.FC<TerminerDistributionModalProps> = ({
  isOpen,
  distribution,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [heureDebutReelle, setHeureDebutReelle] = useState('');
  const [heureFinReelle, setHeureFinReelle] = useState('');
  const [heuresReelles, setHeuresReelles] = useState<string>('');
  const [dateFinReelle, setDateFinReelle] = useState('');
  const [useManualHours, setUseManualHours] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialiser avec les heures planifiées si disponibles
  useEffect(() => {
    if (distribution) {
      // Pré-remplir avec les heures planifiées comme suggestion
      const heureDebut = distribution.heure_debut?.substring(0, 5) || '08:00';
      const heureFin = distribution.heure_fin?.substring(0, 5) || '17:00';
      setHeureDebutReelle(heureDebut);
      setHeureFinReelle(heureFin);
      setHeuresReelles('');
      // Initialiser la date avec aujourd'hui
      setDateFinReelle(new Date().toISOString().split('T')[0]!);
      setUseManualHours(false);
      setError(null);
    }
  }, [distribution]);

  if (!isOpen || !distribution) return null;

  const dateDistribution = new Date(distribution.date);

  // Calculer les heures automatiquement
  const calculateHours = (): number | null => {
    if (!heureDebutReelle || !heureFinReelle) return null;

    const [h1 = 0, m1 = 0] = heureDebutReelle.split(':').map(Number);
    const [h2 = 0, m2 = 0] = heureFinReelle.split(':').map(Number);

    const debut = h1 * 60 + m1;
    const fin = h2 * 60 + m2;

    if (fin <= debut) return null;

    return Math.round(((fin - debut) / 60) * 100) / 100;
  };

  const calculatedHours = calculateHours();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (heureDebutReelle && heureFinReelle) {
      const [h1 = 0, m1 = 0] = heureDebutReelle.split(':').map(Number);
      const [h2 = 0, m2 = 0] = heureFinReelle.split(':').map(Number);
      const debut = h1 * 60 + m1;
      const fin = h2 * 60 + m2;

      if (fin <= debut) {
        setError("L'heure de fin doit être postérieure à l'heure de début");
        return;
      }
    }

    // Préparer les données
    const data: {
      heure_debut_reelle?: string;
      heure_fin_reelle?: string;
      heures_reelles?: number;
      date_fin_reelle?: string;
    } = {};

    if (heureDebutReelle) {
      data.heure_debut_reelle = heureDebutReelle;
    }
    if (heureFinReelle) {
      data.heure_fin_reelle = heureFinReelle;
    }
    if (useManualHours && heuresReelles) {
      data.heures_reelles = parseFloat(heuresReelles);
    }
    if (dateFinReelle) {
      data.date_fin_reelle = dateFinReelle;
    }

    onConfirm(data);
  };

  const handleClose = () => {
    setHeureDebutReelle('');
    setHeureFinReelle('');
    setHeuresReelles('');
    setDateFinReelle('');
    setUseManualHours(false);
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
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-green-50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-slate-800">Terminer la distribution</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-green-100 rounded-lg transition-colors"
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

          {/* Date et heures réelles terrain */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800">
                Date et heures réelles (terrain)
              </span>
            </div>

            {/* Date de fin réelle */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Date de fin</label>
              <input
                type="date"
                value={dateFinReelle}
                onChange={(e) => setDateFinReelle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Heure début</label>
                <input
                  type="time"
                  value={heureDebutReelle}
                  onChange={(e) => setHeureDebutReelle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Heure fin</label>
                <input
                  type="time"
                  value={heureFinReelle}
                  onChange={(e) => setHeureFinReelle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Heures calculées automatiquement */}
            {calculatedHours !== null && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-600">Durée calculée:</span>
                <span className="font-semibold text-emerald-700">
                  {calculatedHours.toFixed(2)}h
                </span>
              </div>
            )}
          </div>

          {/* Override manuel */}
          <div className="border border-slate-200 rounded-lg p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useManualHours}
                onChange={(e) => setUseManualHours(e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-700">
                Saisir les heures manuellement (ex: pause déjeuner)
              </span>
            </label>

            {useManualHours && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Heures réelles travaillées
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max="24"
                  value={heuresReelles}
                  onChange={(e) => setHeuresReelles(e.target.value)}
                  placeholder="Ex: 3.5"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Cette valeur remplacera le calcul automatique
                </p>
              </div>
            )}
          </div>

          {/* Info optionnel */}
          <p className="text-xs text-slate-500 italic">
            Les champs sont optionnels. Si non renseignés, seul le statut sera mis à jour.
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
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Terminer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TerminerDistributionModal;
