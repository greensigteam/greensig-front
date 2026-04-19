import React, { useState, useEffect } from 'react';
import { X, Mail, AlertCircle, Shield, Building2, Award, Phone, User, Hash } from 'lucide-react';
import { PremiumInput } from '../modals/PremiumFormComponents';
import { Role, NomRole, SuperviseurCreate } from '../../types/users';
import {
  fetchRoles,
  createUtilisateur,
  createSuperviseur,
  attribuerRole,
} from '../../services/usersApi';

// ============================================================================
// PROPS COMMUNES
// ============================================================================

interface CreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

// ============================================================================
// MODAL - Créer un Administrateur
// ============================================================================

export const CreateAdminModal: React.FC<CreateModalProps> = ({ onClose, onCreated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleObjects, setRoleObjects] = useState<Role[]>([]);

  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    password: '',
    passwordConfirm: '',
  });

  useEffect(() => {
    fetchRoles().then(setRoleObjects);
  }, []);

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

    setLoading(true);
    try {
      const user = await createUtilisateur({
        email: formData.email,
        nom: formData.nom,
        prenom: formData.prenom,
        password: formData.password,
        passwordConfirm: formData.password,
        actif: true,
      });

      const adminRole = roleObjects.find((r) => r.nomRole === 'ADMIN');
      if (adminRole) {
        await attribuerRole(user.id.toString(), adminRole.id.toString());
      }

      onCreated();
      onClose();
    } catch (err: any) {
      if (err?.data) {
        const errorMessages: string[] = [];
        for (const [field, messages] of Object.entries(err.data)) {
          if (Array.isArray(messages)) {
            errorMessages.push(`${field}: ${messages.join(', ')}`);
          } else if (typeof messages === 'string') {
            errorMessages.push(`${field}: ${messages}`);
          }
        }
        if (errorMessages.length > 0) {
          setError(errorMessages.join('\n'));
        } else {
          setError('Erreur de validation : vérifiez les champs du formulaire.');
        }
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError("Erreur lors de la création de l'administrateur.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-purple-100">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Nouvel Administrateur</h2>
              <p className="text-sm text-gray-500">Accès complet au système</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-purple-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm whitespace-pre-wrap">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <PremiumInput
                type="text"
                value={formData.prenom}
                onChange={(value) => setFormData({ ...formData, prenom: value })}
                label="Prénom"
                placeholder="Jean"
                icon={<User className="w-4 h-4" />}
                required
                variant="outlined"
                size="md"
              />

              <PremiumInput
                type="text"
                value={formData.nom}
                onChange={(value) => setFormData({ ...formData, nom: value })}
                label="Nom"
                placeholder="Dupont"
                icon={<User className="w-4 h-4" />}
                required
                variant="outlined"
                size="md"
              />
            </div>

            <PremiumInput
              type="email"
              value={formData.email}
              onChange={(value) => setFormData({ ...formData, email: value })}
              label="Email"
              placeholder="admin@exemple.com"
              icon={<Mail className="w-4 h-4" />}
              required
              variant="outlined"
              size="md"
            />

            <div className="grid grid-cols-2 gap-4">
              <PremiumInput
                type="password"
                value={formData.password}
                onChange={(value) => setFormData({ ...formData, password: value })}
                label="Mot de passe"
                placeholder="Minimum 8 caractères"
                required
                variant="outlined"
                size="md"
                hint="Au moins 8 caractères"
              />

              <PremiumInput
                type="password"
                value={formData.passwordConfirm}
                onChange={(value) => setFormData({ ...formData, passwordConfirm: value })}
                label="Confirmer"
                placeholder="Retapez le mot de passe"
                required
                variant="outlined"
                size="md"
              />
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
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer Administrateur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { CreateClientModal } from './CreateClientModal';

// ============================================================================
// MODAL - Créer un Superviseur
// ============================================================================

export const CreateChefEquipeModal: React.FC<CreateModalProps> = ({ onClose, onCreated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    password: '',
    passwordConfirm: '',
    matricule: '',
    telephone: '',
  });

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

    if (!formData.matricule.trim()) {
      setError('Le matricule est requis pour un superviseur');
      return;
    }

    setLoading(true);
    try {
      // Utiliser l'endpoint superviseurs/ qui crée automatiquement :
      // 1. Le compte Utilisateur
      // 2. Le profil Superviseur (avec matricule, téléphone, etc.)
      // 3. L'attribution du rôle SUPERVISEUR
      const superviseurData: SuperviseurCreate = {
        email: formData.email,
        nom: formData.nom,
        prenom: formData.prenom,
        password: formData.password,
        matricule: formData.matricule,
        telephone: formData.telephone || undefined,
        date_prise_fonction: new Date().toISOString().split('T')[0],
      };

      await createSuperviseur(superviseurData);

      onCreated();
      onClose();
    } catch (err: any) {
      if (err?.data) {
        const errorMessages: string[] = [];
        for (const [field, messages] of Object.entries(err.data)) {
          if (Array.isArray(messages)) {
            errorMessages.push(`${field}: ${messages.join(', ')}`);
          } else if (typeof messages === 'string') {
            errorMessages.push(`${field}: ${messages}`);
          }
        }
        if (errorMessages.length > 0) {
          setError(errorMessages.join('\n'));
        } else {
          setError('Erreur de validation : vérifiez les champs du formulaire.');
        }
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError('Erreur lors de la création du superviseur.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-yellow-50">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-yellow-100">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Nouveau Superviseur</h2>
              <p className="text-sm text-gray-500">Gestion d'équipe et planification</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-yellow-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm whitespace-pre-wrap">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <PremiumInput
                type="text"
                value={formData.prenom}
                onChange={(value) => setFormData({ ...formData, prenom: value })}
                label="Prénom"
                placeholder="Jean"
                icon={<User className="w-4 h-4" />}
                required
                variant="outlined"
                size="md"
              />

              <PremiumInput
                type="text"
                value={formData.nom}
                onChange={(value) => setFormData({ ...formData, nom: value })}
                label="Nom"
                placeholder="Dupont"
                icon={<User className="w-4 h-4" />}
                required
                variant="outlined"
                size="md"
              />
            </div>

            <PremiumInput
              type="email"
              value={formData.email}
              onChange={(value) => setFormData({ ...formData, email: value })}
              label="Email"
              placeholder="superviseur@exemple.com"
              icon={<Mail className="w-4 h-4" />}
              required
              variant="outlined"
              size="md"
            />

            <div className="grid grid-cols-2 gap-4">
              <PremiumInput
                type="password"
                value={formData.password}
                onChange={(value) => setFormData({ ...formData, password: value })}
                label="Mot de passe"
                placeholder="Minimum 8 caractères"
                required
                variant="outlined"
                size="md"
                hint="Au moins 8 caractères"
              />

              <PremiumInput
                type="password"
                value={formData.passwordConfirm}
                onChange={(value) => setFormData({ ...formData, passwordConfirm: value })}
                label="Confirmer"
                placeholder="Retapez le mot de passe"
                required
                variant="outlined"
                size="md"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <PremiumInput
                type="text"
                value={formData.matricule}
                onChange={(value) => setFormData({ ...formData, matricule: value })}
                label="Matricule"
                placeholder="Ex: CE-2024-001"
                icon={<Hash className="w-4 h-4" />}
                required
                variant="outlined"
                size="md"
              />

              <PremiumInput
                type="tel"
                value={formData.telephone}
                onChange={(value) => setFormData({ ...formData, telephone: value })}
                label="Téléphone"
                placeholder="06 XX XX XX XX"
                icon={<Phone className="w-4 h-4" />}
                variant="outlined"
                size="md"
              />
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
              className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer Superviseur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// COMPOSANT - Menu de sélection du type d'utilisateur
// ============================================================================

interface UserTypeMenuProps {
  onSelect: (type: NomRole) => void;
  onClose: () => void;
}

export const UserTypeMenu: React.FC<UserTypeMenuProps> = ({ onSelect, onClose }) => {
  const userTypes = [
    {
      role: 'ADMIN' as NomRole,
      icon: Shield,
      label: 'Administrateur',
      description: 'Accès complet au système',
      color: 'purple',
    },
    {
      role: 'CLIENT' as NomRole,
      icon: Building2,
      label: 'Client',
      description: 'Portail client et suivi des interventions',
      color: 'green',
    },
    {
      role: 'SUPERVISEUR' as NomRole,
      icon: Award,
      label: 'Superviseur',
      description: "Gestion d'équipe et planification",
      color: 'yellow',
    },
  ];

  const colorClasses: Record<string, { bg: string; hover: string; icon: string; border: string }> =
    {
      purple: {
        bg: 'bg-purple-50',
        hover: 'hover:bg-purple-100',
        icon: 'text-purple-600',
        border: 'border-purple-200',
      },
      green: {
        bg: 'bg-green-50',
        hover: 'hover:bg-green-100',
        icon: 'text-green-600',
        border: 'border-green-200',
      },
      yellow: {
        bg: 'bg-yellow-50',
        hover: 'hover:bg-yellow-100',
        icon: 'text-yellow-600',
        border: 'border-yellow-200',
      },
      blue: {
        bg: 'bg-blue-50',
        hover: 'hover:bg-blue-100',
        icon: 'text-blue-600',
        border: 'border-blue-200',
      },
    };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Créer un utilisateur</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">Sélectionnez le type d'utilisateur à créer :</p>
          <div className="space-y-3">
            {userTypes.map((type) => {
              const colors = colorClasses[type.color]!;
              const Icon = type.icon;
              return (
                <button
                  key={type.role}
                  onClick={() => onSelect(type.role)}
                  className={`w-full p-4 rounded-lg border ${colors.border} ${colors.bg} ${colors.hover} transition-colors text-left flex items-center gap-4`}
                >
                  <div className={`p-3 rounded-full bg-white`}>
                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{type.label}</p>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
