import React from 'react';
import { AlertCircle, Clock, Star, TrendingUp, Loader2 } from 'lucide-react';
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
  ResponsiveContainer,
} from 'recharts';
import { RECLAMATION_STATUS_LABELS } from '../../constants';

interface ReclamationStats {
  total: number;
  delai_moyen_heures?: number;
  satisfaction_moyenne?: number;
  nombre_evaluations?: number;
  par_statut: Record<string, number>;
  par_type: Array<{ type_reclamation__nom_reclamation: string; count: number }>;
  par_urgence: Array<{ urgence__niveau_urgence: string; count: number }>;
  par_zone?: Array<{ zone__nom: string; count: number }>;
}

interface ReclamationsStatsViewProps {
  stats: ReclamationStats | null;
  isLoading: boolean;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ReclamationsStatsView: React.FC<ReclamationsStatsViewProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <AlertCircle className="w-12 h-12 mb-4 text-slate-300" />
        <p className="text-lg font-medium">Impossible de charger les statistiques</p>
      </div>
    );
  }

  const resolutionRate =
    stats.total > 0
      ? Math.round(
          (((stats.par_statut['RESOLUE'] || 0) + (stats.par_statut['CLOTUREE'] || 0)) /
            stats.total) *
            100,
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="text-sm font-medium text-slate-500 mb-1">Total Réclamations</div>
          <div className="flex items-end justify-between relative z-10">
            <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
          </div>
          <div className="absolute top-4 right-4 p-2 bg-slate-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="text-sm font-medium text-slate-500 mb-1">Délai Moyen</div>
          <div className="flex items-end justify-between relative z-10">
            <div className="text-3xl font-bold text-slate-800">
              {`${Math.round(stats.delai_moyen_heures ?? 0)}h`}
            </div>
          </div>
          <div className="absolute top-4 right-4 p-2 bg-slate-50 rounded-lg">
            <Clock className="w-5 h-5 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="text-sm font-medium text-slate-500 mb-1">Satisfaction Moyenne</div>
          <div className="flex items-end justify-between relative z-10">
            <div className="text-3xl font-bold text-slate-800">
              {`${(stats.satisfaction_moyenne ?? 0).toFixed(1)}/5`}
            </div>
            {(stats.nombre_evaluations ?? 0) > 0 && (
              <div className="text-xs text-slate-400">{stats.nombre_evaluations} avis</div>
            )}
          </div>
          <div className="absolute top-4 right-4 p-2 bg-slate-50 rounded-lg">
            <Star className="w-5 h-5 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="text-sm font-medium text-slate-500 mb-1">Taux de Résolution</div>
          <div className="flex items-end justify-between relative z-10">
            <div className="text-3xl font-bold text-slate-800">{resolutionRate}%</div>
          </div>
          <div className="absolute top-4 right-4 p-2 bg-slate-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-lg text-slate-800">Répartition par Statut</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={Object.entries(stats.par_statut).map(([statut, count]) => ({
                    name: RECLAMATION_STATUS_LABELS[statut] || statut,
                    value: count,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.keys(stats.par_statut).map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-lg text-slate-800">Répartition par Type</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={stats.par_type.map((item) => ({
                  name: item.type_reclamation__nom_reclamation,
                  count: item.count,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-lg text-slate-800">Répartition par Urgence</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={stats.par_urgence.map((item) => ({
                  name: item.urgence__niveau_urgence,
                  count: item.count,
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {stats.par_zone && stats.par_zone.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">Répartition par Zone</h3>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.par_zone}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="zone__nom"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReclamationsStatsView;
