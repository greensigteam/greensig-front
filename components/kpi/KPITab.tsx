import { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Loader2,
  Clock,
  MapPin,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Target,
  ClipboardList,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useKPIs, useKPIHistorique } from '../../hooks/queries/useKPIData';
import { useSites } from '../../hooks/queries';
import { KPIFilters } from './KPIFilters';
import { KPISummaryTable } from './KPISummaryTable';
import { KPIEvolutionChart } from './KPIEvolutionChart';
import { KPIDetailModal } from './KPIDetailModal';
import type { KPIFiltersState, KPIStatus } from '../../types/kpi';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// --- KPI Card config ---
const KPI_CARD_CONFIGS = [
  {
    key: 'respect_planning',
    label: 'Respect du planning',
    color: '#059669',
    bgClass: 'from-emerald-50 to-emerald-100/50',
    Icon: CheckCircle2,
  },
  {
    key: 'qualite_service',
    label: 'Qualité de service',
    color: '#3b82f6',
    bgClass: 'from-blue-50 to-blue-100/50',
    Icon: Target,
  },
  {
    key: 'taux_traitement_reclamations',
    label: 'Traitement réclamations',
    color: '#f59e0b',
    bgClass: 'from-amber-50 to-amber-100/50',
    Icon: ClipboardList,
  },
  {
    key: 'temps_moyen_traitement',
    label: 'Temps moyen traitement',
    color: '#8b5cf6',
    bgClass: 'from-violet-50 to-violet-100/50',
    Icon: Clock,
  },
] as const;

function getStatusColor(statut: KPIStatus): string {
  switch (statut) {
    case 'vert':
      return '#059669';
    case 'orange':
      return '#f59e0b';
    case 'rouge':
      return '#ef4444';
    default:
      return '#94a3b8';
  }
}

export function KPITab() {
  const [filters, setFilters] = useState<KPIFiltersState>({
    siteId: null,
    mois: getCurrentMonth(),
  });
  const [detailKey, setDetailKey] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useKPIs(filters.mois, filters.siteId);
  const { data: historique, isLoading: historiqueLoading } = useKPIHistorique(filters.siteId, 6, {
    enabled: true,
  });
  const { data: sites } = useSites();

  const siteName = useMemo(() => {
    if (!filters.siteId || !sites) return null;
    return sites.find((s) => String(s.id) === String(filters.siteId))?.name ?? null;
  }, [filters.siteId, sites]);

  const formattedPeriod = useMemo(() => {
    try {
      const date = parse(filters.mois, 'yyyy-MM', new Date());
      const formatted = format(date, 'MMMM yyyy', { locale: fr });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      return filters.mois;
    }
  }, [filters.mois]);

  // Loading state — premium skeletons
  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="h-7 bg-slate-100 rounded-lg w-64 animate-pulse" />
            <div className="h-4 bg-slate-50 rounded w-48 mt-2 animate-pulse" />
          </div>
          <KPIFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="h-4 bg-slate-100 rounded w-28 animate-pulse" />
                <div className="w-10 h-10 bg-slate-50 rounded-lg animate-pulse" />
              </div>
              <div className="h-8 bg-slate-100 rounded w-20 animate-pulse" />
              <div className="h-1.5 bg-slate-100 rounded-full animate-pulse" />
              <div className="h-4 bg-slate-50 rounded w-32 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-slate-50">
              <div className="w-8 h-8 bg-slate-50 rounded-lg animate-pulse" />
              <div className="h-4 bg-slate-100 rounded w-48 animate-pulse" />
              <div className="h-5 bg-slate-100 rounded-full w-16 animate-pulse ml-auto" />
              <div className="h-4 bg-slate-100 rounded w-16 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 animate-pulse"
            >
              <div className="h-5 bg-slate-100 rounded w-48 mb-2" />
              <div className="h-3 bg-slate-50 rounded w-40 mb-6" />
              <div className="h-52 bg-slate-50 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Indicateurs de Performance</h1>
          </div>
          <KPIFilters filters={filters} onChange={setFilters} />
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-800 font-medium mb-1">Erreur de chargement</p>
          <p className="text-red-600 text-sm">
            {(error as Error)?.message || 'Une erreur est survenue'}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis } = data;

  // Build card data
  const cardData = KPI_CARD_CONFIGS.map((cfg) => {
    if (cfg.key === 'temps_moyen_traitement') {
      const g = kpis.temps_moyen_traitement.global;
      return {
        ...cfg,
        valeur: g.valeur,
        unite: g.unite,
        evolution: g.evolution,
        statut: g.statut,
        seuil: g.seuil,
      };
    }
    const kpi = kpis[cfg.key];
    return {
      ...cfg,
      valeur: kpi.valeur,
      unite: kpi.unite,
      evolution: kpi.evolution,
      statut: kpi.statut,
      seuil: kpi.seuil,
    };
  });

  // Alert check — any KPI in rouge?
  const rougeKPIs = cardData.filter((c) => c.statut === 'rouge');

  // Aggregate KPI 5 data by type_tache for bar chart
  const tempsParType: Record<string, number> = {};
  for (const entry of kpis.temps_realisation_tache) {
    tempsParType[entry.type_tache] = (tempsParType[entry.type_tache] || 0) + entry.heures;
  }
  const tempsParTypeData = Object.entries(tempsParType)
    .map(([name, heures]) => ({ name, heures }))
    .sort((a, b) => b.heures - a.heures);

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            Indicateurs de Performance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {formattedPeriod}
            {siteName && (
              <span className="ml-1.5 inline-flex items-center gap-1 text-emerald-600 font-medium">
                <MapPin className="w-3.5 h-3.5" />
                {siteName}
              </span>
            )}
            {!siteName && ' — Tous les sites'}
          </p>
        </div>
        <KPIFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Alert banner */}
      {rougeKPIs.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {rougeKPIs.length} indicateur{rougeKPIs.length > 1 ? 's' : ''} en alerte critique
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {rougeKPIs.map((k) => k.label).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cardData.map((card) => {
          const statusColor = getStatusColor(card.statut);
          const hasProgress = card.seuil != null && card.valeur != null;
          const progressPct = hasProgress ? Math.min((card.valeur! / card.seuil!) * 100, 100) : 0;
          const isPositive = card.evolution != null && card.evolution > 0;
          const isNegative = card.evolution != null && card.evolution < 0;

          return (
            <div
              key={card.key}
              className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md hover:border-emerald-200 group"
              onClick={() => setDetailKey(card.key)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-medium text-slate-500 truncate">{card.label}</h3>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-bold text-slate-800">
                      {card.valeur != null ? card.valeur : '-'}
                    </span>
                    <span className="text-sm text-slate-500">{card.unite}</span>
                  </div>
                </div>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: card.color + '20' }}
                >
                  <card.Icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
              </div>

              {/* Progress bar */}
              {hasProgress && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>
                      Seuil: {card.seuil}
                      {card.unite}
                    </span>
                    <span
                      style={{ color: progressPct >= 100 ? '#059669' : undefined }}
                      className={progressPct >= 100 ? 'font-medium' : ''}
                    >
                      {progressPct >= 100 ? 'Atteint' : `${Math.round(progressPct)}%`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${progressPct}%`,
                        backgroundColor: progressPct >= 100 ? '#059669' : statusColor,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Status dot for non-progress cards */}
              {!hasProgress && (
                <div className="mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                  <span className="text-xs text-slate-500">
                    {card.statut === 'vert'
                      ? 'Bon'
                      : card.statut === 'orange'
                        ? 'Attention'
                        : card.statut === 'rouge'
                          ? 'Critique'
                          : 'N/A'}
                  </span>
                </div>
              )}

              {/* Evolution */}
              {card.evolution != null && (
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                  {isPositive ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  ) : isNegative ? (
                    <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <Minus className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      isPositive
                        ? 'text-emerald-600'
                        : isNegative
                          ? 'text-red-600'
                          : 'text-slate-500'
                    }`}
                  >
                    {card.evolution > 0 ? '+' : ''}
                    {card.evolution}%
                  </span>
                  <span className="text-xs text-slate-400">vs mois préc.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Table (KPI 1-4) */}
      <KPISummaryTable data={data} onDetailClick={setDetailKey} />

      {/* KPI 5 & 6 — Temps de travail (bar charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KPI 5: Temps par type de tâche */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            Temps de réalisation par type de tâche
          </h3>
          <p className="text-xs text-slate-400 mb-4">Heures réelles cumulées ce mois</p>
          {tempsParTypeData.length > 0 ? (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={tempsParTypeData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" unit="h" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v) => [`${v}h`, 'Heures']} />
                  <Bar dataKey="heures" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
              Aucune donnée
            </div>
          )}
          <button
            onClick={() => setDetailKey('temps_realisation_tache')}
            className="mt-3 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Voir le détail par site &rarr;
          </button>
        </div>

        {/* KPI 6: Temps total par site */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-pink-600" />
              Temps total de travail par site
            </h3>
            <span className="text-xs text-slate-400">
              Total:{' '}
              <strong className="text-slate-700">{kpis.temps_total_par_site.total_heures}h</strong>
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">Heures travaillées par site ce mois</p>
          {kpis.temps_total_par_site.par_site.length > 0 ? (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={kpis.temps_total_par_site.par_site.map((s) => ({
                    name: s.site_nom.length > 15 ? s.site_nom.substring(0, 15) + '...' : s.site_nom,
                    heures: s.heures,
                  }))}
                  margin={{ left: 10, right: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis unit="h" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}h`, 'Heures']} />
                  <Bar dataKey="heures" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
              Aucune donnée
            </div>
          )}
          <button
            onClick={() => setDetailKey('temps_total_par_site')}
            className="mt-3 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Voir le détail &rarr;
          </button>
        </div>
      </div>

      {/* Historique chart */}
      {historique ? (
        <KPIEvolutionChart data={historique} />
      ) : historiqueLoading ? (
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
        </div>
      ) : null}

      {/* Detail modal */}
      {detailKey && (
        <KPIDetailModal kpiKey={detailKey} data={data} onClose={() => setDetailKey(null)} />
      )}
    </div>
  );
}
