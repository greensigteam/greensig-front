import React, { useState } from 'react';
import { UserPlus, Mail, Lock, User, Phone, MapPin, Calendar, Hash, Sparkles } from 'lucide-react';
import { createSuperviseur } from '../../services/usersApi';
import { SuperviseurCreate, SuperviseurList } from '../../types/users';
import { useToast } from '../../contexts/ToastContext';
import FormModal, { FormSection, FormGrid } from '../FormModal';
import { PremiumInput, PremiumButton } from '../modals/PremiumFormComponents';

interface CreateSuperviseurModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (superviseur: SuperviseurList) => void;
}

export default function CreateSuperviseurModal({
  isOpen,
  onClose,
  onCreated,
}: CreateSuperviseurModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<SuperviseurCreate>({
    email: '',
    nom: '',
    prenom: '',
    password: '',
    matricule: '',
    telephone: '',
    secteur_geographique: '',
    date_prise_fonction: '',
  });

  const handleChange = (field: keyof SuperviseurCreate, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const generatePassword = () => {
    // Générer un mot de passe sécurisé : 8 caractères avec majuscule, minuscule, chiffre et symbole
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '@#$%&*!';
    const allChars = uppercase + lowercase + numbers + symbols;

    let password = '';
    // Au moins un de chaque type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Compléter avec des caractères aléatoires
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Mélanger les caractères
    password = password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');

    handleChange('password', password);
    showToast('Mot de passe généré avec succès', 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation basique
    if (!formData.email.trim() || !formData.nom.trim() || !formData.prenom.trim()) {
      setError('Les champs email, nom et prénom sont obligatoires');
      return;
    }

    if (!formData.password || formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (!formData.matricule.trim()) {
      setError('Le matricule est obligatoire');
      return;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("L'adresse email n'est pas valide");
      return;
    }

    setLoading(true);
    try {
      const newSuperviseur = await createSuperviseur(formData);
      showToast(`Superviseur ${newSuperviseur.fullName} créé avec succès`, 'success');
      onCreated?.(newSuperviseur);
      onClose();

      // Réinitialiser le formulaire
      setFormData({
        email: '',
        nom: '',
        prenom: '',
        password: '',
        matricule: '',
        telephone: '',
        secteur_geographique: '',
        date_prise_fonction: '',
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la création du superviseur';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Créer un superviseur"
      subtitle="Nouveau compte avec rôle Superviseur"
      icon={<UserPlus className="w-5 h-5 text-emerald-600" />}
      size="lg"
      loading={loading}
      error={error}
      submitLabel="Créer le superviseur"
      cancelLabel="Annuler"
      useGradientHeader={true}
    >
      {/* Section Compte utilisateur */}
      <FormSection
        title="Compte utilisateur"
        description="Informations de connexion (rôle SUPERVISEUR assigné automatiquement)"
      >
        <PremiumInput
          type="email"
          value={formData.email}
          onChange={(value) => handleChange('email', value)}
          label="Email"
          placeholder="superviseur@exemple.com"
          icon={<Mail className="w-4 h-4" />}
          disabled={loading}
          required
          variant="outlined"
          size="md"
        />

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <PremiumInput
              type="password"
              value={formData.password}
              onChange={(value) => handleChange('password', value)}
              label="Mot de passe"
              placeholder="Minimum 8 caractères"
              icon={<Lock className="w-4 h-4" />}
              disabled={loading}
              required
              minLength={8}
              variant="outlined"
              size="md"
              hint="Utilisez le bouton Générer pour un mot de passe sécurisé"
            />
          </div>
          <div className="mb-5">
            <PremiumButton
              type="button"
              onClick={generatePassword}
              disabled={loading}
              variant="glass"
              size="md"
              icon={<Sparkles className="w-4 h-4" />}
            >
              Générer
            </PremiumButton>
          </div>
        </div>
      </FormSection>

      {/* Section Informations personnelles */}
      <FormSection title="Informations personnelles" description="Identité du superviseur">
        <FormGrid columns={2}>
          <PremiumInput
            type="text"
            value={formData.nom}
            onChange={(value) => handleChange('nom', value)}
            label="Nom"
            placeholder="Dupont"
            icon={<User className="w-4 h-4" />}
            disabled={loading}
            required
            variant="outlined"
            size="md"
          />

          <PremiumInput
            type="text"
            value={formData.prenom}
            onChange={(value) => handleChange('prenom', value)}
            label="Prénom"
            placeholder="Jean"
            icon={<User className="w-4 h-4" />}
            disabled={loading}
            required
            variant="outlined"
            size="md"
          />
        </FormGrid>

        <FormGrid columns={2}>
          <PremiumInput
            type="text"
            value={formData.matricule}
            onChange={(value) => handleChange('matricule', value)}
            label="Matricule"
            placeholder="SUP-001"
            icon={<Hash className="w-4 h-4" />}
            disabled={loading}
            required
            variant="outlined"
            size="md"
          />

          <PremiumInput
            type="tel"
            value={formData.telephone || ''}
            onChange={(value) => handleChange('telephone', value)}
            label="Téléphone"
            placeholder="+212 6XX XXX XXX"
            icon={<Phone className="w-4 h-4" />}
            disabled={loading}
            variant="outlined"
            size="md"
          />
        </FormGrid>
      </FormSection>

      {/* Section Affectation */}
      <FormSection
        title="Affectation (optionnel)"
        description="Secteur géographique et date de prise de fonction"
      >
        <FormGrid columns={2}>
          <PremiumInput
            type="text"
            value={formData.secteur_geographique || ''}
            onChange={(value) => handleChange('secteur_geographique', value)}
            label="Secteur géographique"
            placeholder="Ex: Casablanca Centre"
            icon={<MapPin className="w-4 h-4" />}
            disabled={loading}
            variant="outlined"
            size="md"
          />

          <PremiumInput
            type="date"
            value={formData.date_prise_fonction || ''}
            onChange={(value) => handleChange('date_prise_fonction', value)}
            label="Date de prise de fonction"
            icon={<Calendar className="w-4 h-4" />}
            disabled={loading}
            variant="outlined"
            size="md"
          />
        </FormGrid>
      </FormSection>

      {/* Info sur le rôle */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-emerald-900 mb-1">Rôle SUPERVISEUR</h4>
            <p className="text-xs text-emerald-700">
              Ce compte aura accès à la gestion des équipes, la planification des tâches et le suivi
              des interventions. Le rôle SUPERVISEUR sera automatiquement assigné lors de la
              création.
            </p>
          </div>
        </div>
      </div>
    </FormModal>
  );
}
