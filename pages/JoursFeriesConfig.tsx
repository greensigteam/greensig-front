import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, Download, AlertTriangle, Check } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';

/**
 * ✅ PHASE 3.2: Configuration des jours fériés
 *
 * Permet de définir les jours fériés nationaux et locaux.
 * Utilisé pour le skipping automatique de jours lors de la planification.
 */

interface JourFerie {
  id: number;
  nom: string;
  date: string;
  type_ferie: string;
  type_ferie_display: string;
  recurrent: boolean;
  description: string;
  actif: boolean;
}

interface JourFerieForm {
  nom: string;
  date: string;
  type_ferie: string;
  recurrent: boolean;
  description: string;
  actif: boolean;
}

const TYPE_FERIE_OPTIONS = [
  { value: 'NATIONAL', label: 'Férié national', color: 'bg-red-100 text-red-800' },
  { value: 'LOCAL', label: 'Férié local', color: 'bg-blue-100 text-blue-800' },
  { value: 'RELIGIEUX', label: 'Férié religieux', color: 'bg-purple-100 text-purple-800' },
  { value: 'AUTRE', label: 'Autre', color: 'bg-gray-100 text-gray-800' },
];

const JoursFeriesConfig: React.FC<{ triggerCreate?: number }> = ({ triggerCreate }) => {
  const { showToast } = useToast();
  const [joursFeries, setJoursFeries] = useState<JourFerie[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingJour, setEditingJour] = useState<JourFerie | null>(null);
  const [deletingJourId, setDeletingJourId] = useState<number | null>(null);
  const [importConfirmAnnee, setImportConfirmAnnee] = useState<number | null>(null);
  const [formData, setFormData] = useState<JourFerieForm>({
    nom: '',
    date: '',
    type_ferie: 'NATIONAL',
    recurrent: false,
    description: '',
    actif: true,
  });

  // Charger les jours fériés
  useEffect(() => {
    loadJoursFeries();
  }, []);

  // Ouvrir modal quand triggerCreate change
  useEffect(() => {
    if (triggerCreate && triggerCreate > 0) {
      handleOpenCreate();
    }
  }, [triggerCreate]);

  const loadJoursFeries = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/users/jours-feries/');
      setJoursFeries(response.data.results || response.data);
    } catch (error) {
      showToast('Erreur lors du chargement des jours fériés', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingJour(null);
    setFormData({
      nom: '',
      date: '',
      type_ferie: 'NATIONAL',
      recurrent: false,
      description: '',
      actif: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (jour: JourFerie) => {
    setEditingJour(jour);
    setFormData({
      nom: jour.nom,
      date: jour.date,
      type_ferie: jour.type_ferie,
      recurrent: jour.recurrent,
      description: jour.description,
      actif: jour.actif,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      if (editingJour) {
        // Mise à jour
        await api.patch(`/api/users/jours-feries/${editingJour.id}/`, formData);
        showToast('Jour férié modifié avec succès', 'success');
      } else {
        // Création
        await api.post('/api/users/jours-feries/', formData);
        showToast('Jour férié ajouté avec succès', 'success');
      }

      setShowModal(false);
      loadJoursFeries();
    } catch (error: any) {
      showToast(
        error.response?.data?.error ||
          error.response?.data?.non_field_errors?.[0] ||
          'Erreur lors de la sauvegarde',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    setDeletingJourId(id);
  };

  const confirmDelete = async () => {
    if (!deletingJourId) return;

    try {
      await api.delete(`/api/users/jours-feries/${deletingJourId}/`);
      showToast('Jour férié supprimé avec succès', 'success');
      loadJoursFeries();
    } catch (error) {
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setDeletingJourId(null);
    }
  };

  const handleImporterMaroc = (annee: number) => {
    setImportConfirmAnnee(annee);
  };

  const confirmImport = async () => {
    if (!importConfirmAnnee) return;

    setLoading(true);
    try {
      const response = await api.post('/api/users/jours-feries/importer_feries_maroc/', {
        annee: importConfirmAnnee,
      });
      showToast(response.data.message, 'success');
      loadJoursFeries();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Erreur lors de l'import", 'error');
    } finally {
      setLoading(false);
      setImportConfirmAnnee(null);
    }
  };

  const getTypeColor = (type: string) => {
    return (
      TYPE_FERIE_OPTIONS.find((opt) => opt.value === type)?.color || 'bg-gray-100 text-gray-800'
    );
  };

  // Grouper par année
  const joursFeriesParAnnee = joursFeries.reduce(
    (acc, jour) => {
      const annee = new Date(jour.date).getFullYear();
      if (!acc[annee]) acc[annee] = [];
      acc[annee].push(jour);
      return acc;
    },
    {} as Record<number, JourFerie[]>,
  );

  const annees = Object.keys(joursFeriesParAnnee)
    .map(Number)
    .sort((a, b) => b - a);
  const anneeActuelle = new Date().getFullYear();

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {joursFeries.length} jour{joursFeries.length > 1 ? 's' : ''} férié
            {joursFeries.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleImporterMaroc(anneeActuelle)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Importer {anneeActuelle}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm border border-amber-200">
        <AlertTriangle className="w-4 h-4" />
        Les jours fériés actifs sont automatiquement skippés lors de la génération de tâches
        récurrentes.
      </div>

      {/* Liste des jours fériés par année */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && joursFeries.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : joursFeries.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-lg font-medium">Aucun jour férié configuré</p>
            <p className="text-sm mt-1">Importez les jours fériés ou ajoutez-les manuellement</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {annees.map((annee) => (
              <div key={annee}>
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-800">Année {annee}</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {(joursFeriesParAnnee[annee] ?? [])
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((jour) => (
                      <div
                        key={jour.id}
                        className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-16 text-center">
                            <div className="text-2xl font-bold text-slate-800">
                              {new Date(jour.date).getDate()}
                            </div>
                            <div className="text-xs text-slate-500 uppercase">
                              {new Date(jour.date).toLocaleDateString('fr-FR', { month: 'short' })}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-slate-800">{jour.nom}</h4>
                              {!jour.actif && (
                                <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded">
                                  Inactif
                                </span>
                              )}
                              {jour.recurrent && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Récurrent
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 text-xs rounded font-medium ${getTypeColor(jour.type_ferie)}`}
                              >
                                {jour.type_ferie_display}
                              </span>
                              {jour.description && (
                                <span className="text-sm text-slate-500">{jour.description}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(jour)}
                            className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(jour.id)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal création/édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800">
                {editingJour ? 'Modifier le jour férié' : 'Ajouter un jour férié'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Ex: Fête du Travail"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  disabled={!!editingJour}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
                />
                {editingJour && (
                  <p className="text-xs text-slate-500 mt-1">
                    La date ne peut pas être modifiée après création
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={formData.type_ferie}
                  onChange={(e) => setFormData({ ...formData, type_ferie: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {TYPE_FERIE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description (optionnelle)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Description ou notes supplémentaires..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.recurrent}
                    onChange={(e) => setFormData({ ...formData, recurrent: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700">Récurrent annuellement</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.actif}
                    onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700">Actif</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 font-medium"
                >
                  <Check className="w-4 h-4" />
                  {loading ? 'Enregistrement...' : editingJour ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {deletingJourId && (
        <ConfirmDeleteModal
          title="Supprimer ce jour férié ?"
          message="Cette action est irréversible. Le jour férié sera définitivement supprimé."
          onConfirm={confirmDelete}
          onCancel={() => setDeletingJourId(null)}
        />
      )}

      {/* Modal de confirmation d'import */}
      {importConfirmAnnee && (
        <ConfirmDeleteModal
          title="Importer les jours fériés ?"
          message={`Importer automatiquement les jours fériés marocains pour l'année ${importConfirmAnnee} ?`}
          confirmText="Importer"
          onConfirm={confirmImport}
          onCancel={() => setImportConfirmAnnee(null)}
        />
      )}
    </div>
  );
};

export default JoursFeriesConfig;
