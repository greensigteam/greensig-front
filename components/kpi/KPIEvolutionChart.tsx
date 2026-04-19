import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { KPIHistoriqueData } from '../../types/kpi';

interface KPIEvolutionChartProps {
  data: KPIHistoriqueData;
}

type ChartMode = 'line' | 'bar';

const KPI_CONFIGS = [
  { key: 'respect_planning', label: 'Respect planning', color: '#059669', seuil: 95 },
  { key: 'qualite_service', label: 'Qualité service', color: '#3b82f6', seuil: 95 },
  {
    key: 'taux_traitement_reclamations',
    label: 'Traitement réclamations',
    color: '#f59e0b',
    seuil: 80,
  },
  { key: 'temps_moyen_traitement', label: 'Temps traitement (h)', color: '#8b5cf6', seuil: null },
  { key: 'temps_total_heures', label: 'Heures totales', color: '#ec4899', seuil: null },
] as const;

// Custom tooltip component
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 px-4 py-3 min-w-[180px]">
      <p className="text-xs font-semibold text-slate-600 mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-slate-600">{entry.name}</span>
            </div>
            <span className="text-xs font-bold text-slate-800">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KPIEvolutionChart({ data }: KPIEvolutionChartProps) {
  const [chartMode, setChartMode] = useState<ChartMode>('line');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(
    new Set(['respect_planning', 'qualite_service', 'taux_traitement_reclamations']),
  );

  const toggleKey = (key: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const chartData = data.historique.map((entry) => ({
    ...entry,
    name: entry.mois_label,
  }));

  // Determine if we need dual axis (hours vs percentage)
  const hasPercentage = [
    'respect_planning',
    'qualite_service',
    'taux_traitement_reclamations',
  ].some((k) => visibleKeys.has(k));
  const hasHours = ['temps_moyen_traitement', 'temps_total_heures'].some((k) => visibleKeys.has(k));

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Évolution sur {data.nb_mois} mois</h3>
            <p className="text-xs text-slate-400">Tendances des indicateurs principaux</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setChartMode('line')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              chartMode === 'line'
                ? 'bg-white shadow text-slate-800'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Courbe
          </button>
          <button
            onClick={() => setChartMode('bar')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              chartMode === 'bar'
                ? 'bg-white shadow text-slate-800'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Barres
          </button>
        </div>
      </div>

      {/* Toggle buttons — enhanced pills */}
      <div className="flex flex-wrap gap-2 mb-4 mt-4">
        {KPI_CONFIGS.map((cfg) => {
          const isActive = visibleKeys.has(cfg.key);
          return (
            <button
              key={cfg.key}
              onClick={() => toggleKey(cfg.key)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                isActive
                  ? 'border-transparent text-white'
                  : 'border-slate-200 text-slate-400 bg-white hover:border-slate-300'
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: cfg.color,
                      boxShadow: `0 2px 8px ${cfg.color}40`,
                    }
                  : undefined
              }
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Chart — increased height */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {chartMode === 'line' ? (
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              {hasPercentage && (
                <YAxis yAxisId="percent" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              )}
              {hasHours && (
                <YAxis
                  yAxisId="hours"
                  orientation={hasPercentage ? 'right' : 'left'}
                  tick={{ fontSize: 11 }}
                  unit="h"
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {/* Seuils */}
              {visibleKeys.has('respect_planning') && (
                <ReferenceLine
                  yAxisId="percent"
                  y={95}
                  stroke="#059669"
                  strokeDasharray="5 5"
                  strokeOpacity={0.5}
                />
              )}
              {visibleKeys.has('qualite_service') && (
                <ReferenceLine
                  yAxisId="percent"
                  y={95}
                  stroke="#3b82f6"
                  strokeDasharray="5 5"
                  strokeOpacity={0.5}
                />
              )}
              {/* Lines */}
              {KPI_CONFIGS.filter((c) => visibleKeys.has(c.key)).map((cfg) => {
                const yId = ['temps_moyen_traitement', 'temps_total_heures'].includes(cfg.key)
                  ? 'hours'
                  : 'percent';
                return (
                  <Line
                    key={cfg.key}
                    yAxisId={yId}
                    type="monotone"
                    dataKey={cfg.key}
                    name={cfg.label}
                    stroke={cfg.color}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              {hasPercentage && (
                <YAxis yAxisId="percent" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              )}
              {hasHours && (
                <YAxis
                  yAxisId="hours"
                  orientation={hasPercentage ? 'right' : 'left'}
                  tick={{ fontSize: 11 }}
                  unit="h"
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {KPI_CONFIGS.filter((c) => visibleKeys.has(c.key)).map((cfg) => {
                const yId = ['temps_moyen_traitement', 'temps_total_heures'].includes(cfg.key)
                  ? 'hours'
                  : 'percent';
                return (
                  <Bar
                    key={cfg.key}
                    yAxisId={yId}
                    dataKey={cfg.key}
                    name={cfg.label}
                    fill={cfg.color}
                    radius={[4, 4, 0, 0]}
                  />
                );
              })}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
