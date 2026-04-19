import { memo } from 'react';
import { format } from 'date-fns';
import { Clock, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { Tache, type StatusDistribution } from '../../types/planning';
import { getEquipeName } from '../../utils/equipeHelpers';

// ============================================================================
// TYPES
// ============================================================================

export interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: Tache;
  distributionStatus?: StatusDistribution;
  distributionId?: number;
}

interface TaskEventProps {
  event: CalendarEvent;
  title?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const TaskEvent = memo(function TaskEvent({ event }: TaskEventProps) {
  const tache = event.resource;
  const isCompleted = event.distributionStatus
    ? event.distributionStatus === 'REALISEE'
    : tache.statut === 'TERMINEE';
  const isDistributionRealisee = event.distributionStatus === 'REALISEE';
  const isUrgent = tache.priorite === 5;

  const hasDistributions = tache.distributions_charge && tache.distributions_charge.length > 0;
  const isDistribution = event.distributionId !== undefined;
  const distributionCount = tache.distributions_charge?.length || 0;

  return (
    <div
      className={`
                task-event-root group flex items-start gap-2 p-1.5 rounded-lg transition-all duration-200
                border-l-4 relative h-full
                ${isCompleted ? 'opacity-60' : 'hover:bg-gray-50'}
                ${isDistributionRealisee ? 'bg-green-50 border-green-500 shadow-sm' : ''}
                ${
                  isDistribution && !isDistributionRealisee
                    ? 'border-gray-400 border-dashed bg-white'
                    : !isDistribution
                      ? 'border-gray-400 bg-gradient-to-r from-gray-50 to-transparent'
                      : ''
                }
                ${tache.charge_estimee_heures ? 'min-h-[28px]' : ''}
            `}
      style={{ pointerEvents: 'all' }}
    >
      {/* Glyphe (Checkbox) */}
      <div
        className={`
                    mt-0.5 shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors
                    ${
                      isCompleted
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : `bg-white border-gray-400 group-hover:border-emerald-500 ${isUrgent ? 'border-red-400' : ''}`
                    }
                `}
      >
        {isCompleted && <CheckCircle2 className="w-3 h-3" />}
      </div>

      {/* Contenu Texte */}
      <div className="task-event-content flex flex-col leading-tight min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {/* Icône distinctive */}
          {isDistribution ? (
            <Clock className="w-3 h-3 text-blue-600 shrink-0" />
          ) : (
            <CalendarIcon className="w-3 h-3 text-gray-500 shrink-0" />
          )}

          <span
            className={`
                            text-xs font-medium truncate
                            ${isCompleted ? 'line-through text-gray-500' : 'text-gray-700'}
                            ${isUrgent && !isCompleted ? 'text-red-700 font-semibold' : ''}
                        `}
          >
            {tache.type_tache_detail.nom_tache}
          </span>

          {/* Badge de comptage pour les tâches avec plusieurs distributions */}
          {hasDistributions && !isDistribution && distributionCount > 1 && (
            <span className="shrink-0 text-[9px] px-1.5 py-0.5 bg-blue-500 text-white rounded-full font-semibold">
              {distributionCount}j
            </span>
          )}
        </div>

        {/* Métadonnées (Heure si pas all-day, ou équipe) */}
        {!isCompleted && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-400 font-medium">
              {format(event.start, 'HH:mm')}
            </span>
            {tache.equipes_detail?.length > 0 && (
              <span className="text-[9px] px-1 py-0.5 bg-gray-100 rounded text-gray-500 truncate max-w-[80px]">
                {tache.equipes_detail.length > 1
                  ? `${tache.equipes_detail.length} éq.`
                  : getEquipeName(tache.equipes_detail[0], '')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default TaskEvent;
