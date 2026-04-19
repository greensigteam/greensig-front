import React from 'react';
import { BarChart3, Trees, Droplet, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { VEG_LEGEND, HYDRO_LEGEND } from '../../constants';

const STATE_COLORS: Record<string, string> = {
  bon: '#22c55e',
  moyen: '#eab308',
  mauvais: '#f97316',
  critique: '#ef4444',
};

const TYPE_COLORS: Record<string, string> = {
  arbres: VEG_LEGEND.find((l) => l.type === 'Arbre')?.color || '#22c55e',
  gazons: VEG_LEGEND.find((l) => l.type === 'Gazon')?.color || '#84cc16',
  palmiers: VEG_LEGEND.find((l) => l.type === 'Palmier')?.color || '#16a34a',
  arbustes: VEG_LEGEND.find((l) => l.type === 'Arbuste')?.color || '#65a30d',
  vivaces: VEG_LEGEND.find((l) => l.type === 'Vivace')?.color || '#a3e635',
  cactus: VEG_LEGEND.find((l) => l.type === 'Cactus')?.color || '#4d7c0f',
  graminees: VEG_LEGEND.find((l) => l.type === 'Graminee')?.color || '#bef264',
  puits: HYDRO_LEGEND.find((l) => l.type === 'Puit')?.color || '#0ea5e9',
  pompes: HYDRO_LEGEND.find((l) => l.type === 'Pompe')?.color || '#06b6d4',
  vannes: HYDRO_LEGEND.find((l) => l.type === 'Vanne')?.color || '#14b8a6',
  clapets: HYDRO_LEGEND.find((l) => l.type === 'Clapet')?.color || '#0891b2',
  canalisations: HYDRO_LEGEND.find((l) => l.type === 'Canalisation')?.color || '#0284c7',
  aspersions: HYDRO_LEGEND.find((l) => l.type === 'Aspersion')?.color || '#38bdf8',
  gouttes: HYDRO_LEGEND.find((l) => l.type === 'Goutte')?.color || '#7dd3fc',
  ballons: HYDRO_LEGEND.find((l) => l.type === 'Ballon')?.color || '#0369a1',
};

interface SiteStatistics {
  total_objects: number;
  vegetation: {
    total: number;
    by_type: Record<string, number>;
    by_state: Record<string, number>;
    by_family: Array<{ famille: string; count: number }>;
  };
  hydraulique: {
    total: number;
    by_type: Record<string, number>;
    by_state: Record<string, number>;
  };
  interventions: {
    never_intervened: number;
    urgent_maintenance: number;
    last_30_days: number;
  };
}

interface SiteStatisticsTabProps {
  statistics: SiteStatistics | null;
  isLoading: boolean;
}

function StateLegend({ byState }: { byState: Record<string, number> }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {Object.entries(byState).map(([state, count]) => (
        <div key={state} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: STATE_COLORS[state] }}
          ></span>
          <span className="text-sm text-slate-600 capitalize">{state}:</span>
          <span className="text-sm font-semibold">{count as number}</span>
        </div>
      ))}
    </div>
  );
}

function StatePieChart({
  title,
  icon,
  byState,
}: {
  title: string;
  icon: React.ReactNode;
  byState: Record<string, number>;
}) {
  const hasData = Object.values(byState).some((v) => (v as number) > 0);
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <div className="h-64">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={Object.entries(byState)
                  .map(([state, count]) => ({ name: state, value: count as number }))
                  .filter((item) => item.value > 0)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {Object.entries(byState)
                  .filter(([, count]) => (count as number) > 0)
                  .map(([state]) => (
                    <Cell key={`cell-${state}`} fill={STATE_COLORS[state] || '#gray'} />
                  ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            Aucune donnée
          </div>
        )}
      </div>
      <StateLegend byState={byState} />
    </div>
  );
}

function TypeBarChart({
  title,
  icon,
  byType,
  defaultColor,
}: {
  title: string;
  icon: React.ReactNode;
  byType: Record<string, number>;
  defaultColor: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={Object.entries(byType)
              .map(([type, count]) => ({ name: type, value: count as number }))
              .filter((item) => item.value > 0)}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" name="Quantité" radius={[0, 4, 4, 0]}>
              {Object.entries(byType)
                .filter(([, count]) => (count as number) > 0)
                .map(([typeName], index) => (
                  <Cell key={`cell-${index}`} fill={TYPE_COLORS[typeName] || defaultColor} />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const SiteStatisticsTab: React.FC<SiteStatisticsTabProps> = ({ statistics, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-2/3 mb-3"></div>
              <div className="h-8 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm animate-pulse"
            >
              <div className="h-5 bg-slate-200 rounded w-1/3 mb-4"></div>
              <div className="h-64 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
        <BarChart3 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">Aucune statistique disponible</h3>
        <p className="text-slate-500">
          Les statistiques de ce site ne sont pas encore disponibles.
        </p>
      </div>
    );
  }

  const interventionPieData = [
    {
      name: 'Jamais intervenu',
      value: statistics.interventions.never_intervened,
      color: '#9ca3af',
    },
    {
      name: 'Maintenance urgente',
      value: statistics.interventions.urgent_maintenance,
      color: '#f97316',
    },
    { name: '30 derniers jours', value: statistics.interventions.last_30_days, color: '#22c55e' },
  ].filter((item) => item.value > 0);

  const hasInterventionData = interventionPieData.length > 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Objets',
            value: statistics.total_objects,
            icon: <BarChart3 className="w-5 h-5 text-emerald-600" />,
            bg: 'bg-emerald-50',
          },
          {
            label: 'Végétation',
            value: statistics.vegetation.total,
            icon: <Trees className="w-5 h-5 text-green-600" />,
            bg: 'bg-green-50',
          },
          {
            label: 'Hydraulique',
            value: statistics.hydraulique.total,
            icon: <Droplet className="w-5 h-5 text-blue-600" />,
            bg: 'bg-blue-50',
          },
          {
            label: 'Maintenance Urgente',
            value: statistics.interventions.urgent_maintenance,
            icon: <TrendingUp className="w-5 h-5 text-orange-600" />,
            bg: 'bg-orange-50',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="text-sm font-medium text-slate-500 mb-1">{kpi.label}</div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-slate-800">{kpi.value}</div>
            </div>
            <div className={`absolute top-4 right-4 p-2 ${kpi.bg} rounded-lg`}>{kpi.icon}</div>
          </div>
        ))}
      </div>

      {/* Bar Charts for Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TypeBarChart
          title="Végétation par Type"
          icon={<Trees className="w-5 h-5 text-green-600" />}
          byType={statistics.vegetation.by_type}
          defaultColor="#22c55e"
        />
        <TypeBarChart
          title="Hydraulique par Type"
          icon={<Droplet className="w-5 h-5 text-blue-600" />}
          byType={statistics.hydraulique.by_type}
          defaultColor="#3b82f6"
        />
      </div>

      {/* Pie Charts for State Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatePieChart
          title="État Végétation"
          icon={<Trees className="w-5 h-5 text-green-600" />}
          byState={statistics.vegetation.by_state}
        />
        <StatePieChart
          title="État Hydraulique"
          icon={<Droplet className="w-5 h-5 text-blue-600" />}
          byState={statistics.hydraulique.by_state}
        />
      </div>

      {/* Top Families + Intervention Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Familles de Végétation</h3>
          {statistics.vegetation.by_family.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statistics.vegetation.by_family.slice(0, 7).map((item) => ({
                    name:
                      item.famille.length > 15
                        ? item.famille.substring(0, 15) + '...'
                        : item.famille,
                    value: item.count,
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Quantité" fill="#16a34a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              Aucune famille enregistrée
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            Répartition des Interventions
          </h3>
          <div className="h-64">
            {hasInterventionData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={interventionPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {interventionPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                Aucune donnée d'intervention
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Intervention Summary */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-600" />
          Statistiques d'Intervention
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-sm text-slate-500 mb-1">Jamais intervenu</p>
            <p className="text-2xl font-bold text-slate-800">
              {statistics.interventions.never_intervened}
            </p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
            <p className="text-sm text-orange-600 mb-1">Maintenance urgente (&gt; 6 mois)</p>
            <p className="text-2xl font-bold text-orange-700">
              {statistics.interventions.urgent_maintenance}
            </p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <p className="text-sm text-emerald-600 mb-1">Derniers 30 jours</p>
            <p className="text-2xl font-bold text-emerald-700">
              {statistics.interventions.last_30_days}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteStatisticsTab;
