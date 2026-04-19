import React, { useState, useEffect } from 'react';
import { X, Mail, AlertCircle, Building2, Phone, MapPin, User, CreditCard } from 'lucide-react';
import { PremiumInput } from '../modals/PremiumFormComponents';
import type { ClientWithStructureCreate, StructureClient } from '../../types/users';
import { createClient, fetchStructures, addUserToStructure } from '../../services/usersApi';
import { useToast } from '../../contexts/ToastContext';

interface CreateClientModalProps {
  onClose: () => void;
  onCreated: () => void;
}

type StructureMode = 'existing' | 'new';

export const CreateClientModal: React.FC<CreateClientModalProps> = ({ onClose, onCreated }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    nomStructure: '',
    adresse: '',
    telephone: '',
    contactPrincipal: '',
    emailFacturation: '',
  });

  useEffect(() => {
    loadStructures();
  }, []);

  const loadStructures = async () => {
    setLoadingStructures(true);
    try {
      const data = await fetchStructures();
      setStructures(data.results || []);
    } catch (err) {
      showToast('Erreur lors du chargement des structures', 'error');
    } finally {
      setLoadingStructures(false);
    }
  };

  const filteredStructures = structures.filter(
    (s) =>
      s.nom.toLowerCase().includes(structureSearchQuery.toLowerCase()) ||
      s.contactPrincipal?.toLowerCase().includes(structureSearchQuery.toLowerCase()),
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
        await addUserToStructure(selectedStructureId, {
          email: formData.email,
          nom: formData.nom,
          prenom: formData.prenom,
          password: formData.password,
        });
      } else {
        const clientData: ClientWithStructureCreate = {
          email: formData.email,
          nom: formData.nom,
          prenom: formData.prenom,
          password: formData.password,
          nomStructure: formData.nomStructure,
          adresse: formData.adresse || undefined,
          telephone: formData.telephone || undefined,
          contactPrincipal: formData.contactPrincipal || undefined,
          emailFacturation: formData.emailFacturation || undefined,
        };
        await createClient(clientData);
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
        setError('Erreur lors de la création du client.');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedStructure = structures.find((s) => s.id === selectedStructureId);

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

            <div className="pb-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Informations personnelles
              </h3>
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

              <div className="mt-4">
                <PremiumInput
                  type="email"
                  value={formData.email}
                  onChange={(value) => setFormData({ ...formData, email: value })}
                  label="Email"
                  placeholder="client@exemple.com"
                  icon={<Mail className="w-4 h-4" />}
                  required
                  variant="outlined"
                  size="md"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
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

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Organisation
              </h3>

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
                <div className="space-y-3">
                  {selectedStructure ? (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium text-green-800">{selectedStructure.nom}</p>
                        {selectedStructure.contactPrincipal && (
                          <p className="text-sm text-green-600">
                            {selectedStructure.contactPrincipal}
                          </p>
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
                            {structureSearchQuery
                              ? 'Aucune organisation trouvée'
                              : 'Aucune organisation disponible'}
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
                                <p className="text-sm text-gray-500">
                                  {structure.contactPrincipal}
                                </p>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <PremiumInput
                    type="text"
                    value={formData.nomStructure}
                    onChange={(value) => setFormData({ ...formData, nomStructure: value })}
                    label="Nom de l'organisation"
                    placeholder="Ex: Résidence Les Jardins"
                    icon={<Building2 className="w-4 h-4" />}
                    required
                    variant="outlined"
                    size="md"
                  />

                  <PremiumInput
                    type="text"
                    value={formData.adresse}
                    onChange={(value) => setFormData({ ...formData, adresse: value })}
                    label="Adresse"
                    placeholder="Adresse complète"
                    icon={<MapPin className="w-4 h-4" />}
                    variant="outlined"
                    size="md"
                  />

                  <div className="grid grid-cols-2 gap-4">
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
                    <PremiumInput
                      type="text"
                      value={formData.contactPrincipal}
                      onChange={(value) => setFormData({ ...formData, contactPrincipal: value })}
                      label="Contact principal"
                      placeholder="Nom du contact"
                      icon={<User className="w-4 h-4" />}
                      variant="outlined"
                      size="md"
                    />
                  </div>

                  <PremiumInput
                    type="email"
                    value={formData.emailFacturation}
                    onChange={(value) => setFormData({ ...formData, emailFacturation: value })}
                    label="Email de facturation"
                    placeholder="facturation@exemple.com"
                    icon={<CreditCard className="w-4 h-4" />}
                    variant="outlined"
                    size="md"
                  />
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
