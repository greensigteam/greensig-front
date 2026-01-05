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
  Phone,
  MapPin,
  User,
  CreditCard
} from 'lucide-react';
import {
  Role,
  NomRole,
  ClientCreate,
  SuperviseurCreate
} from '../../types/users';
import {
  fetchRoles,
  createUtilisateur,
  createClient,
  createSuperviseur,
  attribuerRole,
  fetchStructures,
  addUserToStructure
} from '../../services/usersApi';
import type { StructureClient } from '../../types/users';

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

type StructureMode = 'existing' | 'new';

export const CreateClientModal: React.FC<CreateModalProps> = ({ onClose, onCreated }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mode: affecter à une structure existante ou en créer une nouvelle
  const [structureMode, setStructureMode] = useState<StructureMode>('existing');
  const [structures, setStructures] = useState<StructureClient[]>([]);
  const [loadingStructures, setLoadingStructures] = useState(false);
  const [selectedStructureId, setSelectedStructureId] = useState<number | null>(null);
  const [structureSearchQuery, setStructureSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    password: '',
    passwordConfirm: '',
    // Champs pour nouvelle structure
    nomStructure: '',
    adresse: '',
    telephone: '',
    contactPrincipal: '',
    emailFacturation: ''
  });

  // Charger les structures existantes au montage
  useEffect(() => {
    loadStructures();
  }, []);

  const loadStructures = async () => {
    setLoadingStructures(true);
    try {
      const data = await fetchStructures();
      setStructures(data.results || []);
    } catch (err) {
      console.error('Erreur chargement structures:', err);
    } finally {
      setLoadingStructures(false);
    }
  };

  const filteredStructures = structures.filter(s =>
    s.nom.toLowerCase().includes(structureSearchQuery.toLowerCase()) ||
    s.contactPrincipal?.toLowerCase().includes(structureSearchQuery.toLowerCase())
  );

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

    if (structureMode === 'existing' && !selectedStructureId) {
      setError('Veuillez sélectionner une organisation');
      return;
    }

    if (structureMode === 'new' && !formData.nomStructure.trim()) {
      setError('Le nom de la structure est requis');
      return;
    }

    setLoading(true);
    try {
      if (structureMode === 'existing' && selectedStructureId) {
        // Ajouter l'utilisateur à une structure existante
        await addUserToStructure(selectedStructureId, {
          email: formData.email,
          nom: formData.nom,
          prenom: formData.prenom,
          password: formData.password
        });
      } else {
        // Créer un client avec une nouvelle structure
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
      }

      onCreated();
      onClose();
    } catch (err: any) {
      console.error('Erreur création client:', err);
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

  const selectedStructure = structures.find(s => s.id === selectedStructureId);

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

            {/* Section Organisation */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Organisation
              </h3>

              {/* Sélecteur de mode */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setStructureMode('existing');
                    setSelectedStructureId(null);
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    structureMode === 'existing'
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Organisation existante
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStructureMode('new');
                    setSelectedStructureId(null);
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    structureMode === 'new'
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Nouvelle organisation
                </button>
              </div>

              {structureMode === 'existing' ? (
                /* Sélection d'une structure existante */
                <div className="space-y-3">
                  {selectedStructure ? (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium text-green-800">{selectedStructure.nom}</p>
                        {selectedStructure.contactPrincipal && (
                          <p className="text-sm text-green-600">{selectedStructure.contactPrincipal}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedStructureId(null)}
                        className="p-1 hover:bg-green-100 rounded"
                      >
                        <X className="w-4 h-4 text-green-600" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Rechercher une organisation..."
                          value={structureSearchQuery}
                          onChange={(e) => setStructureSearchQuery(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                        {loadingStructures ? (
                          <div className="p-4 text-center text-gray-500">Chargement...</div>
                        ) : filteredStructures.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            {structureSearchQuery ? 'Aucune organisation trouvée' : 'Aucune organisation disponible'}
                          </div>
                        ) : (
                          filteredStructures.map((structure) => (
                            <button
                              key={structure.id}
                              type="button"
                              onClick={() => setSelectedStructureId(structure.id)}
                              className="w-full p-3 text-left hover:bg-green-50 border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              <p className="font-medium text-gray-800">{structure.nom}</p>
                              {structure.contactPrincipal && (
                                <p className="text-sm text-gray-500">{structure.contactPrincipal}</p>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Formulaire nouvelle structure */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de l'organisation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nomStructure}
                      onChange={(e) => setFormData({ ...formData, nomStructure: e.target.value })}
                      placeholder="Ex: Résidence Les Jardins"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  <div>
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

                  <div className="grid grid-cols-2 gap-4">
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

                  <div>
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

  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    password: '',
    passwordConfirm: '',
    matricule: '',
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
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (!formData.matricule.trim()) {
      setError("Le matricule est requis pour un superviseur");
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
        date_prise_fonction: new Date().toISOString().split('T')[0]
      };

      await createSuperviseur(superviseurData);

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
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
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

            <div className="grid grid-cols-2 gap-4">
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
