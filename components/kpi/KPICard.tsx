import React from 'react';
import { Target, TrendingUp, TrendingDown, Minus, AlertTriangle, ExternalLink } from 'lucide-react';
import { KPIDetails, KPIEvolution, COLORS } from '../../hooks/useKPIData';

interface TrendIconProps {
    tendance: 'hausse' | 'baisse' | 'stable';
    isGoodWhenUp?: boolean;
}

export const TrendIcon: React.FC<TrendIconProps> = ({ tendance, isGoodWhenUp = true }) => {
    const isPositive = (tendance === 'hausse' && isGoodWhenUp) || (tendance === 'baisse' && !isGoodWhenUp);

    if (tendance === 'stable') {
        return <Minus className="w-4 h-4 text-slate-400" />;
    }

    return isPositive
        ? <TrendingUp className="w-4 h-4 text-emerald-500" />
        : <TrendingDown className="w-4 h-4 text-red-500" />;
};

interface KPICardProps {
    title: string;
    kpi: KPIDetails;
    evolution?: KPIEvolution;
    color: string;
    isGoodWhenUp?: boolean;
    onClick?: () => void;
    kpiKey?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
    title,
    kpi,
    evolution,
    color,
    isGoodWhenUp = true,
    onClick,
    kpiKey
}) => {
    const hasObjectif = kpi.objectif !== null;
    const progressPct = hasObjectif ? Math.min((kpi.valeur / kpi.objectif!) * 100, 100) : 0;

    return (
        <div
            className={`bg-white p-6 rounded-xl border border-slate-100 shadow-sm transition-all duration-200 ${
                onClick ? 'cursor-pointer hover:shadow-md hover:border-emerald-200 hover:scale-[1.02] group' : ''
            }`}
            onClick={onClick}
            title={onClick ? 'Cliquer pour voir l\'historique détaillé' : undefined}
        >
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-sm font-medium text-slate-500">{title}</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-bold text-slate-800">
                            {kpi.valeur}
                        </span>
                        <span className="text-lg text-slate-500">{kpi.unite}</span>
                    </div>
                </div>
                <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: color + '20' }}
                >
                    <Target className="w-6 h-6" style={{ color }} />
                </div>
            </div>

            {/* Progress bar to objective */}
            {hasObjectif && (
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Objectif: {kpi.objectif}{kpi.unite}</span>
                        <span className={kpi.objectif_atteint ? 'text-emerald-600 font-medium' : 'text-slate-600'}>
                            {kpi.objectif_atteint ? 'Atteint' : `${Math.round(progressPct)}%`}
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                                width: `${progressPct}%`,
                                backgroundColor: kpi.objectif_atteint ? COLORS.success : color
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Alert */}
            {kpi.alerte && (
                <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-xs text-red-700">{kpi.message_alerte}</span>
                </div>
            )}

            {/* Evolution */}
            {evolution && (
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <TrendIcon tendance={evolution.tendance} isGoodWhenUp={isGoodWhenUp} />
                    <span className={`text-sm ${evolution.tendance === 'stable' ? 'text-slate-500' :
                        (evolution.tendance === 'hausse' && isGoodWhenUp) || (evolution.tendance === 'baisse' && !isGoodWhenUp)
                            ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                        {evolution.variation >= 0 ? '+' : ''}{evolution.variation} ({evolution.variation_pct}%)
                    </span>
                    <span className="text-xs text-slate-400">vs mois précédent</span>
                    {onClick && (
                        <ExternalLink className="w-4 h-4 text-slate-300 ml-auto group-hover:text-emerald-500 transition-colors" />
                    )}
                </div>
            )}

            {/* Click indicator when no evolution */}
            {!evolution && onClick && (
                <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400 group-hover:text-emerald-500 transition-colors flex items-center gap-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Voir détails
                    </span>
                </div>
            )}
        </div>
    );
};

interface DetailCardProps {
    title: string;
    children: React.ReactNode;
}

export const DetailCard: React.FC<DetailCardProps> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-5 h-5 text-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
            </div>
            {title}
        </h3>
        {children}
    </div>
);

export default KPICard;
