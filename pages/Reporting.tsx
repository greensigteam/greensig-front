import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Trees,
  Droplet,
  Building2,
  FileText,
  Target,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiFetch } from '../services/api';
import LoadingScreen from '../components/LoadingScreen';
import MonthlyReport from './MonthlyReport';
import WeeklyReport from './WeeklyReport';
import { KPITab } from '../components/kpi/KPITab';
import { useCurrentUser } from '../hooks/queries';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Couleurs pour les graphiques
const COLORS = {
  gray: '#6b7280',
};

const STATE_COLORS: Record<string, string> = {
  bon: '#22c55e',
  moyen: '#eab308',
  mauvais: '#f97316',
  critique: '#ef4444',
};

interface ReportingData {
  taches: {
    total: number;
    terminees: number;
    en_cours: number;
    planifiees: number;
    en_retard: number;
    taux_realisation: number;
    taux_respect_delais: number;
    terminees_7j: number;
    creees_7j: number;
  };
  reclamations: {
    total: number;
    nouvelles_7j: number;
    resolues_7j: number;
    par_statut: Record<string, number>;
    par_type: Array<{ type_reclamation__nom_reclamation: string; count: number }>;
    delai_moyen_heures: number | null;
    satisfaction_moyenne: number | null;
    nombre_evaluations: number;
  };
  equipes: {
    total: number;
    actives: number;
    charge_moyenne: number;
    charges: Array<{
      id: number;
      nom: string;
      charge_percent: number;
      nb_taches: number;
      operateurs_total: number;
      operateurs_disponibles: number;
    }>;
  };
  inventaire: {
    total_objets: number;
    vegetation: {
      total: number;
      par_type: Record<string, number>;
    };
    hydraulique: {
      total: number;
      par_type: Record<string, number>;
    };
    par_etat: Record<string, number>;
    sites: {
      total: number;
      actifs: number;
    };
  };
}

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: { value: number; label: string };
}> = ({ title, value, subtitle, icon, color, trend }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        {trend && (
          <p className={`text-xs mt-1 ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend.value >= 0 ? '+' : ''}
            {trend.value} {trend.label}
          </p>
        )}
      </div>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
    </div>
  </div>
);

type TabType = 'statistics' | 'monthly' | 'weekly' | 'kpis';

const Reporting: React.FC = () => {
  const { data: currentUser } = useCurrentUser();
  const isClient = currentUser?.roles?.includes('CLIENT');
  const [activeTab, setActiveTab] = useState<TabType>('statistics');
  const [data, setData] = useState<ReportingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`${API_BASE_URL}/reporting/`);
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'statistics') {
      loadData();
    }
  }, [activeTab]);

  const allTabs = [
    { id: 'statistics' as TabType, label: 'Statistiques', icon: BarChart3 },
    { id: 'kpis' as TabType, label: 'KPIs', icon: Target },
    { id: 'monthly' as TabType, label: 'Rapport de Site mensuel', icon: FileText },
    { id: 'weekly' as TabType, label: 'Rapport Hebdomadaire', icon: Calendar },
  ];
  const tabs = isClient ? allTabs.filter((t) => t.id !== 'monthly' && t.id !== 'weekly') : allTabs;

  // Render tab content based on active tab
  if (activeTab === 'monthly') {
    return (
      <div className="flex flex-col">
        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-100 px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
          <div className="w-full overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium text-sm rounded-t-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-slate-50">
          <MonthlyReport />
        </div>
      </div>
    );
  }

  if (activeTab === 'weekly') {
    return (
      <div className="flex flex-col">
        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-100 px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
          <div className="w-full overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium text-sm rounded-t-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-slate-50">
          <WeeklyReport />
        </div>
      </div>
    );
  }

  if (activeTab === 'kpis') {
    return (
      <div className="flex flex-col">
        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-100 px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
          <div className="w-full overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium text-sm rounded-t-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-slate-50">
          <KPITab />
        </div>
      </div>
    );
  }

  // Statistics tab content
  if (loading) {
    return (
      <div className="fixed inset-0 z-50">
        <LoadingScreen isLoading={true} loop={true} minDuration={0} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col">
        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-100 px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
          <div className="w-full overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium text-sm rounded-t-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur de chargement</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Préparer les données pour les graphiques
  const etatData = Object.entries(data.inventaire.par_etat)
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0);

  const inventaireData = [
    { name: 'Végétation', value: data.inventaire.vegetation.total, color: '#22c55e' },
    { name: 'Hydraulique', value: data.inventaire.hydraulique.total, color: '#3b82f6' },
  ];

  return (
    <div className="flex flex-col">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-slate-100 px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
        <div className="w-full overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-50">
        <div className="p-6 space-y-6 w-full max-w-[1920px] mx-auto">
          {/* KPIs principaux */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Objets"
              value={data.inventaire.total_objets.toLocaleString()}
              subtitle={`${data.inventaire.sites.actifs} sites actifs`}
              icon={<Building2 className="w-6 h-6 text-white" />}
              color="bg-emerald-600"
            />
            <StatCard
              title="Tâches Actives"
              value={data.taches.en_cours + data.taches.planifiees}
              subtitle={`${data.taches.en_retard} en retard`}
              icon={<Calendar className="w-6 h-6 text-white" />}
              color="bg-blue-600"
              trend={{ value: data.taches.creees_7j, label: 'cette semaine' }}
            />
            <StatCard
              title="Réclamations"
              value={data.reclamations.total}
              icon={<AlertTriangle className="w-6 h-6 text-white" />}
              color="bg-orange-600"
              trend={{ value: data.reclamations.nouvelles_7j, label: 'nouvelles (7j)' }}
            />
            <StatCard
              title="Équipes Actives"
              value={data.equipes.actives}
              subtitle={`Charge moy. ${data.equipes.charge_moyenne}%`}
              icon={<Users className="w-6 h-6 text-white" />}
              color="bg-purple-600"
            />
          </div>

          {/* Inventaire */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Répartition Végétation / Hydraulique */}
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                Répartition de l'Inventaire
              </h2>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height={192} minWidth={0}>
                  <PieChart>
                    <Pie
                      data={inventaireData}
                      cx="30%"
                      cy="50%"
                      labelLine={false}
                      label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={65}
                      dataKey="value"
                    >
                      {inventaireData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      wrapperStyle={{ fontSize: '11px', paddingLeft: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <Trees className="w-8 h-8 text-emerald-600" />
                  <div>
                    <div className="text-xl font-bold text-slate-800">
                      {data.inventaire.vegetation.total}
                    </div>
                    <div className="text-xs text-slate-500">Végétation</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Droplet className="w-8 h-8 text-blue-600" />
                  <div>
                    <div className="text-xl font-bold text-slate-800">
                      {data.inventaire.hydraulique.total}
                    </div>
                    <div className="text-xs text-slate-500">Hydraulique</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Distribution par État */}
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Distribution par État</h2>
              {etatData.length > 0 ? (
                <>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height={192} minWidth={0}>
                      <PieChart>
                        <Pie
                          data={etatData}
                          cx="30%"
                          cy="50%"
                          labelLine={false}
                          label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                          outerRadius={65}
                          dataKey="value"
                        >
                          {etatData.map((entry) => (
                            <Cell
                              key={`cell-${entry.name}`}
                              fill={STATE_COLORS[entry.name] || COLORS.gray}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend
                          layout="vertical"
                          verticalAlign="middle"
                          align="right"
                          wrapperStyle={{ fontSize: '11px', paddingLeft: '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 pt-4 border-t border-slate-100">
                    {Object.entries(data.inventaire.par_etat).map(([state, count]) => (
                      <div key={state} className="text-center">
                        <div
                          className="w-3 h-3 rounded-full mx-auto mb-1"
                          style={{ backgroundColor: STATE_COLORS[state] }}
                        ></div>
                        <div className="text-sm font-bold text-slate-800">{count}</div>
                        <div className="text-xs text-slate-500 capitalize">{state}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  Aucune donnée
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reporting;
