import React, { useState } from 'react';
import { Users as UsersIcon, Award, Gauge, UserPlus, Plus } from 'lucide-react';

// Import des composants de configuration
import CompetencesConfig from './CompetencesConfig';
import Users from './Users';
import RatiosProductivite from './RatiosProductivite';

/**
 * Page centralisée des paramètres et configurations système
 * Accessible uniquement aux administrateurs
 * Organisée en sections : Utilisateurs, Compétences, Ratios de productivité
 */

type ParametresTab = 'utilisateurs' | 'competences' | 'ratios';

const Parametres: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ParametresTab>('utilisateurs');
  const [createTrigger, setCreateTrigger] = useState(0);

  const handleCreate = () => {
    setCreateTrigger(prev => prev + 1);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toolbar avec Tabs et Action Button */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
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

      {/* Content Area */}
      <div className="min-h-0">
        {activeTab === 'utilisateurs' && <Users triggerCreate={createTrigger} />}
        {activeTab === 'competences' && <CompetencesConfig triggerCreate={createTrigger} />}
        {activeTab === 'ratios' && <RatiosProductivite triggerCreate={createTrigger} />}
      </div>
    </div>
  );
};

export default Parametres;
