import React, { useState } from 'react';
import { Plus, Users, UserCheck, Calendar, TrendingUp } from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import {
  MOCK_TEAMS,
  MOCK_TEAM_MEMBERS,
  Team,
  TeamMember,
  getTeamMembers
} from '../services/mockData';

// User 5.5.1: Create Team Form
const CreateTeamModal: React.FC<{
  onClose: () => void;
  onCreate: (team: Partial<Team>) => void;
}> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    leaderId: '',
    members: [] as string[]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Nouvelle équipe</h2>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'équipe <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Ex: Équipe C - Irrigation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chef d'équipe <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.leaderId}
                onChange={(e) => setFormData({ ...formData, leaderId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">Sélectionner</option>
                {MOCK_TEAM_MEMBERS.filter(m => m.role === 'chef').map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Membres</label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {MOCK_TEAM_MEMBERS.map((member) => (
                  <label key={member.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.members.includes(member.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, members: [...formData.members, member.id] });
                        } else {
                          setFormData({ ...formData, members: formData.members.filter(id => id !== member.id) });
                        }
                      }}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-sm">{member.name} ({member.role})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// User 5.5.5: Member Detail Modal
const MemberDetailModal: React.FC<{
  member: TeamMember;
  onClose: () => void;
}> = ({ member, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">{member.name}</h2>
          <p className="text-sm text-gray-500 capitalize">{member.role}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div>
            <label className="text-sm font-medium text-gray-500">Statut</label>
            <div className="mt-1">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${member.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                {member.available ? 'Disponible' : 'Indisponible'}
              </span>
            </div>
          </div>

          {/* Skills (User 5.5.2) */}
          <div>
            <label className="text-sm font-medium text-gray-500 mb-2 block">Compétences</label>
            <div className="flex flex-wrap gap-2">
              {member.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium capitalize"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Placeholder for future features */}
          <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Historique RH et disponibilités</p>
            <p className="text-xs mt-1">(User 5.5.3, 5.5.4 - À implémenter)</p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Teams Component
const Teams: React.FC = () => {
  const [teams, setTeams] = useState(MOCK_TEAMS);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // User 5.5.1: Create team
  const handleCreateTeam = (data: Partial<Team>) => {
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name: data.name!,
      leaderId: data.leaderId!,
      members: data.members || [],
      active: true
    };
    setTeams([...teams, newTeam]);
  };

  // Table columns
  const columns: Column<Team>[] = [
    {
      key: 'name',
      label: 'Nom'
    },
    {
      key: 'leaderId',
      label: 'Chef',
      render: (team) => {
        const leader = MOCK_TEAM_MEMBERS.find(m => m.id === team.leaderId);
        return leader?.name || '-';
      }
    },
    {
      key: 'members',
      label: 'Membres',
      render: (team) => `${team.members.length} membre${team.members.length > 1 ? 's' : ''}`,
      sortable: false
    },
    {
      key: 'active',
      label: 'Statut',
      render: (team) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${team.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
          {team.active ? 'Active' : 'Inactive'}
        </span>
      ),
      sortable: false
    }
  ];

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Équipes</h1>
          <p className="text-gray-500 mt-1">Gestion des équipes opérationnelles</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Nouvelle équipe
        </button>
      </div>

      {/* Teams Table */}
      <div className="mb-6 flex-1 overflow-hidden">
        <DataTable
          data={teams}
          columns={columns}
          itemsPerPage={10}
        />
      </div>

      {/* Team Members Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tous les opérateurs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_TEAM_MEMBERS.map((member) => (
            <div
              key={member.id}
              onClick={() => setSelectedMember(member)}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{member.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{member.role}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {member.skills.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs capitalize"
                  >
                    {skill}
                  </span>
                ))}
                {member.skills.length > 3 && (
                  <span className="px-2 py-0.5 text-gray-500 text-xs">
                    +{member.skills.length - 3}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateForm && (
        <CreateTeamModal
          onClose={() => setShowCreateForm(false)}
          onCreate={handleCreateTeam}
        />
      )}

      {/* Member Detail Modal */}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
};

export default Teams;
