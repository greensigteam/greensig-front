import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Award, Gauge, UserPlus, Plus, Clock, Calendar } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

// Import des composants de configuration
import CompetencesConfig from './CompetencesConfig';
import Users from './Users';
import RatiosProductivite from './RatiosProductivite';
import HorairesConfig from './HorairesConfig';
import JoursFeriesConfig from './JoursFeriesConfig';

/**
 * Page centralisée des paramètres et configurations système
 * Accessible uniquement aux administrateurs
 * Organisée en sections : Utilisateurs, Compétences, Ratios de productivité, Horaires de travail
 */

type ParametresTab = 'utilisateurs' | 'competences' | 'ratios' | 'horaires' | 'jours-feries';

const Parametres: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as ParametresTab | null;

  const [activeTab, setActiveTab] = useState<ParametresTab>(
    tabFromUrl && ['utilisateurs', 'competences', 'ratios', 'horaires', 'jours-feries'].includes(tabFromUrl)
      ? tabFromUrl
      : 'utilisateurs'
  );
  const [createTrigger, setCreateTrigger] = useState(0);

  // Mettre à jour l'onglet actif si le paramètre URL change
  useEffect(() => {
    if (tabFromUrl && ['utilisateurs', 'competences', 'ratios', 'horaires', 'jours-feries'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleCreate = () => {
    setCreateTrigger(prev => prev + 1);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Toolbar avec Tabs et Action Button */}
      <div className="bg-white p-4 m-6 mb-0 rounded-xl shadow-sm border border-slate-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('utilisateurs')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                activeTab === 'utilisateurs'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <UsersIcon className="w-4 h-4" />
              Utilisateurs
            </button>
            <button
              onClick={() => setActiveTab('competences')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                activeTab === 'competences'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Award className="w-4 h-4" />
              Compétences
            </button>
            <button
              onClick={() => setActiveTab('ratios')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                activeTab === 'ratios'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Gauge className="w-4 h-4" />
              Ratios de productivité
            </button>
            <button
              onClick={() => setActiveTab('horaires')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                activeTab === 'horaires'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              Horaires de travail
            </button>
            <button
              onClick={() => setActiveTab('jours-feries')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                activeTab === 'jours-feries'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Jours fériés
            </button>
          </div>

          {/* Action Buttons */}
          {activeTab === 'utilisateurs' && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              <UserPlus className="w-4 h-4" />
              Nouvel utilisateur
            </button>
          )}
          {activeTab === 'competences' && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Nouvelle compétence
            </button>
          )}
          {activeTab === 'ratios' && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Nouveau ratio
            </button>
          )}
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 pt-4">
        {activeTab === 'utilisateurs' && <Users triggerCreate={createTrigger} />}
        {activeTab === 'competences' && <CompetencesConfig triggerCreate={createTrigger} />}
        {activeTab === 'ratios' && <RatiosProductivite triggerCreate={createTrigger} />}
        {activeTab === 'horaires' && <HorairesConfig triggerCreate={createTrigger} />}
        {activeTab === 'jours-feries' && <JoursFeriesConfig triggerCreate={createTrigger} />}
      </div>
    </div>
  );
};

export default Parametres;
