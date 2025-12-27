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

        // Take first 10 recent tasks (more items since we have scroll)
        const tasks = Array.isArray(tasksData) ? tasksData : (tasksData.results || []);
        setRecentTasks(tasks.slice(0, 10));

        // Take first 10 recent reclamations
        const recls = Array.isArray(reclamationsData) ? reclamationsData : (reclamationsData || []);
        setRecentReclamations(recls.slice(0, 10));

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

    // Si on a des stats spécifiques Chef d'Équipe, on les affiche en priorité
    if (statistics.chef_equipe_stats) {
      const stats = statistics.chef_equipe_stats;
      return [
        {
          label: "Tâches Aujourd'hui",
          value: stats.taches_today.toString(),
          change: 0,
          trend: 'neutral' as const,
          icon: <Calendar className="w-5 h-5 text-blue-500" />
        },
        {
          label: "Tâches En Cours",
          value: stats.taches_en_cours.toString(),
          change: 0,
          trend: 'neutral' as const,
          icon: <TrendingUp className="w-5 h-5 text-emerald-500" />
        },
        {
          label: "Absences (Aujourd'hui)",
          value: stats.absences_today.toString(),
          change: 0,
          trend: stats.absences_today > 0 ? 'down' as const : 'neutral' as const,
          icon: <AlertCircle className="w-5 h-5 text-orange-500" />
        },
        {
          label: "En Retard",
          value: stats.taches_retard.toString(),
          change: 0,
          trend: stats.taches_retard > 0 ? 'down' as const : 'neutral' as const,
          icon: <AlertTriangle className="w-5 h-5 text-red-500" />
        }
      ];
    }

    return [
      {
        label: "Total Objets",
        value: statistics.global.total_objets.toString(),
        change: 0,
        trend: 'neutral' as const,
        icon: undefined
      },
      {
        label: "Végétation",
        value: statistics.global.total_vegetation.toString(),
        change: 0,
        trend: 'up' as const,
        icon: undefined
      },
      {
        label: "Sites Actifs",
        value: statistics.hierarchy.active_sites.toString(),
        change: 0,
        trend: 'up' as const,
        icon: undefined
      },
      {
        label: "Hydraulique",
        value: statistics.global.total_hydraulique.toString(),
        change: 0,
        trend: 'neutral' as const,
        icon: undefined
      },
    ];
  }, [statistics]);

  return (
    <div className="p-6 h-full flex flex-col gap-6 overflow-hidden">
      {/* KPI Cards - Fixed height section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
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
            <div key={idx} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="text-sm font-medium text-slate-500 mb-1">{kpi.label}</div>
              <div className="flex items-end justify-between relative z-10">
                <div className="text-3xl font-bold text-slate-800">{kpi.value}</div>
                <div className={`flex items-center text-sm font-bold ${kpi.trend === 'up' ? 'text-emerald-600' : kpi.trend === 'down' ? 'text-red-500' : 'text-slate-400'
                  }`}>
                  {kpi.trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> :
                    kpi.trend === 'down' ? <TrendingDown className="w-4 h-4 mr-1" /> :
                      <Minus className="w-4 h-4 mr-1" />}
                  {kpi.change > 0 ? '+' : ''}{kpi.change}%
                </div>
              </div>
              {/* @ts-ignore - icon property is optional and added for chef equipe */}
              {(kpi as any).icon && (
                <div className="absolute top-4 right-4 p-2 bg-slate-50 rounded-lg">
                  {(kpi as any).icon}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Main Content Area - Flexible height */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col lg:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
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

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {isLoadingData ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-slate-100 rounded"></div>
                ))}
              </div>
            ) : recentTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-500 flex flex-col items-center">
                <Calendar className="w-12 h-12 text-slate-200 mb-3" />
                <p>Aucune tâche récente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-emerald-200 transition-colors group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${task.statut === 'TERMINEE' ? 'bg-emerald-500' :
                        task.statut === 'EN_COURS' ? 'bg-blue-500' : 'bg-slate-300'
                        }`}></div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-800 truncate">
                          {task.type_tache_detail?.nom_tache}
                        </h3>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-1 truncate">
                          <span className="truncate">
                            Équipe: {
                              task.equipes_detail?.length > 0
                                ? task.equipes_detail.map((e: any) => e.nom_equipe || e.nomEquipe).join(', ')
                                : (task.equipe_detail as any)?.nom_equipe || task.equipe_detail?.nomEquipe || 'N/A'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-4">
                      <span className="text-xs font-bold text-slate-500">
                        {new Date(task.date_debut_planifiee).toLocaleDateString()}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${task.statut === 'TERMINEE' ? 'bg-emerald-100 text-emerald-700' :
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
        </div>

        {/* Recent Claims */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
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

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {isLoadingData ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-slate-100 rounded"></div>
                ))}
              </div>
            ) : recentReclamations.length === 0 ? (
              <div className="text-center py-12 text-slate-500 flex flex-col items-center">
                <AlertCircle className="w-12 h-12 text-slate-200 mb-3" />
                <p>Aucune réclamation récente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReclamations.map(claim => (
                  <div key={claim.id} className="p-4 border border-slate-100 rounded-lg hover:shadow-sm transition-shadow bg-white">
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
                    <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-1">
                      {claim.type_reclamation_nom}
                    </h4>
                    <p className="text-xs text-slate-500 mb-2 line-clamp-2">
                      {claim.description}
                    </p>
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-50 mt-2">
                      <span className="text-slate-400 truncate max-w-[100px]" title={claim.client ? 'Client #' + claim.client : 'Interne'}>
                        {claim.client ? 'Client #' + claim.client : 'Interne'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${claim.statut === 'RESOLUE' ? 'bg-green-100 text-green-700' :
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
    </div>
  );
};

export default Dashboard;
