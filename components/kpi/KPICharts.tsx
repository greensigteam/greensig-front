import React from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { DetailCard } from './KPICard';
import { KPI_COLORS } from '../../hooks/useKPIData';

interface KPIEvolutionChartProps {
    chartData: Array<Record<string, any>>;
    visibleKPIs: Set<string>;
}

export const KPIEvolutionChart: React.FC<KPIEvolutionChartProps> = ({ chartData, visibleKPIs }) => {
    return (
        <DetailCard title="Evolution sur 6 mois (tous les KPIs)">
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: '%', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: 'heures', angle: 90, position: 'insideRight', fontSize: 11 }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        {/* KPI 1: Respect planning (%) */}
                        {visibleKPIs.has('respect_planning') && (
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="Respect planning"
                                stroke={KPI_COLORS.respect_planning}
                                strokeWidth={2}
                                dot={{ fill: KPI_COLORS.respect_planning, r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                        )}
                        {/* KPI 2: Claims completion (%) */}
                        {visibleKPIs.has('taux_realisation_reclamations') && (
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="Réalisation réclamations"
                                stroke={KPI_COLORS.taux_realisation_reclamations}
                                strokeWidth={2}
                                dot={{ fill: KPI_COLORS.taux_realisation_reclamations, r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                        )}
                        {/* KPI 3: Claims processing time (h) */}
                        {visibleKPIs.has('temps_moyen_traitement_reclamations') && (
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="Temps traitement (h)"
                                stroke={KPI_COLORS.temps_moyen_traitement_reclamations}
                                strokeWidth={2}
                                dot={{ fill: KPI_COLORS.temps_moyen_traitement_reclamations, r: 3 }}
                                activeDot={{ r: 5 }}
                                strokeDasharray="5 5"
                            />
                        )}
                        {/* KPI 4: Task time (h) */}
                        {visibleKPIs.has('temps_realisation_taches') && (
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="Temps tâche (h)"
                                stroke={KPI_COLORS.temps_realisation_taches}
                                strokeWidth={2}
                                dot={{ fill: KPI_COLORS.temps_realisation_taches, r: 3 }}
                                activeDot={{ r: 5 }}
                                strokeDasharray="5 5"
                            />
                        )}
                        {/* KPI 5: Total work (h) */}
                        {visibleKPIs.has('temps_travail_par_site') && (
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="Total travail (h)"
                                stroke={KPI_COLORS.temps_travail_par_site}
                                strokeWidth={2}
                                dot={{ fill: KPI_COLORS.temps_travail_par_site, r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-2 text-xs text-slate-500 text-center">
                Axe gauche: pourcentages (%) | Axe droit: heures (h) | Lignes pointillées: temps moyens
            </div>
        </DetailCard>
    );
};

interface SitesChartProps {
    sitesData: Array<any>;
}

export const SitesChart: React.FC<SitesChartProps> = ({ sitesData }) => {
    return (
        <DetailCard title="Temps de travail par site">
            {sitesData.length > 0 ? (
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sitesData} layout="vertical" margin={{ left: 100 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis
                                dataKey="site_nom"
                                type="category"
                                tick={{ fontSize: 12 }}
                                width={100}
                            />
                            <Tooltip
                                formatter={(value: number) => [`${value}h`, 'Heures']}
                            />
                            <Bar dataKey="heures" name="Heures" radius={[0, 4, 4, 0]}>
                                {sitesData.map((entry: any, index: number) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={KPI_COLORS.temps_travail_par_site}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-80 flex items-center justify-center text-slate-400">
                    Aucune donnée disponible
                </div>
            )}
        </DetailCard>
    );
};

interface KPIDetailsPlanningProps {
    details: Record<string, any>;
}

export const KPIDetailPlanning: React.FC<KPIDetailsPlanningProps> = ({ details }) => {
    return (
        <DetailCard title="Détails - Respect du planning">
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-600">
                            {details?.taches_en_avance ?? 0}
                        </div>
                        <div className="text-xs text-emerald-700">En avance/à l'heure</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                            {details?.taches_retard_1_7j ?? 0}
                        </div>
                        <div className="text-xs text-orange-700">Retard 1-7j</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                            {details?.taches_retard_critique ?? 0}
                        </div>
                        <div className="text-xs text-red-700">Retards &gt; 7j</div>
                    </div>
                </div>

                {/* Distributions incomplètes */}
                {details?.taches_distributions_incompletes > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-700 text-sm font-medium mb-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {details.taches_distributions_incompletes} tâche(s) marquée(s) terminée(s) mais distributions incomplètes
                        </div>
                    </div>
                )}

                {details?.details_retards_critiques?.length > 0 && (
                    <div className="mt-4">
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Tâches avec retard critique</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {details.details_retards_critiques.map((tache: any) => (
                                <div key={tache.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                                    <span className="text-sm text-red-800 truncate">{tache.titre}</span>
                                    <span className="text-xs text-red-600 font-medium">+{tache.retard_max_jours}j</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </DetailCard>
    );
};

interface KPIDetailReclamationsProps {
    details: Record<string, any>;
}

export const KPIDetailReclamations: React.FC<KPIDetailReclamationsProps> = ({ details }) => {
    return (
        <DetailCard title="Détails - Réclamations">
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                            {details?.total_ouvertes ?? 0}
                        </div>
                        <div className="text-xs text-blue-700">Ouvertes ce mois</div>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-600">
                            {details?.realisees ?? 0}
                        </div>
                        <div className="text-xs text-emerald-700">Clôturées ce mois</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                            {details?.non_realisees ?? 0}
                        </div>
                        <div className="text-xs text-orange-700">Non clôturées</div>
                    </div>
                </div>

                {details?.par_statut && Object.keys(details.par_statut).length > 0 && (
                    <div className="mt-4">
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Par statut</h4>
                        <div className="space-y-2">
                            {Object.entries(details.par_statut).map(([statut, count]) => (
                                <div key={statut} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                    <span className="text-sm text-slate-700">{statut}</span>
                                    <span className="text-sm font-medium text-slate-900">{count as number}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </DetailCard>
    );
};

export default KPIEvolutionChart;
