import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  AlertCircle,
  Clock,
  ClipboardList,
  Star,
  Eye,
  EyeOff,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import { formatLocalDate } from '../../utils/dateHelpers';
import type { Reclamation } from '../../types/reclamations';
import type { Utilisateur } from '../../types/users';

interface ReclamationDetailHeaderProps {
  reclamation: Reclamation;
  currentUser: Utilisateur | undefined;
  isAdmin: boolean;
  isSupervisor: boolean;
  isClient: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenTaskModal: () => void;
  onCloturer: () => void;
  onValiderCloture: () => void;
  onRefuserCloture: () => void;
  onRejeter: () => void;
  onRefuserIntervention: () => void;
  onReprendreIntervention: () => void;
  onEvaluer: () => void;
  onToggleVisibility: () => void;
}

export const ReclamationDetailHeader: React.FC<ReclamationDetailHeaderProps> = ({
  reclamation,
  currentUser,
  isAdmin,
  isSupervisor,
  isClient,
  onEdit,
  onDelete,
  onOpenTaskModal,
  onCloturer,
  onValiderCloture,
  onRefuserCloture,
  onRejeter,
  onRefuserIntervention,
  onReprendreIntervention,
  onEvaluer,
  onToggleVisibility,
}) => {
  const navigate = useNavigate();
  const hasUnfinishedTasks = reclamation.taches_liees_details?.some(
    (t: any) => t.statut !== 'TERMINEE',
  );

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/reclamations')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-emerald-600" />
                {reclamation.numero_reclamation}
                {reclamation.visible_client === false && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                    <EyeOff className="w-3 h-3" />
                    Interne
                  </span>
                )}
              </h1>
              <p className="text-sm text-slate-500">
                Créée le{' '}
                {formatLocalDate(reclamation.date_creation, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentUser &&
              reclamation.createur === currentUser.id &&
              reclamation.statut !== 'CLOTUREE' &&
              reclamation.statut !== 'REJETEE' && (
                <button
                  onClick={onEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 text-sm transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifier
                </button>
              )}

            {(isAdmin || isSupervisor) && !reclamation.createur_est_client && (
              <button
                onClick={onToggleVisibility}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm transition-colors ${
                  reclamation.visible_client
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title={
                  reclamation.visible_client ? 'Masquer au client' : 'Rendre visible au client'
                }
              >
                {reclamation.visible_client ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                {reclamation.visible_client ? 'Masquer au client' : 'Rendre visible'}
              </button>
            )}

            {isAdmin && (
              <button
                onClick={onDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2 text-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            )}

            {isAdmin && reclamation.statut !== 'CLOTUREE' && reclamation.statut !== 'REJETEE' && (
              <button
                onClick={onOpenTaskModal}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2 text-sm"
              >
                <ClipboardList className="w-4 h-4" />
                Créer une tâche
              </button>
            )}

            {reclamation.statut !== 'CLOTUREE' &&
              reclamation.statut !== 'REJETEE' &&
              reclamation.statut !== 'EN_ATTENTE_VALIDATION_CLOTURE' &&
              !isClient && (
                <button
                  onClick={onCloturer}
                  disabled={hasUnfinishedTasks}
                  className={`px-4 py-2 text-white rounded-lg font-medium flex items-center gap-2 text-sm transition-all ${
                    hasUnfinishedTasks
                      ? 'bg-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  title={
                    hasUnfinishedTasks
                      ? 'Certaines tâches ne sont pas terminées'
                      : 'Proposer la clôture de la réclamation'
                  }
                >
                  <Clock className="w-4 h-4" />
                  Proposer clôture
                </button>
              )}

            {isAdmin && reclamation.statut !== 'CLOTUREE' && reclamation.statut !== 'REJETEE' && (
              <button
                onClick={onRejeter}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2 text-sm transition-colors"
                title="Rejeter cette réclamation (justification obligatoire)"
              >
                <X className="w-4 h-4" />
                Rejeter la réclamation
              </button>
            )}

            {reclamation.statut === 'EN_ATTENTE_VALIDATION_CLOTURE' &&
              currentUser &&
              (reclamation.createur === currentUser.id ||
                (isAdmin && reclamation.visible_client === false)) && (
                <div className="flex gap-3">
                  <button
                    onClick={onValiderCloture}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2 text-sm animate-pulse"
                    title="Accepter la clôture de la réclamation"
                  >
                    <Star className="w-4 h-4" />
                    Valider clôture
                  </button>
                  <button
                    onClick={onRefuserCloture}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2 text-sm"
                    title="Refuser la clôture (commentaire obligatoire)"
                  >
                    <X className="w-4 h-4" />
                    Refuser clôture
                  </button>
                </div>
              )}

            {currentUser &&
              reclamation.createur === currentUser.id &&
              reclamation.statut === 'CLOTUREE' &&
              !reclamation.satisfaction && (
                <button
                  onClick={onEvaluer}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium flex items-center gap-2 text-sm"
                >
                  <Star className="w-4 h-4" />
                  Évaluer
                </button>
              )}

            {(isClient || (currentUser && reclamation.createur === currentUser.id)) &&
              reclamation.statut !== 'REJETEE' &&
              (reclamation.statut === 'RESOLUE' ||
                reclamation.statut === 'EN_ATTENTE_VALIDATION_CLOTURE') &&
              reclamation.taches_liees_details?.some((t: any) => t.statut === 'TERMINEE') && (
                <button
                  onClick={onRefuserIntervention}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium flex items-center gap-2 text-sm"
                  title="Refuser l'intervention effectuée (commentaire obligatoire)"
                >
                  <AlertCircle className="w-4 h-4" />
                  Refuser l'intervention
                </button>
              )}

            {isAdmin && reclamation.statut === 'INTERVENTION_REFUSEE' && (
              <button
                onClick={onReprendreIntervention}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 text-sm"
                title="Reprendre l'intervention suite au refus client"
              >
                <ClipboardList className="w-4 h-4" />
                Reprendre l'intervention
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
