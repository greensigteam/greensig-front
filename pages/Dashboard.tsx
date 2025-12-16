
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, Calendar, AlertTriangle, AlertCircle } from 'lucide-react';
import { fetchStatistics, type Statistics } from '../services/api';
import { planningService } from '../services/planningService';
import { fetchReclamations } from '../services/reclamationsApi';
import { Tache } from '../types/planning';
import { Reclamation } from '../types/reclamations';
import { MOCK_KPIS } from '../store';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [recentTasks, setRecentTasks] = useState<Tache[]>([]);
  const [recentReclamations, setRecentReclamations] = useState<Reclamation[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoadingStats(true);
        setIsLoadingData(true);
        setStatsError(null);

        // Parallel fetch for better performance
        const [statsData, tasksData, reclamationsData] = await Promise.all([
          fetchStatistics(),
          planningService.getTaches({ page: 1 }), // Get first page of tasks
          fetchReclamations() // Get reclamations
        ]);

        setStatistics(statsData);

        // Take first 5 recent tasks
        const tasks = Array.isArray(tasksData) ? tasksData : (tasksData.results || []);
        setRecentTasks(tasks.slice(0, 5));

        // Take first 5 recent reclamations
        const recls = Array.isArray(reclamationsData) ? reclamationsData : (reclamationsData || []);
        setRecentReclamations(recls.slice(0, 5));

      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setStatsError(error instanceof Error ? error.message : 'Erreur de chargement');
      } finally {
        setIsLoadingStats(false);
        setIsLoadingData(false);
      }
    };

    loadDashboardData();
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
            </div>
          </div>
        ) : (
          kpis.map((kpi, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-sm font-medium text-slate-500 mb-1">{kpi.label}</div>
              <div className="flex items-end justify-between">
                <div className="text-3xl font-bold text-slate-800">{kpi.value}</div>
                <div className={`flex items-center text-sm font-bold ${kpi.trend === 'up' ? 'text-emerald-600' : kpi.trend === 'down' ? 'text-red-500' : 'text-slate-400'
                  }`}>
                  {kpi.trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> :
                    kpi.trend === 'down' ? <TrendingDown className="w-4 h-4 mr-1" /> :
                      <Minus className="w-4 h-4 mr-1" />}
                  {kpi.change > 0 ? '+' : ''}{kpi.change}%
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Tâches récentes
            </h2>
            <button
              onClick={() => navigate('/planning')}
              className="text-sm text-emerald-600 font-medium hover:underline"
            >
              Voir tout
            </button>
          </div>

          {isLoadingData ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-100 rounded"></div>
              ))}
            </div>
          ) : recentTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Aucune tâche récente</div>
          ) : (
            <div className="space-y-4">
              {recentTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-emerald-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-12 rounded-full ${task.statut === 'TERMINEE' ? 'bg-emerald-500' :
                      task.statut === 'EN_COURS' ? 'bg-blue-500' : 'bg-slate-300'
                      }`}></div>
                    <div>
                      <h3 className="font-bold text-slate-800">{task.type_tache_detail?.nom_tache} (Client: {task.client_detail?.nomStructure || 'N/A'})</h3>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                          {task.type_tache_detail?.nom_tache}
                        </span>
                        {task.equipe_detail && (
                          <span>Assigné à : {task.equipe_detail.nomEquipe}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-bold text-slate-500">
                      {new Date(task.date_debut_planifiee).toLocaleDateString()}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${task.statut === 'TERMINEE' ? 'bg-emerald-100 text-emerald-700' :
                      task.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                      {task.statut?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Claims */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Réclamations
            </h2>
            <button
              onClick={() => navigate('/reclamations')}
              className="text-sm text-emerald-600 font-medium hover:underline"
            >
              Voir tout
            </button>
          </div>

          {isLoadingData ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-100 rounded"></div>
              ))}
            </div>
          ) : recentReclamations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Aucune réclamation récente</div>
          ) : (
            <div className="space-y-4">
              {recentReclamations.map(claim => (
                <div key={claim.id} className="p-4 border border-slate-100 rounded-lg hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    {claim.urgence_niveau && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-700`}
                        style={{ backgroundColor: claim.urgence_couleur + '20', color: claim.urgence_couleur }}>
                        {claim.urgence_niveau}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {new Date(claim.date_creation).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">
                    {claim.type_reclamation_nom}
                  </h4>
                  <p className="text-xs text-slate-500 mb-2 truncate">
                    {claim.description}
                  </p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">{claim.client ? 'Client #' + claim.client : 'Interne'}</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${claim.statut === 'RESOLUE' ? 'bg-green-100 text-green-700' :
                      claim.statut === 'NOUVELLE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                      {claim.statut}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
