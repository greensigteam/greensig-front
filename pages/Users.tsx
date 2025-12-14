import {
  Utilisateur,
  Client,
  OperateurList,
  OperateurDetail,
  OperateurCreate,
  UtilisateurUpdate,
  ClientUpdate,
  OperateurUpdate,
  Role,
  NomRole,
  NOM_ROLE_LABELS,
  Competence,
  NiveauCompetence,
  NIVEAU_COMPETENCE_LABELS
  , STATUT_OPERATEUR_LABELS, STATUT_OPERATEUR_COLORS, getBadgeColors
} from '../types/users';
import React, { useState, useEffect } from 'react';
import {
  Users as UsersIcon,
  UserPlus,
  UserCheck,
  UserX,
  Shield,
  Building2,
  Search,
  X,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Mail,
  Calendar,
  Award,
  Check,
  AlertCircle,
  Save
} from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { Tab } from '@headlessui/react';

// ...existing code...

// API
import {
  fetchUtilisateurs,
  fetchClients,
  fetchRoles,
  createUtilisateur,
  updateUtilisateur,
  deleteUtilisateur,
  createClient,
  updateClient,
  createOperateur,
  fetchOperateurById,
  updateOperateur,
  fetchStatistiquesUtilisateurs,
  fetchOperateurs,
  attribuerRole,
  retirerRole,
  fetchCompetences,
  affecterCompetence
} from '../services/usersApi';

// ============================================================================
// COMPONENT - Role Badge
const RoleBadge: React.FC<{ role: NomRole }> = ({ role }) => {
  const colors: Record<NomRole, { bg: string; text: string }> = {
    ADMIN: { bg: 'bg-purple-100', text: 'text-purple-800' },
    OPERATEUR: { bg: 'bg-blue-100', text: 'text-blue-800' },
    CLIENT: { bg: 'bg-green-100', text: 'text-green-800' },
    CHEF_EQUIPE: { bg: 'bg-yellow-100', text: 'text-yellow-800' }
  };
  const c = colors[role] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {NOM_ROLE_LABELS[role] || role}
    </span>
  );
};

// ============================================================================
// MODAL - Creer un utilisateur
// ============================================================================

interface CreateUserModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ onClose, onCreated }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);

  // Common fields
  // Liste des rôles objets pour mapping id/nomRole (accessible dans tout le composant)
  const [roleObjects, setRoleObjects] = useState<Role[]>([]);
  // Role selection (single role now)
  const [selectedRole, setSelectedRole] = useState<NomRole | null>(null);
  // Rôles de l'utilisateur courant (pour vérifier si c'est un admin)

  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    password: '',
    passwordConfirm: ''
  });
  // Operateur-specific field
  const [matricule, setMatricule] = useState('');
  // Competence selection
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [selectedCompetences, setSelectedCompetences] = useState<{ competenceId: number; niveau: NiveauCompetence }[]>([]);

  // Fetch competences when OPERATEUR or CHEF_EQUIPE is selected
  useEffect(() => {
    if (selectedRole === 'OPERATEUR' || selectedRole === 'CHEF_EQUIPE') {
      fetchCompetences().then(setCompetences);
    }
  }, [selectedRole]);

  // Charger les rôles objets au montage
  useEffect(() => {
    fetchRoles().then(setRoleObjects);
  }, []);

  const handleCompetenceChange = (competenceId: number, niveau: NiveauCompetence) => {
    setSelectedCompetences((prev) => {
      const exists = prev.find((c) => c.competenceId === competenceId);
      if (exists) {
        return prev.map((c) => c.competenceId === competenceId ? { ...c, niveau } : c);
      } else {
        return [...prev, { competenceId, niveau }];
      }
    });
  };

  const handleRemoveCompetence = (competenceId: number) => {
    setSelectedCompetences((prev) => prev.filter((c) => c.competenceId !== competenceId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.passwordConfirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (!selectedRole) {
      setError('Sélectionnez un rôle');
      return;
    }

    // If OPERATEUR or CHEF_EQUIPE is selected, require matricule
    if ((selectedRole === 'OPERATEUR' || selectedRole === 'CHEF_EQUIPE') && !matricule.trim()) {
      setError("Le matricule est requis pour un opérateur/chef d'équipe");
      return;
    }

    setLoading(true);
    try {
      // Nouvelle logique : comportement par rôle (single-role forms)
      if (selectedRole === 'OPERATEUR' || selectedRole === 'CHEF_EQUIPE') {
        const operateurData: OperateurCreate = {
          email: formData.email,
          nom: formData.nom,
          prenom: formData.prenom,
          password: formData.password,
          numeroImmatriculation: matricule || '',
          dateEmbauche: new Date().toISOString().split('T')[0] as string,
          telephone: ''
        };

        const operateurResponse = await createOperateur(operateurData);
        // L'ID de l'opérateur est l'ID de l'utilisateur (primary_key)
        const operateurId = operateurResponse.utilisateur;

        // Si le rôle sélectionné est CHEF_EQUIPE, l'ajouter
        // (createOperateur attribue déjà OPERATEUR par défaut via le backend, ou on peut le forcer)
        if (selectedRole === 'CHEF_EQUIPE') {
          const chefRole = roleObjects.find(r => r.nomRole === 'CHEF_EQUIPE');
          if (chefRole) {
            await attribuerRole(String(operateurId), String(chefRole.id));
          }
        }

        // Ajouter les compétences
        if (selectedCompetences.length > 0) {
          for (const comp of selectedCompetences) {
            await affecterCompetence(operateurId, {
              competenceId: comp.competenceId,
              niveau: comp.niveau
            });
          }
        }
      } else {
        // Cas classique : création utilisateur puis attribution des rôles
        const user = await createUtilisateur({
          email: formData.email,
          nom: formData.nom,
          prenom: formData.prenom,
          password: formData.password,
          passwordConfirm: formData.password, // Ajouté pour respecter UtilisateurCreate
          actif: true
        });
        // Attribuer le rôle sélectionné
        if (selectedRole) {
          const roleObj = roleObjects.find(r => r.nomRole === selectedRole);
          if (roleObj) await attribuerRole(user.id.toString(), roleObj.id.toString());
        }
      }
      onCreated();
      onClose();
    } catch (err: any) {
      // Gestion explicite des erreurs 400 lors de la création d'utilisateur
      if (err?.response?.status === 400) {
        setError('Erreur de validation : vérifiez les champs du formulaire.');
      } else {
        setError('Erreur inconnue lors de la création de l’utilisateur.');
      }
      setLoading(false);
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Nouvel utilisateur</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            <Tab.Group selectedIndex={tabIndex} onChange={setTabIndex}>
              <Tab.List className="flex space-x-2 border-b mb-4">
                <Tab className={({ selected }) =>
                  selected ? 'px-4 py-2 border-b-2 border-emerald-500 font-semibold' : 'px-4 py-2 text-gray-500'}>
                  Informations
                </Tab>
                {(selectedRole === 'OPERATEUR' || selectedRole === 'CHEF_EQUIPE') && (
                  <Tab className={({ selected }) =>
                    selected ? 'px-4 py-2 border-b-2 border-emerald-500 font-semibold' : 'px-4 py-2 text-gray-500'}>
                    Compétences
                  </Tab>
                )}
              </Tab.List>
              <Tab.Panels>
                <Tab.Panel>
                  {/* Onglet Informations */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prénom <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.prenom}
                        onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.nom}
                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mot de passe <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          required
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirmer <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={formData.passwordConfirm}
                        onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  {/* Role selection (single-role buttons) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rôle <span className="text-red-500">*</span></label>
                    <div className="flex gap-2 flex-wrap">
                      {Object.keys(NOM_ROLE_LABELS).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setSelectedRole(role as NomRole)}
                          className={`px-3 py-1 rounded-full border ${selectedRole === role ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'} text-sm flex items-center gap-2`}
                        >
                          <RoleBadge role={role as NomRole} />
                        </button>
                      ))}
                    </div>
                  </div>
                  {(selectedRole === 'OPERATEUR' || selectedRole === 'CHEF_EQUIPE') && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Matricule <span className="text-red-500">*</span>
                      </label>
                      <input
                        required={selectedRole === 'OPERATEUR'}
                        type="text"
                        value={matricule}
                        onChange={(e) => setMatricule(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Ex: OP-2024-007"
                      />
                    </div>
                  )}
                </Tab.Panel>
                {(selectedRole === 'OPERATEUR' || selectedRole === 'CHEF_EQUIPE') && (
                  <Tab.Panel>
                    {/* Onglet Compétences */}
                    <div className="mb-2 text-sm text-gray-600">Sélectionnez les compétences à affecter à l'opérateur (optionnel).</div>
                    {competences.length === 0 ? (
                      <div className="text-gray-500 text-sm">Aucune compétence disponible.</div>
                    ) : (
                      <table className="min-w-full border text-sm mt-2">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-2 py-1 border">Compétence</th>
                            <th className="px-2 py-1 border">Catégorie</th>
                            <th className="px-2 py-1 border">Niveau</th>
                            <th className="px-2 py-1 border">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {competences.map((comp) => {
                            const selected = selectedCompetences.find((c) => c.competenceId === comp.id);
                            return (
                              <tr key={comp.id} className={selected ? 'bg-emerald-50' : ''}>
                                <td className="px-2 py-1 border font-medium">{comp.nomCompetence}</td>
                                <td className="px-2 py-1 border text-gray-500">{comp.categorieDisplay}</td>
                                <td className="px-2 py-1 border">
                                  <select
                                    className="border rounded px-2 py-1 text-sm"
                                    value={selected ? selected.niveau : ''}
                                    onChange={(e) => {
                                      const niveau = e.target.value as NiveauCompetence;
                                      if (niveau) handleCompetenceChange(comp.id, niveau);
                                    }}
                                  >
                                    <option value="">Niveau...</option>
                                    {Object.keys(NIVEAU_COMPETENCE_LABELS).map((niv) => (
                                      <option key={niv} value={niv}>{NIVEAU_COMPETENCE_LABELS[niv as NiveauCompetence]}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-2 py-1 border text-center">
                                  {selected && (
                                    <button type="button" className="text-red-500 text-xs" onClick={() => handleRemoveCompetence(comp.id)}>
                                      Retirer
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </Tab.Panel>
                )}
              </Tab.Panels>
            </Tab.Group>
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
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL - Detail Utilisateur
// ============================================================================

interface UserDetailModalProps {
  user: Utilisateur;
  onClose: () => void;
  onToggleActive: (id: number, actif: boolean) => void;
  onEdit: (user: Utilisateur) => void;
  clients: Client[];
  operateurs: OperateurList[];
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, onClose, onToggleActive, onEdit, clients, operateurs }) => {
  const [operateurDetail, setOperateurDetail] = useState<OperateurDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadOperateurDetail = async () => {
      if (!user.roles.includes('OPERATEUR')) return;
      // trouver l'item dans la liste operateurs (peut être présent même sans profil complet)
      const op = operateurs.find(o => o.utilisateur === user.id);
      if (!op) return;
      setLoadingDetail(true);
      try {
        const detail = await fetchOperateurById(op.utilisateur);
        if (mounted) setOperateurDetail(detail);
      } catch (e) {
        // si l'endpoint ne renvoie pas de detail, on ignore
      } finally {
        if (mounted) setLoadingDetail(false);
      }
    };
    loadOperateurDetail();
    return () => { mounted = false; };
  }, [user, operateurs]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${user.roles.includes('ADMIN') ? 'bg-purple-100' :
              user.roles.includes('OPERATEUR') ? 'bg-blue-100' :
                user.roles.includes('CHEF_EQUIPE') ? 'bg-yellow-100' :
                  user.roles.includes('CLIENT') ? 'bg-green-100' : 'bg-gray-100'
              }`}>
              {user.roles.includes('ADMIN') ? (
                <Shield className="w-6 h-6 text-purple-600" />
              ) : user.roles.includes('OPERATEUR') ? (
                <UserCheck className="w-6 h-6 text-blue-600" />
              ) : user.roles.includes('CHEF_EQUIPE') ? (
                <Award className="w-6 h-6 text-yellow-600" />
              ) : (
                <Building2 className="w-6 h-6 text-green-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user.fullName}</h2>

            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                {user.email}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Statut</label>
              <p className="mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${user.actif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {user.actif ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {user.actif ? 'Actif' : 'Inactif'}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Date de creation</label>
              <p className="text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                {new Date(user.dateCreation).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Derniere connexion</label>
              <p className="text-gray-900">
                {user.derniereConnexion
                  ? new Date(user.derniereConnexion).toLocaleString('fr-FR')
                  : 'Jamais'
                }
              </p>
            </div>
          </div>

          {user.roles.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">Roles</label>
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <span
                    key={role}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium flex items-center gap-1"
                  >
                    <Award className="w-3 h-3" />
                    {NOM_ROLE_LABELS[role]}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Role-specific details */}
          {user.roles.includes('CLIENT') && (
            <div className="p-6 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Détails client</h3>
              {(() => {
                const clientData = clients.find(c => c.utilisateur === user.id);
                if (!clientData) return <p className="text-sm text-gray-500">Aucun profil client associé.</p>;
                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Structure</p>
                      <p className="text-gray-900">{clientData.nomStructure || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email facturation</p>
                      <p className="text-gray-900">{clientData.emailFacturation || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Téléphone</p>
                      <p className="text-gray-900">{clientData.telephone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Contact principal</p>
                      <p className="text-gray-900">{clientData.contactPrincipal || '-'}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {user.roles.includes('OPERATEUR') && (
            <div className="p-6 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Détails opérateur</h3>
              {loadingDetail ? (
                <p className="text-sm text-gray-500">Chargement...</p>
              ) : operateurDetail ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Matricule</p>
                    <p className="text-gray-900">{operateurDetail.numeroImmatriculation || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Statut</p>
                    <div className="mt-1">
                      {(() => {
                        const safe = getBadgeColors(STATUT_OPERATEUR_COLORS, operateurDetail.statut as any);
                        const label = operateurDetail.statut ? STATUT_OPERATEUR_LABELS[operateurDetail.statut] : 'Non renseigné';
                        return (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${safe.bg} ${safe.text}`}>
                            {label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Équipe</p>
                    <p className="text-gray-900">{operateurDetail.equipeNom || 'Non affecte'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date d'embauche</p>
                    <p className="text-gray-900">{operateurDetail.dateEmbauche ? new Date(operateurDetail.dateEmbauche).toLocaleDateString('fr-FR') : '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Compétences</p>
                    {operateurDetail.competencesDetail && operateurDetail.competencesDetail.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {operateurDetail.competencesDetail.map((c) => (
                          <div key={c.id} className="px-2 py-1 bg-gray-50 rounded text-sm text-gray-700">
                            {c.competenceDetail?.nomCompetence || c.competence} — {NIVEAU_COMPETENCE_LABELS[c.niveau]}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">Aucune compétence renseignée.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Profil opérateur non disponible.</p>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={() => onEdit(user)}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Modifier
          </button>
          <button
            onClick={() => onToggleActive(user.id, !user.actif)}
            className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${user.actif
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
          >
            {user.actif ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            {user.actif ? 'Desactiver' : 'Reactiver'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL - Editer un utilisateur
// ============================================================================

interface EditUserModalProps {
  user: Utilisateur;
  clients: Client[];
  operateurs: OperateurList[];
  onClose: () => void;
  onUpdated: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, clients, operateurs, onClose, onUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<NomRole[]>(user.roles);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [currentUserRoles, setCurrentUserRoles] = useState<NomRole[]>([]);

  useEffect(() => {
    // Charger tous les rôles disponibles
    const fetchAllRoles = async () => {
      try {
        const rolesRes = await fetchRoles();
        setAllRoles(rolesRes);
      } catch (err) {
        // ignore
      }
    };
    fetchAllRoles();
    // Récupérer le profil utilisateur courant pour vérifier les permissions
    const fetchMe = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const resp = await fetch('/api/users/me/', { headers: { Authorization: `Bearer ${token}` } });
        if (!resp.ok) return;
        const me = await resp.json();
        let roles: NomRole[] = [];
        if (Array.isArray(me.roles) && me.roles.length > 0) {
          roles = me.roles as NomRole[];
        } else if (me.type_utilisateur) {
          roles = [me.type_utilisateur as NomRole];
        }
        setCurrentUserRoles(roles);
      } catch (e) {
        // ignore
      }
    };
    fetchMe();
  }, []);

  // Trouver les donnees specifiques selon le type
  const clientData = clients.find(c => c.utilisateur === user.id);
  const operateurData = operateurs.find(o => o.utilisateur === user.id);

  // Champs communs
  const [formData, setFormData] = useState({
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    actif: user.actif
  });

  // Champs Client
  const [clientFields, setClientFields] = useState({
    nomStructure: clientData?.nomStructure || '',
    adresse: clientData?.adresse || '',
    telephone: clientData?.telephone || '',
    contactPrincipal: clientData?.contactPrincipal || '',
    emailFacturation: clientData?.emailFacturation || ''
  });

  // Champs Operateur
  const [operateurFields, setOperateurFields] = useState({
    numeroImmatriculation: operateurData?.numeroImmatriculation || '',
    telephone: operateurData?.telephone || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Mise a jour de l'utilisateur de base
      const updateData: UtilisateurUpdate = {
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        actif: formData.actif
      };
      await updateUtilisateur(user.id, updateData);

      // Mise à jour des données spécifiques selon le rôle
      if (user.roles && user.roles.includes('CLIENT') && clientData) {
        const clientUpdate: ClientUpdate = {
          nomStructure: clientFields.nomStructure,
          adresse: clientFields.adresse,
          telephone: clientFields.telephone,
          contactPrincipal: clientFields.contactPrincipal,
          emailFacturation: clientFields.emailFacturation
        };
        await updateClient(clientData.utilisateur, clientUpdate);
      } else if (user.roles && user.roles.includes('OPERATEUR') && operateurData) {
        const operateurUpdate: OperateurUpdate = {
          nom: formData.nom,
          prenom: formData.prenom,
          email: formData.email,
          numeroImmatriculation: operateurFields.numeroImmatriculation,
          telephone: operateurFields.telephone
        };
        await updateOperateur(operateurData.utilisateur, operateurUpdate);
      }

      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise a jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${user.roles.includes('ADMIN') ? 'bg-purple-100' :
              user.roles.includes('OPERATEUR') ? 'bg-blue-100' :
                user.roles.includes('CHEF_EQUIPE') ? 'bg-yellow-100' :
                  user.roles.includes('CLIENT') ? 'bg-green-100' : 'bg-gray-100'
              }`}>
              <Edit2 className={`w-5 h-5 ${user.roles.includes('ADMIN') ? 'text-purple-600' :
                user.roles.includes('OPERATEUR') ? 'text-blue-600' :
                  user.roles.includes('CHEF_EQUIPE') ? 'text-yellow-600' :
                    user.roles.includes('CLIENT') ? 'text-green-600' : 'text-gray-600'
                }`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Modifier l'utilisateur</h2>
              <p className="text-sm text-gray-500">{user.roles.map((role) => NOM_ROLE_LABELS[role]).join(', ')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Gestion des rôles pour les admins */}
            {currentUserRoles.includes('ADMIN') && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-gray-300 rounded-full" />
                  Gestion des rôles
                </h3>
                {roleError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-2">{roleError}</div>
                )}
                <div className="flex flex-wrap gap-2">
                  {allRoles.map((roleObj) => {
                    const roleName = roleObj.nomRole;
                    const hasRole = userRoles.includes(roleName);
                    return (
                      <div key={roleObj.id} className="flex items-center gap-1 border rounded px-2 py-1">
                        <span className="text-xs font-semibold">{NOM_ROLE_LABELS[roleName]}</span>
                        {hasRole ? (
                          <button
                            type="button"
                            disabled={roleLoading === roleName}
                            className="text-red-600 text-xs ml-2 px-1 hover:underline"
                            onClick={async () => {
                              setRoleLoading(roleName);
                              setRoleError(null);
                              try {
                                await retirerRole(user.id.toString(), roleObj.id.toString());
                                setUserRoles((prev) => prev.filter((r) => r !== roleName));
                              } catch (err: any) {
                                setRoleError(err.message || 'Erreur lors du retrait du rôle');
                              } finally {
                                setRoleLoading(null);
                              }
                            }}
                          >Retirer</button>
                        ) : (
                          <button
                            type="button"
                            disabled={roleLoading === roleName}
                            className="text-emerald-600 text-xs ml-2 px-1 hover:underline"
                            onClick={async () => {
                              setRoleLoading(roleName);
                              setRoleError(null);
                              try {
                                await attribuerRole(user.id.toString(), roleObj.id.toString());
                                setUserRoles((prev) => [...prev, roleName]);
                              } catch (err: any) {
                                setRoleError(err.message || 'Erreur lors de l\'attribution du rôle');
                              } finally {
                                setRoleLoading(null);
                              }
                            }}
                          >Ajouter</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Informations de base */}
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              Informations generales
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prenom</label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Statut du compte</label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, actif: !formData.actif })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.actif ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.actif ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
              <span className={`text-sm ${formData.actif ? 'text-emerald-600' : 'text-gray-500'}`}>
                {formData.actif ? 'Actif' : 'Inactif'}
              </span>
            </div>

            {/* Champs specifiques Client */}
            {user.roles.includes('CLIENT') && (
              <>
                <hr className="my-4" />
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  Informations structure
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la structure</label>
                  <input
                    type="text"
                    value={clientFields.nomStructure}
                    onChange={(e) => setClientFields({ ...clientFields, nomStructure: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input
                    type="text"
                    value={clientFields.adresse}
                    onChange={(e) => setClientFields({ ...clientFields, adresse: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                    <input
                      type="tel"
                      value={clientFields.telephone}
                      onChange={(e) => setClientFields({ ...clientFields, telephone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact principal</label>
                    <input
                      type="text"
                      value={clientFields.contactPrincipal}
                      onChange={(e) => setClientFields({ ...clientFields, contactPrincipal: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email de facturation</label>
                  <input
                    type="email"
                    value={clientFields.emailFacturation}
                    onChange={(e) => setClientFields({ ...clientFields, emailFacturation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </>
            )}

            {/* Champs specifiques Operateur */}
            {user.roles.includes('OPERATEUR') && (
              <>
                <hr className="my-4" />
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-gray-400" />
                  Informations operateur
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Matricule</label>
                    <input
                      type="text"
                      value={operateurFields.numeroImmatriculation}
                      onChange={(e) => setOperateurFields({ ...operateurFields, numeroImmatriculation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                    <input
                      type="tel"
                      value={operateurFields.telephone}
                      onChange={(e) => setOperateurFields({ ...operateurFields, telephone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </>
            )}
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
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

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
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

// ============================================================================
// COMPOSANT PRINCIPAL - Users
// ============================================================================

type TabType = 'tous' | 'admins' | 'operateurs' | 'clients' | 'chefs';

const Users: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('tous');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [operateurs, setOperateurs] = useState<OperateurList[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    actifs: number;
    admins: number;
    operateurs: number;
    clients: number;
    chefsEquipe: number;
  } | null>(null);

  // Modals
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Utilisateur | null>(null);
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [utilisateursRes, clientsRes, operateursRes] = await Promise.all([
        fetchUtilisateurs(),
        fetchClients(),
        fetchOperateurs()
      ]);

      setUtilisateurs(utilisateursRes.results);
      setClients(clientsRes.results);
      setOperateurs(operateursRes.results);
      // Calcul local à partir de la liste d'utilisateurs pour s'assurer que
      // les cartes statistiques reflètent les rôles (un utilisateur peut avoir plusieurs rôles).
      const users = utilisateursRes.results || [];
      const total = users.length;
      const actifs = users.filter(u => u.actif).length;
      const parRoleCounts: Record<string, number> = {};
      Object.keys(NOM_ROLE_LABELS).forEach(r => { parRoleCounts[r] = 0; });
      users.forEach(u => {
        (u.roles || []).forEach((r) => {
          parRoleCounts[r] = (parRoleCounts[r] || 0) + 1;
        });
      });

      setStats({
        total,
        actifs,
        admins: parRoleCounts['ADMIN'] || 0,
        operateurs: parRoleCounts['OPERATEUR'] || 0,
        clients: parRoleCounts['CLIENT'] || 0,
        chefsEquipe: parRoleCounts['CHEF_EQUIPE'] || 0
      });
    } catch (error) {
      console.error('Erreur chargement donnees:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleToggleActive = async (id: number, actif: boolean) => {
    try {
      if (actif) {
        await updateUtilisateur(id, { actif: true });
      } else {
        await deleteUtilisateur(id);
      }
      loadData();
      setSelectedUser(null);
    } catch (error) {
      console.error('Erreur modification statut:', error);
    }
  };

  // Filtre par rôle (dropdown)
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const filteredUsers = utilisateurs.filter(u => {
    // Filter by tab
    if (activeTab === 'admins' && !(u.roles && u.roles.includes('ADMIN'))) return false;
    if (activeTab === 'operateurs' && !(u.roles && u.roles.includes('OPERATEUR'))) return false;
    if (activeTab === 'clients' && !(u.roles && u.roles.includes('CLIENT'))) return false;
    if (activeTab === 'chefs' && !(u.roles && u.roles.includes('CHEF_EQUIPE'))) return false;

    // Filter by role (dropdown)
    if (roleFilter && !(u.roles && u.roles.includes(roleFilter as any))) return false;

    // Filter by search
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        u.nom.toLowerCase().includes(search) ||
        u.prenom.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        (u.fullName && u.fullName.toLowerCase().includes(search))
      );
    }
    return true;
  });

  // Columns
  const columns = [
    {
      key: 'fullName',
      label: 'Nom',
      render: (u: Utilisateur) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${u.roles.includes('ADMIN') ? 'bg-purple-100' :
            u.roles.includes('OPERATEUR') ? 'bg-blue-100' :
              u.roles.includes('CHEF_EQUIPE') ? 'bg-yellow-100' :
                u.roles.includes('CLIENT') ? 'bg-green-100' : 'bg-gray-100'
            }`}>
            {u.roles.includes('ADMIN') ? (
              <Shield className="w-4 h-4 text-purple-600" />
            ) : u.roles.includes('OPERATEUR') ? (
              <UserCheck className="w-4 h-4 text-blue-600" />
            ) : u.roles.includes('CHEF_EQUIPE') ? (
              <Award className="w-4 h-4 text-yellow-600" />
            ) : (
              <Building2 className="w-4 h-4 text-green-600" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">{u.fullName}</p>
            <p className="text-xs text-gray-500">{u.email}</p>
          </div>
        </div>
      )
    },
    // Colonne 'Type' supprimée : affichage des rôles uniquement dans la colonne 'Roles'
    {
      key: 'roles',
      label: 'Roles',
      render: (u: Utilisateur) => u.roles.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {u.roles.slice(0, 5).map((role: NomRole) => (
            <RoleBadge key={role} role={role} />
          ))}
          {u.roles.length > 5 && (
            <span className="text-xs text-gray-500">+{u.roles.length - 5}</span>
          )}
        </div>
      ) : '-',
      sortable: false
    },
    {
      key: 'dateCreation',
      label: 'Cree le',
      render: (u: Utilisateur) => new Date(u.dateCreation).toLocaleDateString('fr-FR')
    },
    {
      key: 'actif',
      label: 'Statut',
      render: (u: Utilisateur) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${u.actif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
          {u.actif ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {u.actif ? 'Actif' : 'Inactif'}
        </span>
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
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-500 mt-1">Administrateurs, operateurs et clients</p>
        </div>
        <button
          onClick={() => setShowCreateUser(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
        >
          <UserPlus className="w-4 h-4" />
          Nouvel utilisateur
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 flex-shrink-0">
          <StatCard
            icon={<UsersIcon className="w-5 h-5 text-gray-600" />}
            label="Total"
            value={stats.total}
            color="bg-gray-100"
          />
          <StatCard
            icon={<Check className="w-5 h-5 text-green-600" />}
            label="Actifs"
            value={stats.actifs}
            color="bg-green-100"
          />
          <StatCard
            icon={<Shield className="w-5 h-5 text-purple-600" />}
            label="Admins"
            value={stats.admins}
            color="bg-purple-100"
          />
          <StatCard
            icon={<UserCheck className="w-5 h-5 text-blue-600" />}
            label="Operateurs"
            value={stats.operateurs}
            color="bg-blue-100"
          />
          <StatCard
            icon={<Award className="w-5 h-5 text-yellow-600" />}
            label="Chefs d'equipe"
            value={stats.chefsEquipe}
            color="bg-yellow-100"
          />
          <StatCard
            icon={<Building2 className="w-5 h-5 text-green-600" />}
            label="Clients"
            value={stats.clients}
            color="bg-green-100"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => { setActiveTab('tous'); setRoleFilter(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'tous'
            ? 'border-emerald-500 text-emerald-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          Tous ({utilisateurs.length})
        </button>
        <button
          onClick={() => { setActiveTab('admins'); setRoleFilter(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'admins'
            ? 'border-emerald-500 text-emerald-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Admins ({utilisateurs.filter(u => u.roles && u.roles.includes('ADMIN')).length})
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('operateurs'); setRoleFilter(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'operateurs'
            ? 'border-emerald-500 text-emerald-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <span className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Operateurs ({utilisateurs.filter(u => u.roles && u.roles.includes('OPERATEUR')).length})
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('chefs'); setRoleFilter(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'chefs'
            ? 'border-emerald-500 text-emerald-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <span className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Chefs d'équipe ({utilisateurs.filter(u => u.roles && u.roles.includes('CHEF_EQUIPE')).length})
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('clients'); setRoleFilter(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'clients'
            ? 'border-emerald-500 text-emerald-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <span className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Clients ({utilisateurs.filter(u => u.roles && u.roles.includes('CLIENT')).length})
          </span>
        </button>
      </div>

      {/* Filtres et recherche */}
      <div className="mb-4 flex gap-4 items-center flex-shrink-0">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, prenom ou email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div>
          <select
            value={roleFilter || ''}
            onChange={e => setRoleFilter(e.target.value || null)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Tous les rôles</option>
            <option value="ADMIN">Admin</option>
            <option value="OPERATEUR">Opérateur</option>
            <option value="CHEF_EQUIPE">Chef d'équipe</option>
            <option value="CLIENT">Client</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto bg-white rounded-lg border border-gray-200">
        <DataTable
          data={filteredUsers}
          columns={[
            ...columns,
            {
              key: 'actions',
              label: 'Actions',
              render: (user) => (
                <div className="flex gap-2">
                  <button
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    title="Modifier"
                    onClick={e => {
                      e.stopPropagation();
                      setEditingUser(user);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                    title="Supprimer"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm('Supprimer cet utilisateur ?')) {
                        await deleteUtilisateur(Number(user.id));
                        loadData();
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ),
              sortable: false
            }
          ]}
          itemsPerPage={10}
          onRowClick={(user) => setSelectedUser({ ...user, id: Number(user.id) })}
        />
      </div>

      {/* Modals */}
      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          onCreated={loadData}
        />
      )}

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onToggleActive={handleToggleActive}
          onEdit={(user) => {
            setSelectedUser(null);
            setEditingUser(user);
          }}
          clients={clients}
          operateurs={operateurs}
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
    </div>
  );
};

export default Users;
