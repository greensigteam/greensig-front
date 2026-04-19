import React, { FC } from 'react';
import { format, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  Tache,
  STATUT_TACHE_LABELS,
  STATUT_TACHE_COLORS,
  PRIORITE_LABELS,
} from '../../types/planning';
import { StatusBadge } from '../StatusBadge';
import { getEquipeName, formatEquipesList } from '../../utils/equipeHelpers';

// ============================================================================
// TYPES
// ============================================================================

interface PlanningListViewProps {
  tasksByDate: { [key: string]: Tache[] };
  onTaskClick: (tache: Tache, dateKey: string, e: React.MouseEvent) => void;
  isReadOnly: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PlanningListView: FC<PlanningListViewProps> = ({
  tasksByDate,
  onTaskClick,
  isReadOnly,
}) => {
  if (Object.keys(tasksByDate).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
        <p>Aucune tâche planifiée.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 overflow-y-auto h-full bg-white">
      {Object.entries(tasksByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, dayTasks]) => {
          const date = new Date(dateKey);
          const isTodayDate = isToday(date);

          return (
            <div key={dateKey} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Date Header */}
              <div className="flex items-baseline gap-3 mb-4 sticky top-0 bg-white/95 backdrop-blur-sm py-2 z-10 border-b border-gray-100">
                <span
                  className={`text-2xl font-semibold ${isTodayDate ? 'text-emerald-600' : 'text-gray-800'}`}
                >
                  {format(date, 'd')}
                </span>
                <div className="flex flex-col">
                  <span
                    className={`text-sm font-medium uppercase tracking-wide ${isTodayDate ? 'text-emerald-600' : 'text-gray-500'}`}
                  >
                    {format(date, 'EEEE', { locale: fr })}
                  </span>
                  <span className="text-xs text-gray-400">
                    {format(date, 'MMMM yyyy', { locale: fr })}
                  </span>
                </div>
                {isTodayDate && (
                  <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Aujourd'hui
                  </span>
                )}
              </div>

              {/* Tasks Grid */}
              <div className="grid grid-cols-1 gap-3 pl-4 md:pl-10 border-l-2 border-gray-100">
                {dayTasks.map((tache) => (
                  <TaskListItem
                    key={`${tache.id}-${dateKey}`}
                    tache={tache}
                    dateKey={dateKey}
                    onClick={(e) => onTaskClick(tache, dateKey, e)}
                    isReadOnly={isReadOnly}
                  />
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
};

// ============================================================================
// TASK LIST ITEM COMPONENT
// ============================================================================

interface TaskListItemProps {
  tache: Tache;
  dateKey: string;
  onClick: (e: React.MouseEvent) => void;
  isReadOnly: boolean;
}

const TaskListItem: FC<TaskListItemProps> = ({
  tache,
  dateKey,
  onClick,
  isReadOnly: _isReadOnly,
}) => {
  const equipesNames =
    tache.equipes_detail?.length > 0
      ? formatEquipesList(tache.equipes_detail, '')
      : getEquipeName(tache.equipe_detail, '');
  const hasEquipe = tache.equipes_detail?.length > 0 || tache.equipe_detail;

  // Find distribution for this date
  const distribution = tache.distributions_charge?.find((d) => d.date === dateKey);
  const heureDebut = distribution?.heure_debut || '08:00';
  const heureFin = distribution?.heure_fin || '17:00';
  const isCompleted = distribution
    ? distribution.status === 'REALISEE'
    : tache.statut === 'TERMINEE';
  const isUrgent = tache.priorite >= 4;

  return (
    <div
      onClick={onClick}
      className={`
                group relative p-4 bg-white rounded-xl border-2 transition-all duration-200 cursor-pointer
                ${
                  isCompleted
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-gray-100 hover:border-emerald-200 hover:shadow-md'
                }
                ${isUrgent && !isCompleted ? 'border-l-4 border-l-red-500' : ''}
            `}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox indicator */}
        <div
          className={`
                        mt-1 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                        ${
                          isCompleted
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-gray-300 group-hover:border-emerald-500'
                        }
                    `}
        >
          {isCompleted && <CheckCircle2 className="w-3 h-3" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3
              className={`text-base font-medium ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}
            >
              {tache.type_tache_detail.nom_tache}
            </h3>
            <StatusBadge
              status={tache.statut}
              labels={STATUT_TACHE_LABELS}
              colors={STATUT_TACHE_COLORS}
            />
          </div>

          {/* Reference */}
          {tache.reference && (
            <p className="text-xs text-gray-400 font-mono mb-2">{tache.reference}</p>
          )}

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {/* Time */}
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>
                {heureDebut.slice(0, 5)} - {heureFin.slice(0, 5)}
              </span>
            </div>

            {/* Team */}
            {hasEquipe && (
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="truncate max-w-[150px]">{equipesNames}</span>
              </div>
            )}

            {/* Site */}
            {tache.site_nom && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="truncate max-w-[150px]">{tache.site_nom}</span>
              </div>
            )}

            {/* Priority */}
            {isUrgent && (
              <div className="flex items-center gap-1.5 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">{PRIORITE_LABELS[tache.priorite]}</span>
              </div>
            )}
          </div>

          {/* Charge */}
          {tache.charge_estimee_heures && (
            <div className="mt-2 text-xs text-gray-400">
              Charge estimée: {tache.charge_estimee_heures}h
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanningListView;
