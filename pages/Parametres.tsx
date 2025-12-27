import React, { useState } from 'react';
import { Settings, Users as UsersIcon, Award, Gauge } from 'lucide-react';

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

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-6 pb-4 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-emerald-100 rounded-lg">
            <Settings className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paramètres & Configuration</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Gérez les paramètres système et les référentiels de données
            </p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-1 mt-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('utilisateurs')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'utilisateurs'
                ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />
              Utilisateurs
            </span>
          </button>
          <button
            onClick={() => setActiveTab('competences')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'competences'
                ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Compétences
            </span>
          </button>
          <button
            onClick={() => setActiveTab('ratios')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'ratios'
                ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Ratios de productivité
            </span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'utilisateurs' && (
          <div className="h-full">
            <Users />
          </div>
        )}

        {activeTab === 'competences' && (
          <div className="h-full">
            <CompetencesConfig />
          </div>
        )}

        {activeTab === 'ratios' && (
          <div className="h-full">
            <RatiosProductivite />
          </div>
        )}
      </div>
    </div>
  );
};

export default Parametres;
