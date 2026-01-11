import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, AlertCircle, Info } from 'lucide-react';
import { DistributionChargeData } from '@/types/planning';

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
  // Générer les lignes pour chaque jour
  const dayRows = useMemo(() => {
    const rows: DayRow[] = [];
    const currentDate = new Date(dateDebut);
    const endDate = new Date(dateFin);

    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay(); // 0 = dimanche, 6 = samedi
      const isSunday = dayOfWeek === 0;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Trouver la distribution existante pour cette date
      const existingDist = distributions.find(d => d.date === dateString);

      rows.push({
        date: new Date(currentDate),
        dateString,
        isWeekend,
        isSunday,
        dayName: JOUR_NAMES[dayOfWeek] ?? '',
        heures: existingDist?.heures_planifiees ?? 0,
        commentaire: existingDist?.commentaire ?? ''
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return rows;
  }, [dateDebut, dateFin, distributions]);

  // Calculer le total des heures
  const totalHeures = useMemo(() => {
    return dayRows.reduce((sum, row) => sum + row.heures, 0);
  }, [dayRows]);

  // Handler pour changement d'heures
  const handleHeuresChange = (dateString: string, value: string) => {
    const heures = parseFloat(value) || 0;

    // Créer la nouvelle liste de distributions
    const newDistributions: DistributionChargeData[] = dayRows.map(row => {
      const h = row.dateString === dateString ? heures : row.heures;
      return {
        date: row.dateString,
        heures_planifiees: h,
        commentaire: row.commentaire
      };
    }).filter(d => d.heures_planifiees > 0); // Exclure les jours avec 0h

    onChange(newDistributions);
  };

  // Handler pour changement de commentaire
  const handleCommentaireChange = (dateString: string, value: string) => {
    const newDistributions: DistributionChargeData[] = dayRows.map(row => {
      const c = row.dateString === dateString ? value : row.commentaire;
      return {
        date: row.dateString,
        heures_planifiees: row.heures,
        commentaire: c
      };
    }).filter(d => d.heures_planifiees > 0);

    onChange(newDistributions);
  };

  // Afficher avertissement si période > 30 jours
  const nombreJours = dayRows.length;
  const showWarning = nombreJours > 30;

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
        <div className="text-sm font-semibold text-blue-600">
          Total: {totalHeures.toFixed(2)}h
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
            <span className="font-medium">Attention:</span> Cette tâche s'étend sur {nombreJours} jours.
            Vérifiez que c'est bien intentionnel et considérez diviser en plusieurs tâches si nécessaire.
          </p>
        </div>
      )}

      {/* Tableau des distributions */}
      <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
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
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={row.heures || ''}
                    onChange={(e) => handleHeuresChange(row.dateString, e.target.value)}
                    disabled={readonly || row.isSunday} // Dimanche = disabled
                    placeholder={row.isSunday ? '0' : '0.0'}
                    className={`
                      w-20 px-2 py-1 text-sm border rounded
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
      </div>

      {/* Résumé */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
        <div className="text-xs text-gray-600">
          {nombreJours} jour{nombreJours > 1 ? 's' : ''} dans la période
          ({dayRows.filter(r => r.heures > 0).length} avec heures planifiées)
        </div>
        <div className="text-sm font-bold text-gray-900">
          Total: {totalHeures.toFixed(2)} heures
        </div>
      </div>
    </div>
  );
}
