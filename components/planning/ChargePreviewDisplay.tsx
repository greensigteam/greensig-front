import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Gauge, ExternalLink, Sparkles } from 'lucide-react';
import type { ChargePreview } from '../../hooks/useChargePreview';

interface ChargePreviewDisplayProps {
  chargePreview: ChargePreview | null;
  loadingRatios: boolean;
  ratiosCount: number;
  variant?: 'card' | 'section';
}

const ChargePreviewDisplay: FC<ChargePreviewDisplayProps> = ({
  chargePreview,
  loadingRatios,
  ratiosCount,
  variant = 'section',
}) => {
  const isCard = variant === 'card';

  const content = loadingRatios ? (
    <div
      className={`${isCard ? 'bg-white' : 'bg-slate-50'} p-3 rounded-lg text-center text-sm ${isCard ? 'text-gray-500' : 'text-slate-500'}`}
    >
      Chargement des ratios...
    </div>
  ) : chargePreview ? (
    <div
      className={`${isCard ? 'bg-white rounded-lg p-3 border border-blue-100' : 'bg-blue-50 border border-blue-200 rounded-lg p-3'} space-y-2`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-blue-800">
          {isCard ? 'Charge totale' : 'Charge estimée totale'}
        </span>
        <span className="text-lg font-bold text-blue-700">
          {chargePreview.totalHeures > 0 ? `${chargePreview.totalHeures}h` : '—'}
        </span>
      </div>

      {chargePreview.details.length > 0 && (
        <div className="border-t border-blue-200 pt-2 space-y-1">
          {chargePreview.details.map((detail, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-blue-700">
                {detail.count}x {detail.type}
                {detail.superficie && (
                  <span className="font-semibold text-blue-800">
                    {' '}
                    ({detail.superficie.toFixed(0)}m²)
                  </span>
                )}
              </span>
              {detail.ratio ? (
                <span className="text-blue-600">
                  {detail.ratio.ratio}{' '}
                  {detail.ratio.unite_mesure === 'm2'
                    ? 'm²'
                    : detail.ratio.unite_mesure === 'ml'
                      ? 'ml'
                      : 'unités'}
                  /h → <strong>{Math.round(detail.heures * 100) / 100}h</strong>
                </span>
              ) : (
                <span className="text-amber-600 italic">Ratio non configuré</span>
              )}
            </div>
          ))}
        </div>
      )}

      {chargePreview.hasUnconfiguredTypes && (
        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded mt-2">
          Certains types d'objets n'ont pas de ratio configuré pour ce type de tâche.
          {!isCard && (
            <Link to="/parametres?tab=ratios" target="_blank" className="underline ml-1">
              Configurer les ratios
            </Link>
          )}
        </p>
      )}
    </div>
  ) : (
    <div
      className={`${isCard ? 'bg-white' : 'bg-slate-50'} p-3 rounded-lg text-center text-sm ${isCard ? 'text-gray-500' : 'text-slate-500'}`}
    >
      {ratiosCount === 0 ? (
        isCard ? (
          'Aucun ratio configuré'
        ) : (
          <span>
            Aucun ratio configuré.{' '}
            <Link
              to="/parametres?tab=ratios"
              target="_blank"
              className="text-emerald-600 underline"
            >
              Configurer les ratios
            </Link>
          </span>
        )
      ) : (
        "Sélectionnez un type de tâche et des objets pour voir l'aperçu"
      )}
    </div>
  );

  if (isCard) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-gray-900">Charge estimée</h4>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          Aperçu de la charge estimée
        </label>
        <Link
          to="/parametres?tab=ratios"
          target="_blank"
          className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
        >
          <Gauge className="w-3 h-3" />
          Configurer les ratios
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
      {content}
    </div>
  );
};

export default ChargePreviewDisplay;
