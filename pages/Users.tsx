import React, { useState, useEffect } from 'react';
import {
  Plus,
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
  Phone,
  Calendar,
  Award,
  Check,
  AlertCircle,
  Save
} from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';

// Types
import {
  Utilisateur,
  UtilisateurCreate,
  UtilisateurUpdate,
  Client,
  ClientCreate,
  ClientUpdate,
  OperateurCreate,
  OperateurUpdate,
  OperateurList,
  Role,
  TypeUtilisateur,
  TYPE_UTILISATEUR_LABELS,
  NOM_ROLE_LABELS,
  NomRole
} from '../types/users';

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
  updateOperateur,
  fetchStatistiquesUtilisateurs,
  fetchOperateurs,
  attribuerRole,
  retirerRole
} from '../services/usersApi';

// ============================================================================
// COMPOSANT - Badge Type Utilisateur
// ============================================================================

const TypeUtilisateurBadge: React.FC<{ type: TypeUtilisateur }> = ({ type }) => {
  const colors: Record<TypeUtilisateur, { bg: string; text: string }> = {
    ADMIN: { bg: 'bg-purple-100', text: 'text-purple-800' },
    OPERATEUR: { bg: 'bg-blue-100', text: 'text-blue-800' },
    CLIENT: { bg: 'bg-green-100', text: 'text-green-800' }
  };
  const c = colors[type];
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {TYPE_UTILISATEUR_LABELS[type]}
    </span>
  );
};

// ============================================================================
// MODAL - Creer un utilisateur
// ============================================================================

interface CreateUserModalProps {
  onClose: () => void;
  onCreated: () => void;
  roles: Role[];
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ onClose, onCreated, roles }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [userType, setUserType] = useState<TypeUtilisateur | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common fields
  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    password: '',
    passwordConfirm: ''
  });

  // Client specific fields
  const [clientData, setClientData] = useState({
    nomStructure: '',
    adresse: '',
    telephone: '',
    contactPrincipal: '',
    emailFacturation: ''
  });

  // Operateur specific fields
  const [operateurData, setOperateurData] = useState({
    numeroImmatriculation: '',
    dateEmbauche: new Date().toISOString().split('T')[0],
    telephone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.passwordConfirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      if (userType === 'CLIENT') {
        await createClient({
          email: formData.email,
          nom: formData.nom,
          prenom: formData.prenom,
          password: formData.password,
          nomStructure: clientData.nomStructure,
          adresse: clientData.adresse,
          telephone: clientData.telephone,
          contactPrincipal: clientData.contactPrincipal,
          emailFacturation: clientData.emailFacturation
        });
      } else if (userType === 'OPERATEUR') {
        await createOperateur({
          email: formData.email,
          nom: formData.nom,
          prenom: formData.prenom,
          password: formData.password,
          numeroImmatriculation: operateurData.numeroImmatriculation,
          dateEmbauche: operateurData.dateEmbauche,
          telephone: operateurData.telephone
        });
      } else {
        await createUtilisateur({
          email: formData.email,
          nom: formData.nom,
          prenom: formData.prenom,
          password: formData.password,
          passwordConfirm: formData.passwordConfirm,
          typeUtilisateur: userType || 'ADMIN'
        });
      }

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la creation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {step === 1 ? 'Nouveau utilisateur' : `Creer un ${TYPE_UTILISATEUR_LABELS[userType!]}`}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 1 ? (
          <div className="p-6 space-y-4">
            <p className="text-gray-600 mb-4">Selectionnez le type d'utilisateur a creer :</p>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => { setUserType('ADMIN'); setStep(2); }}
                className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left"
              >
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Administrateur</h3>
                  <p className="text-sm text-gray-500">Acces complet au systeme</p>
                </div>
              </button>

              <button
                onClick={() => { setUserType('OPERATEUR'); setStep(2); }}
                className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="p-3 bg-blue-100 rounded-lg">
                  <UserCheck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Operateur</h3>
                  <p className="text-sm text-gray-500">Jardinier / Agent terrain</p>
                </div>
              </button>

              <button
                onClick={() => { setUserType('CLIENT'); setStep(2); }}
                className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
              >
                <div className="p-3 bg-green-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Client</h3>
                  <p className="text-sm text-gray-500">Maitre d'ouvrage / Structure</p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Informations de base */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prenom <span className="text-red-500">*</span>
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

              {/* Champs specifiques Client */}
              {userType === 'CLIENT' && (
                <>
                  <hr className="my-4" />
                  <h3 className="font-medium text-gray-900">Informations structure</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de la structure <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={clientData.nomStructure}
                      onChange={(e) => setClientData({ ...clientData, nomStructure: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Ex: Residence Al Amal"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                    <input
                      type="text"
                      value={clientData.adresse}
                      onChange={(e) => setClientData({ ...clientData, adresse: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                      <input
                        type="tel"
                        value={clientData.telephone}
                        onChange={(e) => setClientData({ ...clientData, telephone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact principal</label>
                      <input
                        type="text"
                        value={clientData.contactPrincipal}
                        onChange={(e) => setClientData({ ...clientData, contactPrincipal: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email de facturation</label>
                    <input
                      type="email"
                      value={clientData.emailFacturation}
                      onChange={(e) => setClientData({ ...clientData, emailFacturation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </>
              )}

              {/* Champs specifiques Operateur */}
              {userType === 'OPERATEUR' && (
                <>
                  <hr className="my-4" />
                  <h3 className="font-medium text-gray-900">Informations operateur</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Matricule <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={operateurData.numeroImmatriculation}
                      onChange={(e) => setOperateurData({ ...operateurData, numeroImmatriculation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Ex: OP-2024-007"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date d'embauche <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="date"
                        value={operateurData.dateEmbauche}
                        onChange={(e) => setOperateurData({ ...operateurData, dateEmbauche: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                      <input
                        type="tel"
                        value={operateurData.telephone}
                        onChange={(e) => setOperateurData({ ...operateurData, telephone: e.target.value })}
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
                onClick={() => step === 2 ? setStep(1) : onClose()}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {step === 2 ? 'Retour' : 'Annuler'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? 'Creation...' : 'Creer'}
              </button>
            </div>
          </form>
        )}
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
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, onClose, onToggleActive, onEdit }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${
              user.typeUtilisateur === 'ADMIN' ? 'bg-purple-100' :
              user.typeUtilisateur === 'OPERATEUR' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              {user.typeUtilisateur === 'ADMIN' ? (
                <Shield className="w-6 h-6 text-purple-600" />
              ) : user.typeUtilisateur === 'OPERATEUR' ? (
                <UserCheck className="w-6 h-6 text-blue-600" />
              ) : (
                <Building2 className="w-6 h-6 text-green-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user.fullName}</h2>
              <TypeUtilisateurBadge type={user.typeUtilisateur} />
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
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
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  user.actif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
            className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
              user.actif
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

      // Mise a jour des donnees specifiques selon le type
      if (user.typeUtilisateur === 'CLIENT' && clientData) {
        const clientUpdate: ClientUpdate = {
          nomStructure: clientFields.nomStructure,
          adresse: clientFields.adresse,
          telephone: clientFields.telephone,
          contactPrincipal: clientFields.contactPrincipal,
          emailFacturation: clientFields.emailFacturation
        };
        await updateClient(clientData.utilisateur, clientUpdate);
      } else if (user.typeUtilisateur === 'OPERATEUR' && operateurData) {
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
            <div className={`p-3 rounded-full ${
              user.typeUtilisateur === 'ADMIN' ? 'bg-purple-100' :
              user.typeUtilisateur === 'OPERATEUR' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              <Edit2 className={`w-5 h-5 ${
                user.typeUtilisateur === 'ADMIN' ? 'text-purple-600' :
                user.typeUtilisateur === 'OPERATEUR' ? 'text-blue-600' : 'text-green-600'
              }`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Modifier l'utilisateur</h2>
              <p className="text-sm text-gray-500">{TYPE_UTILISATEUR_LABELS[user.typeUtilisateur]}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Gestion des rôles pour les admins */}
            {user.typeUtilisateur !== 'ADMIN' && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-gray-300 rounded-full" />
                  Gestion des rôles
                </h3>
                {roleError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-2">{roleError}</div>
                )}
                <div className="flex flex-wrap gap-2">
                  {allRoles.map((role) => {
                    const hasRole = userRoles.includes(role.nomRole);
                    return (
                      <div key={role.id} className="flex items-center gap-1 border rounded px-2 py-1">
                        <span className="text-xs font-semibold">{NOM_ROLE_LABELS[role.nomRole]}</span>
                        {hasRole ? (
                          <button
                            type="button"
                            disabled={roleLoading === role.nomRole}
                            className="text-red-600 text-xs ml-2 px-1 hover:underline"
                            onClick={async () => {
                              setRoleLoading(role.nomRole);
                              setRoleError(null);
                              try {
                                await retirerRole(user.id.toString(), role.id.toString());
                                setUserRoles((prev) => prev.filter((r) => r !== role.nomRole));
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
                            disabled={roleLoading === role.nomRole}
                            className="text-emerald-600 text-xs ml-2 px-1 hover:underline"
                            onClick={async () => {
                              setRoleLoading(role.nomRole);
                              setRoleError(null);
                              try {
                                await attribuerRole(user.id.toString(), role.id.toString());
                                setUserRoles((prev) => [...prev, role.nomRole]);
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.actif ? 'bg-emerald-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.actif ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${formData.actif ? 'text-emerald-600' : 'text-gray-500'}`}>
                {formData.actif ? 'Actif' : 'Inactif'}
              </span>
            </div>

            {/* Champs specifiques Client */}
            {user.typeUtilisateur === 'CLIENT' && (
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
            {user.typeUtilisateur === 'OPERATEUR' && (
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

type TabType = 'tous' | 'admins' | 'operateurs' | 'clients';

const Users: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('tous');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [operateurs, setOperateurs] = useState<OperateurList[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    actifs: number;
    admins: number;
    operateurs: number;
    clients: number;
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
      const [utilisateursRes, clientsRes, operateursRes, rolesRes, statsRes] = await Promise.all([
        fetchUtilisateurs(),
        fetchClients(),
        fetchOperateurs(),
        fetchRoles(),
        fetchStatistiquesUtilisateurs()
      ]);

      setUtilisateurs(utilisateursRes.results);
      setClients(clientsRes.results);
      setOperateurs(operateursRes.results);
      setRoles(rolesRes);
      setStats({
        total: statsRes.utilisateurs.total,
        actifs: statsRes.utilisateurs.actifs,
        admins: statsRes.utilisateurs.parType.ADMIN,
        operateurs: statsRes.utilisateurs.parType.OPERATEUR,
        clients: statsRes.utilisateurs.parType.CLIENT
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

  // Filter data
  const filteredUsers = utilisateurs.filter(u => {
    // Filter by tab
    if (activeTab === 'admins' && u.typeUtilisateur !== 'ADMIN') return false;
    if (activeTab === 'operateurs' && u.typeUtilisateur !== 'OPERATEUR') return false;
    if (activeTab === 'clients' && u.typeUtilisateur !== 'CLIENT') return false;

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
  }).filter(u => u.actif);

  // Columns
  const columns = [
    {
      key: 'fullName',
      label: 'Nom',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            u.typeUtilisateur === 'ADMIN' ? 'bg-purple-100' :
            u.typeUtilisateur === 'OPERATEUR' ? 'bg-blue-100' : 'bg-green-100'
          }`}>
            {u.typeUtilisateur === 'ADMIN' ? (
              <Shield className="w-4 h-4 text-purple-600" />
            ) : u.typeUtilisateur === 'OPERATEUR' ? (
              <UserCheck className="w-4 h-4 text-blue-600" />
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
    {
      key: 'typeUtilisateur',
      label: 'Type',
      render: (u) => <TypeUtilisateurBadge type={u.typeUtilisateur} />
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (u) => u.roles.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {u.roles.slice(0, 2).map((role) => (
            <span key={role} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
              {NOM_ROLE_LABELS[role]}
            </span>
          ))}
          {u.roles.length > 2 && (
            <span className="text-xs text-gray-500">+{u.roles.length - 2}</span>
          )}
        </div>
      ) : '-',
      sortable: false
    },
    {
      key: 'dateCreation',
      label: 'Cree le',
      render: (u) => new Date(u.dateCreation).toLocaleDateString('fr-FR')
    },
    {
      key: 'actif',
      label: 'Statut',
      render: (u) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          u.actif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
    <div className="p-4 sm:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
            icon={<Building2 className="w-5 h-5 text-green-600" />}
            label="Clients"
            value={stats.clients}
            color="bg-green-100"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('tous')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'tous'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Tous ({utilisateurs.length})
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'admins'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Admins ({utilisateurs.filter(u => u.typeUtilisateur === 'ADMIN').length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('operateurs')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'operateurs'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Operateurs ({utilisateurs.filter(u => u.typeUtilisateur === 'OPERATEUR').length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'clients'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Clients ({utilisateurs.filter(u => u.typeUtilisateur === 'CLIENT').length})
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, prenom ou email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-white rounded-lg border border-gray-200">
        <DataTable
          data={filteredUsers.map(u => ({ ...u, id: String(u.id) }))}
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
          roles={roles}
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
