/**
 * Premium Components Demo
 * Page de démonstration des composants de niveau 3
 */

import React, { useState } from 'react';
import { Mail, Lock, User, Phone, Search, DollarSign, Calendar } from 'lucide-react';
import {
  PremiumInput,
  PremiumSelect,
  PremiumTextarea,
  PremiumButton,
} from './PremiumFormComponents';

export const PremiumComponentsDemo: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const countryOptions = [
    { value: 'ma', label: 'Maroc' },
    { value: 'fr', label: 'France' },
    { value: 'us', label: 'États-Unis' },
    { value: 'uk', label: 'Royaume-Uni' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Premium Components - Niveau 3
          </h1>
          <p className="text-lg text-slate-600">
            Design system moderne avec floating labels, animations & glassmorphism
          </p>
        </div>

        {/* Variants Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Outlined Variant */}
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 mb-4">🎨 Variant: Outlined</h2>

            <PremiumInput
              type="email"
              value={email}
              onChange={setEmail}
              label="Email"
              placeholder="votre@email.com"
              icon={<Mail className="w-4 h-4" />}
              variant="outlined"
              size="md"
            />

            <PremiumInput
              type="password"
              value={password}
              onChange={setPassword}
              label="Mot de passe"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              variant="outlined"
              size="md"
              hint="8 caractères minimum"
            />

            <PremiumSelect
              value={country}
              onChange={setCountry}
              options={countryOptions}
              label="Pays"
              placeholder="Sélectionner"
              icon={<Search className="w-4 h-4" />}
              variant="outlined"
              size="md"
            />

            <PremiumButton variant="primary" size="md" fullWidth>
              Se connecter
            </PremiumButton>
          </div>

          {/* Filled Variant */}
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 mb-4">🌟 Variant: Filled</h2>

            <PremiumInput
              type="text"
              value={name}
              onChange={setName}
              label="Nom complet"
              placeholder="Jean Dupont"
              icon={<User className="w-4 h-4" />}
              variant="filled"
              size="md"
            />

            <PremiumInput
              type="tel"
              value={phone}
              onChange={setPhone}
              label="Téléphone"
              placeholder="+212 6XX XXX XXX"
              icon={<Phone className="w-4 h-4" />}
              variant="filled"
              size="md"
            />

            <PremiumSelect
              value={country}
              onChange={setCountry}
              options={countryOptions}
              label="Pays"
              placeholder="Sélectionner"
              variant="filled"
              size="md"
            />

            <PremiumButton variant="secondary" size="md" fullWidth>
              Valider
            </PremiumButton>
          </div>

          {/* Underlined Variant */}
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">📏 Variant: Underlined</h2>

            <PremiumInput
              type="text"
              value={name}
              onChange={setName}
              label="Nom"
              placeholder="Votre nom"
              variant="underlined"
              size="md"
            />

            <PremiumInput
              type="email"
              value={email}
              onChange={setEmail}
              label="Email"
              placeholder="email@exemple.com"
              variant="underlined"
              size="md"
            />

            <PremiumSelect
              value={country}
              onChange={setCountry}
              options={countryOptions}
              label="Pays"
              placeholder="Choisir"
              variant="underlined"
              size="md"
            />

            <PremiumButton variant="ghost" size="md" fullWidth>
              Continuer
            </PremiumButton>
          </div>

          {/* Glass Variant */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">✨ Variant: Glassmorphism</h2>

            <PremiumInput
              type="text"
              value={name}
              onChange={setName}
              label="Nom"
              placeholder="Entrez votre nom"
              icon={<User className="w-4 h-4" />}
              variant="glass"
              size="md"
            />

            <PremiumInput
              type="email"
              value={email}
              onChange={setEmail}
              label="Email"
              placeholder="votre@email.com"
              icon={<Mail className="w-4 h-4" />}
              variant="glass"
              size="md"
            />

            <PremiumSelect
              value={country}
              onChange={setCountry}
              options={countryOptions}
              label="Pays"
              placeholder="Sélectionner"
              variant="glass"
              size="md"
            />

            <PremiumButton variant="glass" size="md" fullWidth>
              Envoyer
            </PremiumButton>
          </div>
        </div>

        {/* Sizes Showcase */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">📐 Tailles disponibles</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600">Small</p>
              <PremiumInput
                type="text"
                value=""
                onChange={() => {}}
                placeholder="Small input"
                variant="outlined"
                size="sm"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600">Medium (default)</p>
              <PremiumInput
                type="text"
                value=""
                onChange={() => {}}
                placeholder="Medium input"
                variant="outlined"
                size="md"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600">Large</p>
              <PremiumInput
                type="text"
                value=""
                onChange={() => {}}
                placeholder="Large input"
                variant="outlined"
                size="lg"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600">Extra Large</p>
              <PremiumInput
                type="text"
                value=""
                onChange={() => {}}
                placeholder="XL input"
                variant="outlined"
                size="xl"
              />
            </div>
          </div>
        </div>

        {/* Validation States */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">✅ États de validation</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PremiumInput
              type="email"
              value="invalid@email"
              onChange={() => {}}
              label="Email invalide"
              placeholder="email@exemple.com"
              icon={<Mail className="w-4 h-4" />}
              variant="outlined"
              error="Format d'email invalide"
            />

            <PremiumInput
              type="email"
              value="valid@email.com"
              onChange={() => {}}
              label="Email valide"
              placeholder="email@exemple.com"
              icon={<Mail className="w-4 h-4" />}
              variant="outlined"
              success
            />

            <PremiumInput
              type="text"
              value=""
              onChange={() => {}}
              label="Champ avec aide"
              placeholder="Entrez quelque chose"
              variant="outlined"
              hint="Ce champ est optionnel"
            />
          </div>
        </div>

        {/* Textarea Showcase */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">📝 Textarea</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PremiumTextarea
              value={message}
              onChange={setMessage}
              label="Message"
              placeholder="Écrivez votre message ici..."
              variant="outlined"
              rows={4}
              maxLength={500}
            />

            <PremiumTextarea
              value={message}
              onChange={setMessage}
              label="Message (auto-resize)"
              placeholder="Le textarea s'adapte automatiquement..."
              variant="filled"
              autoResize
              maxLength={500}
            />
          </div>
        </div>

        {/* Buttons Showcase */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">🔘 Boutons</h2>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <PremiumButton variant="primary" size="sm">
                Primary Small
              </PremiumButton>
              <PremiumButton variant="primary" size="md">
                Primary Medium
              </PremiumButton>
              <PremiumButton variant="primary" size="lg">
                Primary Large
              </PremiumButton>
              <PremiumButton variant="primary" size="xl">
                Primary XL
              </PremiumButton>
            </div>

            <div className="flex flex-wrap gap-3">
              <PremiumButton variant="secondary" size="md">
                Secondary
              </PremiumButton>
              <PremiumButton variant="ghost" size="md">
                Ghost
              </PremiumButton>
              <PremiumButton variant="glass" size="md">
                Glass
              </PremiumButton>
            </div>

            <div className="flex flex-wrap gap-3">
              <PremiumButton variant="primary" size="md" icon={<Mail className="w-4 h-4" />}>
                Avec icône
              </PremiumButton>
              <PremiumButton
                variant="secondary"
                size="md"
                iconRight={<Calendar className="w-4 h-4" />}
              >
                Icône à droite
              </PremiumButton>
              <PremiumButton
                variant="primary"
                size="md"
                loading={loading}
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => setLoading(false), 2000);
                }}
              >
                Cliquez-moi
              </PremiumButton>
            </div>

            <PremiumButton variant="primary" size="md" fullWidth>
              Bouton pleine largeur
            </PremiumButton>
          </div>
        </div>

        {/* Icons Integration */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">🎭 Intégration d'icônes</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PremiumInput
              type="text"
              value=""
              onChange={() => {}}
              label="Recherche"
              placeholder="Rechercher..."
              icon={<Search className="w-4 h-4" />}
              variant="outlined"
            />

            <PremiumInput
              type="number"
              value=""
              onChange={() => {}}
              label="Montant"
              placeholder="0.00"
              icon={<DollarSign className="w-4 h-4" />}
              variant="outlined"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumComponentsDemo;
