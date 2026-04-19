import { useState, useMemo } from 'react';
import { Calendar, AlertCircle, Info, Settings, Lock } from 'lucide-react';
import { DistributionChargeData, StatusDistribution } from '@/types/planning';
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
  dayName: string;
  heures: number;
  heure_debut: string; // "HH:MM"
  heure_fin: string; // "HH:MM"
  commentaire: string;
  status?: StatusDistribution; // ✅ NOUVEAU: Status pour verrouiller les distributions réalisées
  isRealized: boolean; // ✅ NOUVEAU: Flag pour verrouillage
}

const JOUR_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/**
 * ✅ Composant pour éditer manuellement la distribution de charge journalière
 * pour les tâches multi-jours.
 *
 * Features:
 * - Liste tous les jours entre dateDebut et dateFin
 * - Permet de saisir les heures par jour
 * - Affiche le total des heures
 * - Validation (heures >= 0)
 */
export function DistributionChargeEditor({
  dateDebut,
  dateFin,
  distributions,
  onChange,
  readonly = false,
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

  // ✅ Créer un Map pour accès rapide aux distributions originales par date
  const distributionsMap = useMemo(() => {
    const map = new Map<string, DistributionChargeData>();
    distributions?.forEach((dist) => map.set(dist.date, dist));
    return map;
  }, [distributions]);

  // Générer les lignes UNIQUEMENT pour les jours avec distributions
  const dayRows = useMemo(() => {
    // Si aucune distribution, retourner un tableau vide (affichera un message)
    if (!distributions || distributions.length === 0) {
      return [];
    }

    // Créer une ligne pour chaque distribution existante
    const rows: DayRow[] = distributions.map((dist) => {
      const date = new Date(dist.date + 'T00:00:00');
      const dayOfWeek = date.getDay();

      // Heures par défaut si non définies
      const heure_debut = dist.heure_debut ?? '08:00';
      const heure_fin = dist.heure_fin ?? '17:00';

      // Calculer les heures
      const heures = dist.heures_planifiees ?? calculerHeures(heure_debut, heure_fin);

      // ✅ NOUVEAU: Vérifier si la distribution est réalisée
      const isRealized = dist.status === 'REALISEE';

      return {
        date,
        dateString: dist.date,
        dayName: JOUR_NAMES[dayOfWeek] ?? '',
        heures,
        heure_debut,
        heure_fin,
        commentaire: dist.commentaire ?? '',
        status: dist.status,
        isRealized,
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
    const newDistributions: DistributionChargeData[] = dayRows.map((row) => {
      const originalDist = distributionsMap.get(row.dateString);
      const c = row.dateString === dateString ? value : row.commentaire;
      return {
        ...originalDist, // ✅ Préserver id, status, reference
        date: row.dateString,
        heure_debut: row.heure_debut,
        heure_fin: row.heure_fin,
        commentaire: c,
      };
    });

    onChange(newDistributions);
  };

  // Handler pour changement heure_debut
  const handleHeureDebutChange = (dateString: string, value: string) => {
    const newDistributions: DistributionChargeData[] = dayRows.map((row) => {
      const originalDist = distributionsMap.get(row.dateString);
      const nouveauDebut = row.dateString === dateString ? value : row.heure_debut;

      return {
        ...originalDist, // ✅ Préserver id, status, reference
        date: row.dateString,
        heure_debut: nouveauDebut,
        heure_fin: row.heure_fin,
        commentaire: row.commentaire,
      };
    });

    onChange(newDistributions);
  };

  // Handler pour changement heure_fin
  const handleHeureFinChange = (dateString: string, value: string) => {
    const newDistributions: DistributionChargeData[] = dayRows.map((row) => {
      const originalDist = distributionsMap.get(row.dateString);
      const nouvelleFin = row.dateString === dateString ? value : row.heure_fin;

      return {
        ...originalDist, // ✅ Préserver id, status, reference
        date: row.dateString,
        heure_debut: row.heure_debut,
        heure_fin: nouvelleFin,
        commentaire: row.commentaire,
      };
    });

    onChange(newDistributions);
  };

  // Calculer la durée de la période totale
  const periodeDays =
    Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const showWarning = periodeDays > 30;

  // Handler pour la sélection des jours depuis le modal
  const handleDaysSelected = (selectedDays: any[]) => {
    const newDistributions: DistributionChargeData[] = selectedDays.map((day) => {
      // ✅ Préserver les données existantes si la distribution existe déjà
      const existingDist = distributionsMap.get(day.date);

      return {
        ...existingDist, // Préserver id, status, reference si existant
        date: day.date,
        heure_debut: day.heure_debut,
        heure_fin: day.heure_fin,
        commentaire: day.commentaire || existingDist?.commentaire || '',
      };
    });

    onChange(newDistributions);
    setShowSelectDaysModal(false);
  };

  return (
    <div className="space-y-3">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Distribution de charge journalière</h3>
        </div>
        <div className="flex items-center gap-3">
          {!readonly && (
            <button
              type="button"
              onClick={() => setShowSelectDaysModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
            >
              <Settings className="w-4 h-4" />
              {dayRows.length > 0 ? 'Modifier les jours' : 'Sélectionner les jours'}
            </button>
          )}
          {dayRows.length > 0 && (
            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-sm font-bold text-emerald-700">
              Total: {totalHeures.toFixed(2)}h
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <Info className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="text-xs text-emerald-800 leading-relaxed">
          <p className="font-bold text-[13px] mb-0.5">Contrôle avancé multi-jours</p>
          <p className="opacity-80">
            Répartissez manuellement les heures de travail sur chaque jour. Les jours à 0h ne seront
            pas enregistrés.
          </p>
        </div>
      </div>

      {/* Avertissement si trop de jours */}
      {showWarning && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-bold">Attention:</span> Cette tâche s'étend sur {periodeDays}{' '}
            jours. Vérifiez que c'est bien intentionnel et considérez diviser en plusieurs tâches si
            nécessaire.
          </p>
        </div>
      )}

      {/* Tableau des distributions */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto shadow-sm">
        {dayRows.length === 0 ? (
          <div className="p-12 text-center bg-slate-50/50">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Aucun jour sélectionné</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              Cliquez sur le bouton pour choisir les jours de travail dans la période définie.
            </p>
            {!readonly && (
              <button
                type="button"
                onClick={() => setShowSelectDaysModal(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-lg shadow-emerald-100"
              >
                <Settings className="w-4 h-4" />
                Sélectionner les jours
              </button>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Jour
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
                  Heures
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Début
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Fin
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Commentaire
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {dayRows.map((row) => (
                <tr
                  key={row.dateString}
                  className={
                    row.isRealized
                      ? 'bg-emerald-50/70 border-l-4 border-emerald-500' // ✅ Réalisée = verrouillée
                      : 'hover:bg-slate-50 transition-colors'
                  }
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-700">
                    {row.date.toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className="text-slate-600 font-medium">{row.dayName}</span>
                    {row.isRealized && (
                      <span className="ml-1.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 inline-flex">
                        <Lock className="w-3 h-3" />
                        Réalisée
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex justify-center">
                      <div className="px-3 py-1 rounded-lg text-sm font-bold shadow-sm border bg-emerald-50 text-emerald-700 border-emerald-100">
                        {row.heures.toFixed(1)}h
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="time"
                      value={row.heure_debut}
                      onChange={(e) => handleHeureDebutChange(row.dateString, e.target.value)}
                      disabled={readonly || row.isRealized}
                      className={`
                        w-24 px-3 py-1.5 text-sm border rounded-xl transition-all
                        ${
                          row.isRealized
                            ? 'bg-slate-100 cursor-not-allowed text-slate-400 border-slate-200'
                            : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        }
                        ${readonly ? 'bg-slate-50 cursor-not-allowed' : ''}
                      `}
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="time"
                      value={row.heure_fin}
                      onChange={(e) => handleHeureFinChange(row.dateString, e.target.value)}
                      disabled={readonly || row.isRealized}
                      className={`
                        w-24 px-3 py-1.5 text-sm border rounded-xl transition-all
                        ${
                          row.isRealized
                            ? 'bg-slate-100 cursor-not-allowed text-slate-400 border-slate-200'
                            : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        }
                        ${readonly ? 'bg-slate-50 cursor-not-allowed' : ''}
                      `}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.commentaire}
                      onChange={(e) => handleCommentaireChange(row.dateString, e.target.value)}
                      disabled={readonly || row.isRealized}
                      placeholder={row.isRealized ? '' : 'Détails...'}
                      className={`
                        w-full px-3 py-1.5 text-sm border rounded-xl transition-all
                        ${
                          row.isRealized
                            ? 'bg-slate-100 cursor-not-allowed text-slate-400 border-slate-200'
                            : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        }
                        ${readonly ? 'bg-slate-50 cursor-not-allowed' : ''}
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
        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm">
          <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>
              {dayRows.length} jour{dayRows.length > 1 ? 's' : ''} sélectionné
              {dayRows.length > 1 ? 's' : ''} sur {periodeDays} dans la période
            </span>
          </div>
          <div className="text-sm font-black text-slate-900 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
            Total: <span className="text-emerald-600">{totalHeures.toFixed(2)} heures</span>
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
          initialSelection={distributions.map((d) => d.date)}
          protectedDates={dayRows.filter((row) => row.isRealized).map((row) => row.dateString)}
        />
      )}
    </div>
  );
}
