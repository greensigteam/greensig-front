import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Award, Gauge, UserPlus, Plus, Clock, Calendar, FileText } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

// Import des composants de configuration
import CompetencesConfig from './CompetencesConfig';
import Users from './Users';
import RatiosProductivite from './RatiosProductivite';
import TypesTachesConfig from './TypesTachesConfig';
import HorairesConfig from './HorairesConfig';
import JoursFeriesConfig from './JoursFeriesConfig';

// ============================================================================
// TYPES
// ============================================================================

type ParametresTab = 'utilisateurs' | 'competences' | 'types-taches' | 'ratios' | 'horaires' | 'jours-feries';

interface TabConfig {
  id: ParametresTab;
  label: string;
  description: string;
  icon: React.ElementType;
  createLabel?: string;
  createIcon?: React.ElementType;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const TABS: TabConfig[] = [
  {
    id: 'utilisateurs',
    label: 'Utilisateurs',
    description: 'Gestion des comptes utilisateurs et de leurs accès',
    icon: UsersIcon,
    createLabel: 'Nouvel utilisateur',
    createIcon: UserPlus
  },
  {
    id: 'competences',
    label: 'Compétences',
    description: 'Définition des compétences assignables aux opérateurs',
    icon: Award,
    createLabel: 'Nouvelle compétence',
    createIcon: Plus
  },
  {
    id: 'types-taches',
    label: 'Types de tâches',
    description: 'Configuration des types de tâches et objets compatibles',
    icon: FileText,
    createLabel: 'Nouveau type',
    createIcon: Plus
  },
  {
    id: 'ratios',
    label: 'Ratios de productivité',
    description: 'Ratios de productivité par type de tâche et objet',
    icon: Gauge,
    createLabel: 'Nouveau ratio',
    createIcon: Plus
  },
  {
    id: 'horaires',
    label: 'Horaires de travail',
    description: 'Configuration des plages horaires de travail',
    icon: Clock
  },
  {
    id: 'jours-feries',
    label: 'Jours fériés',
    description: 'Gestion du calendrier des jours fériés',
    icon: Calendar
  }
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
      active
        ? 'border-emerald-600 text-emerald-600'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
    }`}
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </button>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Parametres: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as ParametresTab | null;

  const validTabs = TABS.map(t => t.id);

  const [activeTab, setActiveTab] = useState<ParametresTab>(
    tabFromUrl && validTabs.includes(tabFromUrl)
      ? tabFromUrl
      : 'utilisateurs'
  );
  const [createTrigger, setCreateTrigger] = useState(0);

  // Mettre à jour l'onglet actif si le paramètre URL change
  useEffect(() => {
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleCreate = () => {
    setCreateTrigger(prev => prev + 1);
  };

  // Configuration de l'onglet actif
  const activeTabConfig = TABS.find(t => t.id === activeTab)!;
  const ActiveIcon = activeTabConfig.icon;
  const CreateIcon = activeTabConfig.createIcon;

  return (
    <div className="bg-slate-50 flex flex-col h-full">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
            <ActiveIcon className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{activeTabConfig.label}</h1>
            <p className="text-sm text-slate-500">{activeTabConfig.description}</p>
          </div>
        </div>

        {/* Action Button */}
        {activeTabConfig.createLabel && CreateIcon && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <CreateIcon className="w-4 h-4" />
            {activeTabConfig.createLabel}
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="flex-shrink-0 bg-white border-b border-slate-100 px-6">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <TabButton
                key={tab.id}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                icon={<Icon className="w-4 h-4" />}
                label={tab.label}
              />
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === 'utilisateurs' && <Users triggerCreate={createTrigger} />}
        {activeTab === 'competences' && <CompetencesConfig triggerCreate={createTrigger} />}
        {activeTab === 'types-taches' && <TypesTachesConfig triggerCreate={createTrigger} />}
        {activeTab === 'ratios' && <RatiosProductivite triggerCreate={createTrigger} />}
        {activeTab === 'horaires' && <HorairesConfig triggerCreate={createTrigger} />}
        {activeTab === 'jours-feries' && <JoursFeriesConfig triggerCreate={createTrigger} />}
      </main>
    </div>
  );
};

export default Parametres;
