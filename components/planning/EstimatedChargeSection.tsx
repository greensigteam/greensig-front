import React from 'react';
import { Link } from 'react-router-dom';
import { Timer, RefreshCw } from 'lucide-react';
import { Tache, TacheCreate } from '../../types/planning';
import { PremiumInput } from '../modals/PremiumFormComponents';

interface EstimatedChargeSectionProps {
  tache: Tache;
  chargeManuelle: boolean;
  isResettingCharge: boolean;
  formData: TacheCreate;
  onChargeChange: (value: number | null) => void;
  onResetCharge?: (tacheId: number) => Promise<void>;
  onChargeManuelleChange: (value: boolean) => void;
  onResettingChange: (value: boolean) => void;
}

export const EstimatedChargeSection: React.FC<EstimatedChargeSectionProps> = ({
  tache,
  chargeManuelle,
  isResettingCharge,
  formData,
  onChargeChange,
  onResetCharge,
  onChargeManuelleChange,
  onResettingChange,
}) => (
  <div className="border-t pt-4">
    <div className="flex items-center justify-between mb-3">
      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
        <Timer className="w-4 h-4" />
        Charge estimée
        {chargeManuelle && (
          <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
            Manuelle
          </span>
        )}
      </label>
      {chargeManuelle && onResetCharge && (
        <button
          type="button"
          onClick={async () => {
            onResettingChange(true);
            try {
              await onResetCharge(tache.id);
              onChargeManuelleChange(false);
            } finally {
              onResettingChange(false);
            }
          }}
          disabled={isResettingCharge}
          className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isResettingCharge ? 'animate-spin' : ''}`} />
          Recalculer auto
        </button>
      )}
    </div>
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <PremiumInput
          type="number"
          value={formData.charge_estimee_heures?.toString() ?? ''}
          onChange={(value) => {
            const val = value ? parseFloat(value) : null;
            onChargeChange(val);
            if (val !== null) onChargeManuelleChange(true);
          }}
          placeholder="Auto"
          icon={<Timer className="w-4 h-4" />}
          hint="heures"
          variant="outlined"
          size="md"
        />
      </div>
      {!chargeManuelle && tache.charge_estimee_heures !== null && (
        <span className="text-sm text-slate-500 whitespace-nowrap">
          Calculé: {tache.charge_estimee_heures}h
        </span>
      )}
    </div>
    <p className="text-xs text-slate-400 mt-1">
      {chargeManuelle ? (
        'Valeur saisie manuellement. Cliquez sur "Recalculer auto" pour revenir au calcul automatique.'
      ) : (
        <>
          Calculée automatiquement selon les objets liés et les{' '}
          <Link
            to="/parametres?tab=ratios"
            target="_blank"
            className="text-emerald-600 hover:underline"
          >
            ratios de productivité
          </Link>
          .
        </>
      )}
    </p>
  </div>
);
