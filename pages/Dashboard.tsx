import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus, Calendar, AlertTriangle, AlertCircle,
  Target, Activity, BarChart3, Building2, ChevronRight
} from 'lucide-react';
import { fetchStatistics, apiFetch, type Statistics } from '../services/api';
import { planningService } from '../services/planningService';
import { fetchReclamations } from '../services/reclamationsApi';
import { Tache } from '../types/planning';
import { Reclamation } from '../types/reclamations';
import { MOCK_KPIS } from '../store';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Types pour les KPIs
interface KPIDetails {
  valeur: number;
  objectif: number | null;
  unite: string;
  objectif_atteint: boolean | null;
  details: Record<string, any>;
  alerte?: boolean;
  message_alerte?: string;
  error?: string;
}

interface KPIEvolution {
  valeur_precedente: number;
  variation: number;
  variation_pct: number;
  tendance: 'hausse' | 'baisse' | 'stable';
}

interface KPIData {
  periode: {
    mois: string;
    debut: string;
    fin: string;
  };
  kpis: {
    respect_planning: KPIDetails;
    taux_realisation_reclamations: KPIDetails;
    temps_moyen_traitement_reclamations: KPIDetails;
    temps_realisation_taches: KPIDetails;
    temps_travail_par_site: KPIDetails;
  };
  evolution: Record<string, KPIEvolution>;
  sites_disponibles: Array<{ id: number; nom: string }>;
}

const COLORS = {
  primary: '#059669',
  secondary: '#3b82f6',
  warning: '#f59e0b',
  danger: '#ef4444',
  success: '#22c55e',
  gray: '#6b7280',
};

const KPI_COLORS: Record<string, string> = {
  respect_planning: '#059669',
  taux_realisation_reclamations: '#3b82f6',
  temps_moyen_traitement_reclamations: '#f59e0b',
  temps_realisation_taches: '#8b5cf6',
  temps_travail_par_site: '#ec4899',
};

const KPI_LABELS: Record<string, string> = {
  respect_planning: 'Respect du planning',
  taux_realisation_reclamations: 'Taux de réalisation réclamations',
  temps_moyen_traitement_reclamations: 'Temps moyen traitement',
  temps_realisation_taches: 'Temps réalisation tâches',
  temps_travail_par_site: 'Temps total de travail',
};

const ALL_KPI_KEYS = [
  'respect_planning',
  'taux_realisation_reclamations',
  'temps_moyen_traitement_reclamations',
  'temps_realisation_taches',
  'temps_travail_par_site'
] as const;

// Composant TrendIcon
const TrendIcon: React.FC<{ tendance: 'hausse' | 'baisse' | 'stable'; isGoodWhenUp?: boolean }> =
  ({ tendance, isGoodWhenUp = true }) => {
    const isPositive = (tendance === 'hausse' && isGoodWhenUp) || (tendance === 'baisse' && !isGoodWhenUp);

    if (tendance === 'stable') {
      return <Minus className="w-4 h-4 text-slate-400" />;
    }

    return isPositive
      ? <TrendingUp className="w-4 h-4 text-emerald-500" />
      : <TrendingDown className="w-4 h-4 text-red-500" />;
  };

// Composant KPICard pour le dashboard
const DashboardKPICard: React.FC<{
  title: string;
  kpi: KPIDetails;
  evolution?: KPIEvolution;
  color: string;
  isGoodWhenUp?: boolean;
  onClick?: () => void;
}> = ({ title, kpi, evolution, color, isGoodWhenUp = true, onClick }) => {
  const hasObjectif = kpi.objectif !== null;
  const progressPct = hasObjectif ? Math.min((kpi.valeur / kpi.objectif!) * 100, 100) : 0;

  return (
    <div
      className={`bg-white p-5 rounded-xl border border-slate-100 shadow-sm transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-emerald-200 group' : ''
        }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-medium text-slate-500 truncate">{title}</h3>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold text-slate-800">
              {kpi.valeur}
            </span>
            <span className="text-sm text-slate-500">{kpi.unite}</span>
          </div>
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + '20' }}
        >
          <Target className="w-5 h-5" style={{ color }} />
        </div>
      </div>

      {/* Barre de progression */}
      {hasObjectif && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Objectif: {kpi.objectif}{kpi.unite}</span>
            <span className={kpi.objectif_atteint ? 'text-emerald-600 font-medium' : ''}>
              {kpi.objectif_atteint ? 'Atteint' : `${Math.round(progressPct)}%`}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                backgroundColor: kpi.objectif_atteint ? COLORS.success : color
              }}
            />
          </div>
        </div>
      )}

      {/* Alerte */}
      {kpi.alerte && (
        <div className="flex items-center gap-1.5 p-1.5 bg-red-50 rounded-lg mb-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <span className="text-xs text-red-700 truncate">{kpi.message_alerte}</span>
        </div>
      )}

      {/* Evolution */}
      {evolution && (
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
          <TrendIcon tendance={evolution.tendance} isGoodWhenUp={isGoodWhenUp} />
          <span className={`text-xs ${evolution.tendance === 'stable' ? 'text-slate-500' :
            (evolution.tendance === 'hausse' && isGoodWhenUp) || (evolution.tendance === 'baisse' && !isGoodWhenUp)
              ? 'text-emerald-600' : 'text-red-600'
            }`}>
            {evolution.variation >= 0 ? '+' : ''}{evolution.variation} ({evolution.variation_pct}%)
          </span>
          <span className="text-xs text-slate-400">vs mois préc.</span>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Récupérer le rôle utilisateur
  const userRole = useMemo(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.role || 'ADMIN';
      } catch {
        return 'ADMIN';
      }
    }
    return 'ADMIN';
  }, []);

  // Tabs - KPI par défaut pour admin
  const [activeTab, setActiveTab] = useState<'kpi' | 'general'>(userRole === 'ADMIN' ? 'kpi' : 'general');

  // États pour Vue Générale
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [recentTasks, setRecentTasks] = useState<Tache[]>([]);
  const [recentReclamations, setRecentReclamations] = useState<Reclamation[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // États pour KPI
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [isLoadingKpi, setIsLoadingKpi] = useState(false);
  const [kpiError, setKpiError] = useState<string | null>(null);

  // Charger les données générales
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoadingStats(true);
        setIsLoadingData(true);
        setStatsError(null);

        const [statsData, tasksData, reclamationsData] = await Promise.all([
          fetchStatistics(),
          planningService.getTaches({ page: 1 }),
          fetchReclamations()
        ]);

        setStatistics(statsData);

        const tasks = Array.isArray(tasksData) ? tasksData : (tasksData.results || []);
        setRecentTasks(tasks.slice(0, 10));

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

  // Charger les données KPI quand l'onglet est actif
  useEffect(() => {
    if (activeTab === 'kpi' && !kpiData && !isLoadingKpi) {
      loadKpiData();
    }
  }, [activeTab]);

  const loadKpiData = async () => {
    setIsLoadingKpi(true);
    setKpiError(null);
    try {
      const response = await apiFetch(`${API_BASE_URL}/kpis/`);
      const data = await response.json();
      setKpiData(data);
    } catch (error) {
      console.error('Erreur chargement KPIs:', error);
      setKpiError('Erreur lors du chargement des KPIs');
    } finally {
      setIsLoadingKpi(false);
    }
  };

  // KPIs pour vue générale (non-admin)
  const generalKpis = useMemo(() => {
    if (!statistics) return MOCK_KPIS;

    if (statistics.superviseur_stats) {
      const stats = statistics.superviseur_stats;
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
          label: "Tâches Planifiées",
          value: stats.taches_planifiees.toString(),
          change: 0,
          trend: 'neutral' as const,
          icon: <Calendar className="w-5 h-5 text-indigo-500" />
        }
      ];
    }

    return [
      { label: "Total Objets", value: statistics.global.total_objets.toString(), change: 0, trend: 'neutral' as const, icon: undefined },
      { label: "Végétation", value: statistics.global.total_vegetation.toString(), change: 0, trend: 'up' as const, icon: undefined },
      { label: "Sites Actifs", value: statistics.hierarchy.active_sites.toString(), change: 0, trend: 'up' as const, icon: undefined },
      { label: "Hydraulique", value: statistics.global.total_hydraulique.toString(), change: 0, trend: 'neutral' as const, icon: undefined },
    ];
  }, [statistics]);

  return (
    <div className="p-6 h-full flex flex-col gap-4 overflow-hidden">
      {/* Onglets - Uniquement visibles pour Admin */}
      {userRole === 'ADMIN' && (
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('kpi')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'kpi'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
              }`}
          >
            <BarChart3 className="w-4 h-4" />
            KPIs
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'general'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
              }`}
          >
            <Activity className="w-4 h-4" />
            Vue Générale
          </button>
        </div>
      )}

      {/* Contenu Onglet KPI */}
      {activeTab === 'kpi' && userRole === 'ADMIN' && (
        <div className="flex-1 overflow-auto">
          {/* Header avec lien vers rapport complet */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Indicateurs de Performance</h2>
              {kpiData && (
                <p className="text-sm text-slate-500">
                  Période: {new Date(kpiData.periode.debut).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
            <button
              onClick={() => navigate('/reporting')}
              className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Voir le rapport complet
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* KPI Cards */}
          {isLoadingKpi ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm animate-pulse">
                  <div className="h-3 bg-slate-200 rounded w-2/3 mb-3"></div>
                  <div className="h-7 bg-slate-200 rounded w-1/2 mb-3"></div>
                  <div className="h-1.5 bg-slate-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : kpiError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Erreur de chargement des KPIs</p>
                <p className="text-red-600 text-sm">{kpiError}</p>
              </div>
            </div>
          ) : kpiData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {ALL_KPI_KEYS.map(kpiKey => {
                const kpi = kpiData.kpis[kpiKey];
                const evolution = kpiData.evolution[kpiKey];
                const isGoodWhenUp = !['temps_moyen_traitement_reclamations'].includes(kpiKey);

                return (
                  <DashboardKPICard
                    key={kpiKey}
                    title={KPI_LABELS[kpiKey]}
                    kpi={kpi}
                    evolution={evolution}
                    color={KPI_COLORS[kpiKey]}
                    isGoodWhenUp={isGoodWhenUp}
                    onClick={() => navigate(`/reporting/kpi/${kpiKey}`)}
                  />
                );
              })}
            </div>
          ) : null}

          {/* Résumé rapide */}
          {kpiData && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Alertes */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Alertes
                </h3>
                <div className="space-y-2">
                  {Object.entries(kpiData.kpis).filter(([_, kpi]) => kpi.alerte).length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">Aucune alerte active</p>
                  ) : (
                    Object.entries(kpiData.kpis)
                      .filter(([_, kpi]) => kpi.alerte)
                      .map(([key, kpi]) => (
                        <div key={key} className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-red-800">{KPI_LABELS[key]}</p>
                            <p className="text-xs text-red-600 truncate">{kpi.message_alerte}</p>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Sites disponibles */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  Sites ({kpiData.sites_disponibles.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {kpiData.sites_disponibles.slice(0, 8).map(site => (
                    <span
                      key={site.id}
                      className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full"
                    >
                      {site.nom}
                    </span>
                  ))}
                  {kpiData.sites_disponibles.length > 8 && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm rounded-full">
                      +{kpiData.sites_disponibles.length - 8} autres
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contenu Vue Générale (ou par défaut pour non-admin) */}
      {(activeTab === 'general' || userRole !== 'ADMIN') && (
        <>
          {/* KPI Cards - Fixed height section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
            {isLoadingStats ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-2/3 mb-3"></div>
                  <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                </div>
              ))
            ) : statsError ? (
              <div className="col-span-full bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-red-800 font-medium">Erreur de chargement des statistiques</p>
                  <p className="text-red-600 text-sm">{statsError}</p>
                </div>
              </div>
            ) : (
              generalKpis.map((kpi, idx) => (
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
                  {(kpi as any).icon && (
                    <div className="absolute top-4 right-4 p-2 bg-slate-50 rounded-lg">
                      {(kpi as any).icon}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Main Content Area */}
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
                          <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${claim.statut === 'RESOLUE' || claim.statut === 'CLOTUREE' ? 'bg-green-100 text-green-700' :
                            claim.statut === 'NOUVELLE' ? 'bg-red-100 text-red-700' :
                            claim.statut === 'EN_COURS' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                            {claim.statut_display || claim.statut}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
