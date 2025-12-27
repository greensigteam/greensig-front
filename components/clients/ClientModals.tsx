import React, { useState } from 'react';
import { Building2, Mail, User, Phone, MapPin, Shield, Info } from 'lucide-react';
import FormModal, { FormField, FormInput, FormSection, FormGrid } from '../FormModal';
import type { Client, ClientCreate, ClientUpdate } from '../../types/users';
import { createClient, updateClient } from '../../services/usersApi';
import { useToast } from '../../contexts/ToastContext';

// ============================================================================
// CREATE CLIENT MODAL
// ============================================================================

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateClientModal: React.FC<CreateClientModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ClientCreate>({
    email: '',
    nom: '',
    prenom: '',
    password: '',
    nomStructure: '',
    adresse: '',
    telephone: '',
    contactPrincipal: '',
    emailFacturation: '',
    logo: undefined,
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validation email
    if (!formData.email) {
      newErrors.email = 'Email requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    // Validation nom/prénom
    if (!formData.nom) newErrors.nom = 'Nom requis';
    if (!formData.prenom) newErrors.prenom = 'Prénom requis';

    // Validation password
    if (!formData.password) {
      newErrors.password = 'Mot de passe requis';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Minimum 8 caractères';
    }

    // Validation nom structure
    if (!formData.nomStructure) {
      newErrors.nomStructure = 'Nom de structure requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      showToast('Veuillez corriger les erreurs du formulaire', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await createClient(formData);
      showToast('Client créé avec succès', 'success');
      onCreated();
      onClose();
      // Reset form
      setFormData({
        email: '',
        nom: '',
        prenom: '',
        password: '',
        nomStructure: '',
        adresse: '',
        telephone: '',
        contactPrincipal: '',
        emailFacturation: '',
        logo: undefined,
      });
      setErrors({});
    } catch (error: any) {
      showToast(error.message || 'Erreur lors de la création du client', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast('Le logo ne doit pas dépasser 2MB', 'error');
      return;
    }

    // Validation type
    if (!file.type.startsWith('image/')) {
      showToast('Le fichier doit être une image', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, logo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Nouveau Client"
      subtitle="Créer une organisation cliente avec compte d'accès au portail"
      icon={<Building2 className="w-5 h-5 text-emerald-600" />}
      size="xl"
      loading={isSubmitting}
      submitLabel="Créer le client"
      useGradientHeader
    >
      {/* Banner explicatif */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium">Création d'un client complet</p>
          <p className="text-blue-700 mt-1">
            Vous allez créer à la fois <strong>un compte utilisateur</strong> (identifiant + mot de passe pour accéder au portail client)
            et <strong>un profil organisation</strong> (entreprise propriétaire de sites).
          </p>
        </div>
      </div>

      {/* SECTION 1: Compte Utilisateur */}
      <FormSection
        title="👤 Compte Utilisateur (Accès Portail)"
        description="Identifiants de connexion au portail client"
        className="bg-blue-50/30 p-4 rounded-lg"
      >
        <FormGrid columns={2}>
          <FormField
            label="Email"
            required
            error={errors.email}
            icon={<Mail className="w-4 h-4" />}
            hint="Identifiant de connexion unique"
          >
            <FormInput
              type="email"
              value={formData.email}
              onChange={(v) => setFormData({ ...formData, email: v })}
              placeholder="contact@entreprise.com"
              required
            />
          </FormField>

          <FormField
            label="Mot de passe"
            required
            error={errors.password}
            hint="Minimum 8 caractères"
          >
            <FormInput
              type="password"
              value={formData.password}
              onChange={(v) => setFormData({ ...formData, password: v })}
              placeholder="••••••••"
              required
            />
          </FormField>

          <FormField
            label="Nom"
            required
            error={errors.nom}
            icon={<User className="w-4 h-4" />}
          >
            <FormInput
              value={formData.nom}
              onChange={(v) => setFormData({ ...formData, nom: v })}
              placeholder="Dupont"
              required
            />
          </FormField>

          <FormField
            label="Prénom"
            required
            error={errors.prenom}
          >
            <FormInput
              value={formData.prenom}
              onChange={(v) => setFormData({ ...formData, prenom: v })}
              placeholder="Jean"
              required
            />
          </FormField>
        </FormGrid>

        <div className="mt-3 text-xs text-blue-600 flex items-center gap-1 bg-blue-100/50 p-2 rounded">
          <Shield className="w-3 h-3" />
          Le rôle <strong>CLIENT</strong> sera automatiquement attribué à ce compte
        </div>
      </FormSection>

      {/* SECTION 2: Informations Organisation */}
      <FormSection
        title="🏢 Informations Organisation"
        description="Détails de l'entreprise cliente"
        className="mt-6"
      >
        <FormField
          label="Nom de la structure"
          required
          error={errors.nomStructure}
          hint="Nom de l'entreprise cliente"
        >
          <FormInput
            value={formData.nomStructure}
            onChange={(v) => setFormData({ ...formData, nomStructure: v })}
            placeholder="Ex: ACME GreenCare SARL"
            required
          />
        </FormField>

        <FormGrid columns={2} className="mt-4">
          <FormField label="Adresse" icon={<MapPin className="w-4 h-4" />}>
            <FormInput
              value={formData.adresse || ''}
              onChange={(v) => setFormData({ ...formData, adresse: v })}
              placeholder="Adresse complète"
            />
          </FormField>

          <FormField label="Téléphone" icon={<Phone className="w-4 h-4" />}>
            <FormInput
              type="tel"
              value={formData.telephone || ''}
              onChange={(v) => setFormData({ ...formData, telephone: v })}
              placeholder="+212 5XX XX XX XX"
            />
          </FormField>

          <FormField label="Contact principal">
            <FormInput
              value={formData.contactPrincipal || ''}
              onChange={(v) => setFormData({ ...formData, contactPrincipal: v })}
              placeholder="Nom du contact sur site"
            />
          </FormField>

          <FormField label="Email facturation" icon={<Mail className="w-4 h-4" />}>
            <FormInput
              type="email"
              value={formData.emailFacturation || ''}
              onChange={(v) => setFormData({ ...formData, emailFacturation: v })}
              placeholder="facturation@entreprise.com"
            />
          </FormField>
        </FormGrid>

        <FormField label="Logo" hint="Format JPG, PNG (max 2MB)" className="mt-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
          />
          {formData.logo && (
            <div className="mt-2">
              <img src={formData.logo} alt="Aperçu logo" className="w-16 h-16 rounded-lg object-contain border p-1" />
            </div>
          )}
        </FormField>
      </FormSection>
    </FormModal>
  );
};

// ============================================================================
// EDIT CLIENT MODAL
// ============================================================================

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onUpdated: () => void;
}

export const EditClientModal: React.FC<EditClientModalProps> = ({
  isOpen,
  onClose,
  client,
  onUpdated,
}) => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoChanged, setLogoChanged] = useState(false); // Track si le logo a changé

  const [formData, setFormData] = useState<ClientUpdate & { email: string; nom: string; prenom: string; actif: boolean }>({
    nomStructure: client.nomStructure,
    adresse: client.adresse,
    telephone: client.telephone,
    contactPrincipal: client.contactPrincipal,
    emailFacturation: client.emailFacturation,
    logo: client.logo || undefined,
    // Champs en lecture seule (affichés mais non modifiables directement via cette modale)
    email: client.email,
    nom: client.nom,
    prenom: client.prenom,
    actif: client.actif,
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nomStructure) {
      newErrors.nomStructure = 'Nom de structure requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      showToast('Veuillez corriger les erreurs du formulaire', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Ne pas envoyer les champs undefined au backend
      const updateData: ClientUpdate = {};

      if (formData.nomStructure !== undefined) updateData.nomStructure = formData.nomStructure;
      if (formData.adresse !== undefined) updateData.adresse = formData.adresse;
      if (formData.telephone !== undefined) updateData.telephone = formData.telephone;
      if (formData.contactPrincipal !== undefined) updateData.contactPrincipal = formData.contactPrincipal;
      if (formData.emailFacturation !== undefined) updateData.emailFacturation = formData.emailFacturation;
      // N'envoyer le logo que s'il a été modifié
      if (logoChanged && formData.logo !== undefined) updateData.logo = formData.logo;

      console.log('🔍 Données envoyées à updateClient:', {
        utilisateurId: client.utilisateur,
        logoChanged,
        hasLogo: !!updateData.logo,
        logoType: typeof updateData.logo,
        logoPrefix: updateData.logo ? (updateData.logo as string).substring(0, 50) : 'N/A',
        updateData
      });

      await updateClient(client.utilisateur, updateData);
      showToast('Client modifié avec succès', 'success');
      onUpdated();
      onClose();
    } catch (error: any) {
      console.error('❌ Erreur lors de la modification:', error);

      // Afficher les détails de l'erreur backend si disponibles
      let errorMessage = 'Erreur lors de la modification du client';
      if (error.data) {
        console.error('📋 Détails de l\'erreur backend:', error.data);
        errorMessage += ': ' + JSON.stringify(error.data);
      } else if (error.message) {
        errorMessage = error.message;
      }

      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast('Le logo ne doit pas dépasser 2MB', 'error');
      return;
    }

    // Validation type
    if (!file.type.startsWith('image/')) {
      showToast('Le fichier doit être une image', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, logo: reader.result as string }));
      setLogoChanged(true); // Marquer que le logo a été modifié
    };
    reader.readAsDataURL(file);
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Modifier le Client"
      subtitle={client.nomStructure}
      icon={<Building2 className="w-5 h-5 text-emerald-600" />}
      size="xl"
      loading={isSubmitting}
      submitLabel="Enregistrer"
      useGradientHeader
    >
      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <p className="font-medium">Modification du profil organisation</p>
          <p className="text-amber-700 mt-1">
            Pour modifier l'email, le mot de passe ou le statut du compte, utilisez la gestion des utilisateurs.
          </p>
        </div>
      </div>

      {/* SECTION 1: Informations Compte (lecture seule) */}
      <FormSection
        title="👤 Compte Utilisateur"
        description="Informations en lecture seule - Modifiables via Paramètres > Utilisateurs"
        className="bg-gray-50/50 p-4 rounded-lg"
      >
        <FormGrid columns={2}>
          <FormField label="Email (Identifiant)" icon={<Mail className="w-4 h-4" />}>
            <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600">
              {formData.email}
            </div>
          </FormField>

          <FormField label="Statut du compte">
            <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${formData.actif ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              {formData.actif ? 'Actif' : 'Inactif'}
            </div>
          </FormField>

          <FormField label="Contact principal" icon={<User className="w-4 h-4" />}>
            <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600">
              {formData.prenom} {formData.nom}
            </div>
          </FormField>

          <FormField label="Rôle">
            <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 flex items-center gap-2">
              <Shield className="w-3 h-3" />
              CLIENT
            </div>
          </FormField>
        </FormGrid>
      </FormSection>

      {/* SECTION 2: Informations Organisation (modifiable) */}
      <FormSection
        title="🏢 Informations Organisation"
        description="Détails de l'entreprise cliente"
        className="mt-6"
      >
        <FormField
          label="Nom de la structure"
          required
          error={errors.nomStructure}
        >
          <FormInput
            value={formData.nomStructure || ''}
            onChange={(v) => setFormData({ ...formData, nomStructure: v })}
            placeholder="Ex: ACME GreenCare SARL"
            required
          />
        </FormField>

        <FormGrid columns={2} className="mt-4">
          <FormField label="Adresse" icon={<MapPin className="w-4 h-4" />}>
            <FormInput
              value={formData.adresse || ''}
              onChange={(v) => setFormData({ ...formData, adresse: v })}
              placeholder="Adresse complète"
            />
          </FormField>

          <FormField label="Téléphone" icon={<Phone className="w-4 h-4" />}>
            <FormInput
              type="tel"
              value={formData.telephone || ''}
              onChange={(v) => setFormData({ ...formData, telephone: v })}
              placeholder="+212 5XX XX XX XX"
            />
          </FormField>

          <FormField label="Contact sur site">
            <FormInput
              value={formData.contactPrincipal || ''}
              onChange={(v) => setFormData({ ...formData, contactPrincipal: v })}
              placeholder="Nom du contact sur site"
            />
          </FormField>

          <FormField label="Email facturation" icon={<Mail className="w-4 h-4" />}>
            <FormInput
              type="email"
              value={formData.emailFacturation || ''}
              onChange={(v) => setFormData({ ...formData, emailFacturation: v })}
              placeholder="facturation@entreprise.com"
            />
          </FormField>
        </FormGrid>

        <FormField label="Logo" hint="Format JPG, PNG (max 2MB)" className="mt-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
          />
          {formData.logo && (
            <div className="mt-2 flex items-center gap-3">
              <img src={formData.logo} alt="Logo actuel" className="w-16 h-16 rounded-lg object-contain border p-1" />
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, logo: undefined }));
                  setLogoChanged(true); // Marquer la suppression comme un changement
                }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Supprimer le logo
              </button>
            </div>
          )}
        </FormField>
      </FormSection>
    </FormModal>
  );
};

export default { CreateClientModal, EditClientModal };
