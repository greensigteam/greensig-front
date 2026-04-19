import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  Mail,
  AlertCircle,
  Save,
  Eye,
  EyeOff,
  Key,
  User,
  UserCheck,
  Phone,
  MapPin,
  Building2,
  Lock,
} from 'lucide-react';
import { PremiumInput } from '../modals/PremiumFormComponents';
import {
  Utilisateur,
  Client,
  UtilisateurUpdate,
  ClientUpdate,
  Role,
  NomRole,
  NOM_ROLE_LABELS,
  AdminResetPassword,
} from '../../types/users';
import {
  fetchRoles,
  updateClient,
  updateUtilisateur,
  attribuerRole,
  retirerRole,
  fetchClientByUserId,
  adminResetPassword,
} from '../../services/usersApi';
import { useToast } from '../../contexts/ToastContext';

interface EditUserModalProps {
  user: Utilisateur;
  clients: Client[];
  onClose: () => void;
  onUpdated: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, clients, onClose, onUpdated }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<NomRole[]>(user.roles);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [currentUserRoles, setCurrentUserRoles] = useState<NomRole[]>([]);
  const [loadedClientData, setLoadedClientData] = useState<Client | null>(null);
  const [, setClientDataLoading] = useState(false);

  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordData, setPasswordData] = useState<AdminResetPassword>({
    newPassword: '',
    newPasswordConfirm: '',
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const clientDataFromList = clients.find((c) => c.utilisateur === user.id);
  const clientData = loadedClientData || clientDataFromList;

  useEffect(() => {
    const fetchAllRoles = async () => {
      try {
        const rolesRes = await fetchRoles();
        setAllRoles(rolesRes);
      } catch {
        // ignore
      }
    };
    fetchAllRoles();

    const fetchMe = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const resp = await fetch('/api/users/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return;
        const me = await resp.json();
        let roles: NomRole[] = [];
        if (Array.isArray(me.roles) && me.roles.length > 0) {
          roles = me.roles as NomRole[];
        } else if (me.type_utilisateur) {
          roles = [me.type_utilisateur as NomRole];
        }
        setCurrentUserRoles(roles);
      } catch {
        // ignore
      }
    };
    fetchMe();

    if (user.roles.includes('CLIENT') && !clientDataFromList) {
      const loadClientData = async () => {
        setClientDataLoading(true);
        try {
          const data = await fetchClientByUserId(user.id);
          if (data) {
            setLoadedClientData(data);
          }
        } catch (err) {
          showToast('Erreur lors du chargement des données client', 'error');
        } finally {
          setClientDataLoading(false);
        }
      };
      loadClientData();
    }
  }, [user.id, user.roles, clientDataFromList]);

  const [formData, setFormData] = useState({
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    actif: user.actif,
  });

  const [clientFields, setClientFields] = useState({
    nomStructure: clientDataFromList?.nomStructure || '',
    adresse: clientDataFromList?.adresse || '',
    telephone: clientDataFromList?.telephone || '',
    contactPrincipal: clientDataFromList?.contactPrincipal || '',
    emailFacturation: clientDataFromList?.emailFacturation || '',
  });

  useEffect(() => {
    if (clientData) {
      setClientFields({
        nomStructure: clientData.structure?.nom || clientData.nomStructure || '',
        adresse: clientData.structure?.adresse || clientData.adresse || '',
        telephone: clientData.structure?.telephone || clientData.telephone || '',
        contactPrincipal:
          clientData.structure?.contactPrincipal || clientData.contactPrincipal || '',
        emailFacturation:
          clientData.structure?.emailFacturation || clientData.emailFacturation || '',
      });
    }
  }, [clientData]);

  const getPasswordStrength = (
    password: string,
  ): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: '', color: '' };
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
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

      const updateData: UtilisateurUpdate = {
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        actif: formData.actif,
      };
      await updateUtilisateur(user.id, updateData);

      if (user.roles && user.roles.includes('CLIENT') && clientData) {
        const clientUpdate: ClientUpdate = {
          nomStructure: clientFields.nomStructure,
          adresse: clientFields.adresse,
          telephone: clientFields.telephone,
          contactPrincipal: clientFields.contactPrincipal,
          emailFacturation: clientFields.emailFacturation,
        };
        await updateClient(clientData.utilisateur, clientUpdate);
      }

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
            <div
              className={`p-3 rounded-full ${
                user.roles.includes('ADMIN')
                  ? 'bg-purple-100'
                  : user.roles.includes('SUPERVISEUR')
                    ? 'bg-blue-100'
                    : user.roles.includes('CLIENT')
                      ? 'bg-green-100'
                      : 'bg-gray-100'
              }`}
            >
              <Edit2
                className={`w-5 h-5 ${
                  user.roles.includes('ADMIN')
                    ? 'text-purple-600'
                    : user.roles.includes('SUPERVISEUR')
                      ? 'text-blue-600'
                      : user.roles.includes('CLIENT')
                        ? 'text-green-600'
                        : 'text-gray-600'
                }`}
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Modifier l'utilisateur</h2>
              <p className="text-sm text-gray-500">
                {user.roles.map((role) => NOM_ROLE_LABELS[role]).join(', ')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {currentUserRoles.includes('ADMIN') && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                  <span className="inline-block w-4 h-4 bg-gray-300 rounded-full" />
                  Rôles de l'utilisateur
                </h3>

                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Rôles attribués automatiquement :</p>
                  <div className="flex flex-wrap gap-2">
                    {['CLIENT', 'SUPERVISEUR'].map((roleName) => {
                      const hasRole = userRoles.includes(roleName as NomRole);
                      if (!hasRole) return null;
                      return (
                        <div
                          key={roleName}
                          className="flex items-center gap-1 border border-gray-300 bg-gray-50 rounded px-2 py-1"
                        >
                          <span className="text-xs font-semibold text-gray-700">
                            {NOM_ROLE_LABELS[roleName as NomRole]}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">(automatique)</span>
                        </div>
                      );
                    })}
                    {!userRoles.some((r) => ['CLIENT', 'SUPERVISEUR'].includes(r)) && (
                      <span className="text-xs text-gray-500 italic">Aucun rôle automatique</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">Rôle administrateur (modifiable) :</p>
                  {roleError && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-2">
                      {roleError}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {allRoles
                      .filter((roleObj) => roleObj.nomRole === 'ADMIN')
                      .map((roleObj) => {
                        const roleName = roleObj.nomRole;
                        const hasRole = userRoles.includes(roleName);
                        return (
                          <div
                            key={roleObj.id}
                            className="flex items-center gap-1 border rounded px-2 py-1"
                          >
                            <span className="text-xs font-semibold">
                              {NOM_ROLE_LABELS[roleName]}
                            </span>
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
                              >
                                Retirer
                              </button>
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
                                    setRoleError(
                                      err.message || "Erreur lors de l'attribution du rôle",
                                    );
                                  } finally {
                                    setRoleLoading(null);
                                  }
                                }}
                              >
                                Ajouter
                              </button>
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

            {currentUserRoles.includes('ADMIN') && (
              <>
                <hr className="my-4" />
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordReset(!showPasswordReset);
                      if (showPasswordReset) {
                        setPasswordData({ newPassword: '', newPasswordConfirm: '' });
                        setPasswordError(null);
                      }
                    }}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                  >
                    <Key className="w-4 h-4" />
                    {showPasswordReset
                      ? 'Annuler la réinitialisation'
                      : 'Réinitialiser le mot de passe'}
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
                            type={showPassword ? 'text' : 'password'}
                            value={passwordData.newPassword}
                            onChange={(value) =>
                              setPasswordData({ ...passwordData, newPassword: value })
                            }
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
                            title={
                              showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                            }
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {passwordData.newPassword && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Force du mot de passe :</span>
                              <span
                                className={`font-medium ${
                                  passwordStrength.label === 'Fort'
                                    ? 'text-green-600'
                                    : passwordStrength.label === 'Moyen'
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                }`}
                              >
                                {passwordStrength.label}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              {[...Array(6)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                                    i < passwordStrength.strength
                                      ? passwordStrength.color
                                      : 'bg-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Utilisez majuscules, minuscules, chiffres et caractères spéciaux pour
                              un mot de passe fort
                            </p>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="relative">
                          <PremiumInput
                            type={showPasswordConfirm ? 'text' : 'password'}
                            value={passwordData.newPasswordConfirm}
                            onChange={(value) =>
                              setPasswordData({ ...passwordData, newPasswordConfirm: value })
                            }
                            label="Confirmer le mot de passe"
                            placeholder="Confirmer le mot de passe"
                            icon={<Lock className="w-4 h-4" />}
                            variant="outlined"
                            size="md"
                            minLength={8}
                            error={
                              passwordData.newPasswordConfirm &&
                              passwordData.newPassword !== passwordData.newPasswordConfirm
                                ? 'Les mots de passe ne correspondent pas'
                                : undefined
                            }
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors z-10"
                            title={
                              showPasswordConfirm
                                ? 'Masquer le mot de passe'
                                : 'Afficher le mot de passe'
                            }
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
                    onChange={(value) =>
                      setClientFields({ ...clientFields, contactPrincipal: value })
                    }
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
                  onChange={(value) =>
                    setClientFields({ ...clientFields, emailFacturation: value })
                  }
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

export default EditUserModal;
