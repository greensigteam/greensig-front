import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  Info,
  CheckCircle2,
  Target,
  ClipboardList,
  Clock,
  TableProperties,
} from 'lucide-react';
import type { KPIData, KPIStatus } from '../../types/kpi';

interface KPISummaryTableProps {
  data: KPIData;
  onDetailClick: (kpiKey: string) => void;
}

const STATUS_PILL: Record<KPIStatus, { bg: string; text: string; label: string }> = {
  vert: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Bon' },
  orange: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Attention' },
  rouge: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critique' },
  gris: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'N/A' },
};

const KPI_ROW_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  }
> = {
  respect_planning: { label: 'Respect du planning', color: '#059669', Icon: CheckCircle2 },
  qualite_service: { label: 'Qualité de service', color: '#3b82f6', Icon: Target },
  taux_traitement_reclamations: {
    label: 'Taux de traitement des réclamations',
    color: '#f59e0b',
    Icon: ClipboardList,
  },
  temps_moyen_traitement: {
    label: 'Temps moyen traitement réclamations',
    color: '#8b5cf6',
    Icon: Clock,
  },
};

function formatValue(value: number | null, unite: string): string {
  if (value == null) return '-';
  return `${value}${unite}`;
}

function EvolutionBadge({ evolution }: { evolution: number | null }) {
  if (evolution == null) return <span className="text-slate-400 text-xs">-</span>;

  const isPositive = evolution > 0;
  const isNegative = evolution < 0;
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const color = isPositive
    ? 'text-emerald-600 bg-emerald-50'
    : isNegative
      ? 'text-red-600 bg-red-50'
      : 'text-slate-500 bg-slate-50';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      <Icon className="w-3 h-3" />
      {evolution > 0 ? '+' : ''}
      {evolution}%
    </span>
  );
}

export function KPISummaryTable({ data, onDetailClick }: KPISummaryTableProps) {
  const [expandedKPI4, setExpandedKPI4] = useState(false);
  const { kpis } = data;

  // Lignes globales (KPI 1, 2, 3)
  const globalRows: {
    key: string;
    valeur: number | null;
    valeur_m1: number | null;
    evolution: number | null;
    statut: KPIStatus;
    unite: string;
    seuil: number | null;
  }[] = [
    { key: 'respect_planning', ...kpis.respect_planning },
    { key: 'qualite_service', ...kpis.qualite_service },
    { key: 'taux_traitement_reclamations', ...kpis.taux_traitement_reclamations },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
          <TableProperties className="w-4 h-4 text-slate-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Détail des indicateurs</h3>
          <p className="text-xs text-slate-400">Vue tabulaire des KPIs principaux</p>
        </div>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Indicateur
            </th>
            <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Statut
            </th>
            <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Valeur
            </th>
            <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
              M-1
            </th>
            <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
              Évolution
            </th>
            <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Seuil
            </th>
            <th className="px-5 py-3.5 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {/* KPI 1, 2, 3 — lignes globales */}
          {globalRows.map((row) => {
            const cfg = KPI_ROW_CONFIG[row.key]!;
            const pill = STATUS_PILL[row.statut];
            return (
              <tr key={row.key} className="group hover:bg-emerald-50/30 transition-colors">
                <td className="px-5 py-3.5 text-sm font-medium text-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: cfg.color + '15' }}
                    >
                      <cfg.Icon className="w-4 h-4" style={{ color: cfg.color }} />
                    </div>
                    {cfg.label}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${pill.bg} ${pill.text}`}
                  >
                    {pill.label}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right text-sm font-bold text-slate-800">
                  {formatValue(row.valeur, row.unite)}
                </td>
                <td className="px-5 py-3.5 text-right text-sm text-slate-500 hidden sm:table-cell">
                  {formatValue(row.valeur_m1, row.unite)}
                </td>
                <td className="px-5 py-3.5 text-center hidden sm:table-cell">
                  <EvolutionBadge evolution={row.evolution} />
                </td>
                <td className="px-5 py-3.5 text-right text-sm text-slate-500">
                  {row.seuil != null ? `${row.seuil}%` : '-'}
                </td>
                <td className="px-5 py-3.5">
                  <button
                    onClick={() => onDetailClick(row.key)}
                    className="p-1.5 text-slate-300 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-emerald-50"
                    title="Voir détail"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}

          {/* KPI 4 — Temps moyen traitement (dépliable par type) */}
          {(() => {
            const cfg = KPI_ROW_CONFIG['temps_moyen_traitement']!;
            const pill = STATUS_PILL[kpis.temps_moyen_traitement.global.statut];
            return (
              <>
                <tr
                  className="group hover:bg-emerald-50/30 transition-colors cursor-pointer"
                  onClick={() => setExpandedKPI4(!expandedKPI4)}
                >
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: cfg.color + '15' }}
                      >
                        <cfg.Icon className="w-4 h-4" style={{ color: cfg.color }} />
                      </div>
                      <span className="flex items-center gap-1.5">
                        {expandedKPI4 ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                        {cfg.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${pill.bg} ${pill.text}`}
                    >
                      {pill.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm font-bold text-slate-800">
                    {formatValue(kpis.temps_moyen_traitement.global.valeur, 'h')}
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm text-slate-500 hidden sm:table-cell">
                    {formatValue(kpis.temps_moyen_traitement.global.valeur_m1, 'h')}
                  </td>
                  <td className="px-5 py-3.5 text-center hidden sm:table-cell">
                    <EvolutionBadge evolution={kpis.temps_moyen_traitement.global.evolution} />
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm text-slate-500">-</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDetailClick('temps_moyen_traitement');
                      }}
                      className="p-1.5 text-slate-300 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-emerald-50"
                      title="Voir détail"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </td>
                </tr>

                {/* Sous-lignes par type de réclamation */}
                {expandedKPI4 &&
                  kpis.temps_moyen_traitement.par_type.map((item) => (
                    <tr key={`kpi4-${item.type_id}`} className="bg-slate-50/30">
                      <td className="px-5 py-2.5 text-sm text-slate-600 pl-[4.5rem]">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 mr-2 font-medium">
                          {item.categorie}
                        </span>
                        {item.nom}
                      </td>
                      <td className="px-5 py-2.5"></td>
                      <td className="px-5 py-2.5 text-right text-sm text-slate-700">
                        {item.valeur != null ? `${item.valeur}h` : '-'}
                      </td>
                      <td className="px-5 py-2.5 hidden sm:table-cell"></td>
                      <td className="px-5 py-2.5 hidden sm:table-cell"></td>
                      <td className="px-5 py-2.5"></td>
                      <td className="px-5 py-2.5"></td>
                    </tr>
                  ))}
              </>
            );
          })()}
        </tbody>
      </table>
    </div>
  );
}
