import React, { useState, useEffect } from 'react';
import {
  X,
  Eye,
  EyeOff,
  Mail,
  AlertCircle,
  Shield,
  Building2,
  Award,
  UserCheck,
  Phone,
  MapPin,
  User,
  CreditCard
} from 'lucide-react';
import { Tab } from '@headlessui/react';
import {
  Role,
  NomRole,
  Competence,
  NiveauCompetence,
  NIVEAU_COMPETENCE_LABELS,
  OperateurCreate,
  ClientCreate
} from '../../types/users';
import {
  fetchRoles,
  fetchCompetences,
  createUtilisateur,
  createOperateur,
  createClient,
  attribuerRole,
  affecterCompetence
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleObjects, setRoleObjects] = useState<Role[]>([]);

  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    password: '',
    passwordConfirm: ''
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
        actif: true
      });

      const adminRole = roleObjects.find(r => r.nomRole === 'ADMIN');
      if (adminRole) {
        await attribuerRole(user.id.toString(), adminRole.id.toString());
      }

      onCreated();
      onClose();
    } catch (err: any) {
      console.error('Erreur création admin:', err);
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
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
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
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
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
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

// ============================================================================
// MODAL - Créer un Client
// ============================================================================

export const CreateClientModal: React.FC<CreateModalProps> = ({ onClose, onCreated }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    password: '',
    passwordConfirm: '',
    nomStructure: '',
    adresse: '',
    telephone: '',
    contactPrincipal: '',
    emailFacturation: ''
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

    if (!formData.nomStructure.trim()) {
      setError('Le nom de la structure est requis');
      return;
    }

    setLoading(true);
    try {
      const clientData: ClientCreate = {
        email: formData.email,
        nom: formData.nom,
        prenom: formData.prenom,
        password: formData.password,
        nomStructure: formData.nomStructure,
        adresse: formData.adresse || undefined,
        telephone: formData.telephone || undefined,
        contactPrincipal: formData.contactPrincipal || undefined,
        emailFacturation: formData.emailFacturation || undefined
      };

      await createClient(clientData);
      onCreated();
      onClose();
    } catch (err: any) {
      console.error('Erreur création client:', err);
      // Extraire les messages d'erreur du backend
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
        setError('Erreur lors de la création du client.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-green-50">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-green-100">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Nouveau Client</h2>
              <p className="text-sm text-gray-500">Portail client et suivi des interventions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-green-100 rounded-lg">
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

            {/* Section Informations personnelles */}
            <div className="pb-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Informations personnelles
              </h3>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
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
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
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
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section Structure */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Informations de la structure
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la structure <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={formData.nomStructure}
                  onChange={(e) => setFormData({ ...formData, nomStructure: e.target.value })}
                  placeholder="Ex: Résidence Les Jardins"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder="Adresse complète"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      placeholder="06 XX XX XX XX"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact principal</label>
                  <input
                    type="text"
                    value={formData.contactPrincipal}
                    onChange={(e) => setFormData({ ...formData, contactPrincipal: e.target.value })}
                    placeholder="Nom du contact"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email de facturation</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.emailFacturation}
                    onChange={(e) => setFormData({ ...formData, emailFacturation: e.target.value })}
                    placeholder="facturation@exemple.com"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
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
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL - Créer un Superviseur
// ============================================================================

export const CreateChefEquipeModal: React.FC<CreateModalProps> = ({ onClose, onCreated }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [roleObjects, setRoleObjects] = useState<Role[]>([]);
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [selectedCompetences, setSelectedCompetences] = useState<{ competenceId: number; niveau: NiveauCompetence }[]>([]);

  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    password: '',
    passwordConfirm: '',
    matricule: '',
    telephone: ''
  });

  useEffect(() => {
    fetchRoles().then(setRoleObjects);
    fetchCompetences().then(setCompetences);
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

    if (!formData.matricule.trim()) {
      setError("Le matricule est requis pour un superviseur");
      return;
    }

    setLoading(true);
    try {
      const operateurData: OperateurCreate = {
        email: formData.email,
        nom: formData.nom,
        prenom: formData.prenom,
        password: formData.password,
        numeroImmatriculation: formData.matricule,
        dateEmbauche: new Date().toISOString().split('T')[0],
        telephone: formData.telephone || ''
      };

      const operateurResponse = await createOperateur(operateurData);
      const operateurId = operateurResponse.utilisateur;

      // Attribuer le rôle SUPERVISEUR
      const chefRole = roleObjects.find(r => r.nomRole === 'SUPERVISEUR');
      if (chefRole) {
        await attribuerRole(String(operateurId), String(chefRole.id));
      }

      // Affecter les compétences
      if (selectedCompetences.length > 0) {
        for (const comp of selectedCompetences) {
          await affecterCompetence(operateurId, {
            competenceId: comp.competenceId,
            niveau: comp.niveau
          });
        }
      }

      onCreated();
      onClose();
    } catch (err: any) {
      console.error("Erreur création superviseur:", err);
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
        setError("Erreur lors de la création du superviseur.");
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

            <Tab.Group selectedIndex={tabIndex} onChange={setTabIndex}>
              <Tab.List className="flex space-x-2 border-b mb-4">
                <Tab className={({ selected }) =>
                  selected ? 'px-4 py-2 border-b-2 border-yellow-500 font-semibold' : 'px-4 py-2 text-gray-500'}>
                  Informations
                </Tab>
                <Tab className={({ selected }) =>
                  selected ? 'px-4 py-2 border-b-2 border-yellow-500 font-semibold' : 'px-4 py-2 text-gray-500'}>
                  Compétences
                </Tab>
              </Tab.List>

              <Tab.Panels>
                <Tab.Panel>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
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
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
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
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Matricule <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.matricule}
                        onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                        placeholder="Ex: CE-2024-001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.telephone}
                          onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                          placeholder="06 XX XX XX XX"
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </Tab.Panel>

                <Tab.Panel>
                  <div className="mb-2 text-sm text-gray-600">
                    Sélectionnez les compétences du superviseur (optionnel).
                  </div>
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
                            <tr key={comp.id} className={selected ? 'bg-yellow-50' : ''}>
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
              className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              {loading ? 'Création...' : "Créer Superviseur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL - Créer un Opérateur
// ============================================================================

export const CreateOperateurModal: React.FC<CreateModalProps> = ({ onClose, onCreated }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [selectedCompetences, setSelectedCompetences] = useState<{ competenceId: number; niveau: NiveauCompetence }[]>([]);

  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    password: '',
    passwordConfirm: '',
    matricule: '',
    telephone: ''
  });

  useEffect(() => {
    fetchCompetences().then(setCompetences);
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

    if (!formData.matricule.trim()) {
      setError('Le matricule est requis pour un opérateur');
      return;
    }

    setLoading(true);
    try {
      const operateurData: OperateurCreate = {
        email: formData.email,
        nom: formData.nom,
        prenom: formData.prenom,
        password: formData.password,
        numeroImmatriculation: formData.matricule,
        dateEmbauche: new Date().toISOString().split('T')[0],
        telephone: formData.telephone || ''
      };

      const operateurResponse = await createOperateur(operateurData);
      const operateurId = operateurResponse.utilisateur;

      // Affecter les compétences
      if (selectedCompetences.length > 0) {
        for (const comp of selectedCompetences) {
          await affecterCompetence(operateurId, {
            competenceId: comp.competenceId,
            niveau: comp.niveau
          });
        }
      }

      onCreated();
      onClose();
    } catch (err: any) {
      console.error("Erreur création opérateur:", err);
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
        setError("Erreur lors de la création de l'opérateur.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-blue-100">
              <UserCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Nouvel Opérateur</h2>
              <p className="text-sm text-gray-500">Interventions terrain et maintenance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-blue-100 rounded-lg">
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

            <Tab.Group selectedIndex={tabIndex} onChange={setTabIndex}>
              <Tab.List className="flex space-x-2 border-b mb-4">
                <Tab className={({ selected }) =>
                  selected ? 'px-4 py-2 border-b-2 border-blue-500 font-semibold' : 'px-4 py-2 text-gray-500'}>
                  Informations
                </Tab>
                <Tab className={({ selected }) =>
                  selected ? 'px-4 py-2 border-b-2 border-blue-500 font-semibold' : 'px-4 py-2 text-gray-500'}>
                  Compétences
                </Tab>
              </Tab.List>

              <Tab.Panels>
                <Tab.Panel>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
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
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
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
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Matricule <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.matricule}
                        onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                        placeholder="Ex: OP-2024-007"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.telephone}
                          onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                          placeholder="06 XX XX XX XX"
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </Tab.Panel>

                <Tab.Panel>
                  <div className="mb-2 text-sm text-gray-600">
                    Sélectionnez les compétences de l'opérateur (optionnel).
                  </div>
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
                            <tr key={comp.id} className={selected ? 'bg-blue-50' : ''}>
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer Opérateur'}
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
      color: 'purple'
    },
    {
      role: 'CLIENT' as NomRole,
      icon: Building2,
      label: 'Client',
      description: 'Portail client et suivi des interventions',
      color: 'green'
    },
    {
      role: 'SUPERVISEUR' as NomRole,
      icon: Award,
      label: "Superviseur",
      description: "Gestion d'équipe et planification",
      color: 'yellow'
    },
    {
      role: 'SUPERVISEUR' as NomRole,
      icon: UserCheck,
      label: 'Opérateur',
      description: 'Interventions terrain et maintenance',
      color: 'blue'
    }
  ];

  const colorClasses: Record<string, { bg: string; hover: string; icon: string; border: string }> = {
    purple: { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', icon: 'text-purple-600', border: 'border-purple-200' },
    green: { bg: 'bg-green-50', hover: 'hover:bg-green-100', icon: 'text-green-600', border: 'border-green-200' },
    yellow: { bg: 'bg-yellow-50', hover: 'hover:bg-yellow-100', icon: 'text-yellow-600', border: 'border-yellow-200' },
    blue: { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', icon: 'text-blue-600', border: 'border-blue-200' }
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
              const colors = colorClasses[type.color];
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
