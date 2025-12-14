import React, { useState, useEffect } from 'react';
import {
  Plus,
  Users,
  UserCheck,
  UserX,
  Calendar,
  Award,
  AlertCircle,
  Search,
  X,
  Check,
  Clock,
  Edit2,
  Trash2,
  Eye
} from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';

import EditEquipeModal from './EditEquipeModal';
import CreateAbsenceModal from './CreateAbsenceModal';
import AbsenceDetailModal from './AbsenceDetailModal';
import EditAbsenceModal from './EditAbsenceModal';
import CompetenceMatrix from '../components/CompetenceMatrix';
import HistoriqueRHPanel from '../components/HistoriqueRHPanel';

// Types
import {
  OperateurList,
  OperateurDetail,
  EquipeList,
  EquipeDetail,
  Absence,
  Competence,
  CategorieCompetence,

  StatutOperateur,
  StatutEquipe,
  StatutAbsence,
  NiveauCompetence,
  STATUT_OPERATEUR_LABELS,
  STATUT_OPERATEUR_COLORS,
  STATUT_EQUIPE_LABELS,
  STATUT_EQUIPE_COLORS,
  STATUT_ABSENCE_LABELS,
  STATUT_ABSENCE_COLORS,
  NIVEAU_COMPETENCE_LABELS,
  NIVEAU_COMPETENCE_COLORS,
  CATEGORIE_COMPETENCE_LABELS,
  TYPE_ABSENCE_LABELS,
  TYPE_ABSENCE_COLORS,
  getBadgeColors,

  NOM_ROLE_LABELS,
  Utilisateur,
  Client
} from '../types/users';

import EditUserModal from '../components/EditUserModal';

// API
import {
  fetchOperateurs,
  fetchOperateurById,
  fetchEquipes,
  fetchEquipeById,
  fetchAbsences,
  fetchAbsencesAValider,
  fetchCompetences,
  fetchChefsPotentiels,
  createCompetence,
  updateCompetence,
  deleteCompetence,
  createEquipe,
  affecterMembres,
  validerAbsence,
  refuserAbsence,
  annulerAbsence,
  fetchStatistiquesUtilisateurs,
  fetchUtilisateurs,
  fetchClients,
  deleteOperateur,
  deleteEquipe
} from '../services/usersApi';

// ============================================================================
// COMPONENTS - Badges
// ============================================================================

const StatutOperateurBadge: React.FC<{ statut?: StatutOperateur | null }> = ({ statut }) => {
  const safe = getBadgeColors(STATUT_OPERATEUR_COLORS, statut);
  const label = statut ? STATUT_OPERATEUR_LABELS[statut] : 'Non renseigné';
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${safe.bg} ${safe.text}`}>
      {label}
    </span>
  );
};

const StatutEquipeBadge: React.FC<{ statut?: StatutEquipe | null }> = ({ statut }) => {
  const safe = getBadgeColors(STATUT_EQUIPE_COLORS, statut);
  const label = statut ? STATUT_EQUIPE_LABELS[statut] : 'Non renseigné';
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${safe.bg} ${safe.text}`}>
      {label}
    </span>
  );
};

const StatutAbsenceBadge: React.FC<{ statut?: StatutAbsence | null }> = ({ statut }) => {
  const safe = getBadgeColors(STATUT_ABSENCE_COLORS, statut);
  const label = statut ? STATUT_ABSENCE_LABELS[statut] : 'Non renseigné';
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${safe.bg} ${safe.text}`}>
      {label}
    </span>
  );
};

const NiveauCompetenceBadge: React.FC<{ niveau?: NiveauCompetence | null }> = ({ niveau }) => {
  const safe = getBadgeColors(NIVEAU_COMPETENCE_COLORS, niveau);
  const label = niveau ? NIVEAU_COMPETENCE_LABELS[niveau] : 'Non renseigné';
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${safe.bg} ${safe.text}`}>
      {label}
    </span>
  );
};

// ============================================================================
// MODAL - Creer une equipe
// ============================================================================

interface CreateTeamModalProps {
  onClose: () => void;
  onCreated: () => void;
  chefsPotentiels: OperateurList[];
  operateursSansEquipe: OperateurList[];
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  onClose,
  onCreated,
  chefsPotentiels,
  operateursSansEquipe
}) => {
  const [formData, setFormData] = useState({
    nomEquipe: '',
    chefEquipe: 0,
    specialite: '',
    membres: [] as number[]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nomEquipe.trim()) {
      setError("Le nom de l'equipe est requis");
      return;
    }
    // chefEquipe is optional: allow creating team without chef

    setLoading(true);
    try {
      const equipe = await createEquipe({
        nomEquipe: formData.nomEquipe,
        chefEquipe: formData.chefEquipe && formData.chefEquipe !== 0 ? formData.chefEquipe : undefined,
        specialite: formData.specialite || undefined,
        membres: formData.membres.length > 0 ? formData.membres : undefined
      });

      if (formData.membres.length > 0) {
        await affecterMembres(equipe.id, { operateurs: formData.membres });
      }

      onCreated();
      onClose();
    } catch (error: any) {
      console.error('Erreur creation equipe:', error);
      // Extraire le message d'erreur du backend
      if (error.data) {
        // Erreur du backend avec details
        const messages: string[] = [];
        for (const [field, value] of Object.entries(error.data)) {
          if (Array.isArray(value)) {
            messages.push(`${field}: ${value.join(', ')}`);
          } else if (typeof value === 'string') {
            messages.push(value);
          }
        }
        setError(messages.length > 0 ? messages.join('\n') : error.message || 'Erreur lors de la creation');
      } else {
        setError(error.message || 'Erreur lors de la creation de l\'equipe');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Nouvelle equipe</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm whitespace-pre-line">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'equipe <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.nomEquipe}
                onChange={(e) => setFormData({ ...formData, nomEquipe: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Ex: Equipe C - Irrigation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialite
              </label>
              <input
                type="text"
                value={formData.specialite}
                onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Ex: Entretien general"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chef d'equipe (optionnel)
              </label>
              <select
                required
                value={formData.chefEquipe}
                onChange={(e) => setFormData({ ...formData, chefEquipe: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value={0}>Selectionner un chef</option>
                {chefsPotentiels.map((op) => (
                  <option key={op.utilisateur} value={op.utilisateur}>
                    {op.fullName} ({op.numeroImmatriculation})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Seuls les operateurs avec la competence "Gestion d'equipe" sont affiches
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Membres a affecter
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {operateursSansEquipe.length === 0 ? (
                  <p className="text-sm text-gray-500 p-2">Aucun operateur disponible</p>
                ) : (
                  operateursSansEquipe.map((op) => (
                    <label
                      key={op.utilisateur}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.membres.includes(op.utilisateur)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, membres: [...formData.membres, op.utilisateur] });
                          } else {
                            setFormData({
                              ...formData,
                              membres: formData.membres.filter(id => id !== op.utilisateur)
                            });
                          }
                        }}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span className="text-sm">
                        {op.fullName}
                        <span className="text-gray-500 ml-1">({op.numeroImmatriculation})</span>
                      </span>
                    </label>
                  ))
                )}
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
                disabled={loading}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? 'Creation...' : 'Creer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL - Creer / Editer une competence
// ============================================================================

interface CompetenceModalProps {
  initial?: Competence | null;
  onClose: () => void;
  onSaved: () => void;
}

const CompetenceModal: React.FC<CompetenceModalProps> = ({ initial = null, onClose, onSaved }) => {
  const [form, setForm] = useState<{
    nomCompetence: string;
    categorie: CategorieCompetence;
    description: string;
    ordreAffichage: number;
  }>({
    nomCompetence: initial?.nomCompetence || '',
    categorie: (initial?.categorie as CategorieCompetence) || 'TECHNIQUE',
    description: initial?.description || '',
    ordreAffichage: initial?.ordreAffichage || 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.nomCompetence.trim()) return setError('Le nom est requis');
    if (!form.categorie) return setError('La categorie est requise');

    setLoading(true);
    try {
      if (initial && initial.id) {
        await updateCompetence(initial.id, form);
      } else {
        await createCompetence(form);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Erreur competence:', err);
      setError(err?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{initial ? 'Editer competence' : 'Nouvelle competence'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {error && <div className="p-2 bg-red-50 text-red-700 rounded">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
              <input
                value={form.nomCompetence}
                onChange={(e) => setForm({ ...form, nomCompetence: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categorie</label>
              <select
                value={form.categorie}
                onChange={(e) => setForm({ ...form, categorie: e.target.value as CategorieCompetence })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {Object.entries(CATEGORIE_COMPETENCE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ordre</label>
              <input
                type="number"
                value={form.ordreAffichage}
                onChange={(e) => setForm({ ...form, ordreAffichage: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="p-6 border-t border-gray-200 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg">{loading ? 'En cours...' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL - Detail Operateur
// ============================================================================

interface OperateurDetailModalProps {
  operateur: OperateurDetail;
  onClose: () => void;
}

const OperateurDetailModal: React.FC<OperateurDetailModalProps> = ({ operateur, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{operateur.fullName}</h2>
            <p className="text-sm text-gray-500">{operateur.numeroImmatriculation}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Informations generales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{operateur.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Telephone</label>
              <p className="text-gray-900">{operateur.telephone || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Date d'embauche</label>
              <p className="text-gray-900">
                {new Date(operateur.dateEmbauche).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Statut</label>
              <div className="mt-1">
                <StatutOperateurBadge statut={operateur.statut} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Equipe</label>
              <p className="text-gray-900">{operateur.equipeNom || 'Non affecte'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Role</label>
              <div className="flex items-center gap-2">
                {operateur.utilisateurDetail?.roles && operateur.utilisateurDetail.roles.length > 0 ? (
                  operateur.utilisateurDetail.roles.map((r) => (
                    <span key={r} className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {NOM_ROLE_LABELS[r as keyof typeof NOM_ROLE_LABELS] || r}
                    </span>
                  ))
                ) : (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{operateur.estChefEquipe ? "Chef d'equipe" : 'Operateur'}</span>
                )}

                {operateur.estChefEquipe && (
                  <span className="text-sm text-gray-500 ml-1">
                    ({operateur.equipesDirigeesCount} equipe{operateur.equipesDirigeesCount > 1 ? 's' : ''})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Disponibilite */}
          <div>
            <label className="text-sm font-medium text-gray-500 mb-2 block">Disponibilite</label>
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${operateur.estDisponible
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
              }`}>
              {operateur.estDisponible ? (
                <UserCheck className="w-4 h-4" />
              ) : (
                <UserX className="w-4 h-4" />
              )}
              <span className="font-medium">
                {operateur.estDisponible ? 'Disponible' : 'Indisponible'}
              </span>
            </div>
          </div>

          {/* Competences */}
          <div>
            <label className="text-sm font-medium text-gray-500 mb-3 block flex items-center gap-2">
              <Award className="w-4 h-4" />
              Competences ({operateur.competencesDetail.length})
            </label>
            {operateur.competencesDetail.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucune competence enregistree</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {operateur.competencesDetail.map((comp) => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {comp.competenceDetail?.nomCompetence || `Competence #${comp.competence}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {comp.competenceDetail?.categorieDisplay}
                      </p>
                    </div>
                    <NiveauCompetenceBadge niveau={comp.niveau} />
                  </div>
                ))}
              </div>
            )}
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

// ============================================================================
// MODAL - Detail Equipe
// ============================================================================

interface EquipeDetailModalProps {
  equipe: EquipeDetail;
  onClose: () => void;
}

const EquipeDetailModal: React.FC<EquipeDetailModalProps> = ({ equipe, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{equipe.nomEquipe}</h2>
            <p className="text-sm text-gray-500">{equipe.specialite || 'Pas de specialite'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Statut */}
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Statut</label>
              <div className="mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${equipe.actif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                  {equipe.actif ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Statut operationnel</label>
              <div className="mt-1">
                <StatutEquipeBadge statut={equipe.statutOperationnel} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Creee le</label>
              <p className="text-gray-900">
                {new Date(equipe.dateCreation).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Chef d'equipe */}
          <div>
            <label className="text-sm font-medium text-gray-500 mb-2 block">Chef d'equipe</label>
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{equipe.chefEquipeNom}</p>
                <p className="text-sm text-gray-500">
                  {equipe.chefEquipeDetail?.numeroImmatriculation}
                </p>
              </div>
            </div>
          </div>

          {/* Membres */}
          <div>
            <label className="text-sm font-medium text-gray-500 mb-3 block flex items-center gap-2">
              <Users className="w-4 h-4" />
              Membres ({equipe.nombreMembres})
            </label>
            <div className="space-y-2">
              {equipe.membres.map((membre) => (
                <div
                  key={membre.utilisateur}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{membre.fullName}</p>
                      <p className="text-xs text-gray-500">{membre.numeroImmatriculation}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatutOperateurBadge statut={membre.statut} />
                    {membre.estChefEquipe && (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                        Chef
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
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

// EditUserModalSimple removed — using shared EditUserModal component instead

// ============================================================================
// COMPOSANT - Carte Statistiques
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow">
    <div className="flex items-center gap-2">
      <div className={`p-2 rounded-lg ${color} flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

// ============================================================================
// COMPOSANT PRINCIPAL - Teams
// ============================================================================

type TabType = 'equipes' | 'operateurs' | 'absences' | 'competences' | 'historique';

const Teams: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('equipes');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [equipes, setEquipes] = useState<EquipeList[]>([]);
  const [operateurs, setOperateurs] = useState<OperateurList[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [absencesAValider, setAbsencesAValider] = useState<Absence[]>([]);
  const [chefsPotentiels, setChefsPotentiels] = useState<OperateurList[]>([]);
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [stats, setStats] = useState<{
    totalOperateurs: number;
    disponibles: number;
    chefsEquipe: number;
    totalEquipes: number;
    equipesCompletes: number;
    absencesEnAttente: number;
  } | null>(null);

  // Modals
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [selectedOperateur, setSelectedOperateur] = useState<OperateurDetail | null>(null);
  const [selectedEquipe, setSelectedEquipe] = useState<EquipeDetail | null>(null);
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null);
  const [showCompetenceModal, setShowCompetenceModal] = useState(false);
  const [editingCompetence, setEditingCompetence] = useState<Competence | null>(null);
  const [deleteCompetenceId, setDeleteCompetenceId] = useState<number | null>(null);
  const [showCreateAbsence, setShowCreateAbsence] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);
  const [deleteAbsenceId, setDeleteAbsenceId] = useState<number | null>(null);
  const [competenceSubTab, setCompetenceSubTab] = useState<'list' | 'matrix'>('list');

  // Filtre competences
  const [competenceFilter, setCompetenceFilter] = useState<string>('');

  // Filtres absences
  const [absenceFilters, setAbsenceFilters] = useState<{
    statut: string;
    typeAbsence: string;
    dateDebut: string;
    dateFin: string;
  }>({
    statut: '',
    typeAbsence: '',
    dateDebut: '',
    dateFin: ''
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        equipesRes,
        operateursRes,
        absencesRes,
        absencesAValiderRes,
        chefsPotentielsRes,
        competencesRes,
        statsRes,
        utilisateursRes,
        clientsRes
      ] = await Promise.all([
        fetchEquipes(),
        fetchOperateurs(),
        fetchAbsences(),
        fetchAbsencesAValider(),
        fetchChefsPotentiels(),
        fetchCompetences(),
        fetchStatistiquesUtilisateurs(),
        fetchUtilisateurs(),
        fetchClients()
      ]);

      setEquipes(equipesRes.results);
      setOperateurs(operateursRes.results);
      setAbsences(absencesRes.results);
      setAbsencesAValider(absencesAValiderRes);
      setChefsPotentiels(chefsPotentielsRes);
      setCompetences(competencesRes);
      setUtilisateurs(utilisateursRes.results);
      setClients(clientsRes.results);
      // Calculer chefs d'equipe à partir des rôles utilisateurs (un utilisateur peut être chef sans profil Operateur)
      const users = (utilisateursRes && utilisateursRes.results) || [];
      const parRoleCounts: Record<string, number> = {};
      Object.keys(NOM_ROLE_LABELS).forEach(r => { parRoleCounts[r] = 0; });
      users.forEach(u => {
        (u.roles || []).forEach((r) => {
          parRoleCounts[r] = (parRoleCounts[r] || 0) + 1;
        });
      });

      setStats({
        totalOperateurs: statsRes.operateurs.total,
        disponibles: statsRes.operateurs.disponiblesAujourdhui,
        chefsEquipe: parRoleCounts['CHEF_EQUIPE'] || statsRes.operateurs.chefsEquipe || 0,
        totalEquipes: statsRes.equipes.total,
        equipesCompletes: statsRes.equipes.statutsOperationnels.completes,
        absencesEnAttente: statsRes.absences.enAttente
      });
    } catch (error) {
      console.error('Erreur chargement donnees:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleViewOperateur = async (operateurId: number) => {
    try {
      const detail = await fetchOperateurById(operateurId);
      // Enrich with competence details
      const enriched = {
        ...detail,
        competencesDetail: detail.competencesDetail.map(comp => ({
          ...comp,
          competenceDetail: competences.find(c => c.id === comp.competence)
        }))
      };
      setSelectedOperateur(enriched);
    } catch (error) {
      console.error('Erreur chargement operateur:', error);
    }
  };

  const handleViewEquipe = async (equipeId: number) => {
    try {
      const detail = await fetchEquipeById(equipeId);
      setSelectedEquipe(detail);
    } catch (error) {
      console.error('Erreur chargement equipe:', error);
    }
  };

  const handleValiderAbsence = async (absenceId: number) => {
    try {
      await validerAbsence(absenceId, 'Approuve');
      loadData();
    } catch (error) {
      console.error('Erreur validation absence:', error);
    }
  };

  const handleRefuserAbsence = async (absenceId: number) => {
    try {
      await refuserAbsence(absenceId, 'Refuse');
      loadData();
    } catch (error) {
      console.error('Erreur refus absence:', error);
    }
  };

  // Filter data
  const filteredEquipes = equipes
    .filter(e => e.actif)
    .filter(e =>
      e.nomEquipe.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.chefEquipeNom || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredOperateurs = operateurs.filter(o =>
    o.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.numeroImmatriculation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAbsences = absences.filter(a => {
    // Filtre par recherche (operateur, motif, type)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchOperateur = a.operateurNom.toLowerCase().includes(query);
      const matchMotif = a.motif?.toLowerCase().includes(query);
      const matchType = TYPE_ABSENCE_LABELS[a.typeAbsence]?.toLowerCase().includes(query);
      const matchStatut = STATUT_ABSENCE_LABELS[a.statut]?.toLowerCase().includes(query);
      if (!matchOperateur && !matchMotif && !matchType && !matchStatut) {
        return false;
      }
    }
    // Filtre par statut
    if (absenceFilters.statut && a.statut !== absenceFilters.statut) {
      return false;
    }
    // Filtre par type
    if (absenceFilters.typeAbsence && a.typeAbsence !== absenceFilters.typeAbsence) {
      return false;
    }
    // Filtre par date debut
    if (absenceFilters.dateDebut && new Date(a.dateDebut) < new Date(absenceFilters.dateDebut)) {
      return false;
    }
    // Filtre par date fin
    if (absenceFilters.dateFin && new Date(a.dateFin) > new Date(absenceFilters.dateFin)) {
      return false;
    }
    return true;
  });

  const operateursSansEquipe = operateurs.filter(o => o.equipe === null && o.actif);

  // Filtrage des competences
  const filteredCompetences = competences.filter(c => {
    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchNom = c.nomCompetence.toLowerCase().includes(query);
      const matchDescription = c.description?.toLowerCase().includes(query);
      const matchCategorie = CATEGORIE_COMPETENCE_LABELS[c.categorie]?.toLowerCase().includes(query);
      if (!matchNom && !matchDescription && !matchCategorie) {
        return false;
      }
    }
    // Filtre par categorie
    if (competenceFilter && c.categorie !== competenceFilter) {
      return false;
    }
    return true;
  }).sort((a, b) => (a.ordreAffichage || 0) - (b.ordreAffichage || 0));

  // Columns
  const [editEquipe, setEditEquipe] = useState<EquipeList | null>(null);
  const [deleteEquipeId, setDeleteEquipeId] = useState<number | null>(null);
  const [deleteOperateurId, setDeleteOperateurId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const equipesColumns: Column<EquipeList>[] = [
    { key: 'nomEquipe', label: 'Nom' },
    { key: 'chefEquipeNom', label: "Chef d'equipe" },
    { key: 'specialite', label: 'Specialite', render: (e) => e.specialite || '-' },
    {
      key: 'nombreMembres',
      label: 'Membres',
      render: (e) => `${e.nombreMembres} membre${e.nombreMembres > 1 ? 's' : ''}`
    },
    {
      key: 'statutOperationnel',
      label: 'Statut',
      render: (e) => <StatutEquipeBadge statut={e.statutOperationnel} />,
      sortable: false
    },
    {
      key: 'actif',
      label: 'Actif',
      render: (e) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${e.actif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
          {e.actif ? 'Oui' : 'Non'}
        </span>
      ),
      sortable: false
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (e) => (
        <div className="flex gap-1">
          <button
            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
            title="Modifier"
            onClick={(ev) => { ev.stopPropagation(); setEditEquipe(e); }}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            className="p-1 text-red-600 hover:bg-red-100 rounded"
            title="Supprimer"
            onClick={(ev) => { ev.stopPropagation(); setDeleteEquipeId(e.id); }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      sortable: false
    }
  ];

  const operateursColumns: Column<OperateurList>[] = [
    { key: 'numeroImmatriculation', label: 'Matricule' },
    { key: 'fullName', label: 'Nom' },
    { key: 'equipeNom', label: 'Equipe', render: (o) => o.equipeNom || '-' },
    {
      key: 'statut',
      label: 'Statut',
      render: (o) => <StatutOperateurBadge statut={o.statut} />,
      sortable: false
    },
    {
      key: 'estChefEquipe',
      label: "Chef d'equipe",
      render: (o) => o.estChefEquipe ? (
        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
          Oui
        </span>
      ) : '-',
      sortable: false
    },
    {
      key: 'estDisponible',
      label: 'Disponible',
      render: (o) => (
        <span className={`inline-flex items-center gap-1 ${o.estDisponible ? 'text-green-600' : 'text-red-600'
          }`}>
          {o.estDisponible ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
        </span>
      ),
      sortable: false
    }
    ,
    {
      key: 'actions',
      label: 'Actions',
      render: (o) => (
        <div className="flex gap-1">
          <button
            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
            title="Modifier"
            onClick={(ev) => { ev.stopPropagation(); const u = utilisateurs.find(us => us.id === o.utilisateur); if (u) setEditingUser(u); }}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            className="p-1 text-red-600 hover:bg-red-100 rounded"
            title="Supprimer"
            onClick={(ev) => { ev.stopPropagation(); setDeleteOperateurId(o.utilisateur); }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      sortable: false
    }
  ];

  const absencesColumns: Column<Absence>[] = [
    { key: 'operateurNom', label: 'Operateur' },
    {
      key: 'typeAbsence',
      label: 'Type',
      render: (a) => {
        const safe = getBadgeColors(TYPE_ABSENCE_COLORS, a.typeAbsence);
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${safe.bg} ${safe.text}`}>
            {TYPE_ABSENCE_LABELS[a.typeAbsence]}
          </span>
        );
      },
      sortable: false
    },
    {
      key: 'dateDebut',
      label: 'Debut',
      render: (a) => new Date(a.dateDebut).toLocaleDateString('fr-FR')
    },
    {
      key: 'dateFin',
      label: 'Fin',
      render: (a) => new Date(a.dateFin).toLocaleDateString('fr-FR')
    },
    {
      key: 'dureeJours',
      label: 'Duree',
      render: (a) => `${a.dureeJours} jour${a.dureeJours > 1 ? 's' : ''}`
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (a) => <StatutAbsenceBadge statut={a.statut} />,
      sortable: false
    },
    {
      key: 'id',
      label: 'Actions',
      render: (a) => (
        <div className="flex items-center gap-1">
          {/* Bouton voir details */}
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedAbsence(a); }}
            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
            title="Voir details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {/* Bouton modifier (seulement si DEMANDEE ou VALIDEE) */}
          {(a.statut === 'DEMANDEE' || a.statut === 'VALIDEE') && (
            <button
              onClick={(e) => { e.stopPropagation(); setEditingAbsence(a); }}
              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
              title="Modifier"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {/* Boutons valider/refuser (seulement si DEMANDEE) */}
          {a.statut === 'DEMANDEE' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleValiderAbsence(a.id); }}
                className="p-1 text-green-600 hover:bg-green-100 rounded"
                title="Valider"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleRefuserAbsence(a.id); }}
                className="p-1 text-red-600 hover:bg-red-100 rounded"
                title="Refuser"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          {/* Bouton supprimer (seulement si DEMANDEE ou VALIDEE) */}
          {(a.statut === 'DEMANDEE' || a.statut === 'VALIDEE') && (
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteAbsenceId(a.id); }}
              className="p-1 text-red-600 hover:bg-red-100 rounded"
              title="Supprimer (annuler)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
      sortable: false
    }
  ];

  const competencesColumns: Column<Competence>[] = [
    { key: 'nomCompetence', label: 'Compétence' },
    { key: 'categorieDisplay', label: 'Catégorie', render: (c: Competence) => c.categorieDisplay || c.categorie },
    { key: 'ordreAffichage', label: 'Ordre', render: (c: Competence) => String(c.ordreAffichage || 0) },
    {
      key: 'actions',
      label: 'Actions',
      render: (c: Competence) => (
        <div className="flex items-center gap-2">
          <button
            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
            onClick={() => { setEditingCompetence(c); setShowCompetenceModal(true); }}
            title="Editer"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            className="p-1 text-red-600 hover:bg-red-100 rounded"
            onClick={() => setDeleteCompetenceId(c.id)}
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      sortable: false
    }
  ];

  if (loading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion RH</h1>
          <p className="text-gray-500 mt-1">Equipes, operateurs et absences</p>
        </div>
        <button
          onClick={() => setShowCreateTeam(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Nouvelle equipe
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 flex-shrink-0">
          <StatCard
            icon={<Users className="w-5 h-5 text-blue-600" />}
            label="Operateurs"
            value={stats.totalOperateurs}
            color="bg-blue-100"
          />
          <StatCard
            icon={<Award className="w-5 h-5 text-yellow-600" />}
            label="Chefs d'equipe"
            value={stats.chefsEquipe}
            color="bg-yellow-100"
          />
          <StatCard
            icon={<UserCheck className="w-5 h-5 text-green-600" />}
            label="Disponibles"
            value={stats.disponibles}
            color="bg-green-100"
          />
          <StatCard
            icon={<Users className="w-5 h-5 text-purple-600" />}
            label="Equipes"
            value={stats.totalEquipes}
            color="bg-purple-100"
          />
          <StatCard
            icon={<Check className="w-5 h-5 text-emerald-600" />}
            label="Completes"
            value={stats.equipesCompletes}
            color="bg-emerald-100"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-orange-600" />}
            label="Absences en attente"
            value={stats.absencesEnAttente}
            color="bg-orange-100"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => setActiveTab('equipes')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'equipes'
            ? 'border-emerald-500 text-emerald-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Equipes ({equipes.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('operateurs')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'operateurs'
            ? 'border-emerald-500 text-emerald-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <span className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Operateurs ({operateurs.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('competences')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'competences'
            ? 'border-emerald-500 text-emerald-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <span className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Gestion des compétences ({competences.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('absences')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'absences'
            ? 'border-emerald-500 text-emerald-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Absences ({absences.length})
            {absencesAValider.length > 0 && (
              <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                {absencesAValider.length}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('historique')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'historique'
            ? 'border-emerald-500 text-emerald-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Historique RH
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 flex-shrink-0">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden">
        {activeTab === 'equipes' && (
          <div className="h-full overflow-auto">
            <DataTable
              data={filteredEquipes}
              columns={equipesColumns}
              itemsPerPage={10}
              onRowClick={(equipe) => handleViewEquipe(equipe.id)}
            />
          </div>
        )}

        {activeTab === 'operateurs' && (
          <div className="h-full overflow-auto">
            <DataTable
              data={filteredOperateurs}
              columns={operateursColumns}
              itemsPerPage={10}
              onRowClick={(op) => handleViewOperateur(op.utilisateur)}
            />
          </div>
        )}

        {activeTab === 'absences' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header avec titre et bouton */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">Gestion des absences</h2>
                <span className="text-sm text-gray-500">
                  {filteredAbsences.length} resultat{filteredAbsences.length > 1 ? 's' : ''}
                  {(searchQuery || absenceFilters.statut || absenceFilters.typeAbsence || absenceFilters.dateDebut || absenceFilters.dateFin) && (
                    <span className="text-emerald-600 ml-1">(filtres actifs)</span>
                  )}
                </span>
                {searchQuery && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1">
                    <Search className="w-3 h-3" />
                    "{searchQuery}"
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowCreateAbsence(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
              >
                <Plus className="w-4 h-4" /> Nouvelle absence
              </button>
            </div>

            {/* Filtres compacts */}
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={absenceFilters.statut}
                  onChange={(e) => setAbsenceFilters({ ...absenceFilters, statut: e.target.value })}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="">Tous statuts</option>
                  {Object.entries(STATUT_ABSENCE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <select
                  value={absenceFilters.typeAbsence}
                  onChange={(e) => setAbsenceFilters({ ...absenceFilters, typeAbsence: e.target.value })}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="">Tous types</option>
                  {Object.entries(TYPE_ABSENCE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Du</span>
                  <input
                    type="date"
                    value={absenceFilters.dateDebut}
                    onChange={(e) => setAbsenceFilters({ ...absenceFilters, dateDebut: e.target.value })}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Au</span>
                  <input
                    type="date"
                    value={absenceFilters.dateFin}
                    onChange={(e) => setAbsenceFilters({ ...absenceFilters, dateFin: e.target.value })}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  />
                </div>
                {(absenceFilters.statut || absenceFilters.typeAbsence || absenceFilters.dateDebut || absenceFilters.dateFin) && (
                  <button
                    onClick={() => setAbsenceFilters({ statut: '', typeAbsence: '', dateDebut: '', dateFin: '' })}
                    className="px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Effacer
                  </button>
                )}
              </div>
            </div>

            {/* Tableau */}
            <div className="flex-1 min-h-0 overflow-auto">
              <DataTable
                data={filteredAbsences}
                columns={absencesColumns}
                itemsPerPage={10}
              />
            </div>
          </div>
        )}
        {activeTab === 'competences' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Sub-tabs */}
            <div className="flex border-b border-gray-200 px-4 flex-shrink-0 bg-white">
              <button
                onClick={() => setCompetenceSubTab('list')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${competenceSubTab === 'list'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                Liste des competences
              </button>
              <button
                onClick={() => setCompetenceSubTab('matrix')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${competenceSubTab === 'matrix'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                Matrice operateurs
              </button>
            </div>

            {/* List view */}
            {competenceSubTab === 'list' && (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Header compact avec filtres intégrés */}
                <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold">Competences</h2>
                    <span className="text-xs text-gray-500">
                      {filteredCompetences.length} resultat{filteredCompetences.length > 1 ? 's' : ''}
                    </span>
                    {searchQuery && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1">
                        <Search className="w-3 h-3" />
                        "{searchQuery}"
                      </span>
                    )}
                    <select
                      value={competenceFilter}
                      onChange={(e) => setCompetenceFilter(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    >
                      <option value="">Toutes categories</option>
                      {Object.entries(CATEGORIE_COMPETENCE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    {competenceFilter && (
                      <button
                        onClick={() => setCompetenceFilter('')}
                        className="px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => { setEditingCompetence(null); setShowCompetenceModal(true); }}
                    className="flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors font-medium text-xs"
                  >
                    <Plus className="w-3 h-3" /> Ajouter
                  </button>
                </div>

                {/* Tableau */}
                <div className="flex-1 min-h-0 overflow-auto">
                  <DataTable
                    data={filteredCompetences}
                    columns={competencesColumns}
                    itemsPerPage={10}
                    showExport={false}
                  />
                </div>
              </div>
            )}

            {/* Matrix view */}
            {competenceSubTab === 'matrix' && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <CompetenceMatrix
                  operateurs={operateurs}
                  competences={competences}
                  onRefresh={loadData}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'historique' && (
          <HistoriqueRHPanel
            operateurs={operateurs}
            equipes={equipes}
            chefsPotentiels={chefsPotentiels}
            searchQuery={searchQuery}
          />
        )}
      </div>

      {/* Modals */}
      {showCreateTeam && (
        <CreateTeamModal
          onClose={() => setShowCreateTeam(false)}
          onCreated={loadData}
          chefsPotentiels={chefsPotentiels}
          operateursSansEquipe={operateursSansEquipe}
        />
      )}

      {selectedOperateur && (
        <OperateurDetailModal
          operateur={selectedOperateur}
          onClose={() => setSelectedOperateur(null)}
        />
      )}

      {selectedEquipe && (
        <EquipeDetailModal
          equipe={selectedEquipe}
          onClose={() => setSelectedEquipe(null)}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          clients={clients}
          operateurs={operateurs}
          onClose={() => setEditingUser(null)}
          onUpdated={loadData}
        />
      )}

      {showCompetenceModal && (
        <CompetenceModal
          initial={editingCompetence || undefined}
          onClose={() => { setShowCompetenceModal(false); setEditingCompetence(null); }}
          onSaved={loadData}
        />
      )}

      {deleteCompetenceId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
            <h2 className="text-lg font-bold mb-2">Supprimer la compétence ?</h2>
            <p className="text-gray-600 mb-4">Cette action est irréversible.</p>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setDeleteCompetenceId(null)}
              >Annuler</button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={async () => {
                  try {
                    await deleteCompetence(deleteCompetenceId as number);
                    setDeleteCompetenceId(null);
                    loadData();
                  } catch (err) {
                    alert('Erreur lors de la suppression');
                  }
                }}
              >Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale édition équipe */}
      {editEquipe && (
        <EditEquipeModal
          equipe={editEquipe}
          onClose={() => setEditEquipe(null)}
          onSaved={loadData}
        />
      )}

      {/* Modale confirmation suppression */}
      {deleteEquipeId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
            <h2 className="text-lg font-bold mb-2">Supprimer l'équipe ?</h2>
            <p className="text-gray-600 mb-4">Cette action est irréversible.</p>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setDeleteEquipeId(null)}
                disabled={actionLoading}
              >Annuler</button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await deleteEquipe(deleteEquipeId);
                    setDeleteEquipeId(null);
                    loadData();
                  } catch (err) {
                    alert('Erreur lors de la suppression');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
              >Supprimer</button>
            </div>
          </div>
        </div>
      )}
      {/* Modale confirmation suppression operateur */}
      {deleteOperateurId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
            <h2 className="text-lg font-bold mb-2">Supprimer l'opérateur ?</h2>
            <p className="text-gray-600 mb-4">Cette action est irréversible.</p>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setDeleteOperateurId(null)}
                disabled={actionLoading}
              >Annuler</button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await deleteOperateur(deleteOperateurId as number);
                    setDeleteOperateurId(null);
                    loadData();
                  } catch (err) {
                    alert('Erreur lors de la suppression');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
              >Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale creation absence */}
      {showCreateAbsence && (
        <CreateAbsenceModal
          operateurs={operateurs}
          onClose={() => setShowCreateAbsence(false)}
          onCreated={loadData}
        />
      )}

      {/* Modale detail absence */}
      {selectedAbsence && (
        <AbsenceDetailModal
          absence={selectedAbsence}
          onClose={() => setSelectedAbsence(null)}
        />
      )}

      {/* Modale edition absence */}
      {editingAbsence && (
        <EditAbsenceModal
          absence={editingAbsence}
          onClose={() => setEditingAbsence(null)}
          onUpdated={loadData}
        />
      )}

      {/* Modale confirmation suppression absence */}
      {deleteAbsenceId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
            <h2 className="text-lg font-bold mb-2">Supprimer l'absence ?</h2>
            <p className="text-gray-600 mb-4 text-center text-sm">
              L'absence sera marquee comme annulee. Cette action ne peut pas etre annulee.
            </p>
            <div className="flex gap-2 w-full">
              <button
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                onClick={() => setDeleteAbsenceId(null)}
                disabled={actionLoading}
              >
                Annuler
              </button>
              <button
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await annulerAbsence(deleteAbsenceId);
                    setDeleteAbsenceId(null);
                    loadData();
                  } catch (err) {
                    alert('Erreur lors de la suppression');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
              >
                {actionLoading ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;
