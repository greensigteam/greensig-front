import { FC, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    X, Trash2, Edit, Clock, AlertTriangle,
    CheckCircle2, MoreVertical, Users, Calendar, MapPin
} from 'lucide-react';
import { FloatingPortal } from '@floating-ui/react';
import {
    Tache,
    STATUT_TACHE_LABELS, STATUT_TACHE_COLORS,
    PRIORITE_LABELS,
    STATUS_DISTRIBUTION_LABELS, STATUS_DISTRIBUTION_COLORS,
    type StatusDistribution
} from '../../types/planning';
import { StatusBadge } from '../StatusBadge';
import { DistributionEditForm } from './DistributionEditForm';

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
    onToggleDistribution?: () => void;
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
    onToggleDistribution,
    onUpdate,
    isReadOnly
}) => {
    const [isEditingDist, setIsEditingDist] = useState(false);
    const isCompleted = distributionStatus ? distributionStatus === 'REALISEE' : tache.statut === 'TERMINEE';
    const hasEquipe = (tache.equipes_detail && tache.equipes_detail.length > 0) || tache.equipe_detail;
    const isDistributionDisabled = isReadOnly || tache.statut === 'TERMINEE' || !hasEquipe;

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
                        <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-1">
                            {!isReadOnly && (
                                <>
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
                                    <button onClick={onDelete} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" title="Supprimer">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Hero Content */}
                    <div className="p-8">
                        <div className="flex items-start gap-5">
                            {/* Big Checkbox */}
                            {onToggleDistribution && (
                                <button
                                    onClick={isDistributionDisabled ? undefined : onToggleDistribution}
                                    disabled={isDistributionDisabled}
                                    title={
                                        !hasEquipe
                                            ? 'Veuillez assigner une équipe avant de modifier les distributions'
                                            : tache.statut === 'TERMINEE'
                                                ? 'Les distributions ne peuvent pas être modifiées pour une tâche terminée'
                                                : distributionStatus === 'REALISEE'
                                                    ? 'Marquer cette journée comme non réalisée'
                                                    : 'Marquer cette journée comme réalisée'
                                    }
                                    className={`
                                        mt-1.5 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0
                                        ${isCompleted
                                            ? 'bg-emerald-600 border-emerald-600 text-white animate-check'
                                            : 'bg-white border-gray-400 hover:border-emerald-500 hover:bg-emerald-50'
                                        }
                                        ${isDistributionDisabled ? 'cursor-not-allowed opacity-60' : ''}
                                    `}
                                >
                                    {isCompleted && <CheckCircle2 className="w-5 h-5" />}
                                </button>
                            )}

                            <div className="flex-1">
                                {/* Type Label & Reference */}
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`text-[11px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${distributionId ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {distributionId ? 'Distribution de la tâche' : 'Tâche'}
                                    </span>
                                    {tache.reference && (
                                        <span className="text-sm font-mono text-slate-500">
                                            {tache.reference}
                                        </span>
                                    )}
                                </div>

                                {/* Task Title */}
                                <h2 className={`text-2xl font-medium mb-4 ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
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
                                            {format(eventStart, 'EEEE d MMMM', { locale: fr })} &bull; {format(eventStart, 'HH:mm')} - {format(eventEnd, 'HH:mm')}
                                        </span>
                                    </div>
                                )}

                                {/* Équipes */}
                                {hasEquipe && (
                                    <div className="flex items-center gap-2 text-gray-600 mb-3">
                                        <Users className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm">
                                            {tache.equipes_detail?.length > 0
                                                ? tache.equipes_detail.map(e => (e as any).nom_equipe || e.nomEquipe).join(', ')
                                                : (tache.equipe_detail as any)?.nom_equipe || tache.equipe_detail?.nomEquipe
                                            }
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
                                        Du {format(new Date(tache.date_debut_planifiee), 'd MMM yyyy', { locale: fr })} au {format(new Date(tache.date_fin_planifiee), 'd MMM yyyy', { locale: fr })}
                                    </span>
                                </div>

                                {/* Charge estimée */}
                                {tache.charge_estimee_heures && (
                                    <div className="flex items-center gap-2 text-gray-600 mb-3">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm">
                                            Charge estimée: {tache.charge_estimee_heures}h
                                        </span>
                                    </div>
                                )}

                                {/* Distribution Edit Form */}
                                {isEditingDist && distributionId && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <DistributionEditForm
                                            distributionId={distributionId}
                                            tacheId={tache.id}
                                            initialDate={eventStart ? format(eventStart, 'yyyy-MM-dd') : ''}
                                            initialStartTime={eventStart ? format(eventStart, 'HH:mm') : ''}
                                            initialEndTime={eventEnd ? format(eventEnd, 'HH:mm') : ''}
                                            onCancel={() => setIsEditingDist(false)}
                                            onSaved={() => {
                                                setIsEditingDist(false);
                                                onUpdate?.();
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Commentaires */}
                                {tache.commentaires && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Commentaires</h4>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{tache.commentaires}</p>
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
