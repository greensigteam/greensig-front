import React from 'react';
import { BarChart3, TrendingUp, Users, AlertTriangle, Calendar } from 'lucide-react';

// User 8.8.1: Global Dashboard & Reporting
const Reporting: React.FC = () => {
    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Rapports & Statistiques</h1>
                    <p className="text-gray-500">Analyse de la performance et de l'activité</p>
                </div>
                <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Exporter le rapport mensuel
                </button>
            </div>

            {/* User 8.8.2: Performance Interventions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                        Performance des Interventions
                    </h2>
                    <div className="space-y-4">
                        {/* Mock Charts using CSS bars */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Taux de réalisation</span>
                                <span className="font-bold text-emerald-600">92%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: '92%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Respect des délais</span>
                                <span className="font-bold text-blue-600">85%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '85%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Satisfaction client</span>
                                <span className="font-bold text-orange-500">4.5/5</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                <div className="bg-orange-500 h-2.5 rounded-full" style={{ width: '90%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* User 8.8.3: Team Workload */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Charge des Équipes
                    </h2>
                    <div className="space-y-4">
                        {['Équipe A - Tonte', 'Équipe B - Taille', 'Équipe C - Irrigation'].map((team, idx) => (
                            <div key={idx} className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-700 w-32 truncate">{team}</span>
                                <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${idx === 1 ? 'bg-red-500' : 'bg-blue-500'}`}
                                        style={{ width: idx === 1 ? '95%' : '70%' }}
                                    ></div>
                                </div>
                                <span className="text-xs font-bold text-gray-600">{idx === 1 ? '95%' : '70%'}</span>
                            </div>
                        ))}
                        <p className="text-xs text-gray-500 mt-2 italic">
                            * L'Équipe B est proche de la saturation cette semaine.
                        </p>
                    </div>
                </div>
            </div>

            {/* User 8.8.4: Claims Analysis */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Analyse des Réclamations
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                        <div className="text-2xl font-bold text-red-600">12</div>
                        <div className="text-xs text-red-800 font-medium">Nouvelles (7j)</div>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                        <div className="text-2xl font-bold text-orange-600">5</div>
                        <div className="text-xs text-orange-800 font-medium">En retard</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                        <div className="text-2xl font-bold text-green-600">28</div>
                        <div className="text-xs text-green-800 font-medium">Résolues (7j)</div>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Répartition par type</h3>
                    <div className="flex h-4 rounded-full overflow-hidden">
                        <div className="bg-blue-500 w-[40%]" title="Qualité (40%)"></div>
                        <div className="bg-red-500 w-[20%]" title="Sécurité (20%)"></div>
                        <div className="bg-yellow-500 w-[30%]" title="Esthétique (30%)"></div>
                        <div className="bg-gray-400 w-[10%]" title="Autre (10%)"></div>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500 justify-center">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Qualité</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Sécurité</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div> Esthétique</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reporting;
