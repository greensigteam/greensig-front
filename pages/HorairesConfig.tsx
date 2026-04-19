import React, { useState, useEffect } from 'react';
import {
  Clock,
  Save,
  X,
  Plus,
  Trash2,
  Edit2,
  Globe,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';

/**
 * ✅ REFONTE: Configuration des horaires de travail
 *
 * Deux modes:
 * 1. Configuration Globale - horaires par défaut pour toutes les équipes
 * 2. Par Équipe - configurations personnalisées qui écrasent la config globale
 */

interface HoraireTravail {
  id: number;
  equipe: number | null; // null = global
  equipe_nom: string;
  jour_semaine: string;
  jour_semaine_display: string;
  heure_debut: string;
  heure_fin: string;
  duree_pause_minutes: number;
  actif: boolean;
  heures_travaillables: number;
}

interface Equipe {
  id: number;
  nom_equipe: string;
  actif: boolean;
}

interface HoraireFormData {
  jour_semaine: string;
  heure_debut: string;
  heure_fin: string;
  duree_pause_minutes: number;
}

const JOURS_SEMAINE = [
  { code: 'LUN', label: 'Lundi' },
  { code: 'MAR', label: 'Mardi' },
  { code: 'MER', label: 'Mercredi' },
  { code: 'JEU', label: 'Jeudi' },
  { code: 'VEN', label: 'Vendredi' },
  { code: 'SAM', label: 'Samedi' },
  { code: 'DIM', label: 'Dimanche' },
];

type TabType = 'global' | 'par-equipe';

const HorairesConfig: React.FC<{ triggerCreate?: number }> = ({
  triggerCreate: _triggerCreate,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [horairesGlobaux, setHorairesGlobaux] = useState<HoraireTravail[]>([]);
  const [horairesEquipes, setHorairesEquipes] = useState<HoraireTravail[]>([]);
  const [loading, setLoading] = useState(false);

  // États pour les modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHoraire, setEditingHoraire] = useState<HoraireTravail | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForEquipe, setCreateForEquipe] = useState<number | null>(null);
  const [deletingHoraireId, setDeletingHoraireId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState<HoraireFormData>({
    jour_semaine: 'LUN',
    heure_debut: '08:00',
    heure_fin: '17:00',
    duree_pause_minutes: 60,
  });

  // Équipes expanded
  const [expandedEquipes, setExpandedEquipes] = useState<number[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger équipes
      const equipesRes = await api.get('/api/users/equipes/');
      setEquipes(equipesRes.data.results || equipesRes.data);

      // Charger TOUS les horaires
      const horairesRes = await api.get('/api/users/horaires/');
      const allHoraires = horairesRes.data.results || horairesRes.data;

      // Séparer globaux (equipe = null) et par équipe
      setHorairesGlobaux(allHoraires.filter((h: HoraireTravail) => h.equipe === null));
      setHorairesEquipes(allHoraires.filter((h: HoraireTravail) => h.equipe !== null));
    } catch (error) {
      showToast('Erreur lors du chargement des horaires', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getHorairesForEquipe = (equipeId: number): HoraireTravail[] => {
    return horairesEquipes.filter((h) => h.equipe === equipeId);
  };

  const hasCustomConfig = (equipeId: number): boolean => {
    return getHorairesForEquipe(equipeId).length > 0;
  };

  const toggleEquipe = (equipeId: number) => {
    setExpandedEquipes((prev) =>
      prev.includes(equipeId) ? prev.filter((id) => id !== equipeId) : [...prev, equipeId],
    );
  };

  const handleEdit = (horaire: HoraireTravail) => {
    setEditingHoraire(horaire);
    setFormData({
      jour_semaine: horaire.jour_semaine,
      heure_debut: horaire.heure_debut,
      heure_fin: horaire.heure_fin,
      duree_pause_minutes: horaire.duree_pause_minutes,
    });
    setShowEditModal(true);
  };

  const handleCreate = (equipeId: number | null = null) => {
    setCreateForEquipe(equipeId);
    setFormData({
      jour_semaine: 'LUN',
      heure_debut: '08:00',
      heure_fin: '17:00',
      duree_pause_minutes: 60,
    });
    setShowCreateModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingHoraire) return;

    setLoading(true);
    try {
      await api.patch(`/api/users/horaires/${editingHoraire.id}/`, formData);
      showToast('Horaire modifié avec succès', 'success');
      setShowEditModal(false);
      setEditingHoraire(null);
      loadData();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Erreur lors de la modification', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCreate = async () => {
    setLoading(true);
    try {
      // Construire le payload : ne pas inclure 'equipe' si null (config globale)
      const payload: any = {
        ...formData,
        actif: true,
      };

      // Ajouter equipe uniquement si c'est une config par équipe
      if (createForEquipe !== null) {
        payload.equipe = createForEquipe;
      }

      await api.post('/api/users/horaires/', payload);
      showToast('Horaire créé avec succès', 'success');
      setShowCreateModal(false);
      setCreateForEquipe(null);
      loadData();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Erreur lors de la création', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (horaireId: number) => {
    setDeletingHoraireId(horaireId);
  };

  const confirmDelete = async () => {
    if (!deletingHoraireId) return;

    try {
      await api.delete(`/api/users/horaires/${deletingHoraireId}/`);
      showToast('Horaire supprimé avec succès', 'success');
      loadData();
    } catch (error) {
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setDeletingHoraireId(null);
    }
  };

  const renderHoraireRow = (
    jour: { code: string; label: string },
    horaire: HoraireTravail | undefined,
    isGlobal: boolean,
  ) => (
    <tr key={jour.code} className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`font-medium ${horaire ? 'text-slate-800' : 'text-slate-400'}`}>
          {jour.label}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {horaire ? (
          <span className="text-sm text-slate-600">
            {horaire.heure_debut} - {horaire.heure_fin}
          </span>
        ) : (
          <span className="text-sm text-slate-400 italic">Non configuré</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {horaire ? (
          <span className="text-sm text-slate-600">{horaire.duree_pause_minutes} min</span>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {horaire ? (
          <span className="text-sm font-semibold text-emerald-600">
            {horaire.heures_travaillables.toFixed(1)}h
          </span>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {horaire ? (
            <>
              <button
                onClick={() => handleEdit(horaire)}
                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                title="Modifier"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(horaire.id)}
                className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() =>
                handleCreate(
                  isGlobal ? null : ((horaire as HoraireTravail | undefined)?.equipe ?? null),
                )
              }
              className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded transition-colors"
              title="Ajouter"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          {/* Mode Filter Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('global')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === 'global'
                  ? 'bg-white shadow-sm text-slate-900 font-medium'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-4 h-4" />
              Globale
            </button>
            <button
              onClick={() => setActiveTab('par-equipe')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === 'par-equipe'
                  ? 'bg-white shadow-sm text-slate-900 font-medium'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              Par équipe
              {horairesEquipes.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                  {new Set(horairesEquipes.map((h) => h.equipe)).size}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
        {activeTab === 'global' && (
          <div className="space-y-4">
            {/* Info */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
              <Globe className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-emerald-900 mb-1">Configuration par défaut</h3>
                <p className="text-sm text-emerald-700">
                  Ces horaires s'appliquent à toutes les équipes qui n'ont pas de configuration
                  personnalisée.
                </p>
              </div>
            </div>

            {/* Button */}
            <div className="flex justify-end">
              <button
                onClick={() => handleCreate(null)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Ajouter un jour
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Jour
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Horaires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Pause
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Heures travaillables
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {JOURS_SEMAINE.map((jour) => {
                    const horaire = horairesGlobaux.find((h) => h.jour_semaine === jour.code);
                    return renderHoraireRow(jour, horaire, true);
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'par-equipe' && (
          <div className="space-y-4">
            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Configurations personnalisées</h3>
                <p className="text-sm text-blue-700">
                  Configurez des horaires spécifiques pour certaines équipes. Ces configurations
                  écrasent la configuration globale.
                </p>
              </div>
            </div>

            {/* Liste des équipes */}
            <div className="space-y-3">
              {equipes.map((equipe) => {
                const hasCustom = hasCustomConfig(equipe.id);
                const isExpanded = expandedEquipes.includes(equipe.id);
                const horaires = getHorairesForEquipe(equipe.id);

                return (
                  <div
                    key={equipe.id}
                    className="bg-white border border-slate-200 rounded-lg overflow-hidden"
                  >
                    {/* Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => toggleEquipe(equipe.id)}
                    >
                      <div className="flex items-center gap-3">
                        <button className="text-slate-400 hover:text-slate-600">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                        <h3 className="font-semibold text-slate-800">{equipe.nom_equipe}</h3>
                        {hasCustom ? (
                          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            Config Personnalisée ({horaires.length} jours)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                            Config Globale
                          </span>
                        )}
                      </div>
                      {!hasCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreate(equipe.id);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Personnaliser
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    {isExpanded && (
                      <div className="border-t border-slate-200">
                        {hasCustom ? (
                          <div className="p-4">
                            <div className="flex justify-end mb-3">
                              <button
                                onClick={() => handleCreate(equipe.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                              >
                                <Plus className="w-4 h-4" />
                                Ajouter un jour
                              </button>
                            </div>
                            <table className="w-full">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                    Jour
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                    Horaires
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                    Pause
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                    Heures travaillables
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {JOURS_SEMAINE.map((jour) => {
                                  const horaire = horaires.find(
                                    (h) => h.jour_semaine === jour.code,
                                  );
                                  return renderHoraireRow(jour, horaire, false);
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="p-8 text-center text-slate-500">
                            <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            <p className="font-medium">Utilise la configuration globale</p>
                            <p className="text-sm mt-1">
                              Cliquez sur "Personnaliser" pour créer une configuration spécifique
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal Édition */}
      {showEditModal && editingHoraire && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                Modifier l'horaire
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Jour</label>
                <input
                  type="text"
                  value={editingHoraire.jour_semaine_display}
                  disabled
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Heure début
                  </label>
                  <input
                    type="time"
                    value={formData.heure_debut}
                    onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Heure fin</label>
                  <input
                    type="time"
                    value={formData.heure_fin}
                    onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pause (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.duree_pause_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, duree_pause_minutes: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                Ajouter un horaire
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Jour</label>
                <select
                  value={formData.jour_semaine}
                  onChange={(e) => setFormData({ ...formData, jour_semaine: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {JOURS_SEMAINE.map((jour) => (
                    <option key={jour.code} value={jour.code}>
                      {jour.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Heure début
                  </label>
                  <input
                    type="time"
                    value={formData.heure_debut}
                    onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Heure fin</label>
                  <input
                    type="time"
                    value={formData.heure_fin}
                    onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pause (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.duree_pause_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, duree_pause_minutes: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveCreate}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {deletingHoraireId && (
        <ConfirmDeleteModal
          title="Supprimer cet horaire ?"
          message="Cette action est irréversible. L'horaire sera définitivement supprimé."
          onConfirm={confirmDelete}
          onCancel={() => setDeletingHoraireId(null)}
        />
      )}
    </div>
  );
};

export default HorairesConfig;
