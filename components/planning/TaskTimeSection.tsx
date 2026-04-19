import React from 'react';
import { format } from 'date-fns';
import { Clock, AlertTriangle } from 'lucide-react';
import { DistributionChargeData } from '../../types/planning';
import { PremiumInput } from '../modals/PremiumFormComponents';
import { DistributionChargeEditor } from './DistributionChargeEditor';

interface TaskTimeSectionProps {
  dateDebutPlanifiee: string;
  dateFinPlanifiee: string;
  startTime: string;
  endTime: string;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  distributionsCharge: DistributionChargeData[];
  onDistributionsChange: (distributions: DistributionChargeData[]) => void;
}

export const TaskTimeSection: React.FC<TaskTimeSectionProps> = ({
  dateDebutPlanifiee,
  dateFinPlanifiee,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  distributionsCharge,
  onDistributionsChange,
}) => {
  if (!dateDebutPlanifiee || !dateFinPlanifiee) return null;

  const startDate = new Date(dateDebutPlanifiee);
  const endDate = new Date(dateFinPlanifiee);
  const startDay = format(startDate, 'yyyy-MM-dd');
  const endDay = format(endDate, 'yyyy-MM-dd');
  const isSameDay = startDay === endDay;

  if (isSameDay) {
    const [startHour = 0, startMin = 0] = startTime.split(':').map(Number);
    const [endHour = 0, endMin = 0] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const duration = (endMinutes - startMinutes) / 60;

    return (
      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          Horaires de la journée
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <PremiumInput
            type="time"
            value={startTime}
            onChange={onStartTimeChange}
            label="Heure de début"
            icon={<Clock className="w-4 h-4" />}
            variant="outlined"
            size="md"
          />
          <PremiumInput
            type="time"
            value={endTime}
            onChange={onEndTimeChange}
            label="Heure de fin"
            icon={<Clock className="w-4 h-4" />}
            variant="outlined"
            size="md"
          />
        </div>
        {duration <= 0 ? (
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            L'heure de fin doit être après l'heure de début
          </p>
        ) : (
          <p className="text-xs text-slate-500 mt-2">
            Durée: <strong>{duration.toFixed(2)}h</strong>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="border-t pt-4">
      <DistributionChargeEditor
        dateDebut={startDate}
        dateFin={endDate}
        distributions={distributionsCharge}
        onChange={onDistributionsChange}
      />
    </div>
  );
};
