import { FC, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  X,
  Trash2,
  Edit,
  Clock,
  AlertTriangle,
  CheckCircle,
  MoreVertical,
  Users,
  Calendar,
  MapPin,
  Play,
  CalendarClock,
  XCircle,
  RotateCcw,
  History,
} from 'lucide-react';
import { FloatingPortal } from '@floating-ui/react';
import {
  Tache,
  STATUT_TACHE_LABELS,
  STATUT_TACHE_COLORS,
  PRIORITE_LABELS,
  STATUS_DISTRIBUTION_LABELS,
  STATUS_DISTRIBUTION_COLORS,
  ALLOWED_DISTRIBUTION_TRANSITIONS,
  type StatusDistribution,
} from '../../types/planning';
import { StatusBadge } from '../StatusBadge';
import { DistributionEditForm } from './DistributionEditForm';
import { getEquipeName, formatEquipesList } from '../../utils/equipeHelpers';

// ============================================================================
// TYPES
// ============================================================================

interface TaskDetailPopoverProps {
  tache: Tache;
  eventStart?: Date;
  eventEnd?: Date;
  distributionStatus?: StatusDistribution;
  distributionId?: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  // Nouveau workflow distribution
  onDemarrer?: () => void;
  onTerminer?: () => void;
  onReporter?: () => void;
  onAnnuler?: () => void;
  onRestaurer?: () => void;
  onHistorique?: () => void;
  isActionLoading?: boolean;
  nombreReports?: number;
  onUpdate?: () => void;
  isReadOnly?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const TaskDetailPopover: FC<TaskDetailPopoverProps> = ({
  tache,
  eventStart,
  eventEnd,
  distributionStatus,
  distributionId,
  onClose,
  onEdit,
  onDelete,
  onDemarrer,
  onTerminer,
  onReporter,
  onAnnuler,
  onRestaurer,
  onHistorique,
  isActionLoading = false,
  nombreReports = 0,
  onUpdate,
  isReadOnly,
}) => {
  const [isEditingDist, setIsEditingDist] = useState(false);
  const isCompleted = distributionStatus
    ? distributionStatus === 'REALISEE'
    : tache.statut === 'TERMINEE';
  const hasEquipe =
    (tache.equipes_detail && tache.equipes_detail.length > 0) || tache.equipe_detail;
  const _isDistributionDisabled = isReadOnly || tache.statut === 'TERMINEE' || !hasEquipe;
  void _isDistributionDisabled;

  // Vérifier les actions autorisées selon le statut actuel
  const canDemarrer =
    distributionStatus &&
    ALLOWED_DISTRIBUTION_TRANSITIONS[distributionStatus]?.includes('EN_COURS');
  const canTerminer = distributionStatus === 'EN_COURS';
  const canReporter =
    distributionStatus &&
    ALLOWED_DISTRIBUTION_TRANSITIONS[distributionStatus]?.includes('REPORTEE');
  const canAnnuler =
    distributionStatus && ALLOWED_DISTRIBUTION_TRANSITIONS[distributionStatus]?.includes('ANNULEE');
  const canRestaurer = distributionStatus === 'ANNULEE';
  const hasHistorique = nombreReports > 0;

  // Handle escape key to close popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <FloatingPortal>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[999] animate-in fade-in duration-200"
        onClick={onClose}
      />
      {/* Centered Modal */}
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-[550px] max-w-full min-h-[400px] bg-white rounded-xl shadow-2xl border border-gray-100 animate-popover flex flex-col overflow-hidden pointer-events-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Actions */}
          <div className="flex justify-between items-center px-4 py-2 bg-white border-b border-gray-50">
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {!isReadOnly && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (distributionId) {
                      setIsEditingDist(!isEditingDist);
                    } else {
                      onEdit();
                    }
                  }}
                  className={`p-2 rounded-full transition-colors ${isEditingDist ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}
                  title="Modifier"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Hero Content */}
          <div className="p-8">
            <div className="flex items-start gap-5">
              {/* Status indicator */}
              {distributionId && (
                <div
                  className={`
                                    mt-1.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0
                                    ${
                                      isCompleted
                                        ? 'bg-emerald-100 text-emerald-600'
                                        : distributionStatus === 'EN_COURS'
                                          ? 'bg-orange-100 text-orange-600'
                                          : distributionStatus === 'ANNULEE'
                                            ? 'bg-red-100 text-red-600'
                                            : distributionStatus === 'REPORTEE'
                                              ? 'bg-purple-100 text-purple-600'
                                              : 'bg-blue-100 text-blue-600'
                                    }
                                `}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : distributionStatus === 'EN_COURS' ? (
                    <Clock className="w-5 h-5" />
                  ) : distributionStatus === 'ANNULEE' ? (
                    <XCircle className="w-5 h-5" />
                  ) : distributionStatus === 'REPORTEE' ? (
                    <CalendarClock className="w-5 h-5" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                </div>
              )}

              <div className="flex-1">
                {/* Type Label & Reference */}
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`text-[11px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${distributionId ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {distributionId ? 'Distribution de la tâche' : 'Tâche'}
                  </span>
                  {tache.reference && (
                    <span className="text-sm font-mono text-slate-500">{tache.reference}</span>
                  )}
                </div>

                {/* Task Title */}
                <h2
                  className={`text-2xl font-medium mb-4 ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}
                >
                  {tache.type_tache_detail.nom_tache}
                </h2>

                {/* Status & Priority Badges */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {/* Statut de la tâche */}
                  <StatusBadge
                    status={tache.statut}
                    labels={STATUT_TACHE_LABELS}
                    colors={STATUT_TACHE_COLORS}
                  />

                  {/* Statut de la distribution (si applicable) */}
                  {distributionStatus && (
                    <StatusBadge
                      status={distributionStatus}
                      labels={STATUS_DISTRIBUTION_LABELS}
                      colors={STATUS_DISTRIBUTION_COLORS}
                    />
                  )}

                  {/* Priorité */}
                  {tache.priorite >= 4 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      {PRIORITE_LABELS[tache.priorite]}
                    </span>
                  )}
                </div>

                {/* Time & Date */}
                {eventStart && eventEnd && (
                  <div className="flex items-center gap-2 text-gray-600 mb-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      {format(eventStart, 'EEEE d MMMM', { locale: fr })} &bull;{' '}
                      {format(eventStart, 'HH:mm')} - {format(eventEnd, 'HH:mm')}
                    </span>
                  </div>
                )}

                {/* Équipes */}
                {hasEquipe && (
                  <div className="flex items-center gap-2 text-gray-600 mb-3">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      {tache.equipes_detail?.length > 0
                        ? formatEquipesList(tache.equipes_detail, '')
                        : getEquipeName(tache.equipe_detail, '')}
                    </span>
                  </div>
                )}

                {/* Site */}
                {tache.site_nom && (
                  <div className="flex items-center gap-2 text-gray-600 mb-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{tache.site_nom}</span>
                  </div>
                )}

                {/* Dates planifiées */}
                <div className="flex items-center gap-2 text-gray-600 mb-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">
                    Du {format(new Date(tache.date_debut_planifiee), 'd MMM yyyy', { locale: fr })}{' '}
                    au {format(new Date(tache.date_fin_planifiee), 'd MMM yyyy', { locale: fr })}
                  </span>
                </div>

                {/* Charge estimée */}
                {tache.charge_estimee_heures && (
                  <div className="flex items-center gap-2 text-gray-600 mb-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">Charge estimée: {tache.charge_estimee_heures}h</span>
                  </div>
                )}

                {/* Nombre de reports */}
                {hasHistorique && (
                  <div className="flex items-center gap-2 text-gray-600 mb-3">
                    <History className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-purple-600 font-medium">
                      {nombreReports} report{nombreReports > 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* Actions de distribution */}
                {distributionId && !isReadOnly && tache.statut !== 'TERMINEE' && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                    {/* Badge "Sans équipe" */}
                    {!hasEquipe && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-300 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        Sans équipe
                      </span>
                    )}

                    {/* Démarrer */}
                    {canDemarrer && onDemarrer && (
                      <button
                        onClick={!hasEquipe ? undefined : onDemarrer}
                        disabled={isActionLoading || !hasEquipe}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                          !hasEquipe
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'text-white bg-orange-500 hover:bg-orange-600'
                        }`}
                        title={!hasEquipe ? "Assignez d'abord une équipe à la tâche" : 'Démarrer'}
                      >
                        <Play className="w-4 h-4" />
                        Démarrer
                      </button>
                    )}

                    {/* Terminer */}
                    {canTerminer && onTerminer && (
                      <button
                        onClick={!hasEquipe ? undefined : onTerminer}
                        disabled={isActionLoading || !hasEquipe}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                          !hasEquipe
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'text-white bg-green-500 hover:bg-green-600'
                        }`}
                        title={!hasEquipe ? "Assignez d'abord une équipe à la tâche" : 'Terminer'}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Terminer
                      </button>
                    )}

                    {/* Reporter */}
                    {canReporter && onReporter && (
                      <button
                        onClick={!hasEquipe ? undefined : onReporter}
                        disabled={isActionLoading || !hasEquipe}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                          !hasEquipe
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'text-purple-700 bg-purple-100 hover:bg-purple-200'
                        }`}
                        title={!hasEquipe ? "Assignez d'abord une équipe à la tâche" : 'Reporter'}
                      >
                        <CalendarClock className="w-4 h-4" />
                        Reporter
                      </button>
                    )}

                    {/* Annuler */}
                    {canAnnuler && onAnnuler && (
                      <button
                        onClick={!hasEquipe ? undefined : onAnnuler}
                        disabled={isActionLoading || !hasEquipe}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                          !hasEquipe
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'text-red-700 bg-red-100 hover:bg-red-200'
                        }`}
                        title={!hasEquipe ? "Assignez d'abord une équipe à la tâche" : 'Annuler'}
                      >
                        <XCircle className="w-4 h-4" />
                        Annuler
                      </button>
                    )}

                    {/* Restaurer */}
                    {canRestaurer && onRestaurer && (
                      <button
                        onClick={!hasEquipe ? undefined : onRestaurer}
                        disabled={isActionLoading || !hasEquipe}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                          !hasEquipe
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                        }`}
                        title={!hasEquipe ? "Assignez d'abord une équipe à la tâche" : 'Restaurer'}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restaurer
                      </button>
                    )}

                    {/* Historique - toujours actif (lecture seule) */}
                    {hasHistorique && onHistorique && (
                      <button
                        onClick={onHistorique}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <History className="w-4 h-4" />
                        Historique
                      </button>
                    )}
                  </div>
                )}

                {/* Distribution Edit Form */}
                {isEditingDist && distributionId && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <DistributionEditForm
                      distributionId={distributionId}
                      tacheId={tache.id}
                      eventStart={eventStart ?? new Date()}
                      eventEnd={eventEnd ?? new Date()}
                      isExternalEditing={true}
                      onSuccess={() => {
                        setIsEditingDist(false);
                        onUpdate?.();
                      }}
                      onClose={() => setIsEditingDist(false)}
                    />
                  </div>
                )}

                {/* Commentaires */}
                {tache.commentaires && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Commentaires
                    </h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {tache.commentaires}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </FloatingPortal>
  );
};

export default TaskDetailPopover;
