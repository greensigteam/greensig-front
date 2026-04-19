import { useEffect } from 'react';
import { X, CheckCircle2, Target, ClipboardList, Clock, MapPin } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { KPIData } from '../../types/kpi';

interface KPIDetailModalProps {
  kpiKey: string;
  data: KPIData;
  onClose: () => void;
}

const KPI_MODAL_CONFIG: Record<
  string,
  {
    title: string;
    subtitle: string;
    color: string;
    gradientClass: string;
    Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  }
> = {
  respect_planning: {
    title: 'Respect du planning',
    subtitle: 'Détail et ventilation',
    color: '#059669',
    gradientClass: 'from-emerald-500 to-emerald-600',
    Icon: CheckCircle2,
  },
  qualite_service: {
    title: 'Qualité de service',
    subtitle: 'Détail et ventilation',
    color: '#3b82f6',
    gradientClass: 'from-blue-500 to-blue-600',
    Icon: Target,
  },
  taux_traitement_reclamations: {
    title: 'Taux de traitement des réclamations',
    subtitle: 'Détail et ventilation',
    color: '#f59e0b',
    gradientClass: 'from-amber-500 to-amber-600',
    Icon: ClipboardList,
  },
  temps_moyen_traitement: {
    title: 'Temps moyen de traitement',
    subtitle: 'Ventilation par type de réclamation',
    color: '#8b5cf6',
    gradientClass: 'from-violet-500 to-violet-600',
    Icon: Clock,
  },
  temps_realisation_tache: {
    title: 'Temps de réalisation par tâche',
    subtitle: 'Détail par type de tâche et site',
    color: '#f59e0b',
    gradientClass: 'from-amber-500 to-amber-600',
    Icon: Clock,
  },
  temps_total_par_site: {
    title: 'Temps total de travail par site',
    subtitle: 'Ventilation par site',
    color: '#ec4899',
    gradientClass: 'from-pink-500 to-pink-600',
    Icon: MapPin,
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  URGENCE: '#ef4444',
  QUALITE: '#3b82f6',
  PLANNING: '#f59e0b',
  RESSOURCES: '#8b5cf6',
  AUTRE: '#6b7280',
};

export function KPIDetailModal({ kpiKey, data, onClose }: KPIDetailModalProps) {
  const { kpis } = data;
  const cfg = KPI_MODAL_CONFIG[kpiKey] ?? {
    title: kpiKey,
    subtitle: 'Détail',
    color: '#6b7280',
    gradientClass: 'from-slate-500 to-slate-600',
    Icon: Target,
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className={`bg-gradient-to-r ${cfg.gradientClass} px-6 py-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <cfg.Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{cfg.title}</h2>
                <p className="text-sm text-white/70">{cfg.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-88px)] space-y-5">
          {/* KPI 1: Respect du planning */}
          {kpiKey === 'respect_planning' && (
            <DetailGlobal
              details={kpis.respect_planning.details}
              labels={{
                total_planifiees: 'Tâches planifiées',
                dans_delais: 'Dans les délais (≤7j)',
                hors_delais: 'Hors délais (non terminées ou >7j)',
              }}
            />
          )}

          {/* KPI 2: Qualité de service */}
          {kpiKey === 'qualite_service' && (
            <DetailGlobal
              details={kpis.qualite_service.details}
              labels={{
                total_evaluations: 'Total évaluations',
                satisfaits: 'Satisfaits (note >= 4)',
                insatisfaits: 'Insatisfaits (note < 4)',
                note_moyenne: 'Note moyenne (/5)',
              }}
            />
          )}

          {/* KPI 3: Taux réalisation réclamations */}
          {kpiKey === 'taux_traitement_reclamations' && (
            <DetailGlobal
              details={kpis.taux_traitement_reclamations.details}
              labels={{
                total_ouvertes: 'Réclamations ouvertes dans le mois',
                ouvertes_et_fermees: 'Ouvertes ET fermées dans le mois',
                non_realisees: 'Non réalisées',
              }}
            />
          )}

          {/* KPI 4: Temps moyen traitement — ventilation par type */}
          {kpiKey === 'temps_moyen_traitement' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100">
                  <div className="text-2xl font-bold text-violet-600">
                    {kpis.temps_moyen_traitement.global.valeur != null
                      ? `${kpis.temps_moyen_traitement.global.valeur}h`
                      : '-'}
                  </div>
                  <div className="text-xs text-violet-800 font-medium mt-1">Moyenne globale</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-100">
                  <div className="text-2xl font-bold text-slate-600">
                    {kpis.temps_moyen_traitement.global.total_cloturees}
                  </div>
                  <div className="text-xs text-slate-600 font-medium mt-1">
                    Réclamations clôturées
                  </div>
                </div>
              </div>

              {kpis.temps_moyen_traitement.par_type.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold text-slate-700 mt-4">
                    Par type de réclamation
                  </h4>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart
                        data={kpis.temps_moyen_traitement.par_type.map((t) => ({
                          name: t.nom.length > 20 ? t.nom.substring(0, 20) + '...' : t.nom,
                          heures: t.valeur ?? 0,
                          categorie: t.categorie,
                        }))}
                        layout="vertical"
                        margin={{ left: 100, right: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis type="number" unit="h" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                        <Tooltip formatter={(v) => [`${v}h`, 'Temps moyen']} />
                        <Bar dataKey="heures" radius={[0, 4, 4, 0]}>
                          {kpis.temps_moyen_traitement.par_type.map((item, i) => (
                            <Cell key={i} fill={CATEGORY_COLORS[item.categorie] || '#6b7280'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </>
          )}

          {/* KPI 5: Temps de réalisation par tâche */}
          {kpiKey === 'temps_realisation_tache' && (
            <>
              {kpis.temps_realisation_tache.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                          Type de tâche
                        </th>
                        <th className="text-left py-3 px-4 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                          Site
                        </th>
                        <th className="text-right py-3 px-4 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                          Heures
                        </th>
                        <th className="text-right py-3 px-4 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                          Interventions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {kpis.temps_realisation_tache.map((entry, i) => (
                        <tr
                          key={i}
                          className={`hover:bg-emerald-50/30 transition-colors ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                        >
                          <td className="py-3 px-4 text-slate-800 font-medium">
                            {entry.type_tache}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{entry.site_nom}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-800">
                            {entry.heures}h
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500">
                            {entry.nb_interventions}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center py-8">
                  Aucune donnée pour ce mois
                </p>
              )}
            </>
          )}

          {/* KPI 6: Temps total par site */}
          {kpiKey === 'temps_total_par_site' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl border border-pink-100">
                  <div className="text-2xl font-bold text-pink-600">
                    {kpis.temps_total_par_site.total_heures}h
                  </div>
                  <div className="text-xs text-pink-800 font-medium mt-1">Total ce mois</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-100">
                  <div className="text-2xl font-bold text-slate-600">
                    {kpis.temps_total_par_site.total_heures_m1}h
                  </div>
                  <div className="text-xs text-slate-600 font-medium mt-1">Total M-1</div>
                </div>
              </div>

              {kpis.temps_total_par_site.par_site.length > 0 && (
                <div className="h-56 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart
                      data={kpis.temps_total_par_site.par_site.map((s) => ({
                        name:
                          s.site_nom.length > 15 ? s.site_nom.substring(0, 15) + '...' : s.site_nom,
                        heures: s.heures,
                      }))}
                      margin={{ left: 10, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis unit="h" tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`${v}h`, 'Heures']} />
                      <Bar dataKey="heures" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Affiche les détails clé/valeur d'un KPI global */
function DetailGlobal({
  details,
  labels,
}: {
  details: Record<string, number | null>;
  labels: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {Object.entries(labels).map(([key, label]) => {
        const val = details[key];
        return (
          <div
            key={key}
            className="p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-100"
          >
            <div className="text-2xl font-bold text-slate-700">{val != null ? val : '-'}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">{label}</div>
          </div>
        );
      })}
    </div>
  );
}
