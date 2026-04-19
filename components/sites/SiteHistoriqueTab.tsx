import { type FC } from 'react';
import { TrendingUp, Clock } from 'lucide-react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { KPIHistoriqueEntry, KPITempsRealisationEntry } from '../../types/kpi';

interface SiteHistoriqueTabProps {
  historiqueData: KPIHistoriqueEntry[];
  isLoadingHistorique: boolean;
  kpiDetailRows: KPITempsRealisationEntry[];
  isLoadingKpiDetail: boolean;
  selectedMois: string;
  onMoisChange: (mois: string) => void;
}

const SiteHistoriqueTab: FC<SiteHistoriqueTabProps> = ({
  historiqueData,
  isLoadingHistorique,
  kpiDetailRows,
  isLoadingKpiDetail,
  selectedMois,
  onMoisChange,
}) => (
  <div className="p-6 space-y-6">
    {/* Tendance 12 mois */}
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-emerald-600" />
        Tendance — 12 derniers mois
      </h3>
      <p className="text-xs text-slate-400 mb-4">Cliquez sur un mois pour afficher le détail</p>
      {isLoadingHistorique ? (
        <div className="h-48 animate-pulse bg-slate-100 rounded-lg" />
      ) : historiqueData.length > 0 ? (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={historiqueData}
              onClick={(data: any) => {
                const payload = data?.activePayload?.[0]?.payload as KPIHistoriqueEntry | undefined;
                if (payload?.mois) onMoisChange(payload.mois);
              }}
              style={{ cursor: 'pointer' }}
              margin={{ left: 0, right: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois_label" tick={{ fontSize: 11 }} />
              <YAxis unit="h" tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}h`, 'Heures']} />
              <Bar dataKey="temps_total_heures" radius={[4, 4, 0, 0]}>
                {historiqueData.map((entry) => (
                  <Cell
                    key={entry.mois}
                    fill={entry.mois === selectedMois ? '#059669' : '#10b981'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
          Aucune donnée disponible
        </div>
      )}
    </div>

    {/* Détail du mois sélectionné */}
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-600" />
          Détail par type de tâche
        </h3>
        <input
          type="month"
          value={selectedMois}
          onChange={(e) => onMoisChange(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {isLoadingKpiDetail ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : kpiDetailRows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 pr-4 text-slate-500 font-medium">Type de tâche</th>
                <th className="text-right py-2 px-4 text-slate-500 font-medium">
                  Heures réalisées
                </th>
                <th className="text-right py-2 pl-4 text-slate-500 font-medium">
                  Nb interventions
                </th>
              </tr>
            </thead>
            <tbody>
              {kpiDetailRows.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2.5 pr-4 font-medium text-slate-800">{row.type_tache}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-emerald-700 font-semibold">
                    {row.heures}h
                  </td>
                  <td className="py-2.5 pl-4 text-right text-slate-600">{row.nb_interventions}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                <td className="py-2.5 pr-4 text-slate-800">Total</td>
                <td className="py-2.5 px-4 text-right font-mono text-emerald-700">
                  {kpiDetailRows.reduce((sum, r) => Math.round((sum + r.heures) * 10) / 10, 0)}h
                </td>
                <td className="py-2.5 pl-4 text-right text-slate-600">
                  {kpiDetailRows.reduce((sum, r) => sum + r.nb_interventions, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center text-slate-400 text-sm">
          <Clock className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          Aucune intervention réalisée ce mois
        </div>
      )}
    </div>
  </div>
);

export default SiteHistoriqueTab;
