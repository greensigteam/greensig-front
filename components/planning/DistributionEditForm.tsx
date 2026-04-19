import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { format, isValid, Locale } from 'date-fns';
import { fr } from 'date-fns/locale';
import { planningService } from '../../services/planningService';
import { useToast } from '../../contexts/ToastContext';
import { Edit } from 'lucide-react';

/**
 * Formate une date de manière sécurisée (retourne fallback si date invalide)
 */
const safeFormat = (
  date: Date | null | undefined,
  formatStr: string,
  options?: { locale?: Locale },
): string => {
  if (!date || !isValid(date)) {
    // Valeurs par défaut selon le format demandé
    if (formatStr === 'yyyy-MM-dd') return new Date().toISOString().split('T')[0]!;
    if (formatStr === 'HH:mm') return '08:00';
    return '-';
  }
  return format(date, formatStr, options);
};

interface DistributionEditFormProps {
  /** ID de la distribution à modifier */
  distributionId: number;
  /** ID de la tâche associée */
  tacheId: number;
  /** Date de début de la distribution (pour initialiser le formulaire) */
  eventStart: Date;
  /** Date de fin de la distribution (pour initialiser le formulaire) */
  eventEnd: Date;
  /** Commentaire actuel de la distribution */
  commentaire?: string;
  /** Dates limites de la tâche pour validation */
  tacheDateDebut?: string;
  tacheDateFin?: string;
  /** Date de l'événement (pour affichage) */
  eventDate?: string;
  /** Heures réelles travaillées (affichage) */
  heuresReelles?: number | null;
  /** Heures planifiées (affichage) */
  heuresPlanifiees?: number | null;
  /** Mode lecture seule */
  isReadOnly?: boolean;
  /** Distribution terminée */
  isCompleted?: boolean;
  /** État d'édition contrôlé de l'extérieur */
  isExternalEditing?: boolean;
  /** Callback pour notifier le parent du changement d'état d'édition */
  onIsEditingChange?: (isEditing: boolean) => void;
  /** Mode standalone (non-overlay) */
  standalone?: boolean;
  /** Callback appelé après succès */
  onSuccess?: () => void;
  /** Callback pour fermer le formulaire/popup */
  onClose?: () => void;
}

/**
 * Composant pour éditer une distribution de charge (date et heures)
 *
 * Affiche soit :
 * - Un mode lecture avec bouton "Modifier"
 * - Un formulaire d'édition avec inputs date/heures et boutons Sauvegarder/Annuler
 */
export const DistributionEditForm: React.FC<DistributionEditFormProps> = ({
  distributionId,
  tacheId,
  eventStart,
  eventEnd,
  commentaire = '',
  tacheDateDebut,
  tacheDateFin,
  isReadOnly = false,
  isCompleted = false,
  isExternalEditing = false,
  onIsEditingChange,
  standalone = false,
  onSuccess,
  onClose,
}) => {
  const { showToast } = useToast();
  // Initialiser directement avec isExternalEditing
  const [isEditing, setIsEditing] = useState(isExternalEditing);
  const [isSaving, setIsSaving] = useState(false);

  // Synchroniser avec l'état extérieur
  React.useEffect(() => {
    setIsEditing(isExternalEditing);
  }, [isExternalEditing]);

  // Fonction interne pour changer l'état d'édition
  const toggleEditing = (val: boolean) => {
    if (onIsEditingChange) {
      onIsEditingChange(val);
    } else {
      setIsEditing(val);
    }
  };

  // États pour les champs édités (avec gestion des dates invalides)
  const [editedDate, setEditedDate] = useState(safeFormat(eventStart, 'yyyy-MM-dd'));
  const [editedHeureDebut, setEditedHeureDebut] = useState(safeFormat(eventStart, 'HH:mm'));
  const [editedHeureFin, setEditedHeureFin] = useState(safeFormat(eventEnd, 'HH:mm'));

  /**
   * Valide et sauvegarde les modifications de la distribution
   */
  const handleSave = async () => {
    // Validation des champs requis
    if (!editedDate || !editedHeureDebut || !editedHeureFin) {
      showToast('Veuillez remplir tous les champs', 'error');
      return;
    }

    // Vérifier que heure_fin > heure_debut
    const [hDebut = 0, mDebut = 0] = editedHeureDebut.split(':').map(Number);
    const [hFin = 0, mFin = 0] = editedHeureFin.split(':').map(Number);
    const minutesDebut = hDebut * 60 + mDebut;
    const minutesFin = hFin * 60 + mFin;

    if (minutesFin <= minutesDebut) {
      showToast("L'heure de fin doit être après l'heure de début", 'error');
      return;
    }

    setIsSaving(true);
    try {
      // Appeler l'API pour mettre à jour la distribution
      await planningService.updateSingleDistribution(tacheId, distributionId, {
        date: editedDate,
        heure_debut: editedHeureDebut,
        heure_fin: editedHeureFin,
        commentaire,
      });

      showToast('Distribution modifiée avec succès', 'success');

      // Déclencher les callbacks d'abord
      if (onSuccess) {
        await onSuccess();
      }

      if (onClose) {
        onClose();
      }

      // Seulement après, on bascule l'état (si le composant est encore monté)
      toggleEditing(false);
    } catch (error: any) {
      // Si c'est une erreur de validation avec plusieurs messages, afficher tous
      if (error.validationErrors && Array.isArray(error.validationErrors)) {
        error.validationErrors.forEach((msg: string) => {
          showToast(msg, 'warning');
        });
      } else {
        // Sinon, afficher le message d'erreur principal
        showToast(error.message || 'Erreur lors de la modification', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Annule les modifications et retourne en mode lecture
   */
  const handleCancel = () => {
    // Réinitialiser les valeurs (avec gestion des dates invalides)
    setEditedDate(safeFormat(eventStart, 'yyyy-MM-dd'));
    setEditedHeureDebut(safeFormat(eventStart, 'HH:mm'));
    setEditedHeureFin(safeFormat(eventEnd, 'HH:mm'));
    toggleEditing(false);
    if (onClose) {
      onClose();
    }
  };

  // Mode édition : Version Overlay (superposition) ou Standalone (contenu direct)
  if (isEditing) {
    return (
      <div
        className={`
                ${standalone ? 'relative min-h-[450px]' : 'absolute inset-0 z-[60]'} 
                bg-white/95 backdrop-blur-sm animate-in fade-in duration-200 flex flex-col
            `}
      >
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Clock className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">Modifier les horaires</h4>
              <p className="text-xs text-slate-500">
                Ajustez la date et les heures de cette intervention
              </p>
            </div>
          </div>

          <div className="grid gap-5">
            {/* Champ Date */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">
                Date de l'intervention
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={editedDate}
                  onChange={(e) => setEditedDate(e.target.value)}
                  min={tacheDateDebut}
                  max={tacheDateFin}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium px-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  Période autorisée :{' '}
                  {safeFormat(tacheDateDebut ? new Date(tacheDateDebut) : null, 'd MMM', {
                    locale: fr,
                  })}{' '}
                  au{' '}
                  {safeFormat(tacheDateFin ? new Date(tacheDateFin) : null, 'd MMM yyyy', {
                    locale: fr,
                  })}
                </div>
              </div>
            </div>

            {/* Champs Heures */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Début</label>
                <input
                  type="time"
                  value={editedHeureDebut}
                  onChange={(e) => setEditedHeureDebut(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Fin</label>
                <input
                  type="time"
                  value={editedHeureFin}
                  onChange={(e) => setEditedHeureFin(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer avec boutons d'action */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="flex-1 px-4 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50 font-bold text-sm transition-all"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-[2] px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Sauvegarder les modifications'
            )}
          </button>
        </div>
      </div>
    );
  }

  // Mode lecture : Affichage avec bouton "Modifier"
  return (
    <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
      <Clock className="w-5 h-5 text-gray-400" />
      <div className="flex-1 flex items-center justify-between">
        <span>
          {safeFormat(eventStart, 'EEEE d MMMM', { locale: fr })}
          <span className="mx-2 text-gray-300">|</span>
          {`${safeFormat(eventStart, 'HH:mm')} - ${safeFormat(eventEnd, 'HH:mm')}`}
        </span>
        {!isReadOnly && !isCompleted && !onIsEditingChange && (
          <button
            onClick={() => toggleEditing(true)}
            className="ml-3 px-3 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
