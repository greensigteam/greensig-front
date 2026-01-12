import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, AlertCircle, Info, Settings } from 'lucide-react';
import { DistributionChargeData } from '@/types/planning';
import SelectDaysModal from '../modals/SelectDaysModal';

interface DistributionChargeEditorProps {
  dateDebut: Date;
  dateFin: Date;
  distributions: DistributionChargeData[];
  onChange: (distributions: DistributionChargeData[]) => void;
  readonly?: boolean;
}

interface DayRow {
  date: Date;
  dateString: string; // YYYY-MM-DD
  isWeekend: boolean;
  isSunday: boolean;
  dayName: string;
  heures: number;
  heure_debut: string;  // "HH:MM"
  heure_fin: string;     // "HH:MM"
  commentaire: string;
}

const JOUR_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/**
 * ✅ Composant pour éditer manuellement la distribution de charge journalière
 * pour les tâches multi-jours.
 *
 * Features:
 * - Liste tous les jours entre dateDebut et dateFin
 * - Permet de saisir les heures par jour
 * - Marque les weekends (samedi travaillé, dimanche repos)
 * - Affiche le total des heures
 * - Validation (heures >= 0)
 */
export function DistributionChargeEditor({
  dateDebut,
  dateFin,
  distributions,
  onChange,
  readonly = false
}: DistributionChargeEditorProps) {
  // État pour le modal de sélection des jours
  const [showSelectDaysModal, setShowSelectDaysModal] = useState(false);

  // Fonction utilitaire pour calculer les heures entre deux horaires
  const calculerHeures = (debut: string, fin: string): number => {
    if (!debut || !fin) return 0;

    const [hDebut, mDebut] = debut.split(':').map(Number);
    const [hFin, mFin] = fin.split(':').map(Number);

    const minutesDebut = (hDebut ?? 0) * 60 + (mDebut ?? 0);
    const minutesFin = (hFin ?? 0) * 60 + (mFin ?? 0);

    const diffMinutes = minutesFin - minutesDebut;
    return Math.round((diffMinutes / 60) * 100) / 100; // Arrondi à 2 décimales
  };

  // Générer les lignes UNIQUEMENT pour les jours avec distributions
  const dayRows = useMemo(() => {
    // Si aucune distribution, retourner un tableau vide (affichera un message)
    if (!distributions || distributions.length === 0) {
      return [];
    }

    // Créer une ligne pour chaque distribution existante
    const rows: DayRow[] = distributions.map(dist => {
      const date = new Date(dist.date + 'T00:00:00');
      const dayOfWeek = date.getDay(); // 0 = dimanche, 6 = samedi
      const isSunday = dayOfWeek === 0;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Heures par défaut si non définies
      const heure_debut = dist.heure_debut ?? '08:00';
      const heure_fin = dist.heure_fin ?? '17:00';

      // Calculer les heures
      const heures = dist.heures_planifiees ?? calculerHeures(heure_debut, heure_fin);

      return {
        date,
        dateString: dist.date,
        isWeekend,
        isSunday,
        dayName: JOUR_NAMES[dayOfWeek] ?? '',
        heures,
        heure_debut,
        heure_fin,
        commentaire: dist.commentaire ?? ''
      };
    });

    // Trier par date
    return rows.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [distributions]);

  // Calculer le total des heures
  const totalHeures = useMemo(() => {
    return dayRows.reduce((sum, row) => sum + row.heures, 0);
  }, [dayRows]);

  // Handler pour changement de commentaire
  const handleCommentaireChange = (dateString: string, value: string) => {
    const newDistributions: DistributionChargeData[] = dayRows.map(row => {
      const c = row.dateString === dateString ? value : row.commentaire;
      return {
        date: row.dateString,
        heure_debut: row.heure_debut,
        heure_fin: row.heure_fin,
        commentaire: c
      };
    });

    onChange(newDistributions);
  };

  // Handler pour changement heure_debut
  const handleHeureDebutChange = (dateString: string, value: string) => {
    const newDistributions: DistributionChargeData[] = dayRows.map(row => {
      const nouveauDebut = row.dateString === dateString ? value : row.heure_debut;

      return {
        date: row.dateString,
        heure_debut: nouveauDebut,
        heure_fin: row.heure_fin,
        commentaire: row.commentaire
      };
    });

    onChange(newDistributions);
  };

  // Handler pour changement heure_fin
  const handleHeureFinChange = (dateString: string, value: string) => {
    const newDistributions: DistributionChargeData[] = dayRows.map(row => {
      const nouvelleFin = row.dateString === dateString ? value : row.heure_fin;

      return {
        date: row.dateString,
        heure_debut: row.heure_debut,
        heure_fin: nouvelleFin,
        commentaire: row.commentaire
      };
    });

    onChange(newDistributions);
  };

  // Calculer la durée de la période totale
  const periodeDays = Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const showWarning = periodeDays > 30;

  // Handler pour la sélection des jours depuis le modal
  const handleDaysSelected = (selectedDays: any[]) => {
    const newDistributions: DistributionChargeData[] = selectedDays.map(day => ({
      date: day.date,
      heure_debut: day.heure_debut,
      heure_fin: day.heure_fin,
      commentaire: day.commentaire || ''
    }));

    onChange(newDistributions);
    setShowSelectDaysModal(false);
  };

  return (
    <div className="space-y-3">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-medium text-gray-700">
            Distribution de charge journalière
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {!readonly && (
            <button
              type="button"
              onClick={() => setShowSelectDaysModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              {dayRows.length > 0 ? 'Modifier les jours' : 'Sélectionner les jours'}
            </button>
          )}
          {dayRows.length > 0 && (
            <div className="text-sm font-semibold text-blue-600">
              Total: {totalHeures.toFixed(2)}h
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-700">
          <p className="font-medium">Contrôle avancé multi-jours</p>
          <p className="mt-1">
            Répartissez manuellement les heures de travail sur chaque jour.
            Les jours à 0h ne seront pas enregistrés.
            <span className="font-medium"> Samedi</span> est travaillé jusqu'à midi (demi-journée),
            <span className="font-medium"> Dimanche</span> est repos.
          </p>
        </div>
      </div>

      {/* Avertissement si trop de jours */}
      {showWarning && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            <span className="font-medium">Attention:</span> Cette tâche s'étend sur {periodeDays} jours.
            Vérifiez que c'est bien intentionnel et considérez diviser en plusieurs tâches si nécessaire.
          </p>
        </div>
      )}

      {/* Tableau des distributions */}
      <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
        {dayRows.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun jour sélectionné</h3>
            <p className="text-sm text-gray-500 mb-4">
              Cliquez sur le bouton "Sélectionner les jours" pour choisir les jours de travail
            </p>
            {!readonly && (
              <button
                type="button"
                onClick={() => setShowSelectDaysModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Sélectionner les jours
              </button>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jour
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Heures
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Début
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fin
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commentaire
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dayRows.map((row) => (
              <tr
                key={row.dateString}
                className={
                  row.isSunday
                    ? 'bg-red-50' // Dimanche = repos
                    : row.isWeekend
                    ? 'bg-blue-50' // Samedi = demi-journée
                    : 'hover:bg-gray-50'
                }
              >
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                  {row.date.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm">
                  <span
                    className={
                      row.isSunday
                        ? 'text-red-700 font-medium'
                        : row.isWeekend
                        ? 'text-blue-700 font-medium'
                        : 'text-gray-700'
                    }
                  >
                    {row.dayName}
                  </span>
                  {row.isSunday && (
                    <span className="ml-1 text-xs text-red-500">(Repos)</span>
                  )}
                  {row.isWeekend && !row.isSunday && (
                    <span className="ml-1 text-xs text-blue-500">(Demi-j.)</span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={row.heures || ''}
                      readOnly
                      disabled={row.isSunday}
                      placeholder={row.isSunday ? '0' : '0.0'}
                      title="Calculé automatiquement depuis les horaires (lecture seule)"
                      className={`
                        w-20 px-2 py-1 text-sm border rounded cursor-not-allowed
                        ${row.isSunday
                          ? 'bg-gray-100 text-gray-400 border-gray-200'
                          : 'bg-blue-50 text-blue-900 border-blue-300 font-medium'
                        }
                      `}
                    />
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="time"
                    value={row.heure_debut}
                    onChange={(e) => handleHeureDebutChange(row.dateString, e.target.value)}
                    disabled={readonly || row.isSunday}
                    className={`
                      w-24 px-2 py-1 text-sm border rounded
                      ${row.isSunday
                        ? 'bg-gray-100 cursor-not-allowed text-gray-400'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      }
                      ${readonly ? 'bg-gray-50 cursor-not-allowed' : ''}
                    `}
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="time"
                    value={row.heure_fin}
                    onChange={(e) => handleHeureFinChange(row.dateString, e.target.value)}
                    disabled={readonly || row.isSunday}
                    className={`
                      w-24 px-2 py-1 text-sm border rounded
                      ${row.isSunday
                        ? 'bg-gray-100 cursor-not-allowed text-gray-400'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      }
                      ${readonly ? 'bg-gray-50 cursor-not-allowed' : ''}
                    `}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={row.commentaire}
                    onChange={(e) => handleCommentaireChange(row.dateString, e.target.value)}
                    disabled={readonly || row.isSunday}
                    placeholder={row.isSunday ? '' : 'Optionnel'}
                    className={`
                      w-full px-2 py-1 text-sm border rounded
                      ${row.isSunday
                        ? 'bg-gray-100 cursor-not-allowed text-gray-400'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      }
                      ${readonly ? 'bg-gray-50 cursor-not-allowed' : ''}
                    `}
                  />
                </td>
              </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Résumé */}
      {dayRows.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div className="text-xs text-gray-600">
            {dayRows.length} jour{dayRows.length > 1 ? 's' : ''} sélectionné{dayRows.length > 1 ? 's' : ''}
            {' '}sur {periodeDays} dans la période
          </div>
          <div className="text-sm font-bold text-gray-900">
            Total: {totalHeures.toFixed(2)} heures
          </div>
        </div>
      )}

      {/* Modal de sélection des jours */}
      {showSelectDaysModal && (
        <SelectDaysModal
          dateDebut={new Date(dateDebut)}
          dateFin={new Date(dateFin)}
          onConfirm={handleDaysSelected}
          onCancel={() => setShowSelectDaysModal(false)}
          initialSelection={distributions.map(d => d.date)}
        />
      )}
    </div>
  );
}
