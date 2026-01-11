import {
  Utilisateur,
  Client,
  UtilisateurUpdate,
  ClientUpdate,
  Role,
  NomRole,
  NOM_ROLE_LABELS,
  AdminResetPassword
} from '../types/users';
import {
  CreateAdminModal,
  CreateClientModal,
  CreateChefEquipeModal,
  UserTypeMenu
} from '../components/users/CreateUserModals';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import { AdminDetailModal, ClientDetailModal, UserDetailModalSelector } from '../components/users/UserDetailModals';
import React, { useState, useEffect } from 'react';
import {
  Users as UsersIcon,
  UserCheck,
  Shield,
  Building2,
  X,
  Edit2,
  UserX,
  Mail,
  Award,
  Check,
  AlertCircle,
  Save,
  MoreVertical,
  Eye,
  EyeOff,
  Key,
  User,
  Phone,
  MapPin,
  Lock
} from 'lucide-react';
import { PremiumInput } from '../components/modals/PremiumFormComponents';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';
import { useSearch } from '../contexts/SearchContext';

// ...existing code...

// API
import {
  fetchUtilisateurs,
  fetchClients,
  fetchRoles,
  updateUtilisateur,
  deleteUtilisateur,
  updateClient,
  attribuerRole,
  retirerRole,
  fetchClientByUserId,
  adminResetPassword
} from '../services/usersApi';

// ============================================================================
// MODAL - Editer un utilisateur
// ============================================================================

interface EditUserModalProps {
  user: Utilisateur;
  clients: Client[];
  onClose: () => void;
  onUpdated: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, clients, onClose, onUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<NomRole[]>(user.roles);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [currentUserRoles, setCurrentUserRoles] = useState<NomRole[]>([]);
  const [loadedClientData, setLoadedClientData] = useState<Client | null>(null);
  const [clientDataLoading, setClientDataLoading] = useState(false);

  // Password reset state
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordData, setPasswordData] = useState<AdminResetPassword>({
    newPassword: '',
    newPasswordConfirm: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Trouver les donnees specifiques selon le type
  const clientDataFromList = clients.find(c => c.utilisateur === user.id);
  const clientData = loadedClientData || clientDataFromList;

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

    // Si l'utilisateur est un CLIENT et les données ne sont pas dans la liste, les charger depuis l'API
    if (user.roles.includes('CLIENT') && !clientDataFromList) {
      const loadClientData = async () => {
        setClientDataLoading(true);
        try {
          const data = await fetchClientByUserId(user.id);
          if (data) {
            setLoadedClientData(data);
            // Les champs seront mis à jour automatiquement par le useEffect qui surveille clientData
          }
        } catch (err) {
          console.error('Erreur chargement client:', err);
        } finally {
          setClientDataLoading(false);
        }
      };
      loadClientData();
    }
  }, [user.id, user.roles, clientDataFromList]);

  // Champs communs
  const [formData, setFormData] = useState({
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    actif: user.actif
  });

  // Champs Client
  const [clientFields, setClientFields] = useState({
    nomStructure: clientDataFromList?.nomStructure || '',
    adresse: clientDataFromList?.adresse || '',
    telephone: clientDataFromList?.telephone || '',
    contactPrincipal: clientDataFromList?.contactPrincipal || '',
    emailFacturation: clientDataFromList?.emailFacturation || ''
  });

  // Mettre à jour les champs client quand clientData change
  useEffect(() => {
    if (clientData) {
      // Debug: voir ce que l'API renvoie
      console.log('🔍 DEBUG clientData:', clientData);
      console.log('🔍 DEBUG structure:', clientData.structure);
      console.log('🔍 DEBUG legacy fields:', {
        nomStructure: clientData.nomStructure,
        adresse: clientData.adresse,
        telephone: clientData.telephone
      });

      setClientFields({
        // Priorité au nouveau système (structure), sinon legacy
        nomStructure: clientData.structure?.nom || clientData.nomStructure || '',
        adresse: clientData.structure?.adresse || clientData.adresse || '',
        telephone: clientData.structure?.telephone || clientData.telephone || '',
        contactPrincipal: clientData.structure?.contactPrincipal || clientData.contactPrincipal || '',
        emailFacturation: clientData.structure?.emailFacturation || clientData.emailFacturation || ''
      });
    }
  }, [clientData]);

  // Password strength calculator
  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: '', color: '' };

    let strength = 0;

    // Length
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;

    // Contains lowercase
    if (/[a-z]/.test(password)) strength += 1;

    // Contains uppercase
    if (/[A-Z]/.test(password)) strength += 1;

    // Contains numbers
    if (/\d/.test(password)) strength += 1;

    // Contains special chars
    if (/[^a-zA-Z\d]/.test(password)) strength += 1;

    if (strength <= 2) return { strength, label: 'Faible', color: 'bg-red-500' };
    if (strength <= 4) return { strength, label: 'Moyen', color: 'bg-yellow-500' };
    return { strength, label: 'Fort', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPasswordError(null);
    setLoading(true);

    try {
      // Validation du mot de passe si la section est affichée
      if (showPasswordReset && passwordData.newPassword) {
        if (passwordData.newPassword !== passwordData.newPasswordConfirm) {
          setPasswordError('Les mots de passe ne correspondent pas');
          setLoading(false);
          return;
        }
        if (passwordData.newPassword.length < 8) {
          setPasswordError('Le mot de passe doit contenir au moins 8 caractères');
          setLoading(false);
          return;
        }
      }

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
      }

      // Réinitialisation du mot de passe si demandé
      if (showPasswordReset && passwordData.newPassword) {
        await adminResetPassword(Number(user.id), passwordData);
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
              user.roles.includes('SUPERVISEUR') ? 'bg-blue-100' :
                user.roles.includes('SUPERVISEUR') ? 'bg-yellow-100' :
                  user.roles.includes('CLIENT') ? 'bg-green-100' : 'bg-gray-100'
              }`}>
              <Edit2 className={`w-5 h-5 ${user.roles.includes('ADMIN') ? 'text-purple-600' :
                user.roles.includes('SUPERVISEUR') ? 'text-blue-600' :
                  user.roles.includes('SUPERVISEUR') ? 'text-yellow-600' :
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
                <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                  <span className="inline-block w-4 h-4 bg-gray-300 rounded-full" />
                  Rôles de l'utilisateur
                </h3>

                {/* Rôles automatiques (lecture seule) */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Rôles attribués automatiquement :</p>
                  <div className="flex flex-wrap gap-2">
                    {['CLIENT', 'SUPERVISEUR'].map((roleName) => {
                      const hasRole = userRoles.includes(roleName as NomRole);
                      if (!hasRole) return null;
                      return (
                        <div key={roleName} className="flex items-center gap-1 border border-gray-300 bg-gray-50 rounded px-2 py-1">
                          <span className="text-xs font-semibold text-gray-700">
                            {NOM_ROLE_LABELS[roleName as NomRole]}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">(automatique)</span>
                        </div>
                      );
                    })}
                    {!userRoles.some(r => ['CLIENT', 'SUPERVISEUR'].includes(r)) && (
                      <span className="text-xs text-gray-500 italic">Aucun rôle automatique</span>
                    )}
                  </div>
                </div>

                {/* Rôles manuels (modifiables) */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Rôle administrateur (modifiable) :</p>
                  {roleError && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-2">{roleError}</div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {allRoles
                      .filter(roleObj => roleObj.nomRole === 'ADMIN')
                      .map((roleObj) => {
                        const roleName = roleObj.nomRole;
                        const hasRole = userRoles.includes(roleName);
                        return (
                          <div key={roleObj.id} className="flex items-center gap-1 border rounded px-2 py-1">
                            <span className="text-xs font-semibold">{NOM_ROLE_LABELS[roleName]}</span>
                            {hasRole ? (
                              <button
                                type="button"
                                disabled={roleLoading === roleName}
                                className="text-red-600 text-xs ml-2 px-1 hover:underline disabled:opacity-50"
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
                                className="text-emerald-600 text-xs ml-2 px-1 hover:underline disabled:opacity-50"
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
              <PremiumInput
                type="text"
                value={formData.prenom}
                onChange={(value) => setFormData({ ...formData, prenom: value })}
                label="Prénom"
                placeholder="Jean"
                icon={<User className="w-4 h-4" />}
                variant="outlined"
                size="md"
                required
              />
              <PremiumInput
                type="text"
                value={formData.nom}
                onChange={(value) => setFormData({ ...formData, nom: value })}
                label="Nom"
                placeholder="Dupont"
                icon={<User className="w-4 h-4" />}
                variant="outlined"
                size="md"
                required
              />
            </div>

            <PremiumInput
              type="email"
              value={formData.email}
              onChange={(value) => setFormData({ ...formData, email: value })}
              label="Email"
              placeholder="jean.dupont@exemple.com"
              icon={<Mail className="w-4 h-4" />}
              variant="outlined"
              size="md"
              required
            />

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

            {/* Section Réinitialisation du mot de passe (ADMIN uniquement) */}
            {currentUserRoles.includes('ADMIN') && (
              <>
                <hr className="my-4" />
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordReset(!showPasswordReset);
                      if (showPasswordReset) {
                        // Reset password fields when closing
                        setPasswordData({ newPassword: '', newPasswordConfirm: '' });
                        setPasswordError(null);
                      }
                    }}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                  >
                    <Key className="w-4 h-4" />
                    {showPasswordReset ? 'Annuler la réinitialisation' : 'Réinitialiser le mot de passe'}
                  </button>

                  {showPasswordReset && (
                    <div className="space-y-3 pl-6 border-l-2 border-amber-200">
                      {passwordError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          {passwordError}
                        </div>
                      )}

                      <div>
                        <div className="relative">
                          <PremiumInput
                            type={showPassword ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(value) => setPasswordData({ ...passwordData, newPassword: value })}
                            label="Nouveau mot de passe"
                            placeholder="Minimum 8 caractères"
                            icon={<Lock className="w-4 h-4" />}
                            variant="outlined"
                            size="md"
                            minLength={8}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors z-10"
                            title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Password strength indicator */}
                        {passwordData.newPassword && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Force du mot de passe :</span>
                              <span className={`font-medium ${passwordStrength.label === 'Fort' ? 'text-green-600' :
                                  passwordStrength.label === 'Moyen' ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                {passwordStrength.label}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              {[...Array(6)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`h-1.5 flex-1 rounded-full transition-colors ${i < passwordStrength.strength ? passwordStrength.color : 'bg-gray-200'
                                    }`}
                                />
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Utilisez majuscules, minuscules, chiffres et caractères spéciaux pour un mot de passe fort
                            </p>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="relative">
                          <PremiumInput
                            type={showPasswordConfirm ? "text" : "password"}
                            value={passwordData.newPasswordConfirm}
                            onChange={(value) => setPasswordData({ ...passwordData, newPasswordConfirm: value })}
                            label="Confirmer le mot de passe"
                            placeholder="Confirmer le mot de passe"
                            icon={<Lock className="w-4 h-4" />}
                            variant="outlined"
                            size="md"
                            minLength={8}
                            error={passwordData.newPasswordConfirm && passwordData.newPassword !== passwordData.newPasswordConfirm ? 'Les mots de passe ne correspondent pas' : undefined}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors z-10"
                            title={showPasswordConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                          >
                            {showPasswordConfirm ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Champs specifiques Client */}
            {user.roles.includes('CLIENT') && (
              <>
                <hr className="my-4" />
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  Informations structure
                </h3>

                <PremiumInput
                  type="text"
                  value={clientFields.nomStructure}
                  onChange={(value) => setClientFields({ ...clientFields, nomStructure: value })}
                  label="Nom de la structure"
                  placeholder="Nom de l'entreprise ou organisation"
                  icon={<Building2 className="w-4 h-4" />}
                  variant="outlined"
                  size="md"
                />

                <PremiumInput
                  type="text"
                  value={clientFields.adresse}
                  onChange={(value) => setClientFields({ ...clientFields, adresse: value })}
                  label="Adresse"
                  placeholder="123 Avenue Mohammed V, Casablanca"
                  icon={<MapPin className="w-4 h-4" />}
                  variant="outlined"
                  size="md"
                />

                <div className="grid grid-cols-2 gap-4">
                  <PremiumInput
                    type="tel"
                    value={clientFields.telephone}
                    onChange={(value) => setClientFields({ ...clientFields, telephone: value })}
                    label="Téléphone"
                    placeholder="+212 6XX XXX XXX"
                    icon={<Phone className="w-4 h-4" />}
                    variant="outlined"
                    size="md"
                  />
                  <PremiumInput
                    type="text"
                    value={clientFields.contactPrincipal}
                    onChange={(value) => setClientFields({ ...clientFields, contactPrincipal: value })}
                    label="Contact principal"
                    placeholder="Nom du contact"
                    icon={<UserCheck className="w-4 h-4" />}
                    variant="outlined"
                    size="md"
                  />
                </div>

                <PremiumInput
                  type="email"
                  value={clientFields.emailFacturation}
                  onChange={(value) => setClientFields({ ...clientFields, emailFacturation: value })}
                  label="Email de facturation"
                  placeholder="facturation@exemple.com"
                  icon={<Mail className="w-4 h-4" />}
                  variant="outlined"
                  size="md"
                />
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
  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
    <div className="text-sm font-medium text-slate-500 mb-1">{label}</div>
    <div className="text-3xl font-bold text-slate-800">{value}</div>
    <div className={`absolute top-4 right-4 p-2 rounded-lg ${color}`}>
      {icon}
    </div>
  </div>
);

// ============================================================================
// COMPOSANT PRINCIPAL - Users
// ============================================================================

interface UsersProps {
  triggerCreate?: number;
}

const Users: React.FC<UsersProps> = ({ triggerCreate }) => {
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery, setPlaceholder } = useSearch();

  // State
  const [loading, setLoading] = useState(true);

  // Data
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    actifs: number;
    admins: number;
    clients: number;
    superviseurs: number;
  } | null>(null);

  // Modals
  const [showUserTypeMenu, setShowUserTypeMenu] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCreateChefEquipe, setShowCreateChefEquipe] = useState(false);
  const [selectedAdminUser, setSelectedAdminUser] = useState<Utilisateur | null>(null);
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);

  // Handler pour la sélection du type d'utilisateur
  const handleUserTypeSelect = (type: NomRole) => {
    setShowUserTypeMenu(false);
    switch (type) {
      case 'ADMIN':
        setShowCreateAdmin(true);
        break;
      case 'CLIENT':
        setShowCreateClient(true);
        break;
      case 'SUPERVISEUR':
        setShowCreateChefEquipe(true);
        break;
    }
  };

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Set search placeholder and cleanup on unmount
  useEffect(() => {
    setPlaceholder('Rechercher un utilisateur (nom, prénom, email)...');
    return () => {
      setPlaceholder('Rechercher...');
      setSearchQuery('');
    };
  }, [setPlaceholder, setSearchQuery]);

  // Handle external trigger to open create modal
  useEffect(() => {
    if (triggerCreate && triggerCreate > 0) {
      setShowUserTypeMenu(true);
    }
  }, [triggerCreate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [utilisateursRes, clientsRes] = await Promise.all([
        fetchUtilisateurs(),
        fetchClients()
      ]);

      setUtilisateurs(utilisateursRes.results);
      setClients(clientsRes.results);

      // Calcul local à partir de la liste d'utilisateurs
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
        clients: parRoleCounts['CLIENT'] || 0,
        superviseurs: parRoleCounts['SUPERVISEUR'] || 0
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
      setSelectedAdminUser(null);
    } catch (error) {
      console.error('Erreur modification statut:', error);
    }
  };

  const handleRowClick = (user: Utilisateur) => {
    // Show detail modal for all user types
    // UserDetailModalSelector will choose the appropriate modal based on role
    setSelectedAdminUser(user);
  };

  // Filtre par rôle
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const filteredUsers = utilisateurs.filter(u => {
    // Filter by role
    if (roleFilter && !(u.roles && u.roles.includes(roleFilter as any))) return false;

    // Filter by search (from header)
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

  // Columns - Mêmes colonnes pour tous les onglets (affichage des infos utilisateur)
  const columns = [
    {
      key: 'prenom',
      label: 'Prénom',
      render: (u: Utilisateur) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${u.roles.includes('ADMIN') ? 'bg-purple-100' :
            u.roles.includes('SUPERVISEUR') ? 'bg-blue-100' :
              u.roles.includes('CLIENT') ? 'bg-green-100' : 'bg-gray-100'
            }`}>
            {u.roles.includes('ADMIN') ? (
              <Shield className="w-4 h-4 text-purple-600" />
            ) : u.roles.includes('SUPERVISEUR') ? (
              <UserCheck className="w-4 h-4 text-blue-600" />
            ) : (
              <Building2 className="w-4 h-4 text-green-600" />
            )}
          </div>
          <span className="font-medium text-gray-900">{u.prenom}</span>
        </div>
      )
    },
    {
      key: 'nom',
      label: 'Nom',
      render: (u: Utilisateur) => (
        <div>
          <p className="font-medium text-gray-900">{u.nom}</p>
          <p className="text-xs text-gray-500">{u.email}</p>
        </div>
      )
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (u: Utilisateur) => u.roles.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {u.roles.slice(0, 5).map((role: NomRole) => (
            <StatusBadge key={role} variant="role" value={role} />
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
        <StatusBadge variant="boolean" value={u.actif} labels={{ true: 'Actif', false: 'Inactif' }} />
      ),
      sortable: false
    }
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 z-50">
        <LoadingScreen isLoading={true} loop={true} minDuration={0} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col overflow-hidden">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 flex-shrink-0">
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
            icon={<Award className="w-5 h-5 text-yellow-600" />}
            label="Superviseurs"
            value={stats.superviseurs}
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

      {/* Filtres */}
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Filtrer par rôle :</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setRoleFilter(null)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${!roleFilter
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
                }`}
            >
              Tous
            </button>
            <button
              onClick={() => setRoleFilter('ADMIN')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${roleFilter === 'ADMIN'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
                }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
            <button
              onClick={() => setRoleFilter('SUPERVISEUR')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${roleFilter === 'SUPERVISEUR'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
                }`}
            >
              <Award className="w-3.5 h-3.5" />
              Superviseur
            </button>
            <button
              onClick={() => setRoleFilter('CLIENT')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${roleFilter === 'CLIENT'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
                }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Client
            </button>
          </div>
        </div>

        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{filteredUsers.length}</span> utilisateur{filteredUsers.length > 1 ? 's' : ''}
          {(searchQuery || roleFilter) && <span className="text-emerald-600 ml-1">(filtrés)</span>}
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
                <div className="relative">
                  <button
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Actions"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenActionMenu(openActionMenu === user.id ? null : user.id);
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {openActionMenu === user.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenActionMenu(null);
                        }}
                      />
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(user);
                            setOpenActionMenu(null);
                          }}
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                          Voir les détails
                        </button>
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingUser(user);
                            setOpenActionMenu(null);
                          }}
                        >
                          <Edit2 className="w-4 h-4 text-blue-500" />
                          Modifier
                        </button>
                        <hr className="my-1 border-gray-100" />
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteUserId(Number(user.id));
                            setOpenActionMenu(null);
                          }}
                        >
                          <UserX className="w-4 h-4" />
                          Désactiver
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ),
              sortable: false
            }
          ]}
          itemsPerPage={10}
          onRowClick={handleRowClick}
        />
      </div>

      {/* Modals */}
      {showUserTypeMenu && (
        <UserTypeMenu
          onSelect={handleUserTypeSelect}
          onClose={() => setShowUserTypeMenu(false)}
        />
      )}

      {showCreateAdmin && (
        <CreateAdminModal
          onClose={() => setShowCreateAdmin(false)}
          onCreated={loadData}
        />
      )}

      {showCreateClient && (
        <CreateClientModal
          onClose={() => setShowCreateClient(false)}
          onCreated={loadData}
        />
      )}

      {showCreateChefEquipe && (
        <CreateChefEquipeModal
          onClose={() => setShowCreateChefEquipe(false)}
          onCreated={loadData}
        />
      )}

      {selectedAdminUser && (
        <UserDetailModalSelector
          user={selectedAdminUser}
          clients={clients}
          onClose={() => setSelectedAdminUser(null)}
          onEdit={(user) => {
            setSelectedAdminUser(null);
            setEditingUser(user);
          }}
          onToggleActive={handleToggleActive}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          clients={clients}
          onClose={() => setEditingUser(null)}
          onUpdated={loadData}
        />
      )}

      {deleteUserId && (
        <ConfirmDeleteModal
          title="Désactiver l'utilisateur ?"
          message="Êtes-vous sûr de vouloir désactiver cet utilisateur ? Son compte ne sera plus accessible."
          onConfirm={async () => {
            await deleteUtilisateur(deleteUserId);
            loadData();
          }}
          onCancel={() => setDeleteUserId(null)}
          confirmText="Désactiver"
          cancelText="Annuler"
        />
      )}
    </div>
  );
};

export default Users;
