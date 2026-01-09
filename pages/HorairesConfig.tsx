import React, { useState, useEffect } from 'react';
import { Clock, Save, X, Plus, Trash2, Calendar } from 'lucide-react';
import { api } from '@/services/api';

/**
 * ✅ PHASE 2.2: Configuration des horaires de travail des équipes
 *
 * Permet de définir les horaires hebdomadaires par équipe.
 * Utilisé pour calculer la charge de travail réelle dans la planification automatique.
 */

interface HoraireTravail {
  id: number;
  equipe: number;
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
  heure_debut: string;
  heure_fin: string;
  duree_pause_minutes: number;
}

interface SemaineCompleteData {
  lundi_vendredi: HoraireFormData;
  samedi: HoraireFormData | null;
  dimanche: HoraireFormData | null;
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

const HorairesConfig: React.FC<{ triggerCreate?: number }> = ({ triggerCreate }) => {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [horaires, setHoraires] = useState<HoraireTravail[]>([]);
  const [selectedEquipe, setSelectedEquipe] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingHoraire, setEditingHoraire] = useState<HoraireTravail | null>(null);

  // Form pour création rapide (toute la semaine)
  const [semaineComplete, setSemaineComplete] = useState<SemaineCompleteData>({
    lundi_vendredi: { heure_debut: '08:00', heure_fin: '17:00', duree_pause_minutes: 60 },
    samedi: { heure_debut: '08:00', heure_fin: '12:00', duree_pause_minutes: 0 },
    dimanche: null,
  });

  // Charger les équipes
  useEffect(() => {
    loadEquipes();
  }, []);

  // Charger les horaires quand une équipe est sélectionnée
  useEffect(() => {
    if (selectedEquipe) {
      loadHoraires();
    }
  }, [selectedEquipe]);

  const loadEquipes = async () => {
    try {
      const response = await api.get('/api/users/equipes/');
      setEquipes(response.data.results || response.data);
      if (response.data.results?.length > 0 || response.data.length > 0) {
        setSelectedEquipe((response.data.results || response.data)[0].id);
      }
    } catch (error) {
      console.error('Erreur chargement équipes:', error);
    }
  };

  const loadHoraires = async () => {
    if (!selectedEquipe) return;

    setLoading(true);
    try {
      const response = await api.get(`/api/users/horaires/?equipe=${selectedEquipe}`);
      setHoraires(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur chargement horaires:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreerSemaineComplete = async () => {
    if (!selectedEquipe) return;

    setLoading(true);
    try {
      await api.post('/api/users/horaires/creer_semaine_complete/', {
        equipe: selectedEquipe,
        lundi_vendredi: semaineComplete.lundi_vendredi,
        samedi: semaineComplete.samedi,
        dimanche: semaineComplete.dimanche,
      });

      alert('Horaires créés avec succès !');
      loadHoraires();
      setShowModal(false);
    } catch (error: any) {
      console.error('Erreur création horaires:', error);
      alert(error.response?.data?.error || 'Erreur lors de la création des horaires');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoraire = async (horaireId: number) => {
    if (!confirm('Supprimer cet horaire ?')) return;

    try {
      await api.delete(`/api/users/horaires/${horaireId}/`);
      loadHoraires();
    } catch (error) {
      console.error('Erreur suppression horaire:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const getHoraireForDay = (jourCode: string): HoraireTravail | undefined => {
    return horaires.find(h => h.jour_semaine === jourCode && h.actif);
  };

  return (
    <div className="space-y-6">
      {/* Sélection équipe */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            Horaires de travail
          </h2>
          <button
            onClick={() => setShowModal(true)}
            disabled={!selectedEquipe}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Calendar className="w-4 h-4" />
            Configurer la semaine
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Équipe
            </label>
            <select
              value={selectedEquipe || ''}
              onChange={(e) => setSelectedEquipe(Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {equipes.map(equipe => (
                <option key={equipe.id} value={equipe.id}>
                  {equipe.nom_equipe}
                </option>
              ))}
            </select>
          </div>

          {!selectedEquipe && (
            <div className="text-center py-8 text-slate-500">
              Sélectionnez une équipe pour voir ses horaires
            </div>
          )}
        </div>
      </div>

      {/* Tableau des horaires */}
      {selectedEquipe && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
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
                {JOURS_SEMAINE.map(jour => {
                  const horaire = getHoraireForDay(jour.code);

                  return (
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
                          <span className="text-sm text-slate-400 italic">
                            Non configuré
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {horaire ? (
                          <span className="text-sm text-slate-600">
                            {horaire.duree_pause_minutes} min
                          </span>
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
                        {horaire && (
                          <button
                            onClick={() => handleDeleteHoraire(horaire.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          )}

          {!loading && horaires.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>Aucun horaire configuré pour cette équipe</p>
              <p className="text-sm">Cliquez sur "Configurer la semaine" pour commencer</p>
            </div>
          )}
        </div>
      )}

      {/* Modal création semaine complète */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-emerald-600" />
                Configurer la semaine
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Lundi - Vendredi */}
              <div className="bg-emerald-50 p-4 rounded-lg">
                <h4 className="font-semibold text-slate-800 mb-4">Lundi - Vendredi</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Début
                    </label>
                    <input
                      type="time"
                      value={semaineComplete.lundi_vendredi.heure_debut}
                      onChange={(e) => setSemaineComplete({
                        ...semaineComplete,
                        lundi_vendredi: { ...semaineComplete.lundi_vendredi, heure_debut: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Fin
                    </label>
                    <input
                      type="time"
                      value={semaineComplete.lundi_vendredi.heure_fin}
                      onChange={(e) => setSemaineComplete({
                        ...semaineComplete,
                        lundi_vendredi: { ...semaineComplete.lundi_vendredi, heure_fin: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Pause (min)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={semaineComplete.lundi_vendredi.duree_pause_minutes}
                      onChange={(e) => setSemaineComplete({
                        ...semaineComplete,
                        lundi_vendredi: { ...semaineComplete.lundi_vendredi, duree_pause_minutes: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Samedi */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-slate-800">Samedi</h4>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={semaineComplete.samedi !== null}
                      onChange={(e) => setSemaineComplete({
                        ...semaineComplete,
                        samedi: e.target.checked ? { heure_debut: '08:00', heure_fin: '12:00', duree_pause_minutes: 0 } : null
                      })}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-600">Travail le samedi</span>
                  </label>
                </div>
                {semaineComplete.samedi && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Début
                      </label>
                      <input
                        type="time"
                        value={semaineComplete.samedi.heure_debut}
                        onChange={(e) => setSemaineComplete({
                          ...semaineComplete,
                          samedi: { ...semaineComplete.samedi!, heure_debut: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Fin
                      </label>
                      <input
                        type="time"
                        value={semaineComplete.samedi.heure_fin}
                        onChange={(e) => setSemaineComplete({
                          ...semaineComplete,
                          samedi: { ...semaineComplete.samedi!, heure_fin: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Pause (min)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={semaineComplete.samedi.duree_pause_minutes}
                        onChange={(e) => setSemaineComplete({
                          ...semaineComplete,
                          samedi: { ...semaineComplete.samedi!, duree_pause_minutes: parseInt(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dimanche */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-slate-800">Dimanche</h4>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={semaineComplete.dimanche !== null}
                      onChange={(e) => setSemaineComplete({
                        ...semaineComplete,
                        dimanche: e.target.checked ? { heure_debut: '08:00', heure_fin: '12:00', duree_pause_minutes: 0 } : null
                      })}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-600">Travail le dimanche</span>
                  </label>
                </div>
                {semaineComplete.dimanche && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Début
                      </label>
                      <input
                        type="time"
                        value={semaineComplete.dimanche.heure_debut}
                        onChange={(e) => setSemaineComplete({
                          ...semaineComplete,
                          dimanche: { ...semaineComplete.dimanche!, heure_debut: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Fin
                      </label>
                      <input
                        type="time"
                        value={semaineComplete.dimanche.heure_fin}
                        onChange={(e) => setSemaineComplete({
                          ...semaineComplete,
                          dimanche: { ...semaineComplete.dimanche!, heure_fin: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Pause (min)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={semaineComplete.dimanche.duree_pause_minutes}
                        onChange={(e) => setSemaineComplete({
                          ...semaineComplete,
                          dimanche: { ...semaineComplete.dimanche!, duree_pause_minutes: parseInt(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreerSemaineComplete}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HorairesConfig;
