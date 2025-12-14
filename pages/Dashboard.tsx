
import React, { useState, useEffect } from 'react';
import { MOCK_KPIS, MOCK_TASKS, MOCK_CLAIMS } from '../store';
import { TrendingUp, TrendingDown, Minus, Calendar, AlertTriangle, AlertCircle } from 'lucide-react';
import { fetchStatistics, type Statistics } from '../services/api';

const Dashboard: React.FC = () => {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        setIsLoadingStats(true);
        setStatsError(null);
        const data = await fetchStatistics();
        setStatistics(data);
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
        setStatsError(error instanceof Error ? error.message : 'Erreur de chargement');
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadStatistics();
  }, []);

  // Generate KPIs from API statistics
  const kpis = React.useMemo(() => {
    if (!statistics) return MOCK_KPIS;

    return [
      {
        label: "Total Objets",
        value: statistics.global.total_objets.toString(),
        change: 0,
        trend: 'neutral' as const
      },
      {
        label: "Végétation",
        value: statistics.global.total_vegetation.toString(),
        change: 0,
        trend: 'up' as const
      },
      {
        label: "Sites Actifs",
        value: statistics.hierarchy.active_sites.toString(),
        change: 0,
        trend: 'up' as const
      },
      {
        label: "Hydraulique",
        value: statistics.global.total_hydraulique.toString(),
        change: 0,
        trend: 'neutral' as const
      },
    ];
  }, [statistics]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-500">Vue d'ensemble de l'activité</p>
        </div>
        <div className="text-sm text-slate-500 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingStats ? (
          // Loading skeleton
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-2/3 mb-3"></div>
              <div className="h-8 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))
        ) : statsError ? (
          // Error state
          <div className="col-span-full bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium">Erreur de chargement des statistiques</p>
              <p className="text-red-600 text-sm">{statsError}</p>
              <p className="text-slate-600 text-xs mt-1">Affichage des données de démonstration</p>
            </div>
          </div>
        ) : null}

        {/* KPI Cards - show if not loading */}
        {!isLoadingStats && kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-medium text-slate-500 mb-1">{kpi.label}</div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-slate-800">{kpi.value}</div>
              <div className={`flex items-center text-sm font-bold ${
                kpi.trend === 'up' ? 'text-emerald-600' : kpi.trend === 'down' ? 'text-red-500' : 'text-slate-400'
              }`}>
                {kpi.trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> :
                 kpi.trend === 'down' ? <TrendingDown className="w-4 h-4 mr-1" /> :
                 <Minus className="w-4 h-4 mr-1" />}
                {kpi.change > 0 ? '+' : ''}{kpi.change}%
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Tâches récentes
            </h2>
            <button className="text-sm text-emerald-600 font-medium hover:underline">Voir tout</button>
          </div>
          <div className="space-y-4">
            {MOCK_TASKS.map(task => (
              <div key={task.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-12 rounded-full ${
                    task.status === 'TERMINE' ? 'bg-emerald-500' : 
                    task.status === 'EN_COURS' ? 'bg-blue-500' : 'bg-slate-300'
                  }`}></div>
                  <div>
                    <h3 className="font-bold text-slate-800">{task.title}</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <span className="bg-white px-2 py-0.5 rounded border border-slate-200">{task.type}</span>
                      <span>Assigné à : {task.assignee}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-bold text-slate-500">{task.date}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                    task.status === 'TERMINE' ? 'bg-emerald-100 text-emerald-700' : 
                    task.status === 'EN_COURS' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Claims */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Réclamations
            </h2>
          </div>
          <div className="space-y-4">
            {MOCK_CLAIMS.map(claim => (
              <div key={claim.id} className="p-4 border border-slate-100 rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                    claim.priority === 'HAUTE' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {claim.priority}
                  </span>
                  <span className="text-xs text-slate-400">{claim.date}</span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">{claim.title}</h4>
                <p className="text-xs text-slate-500">Par: {claim.author}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
