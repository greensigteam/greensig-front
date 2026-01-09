# Guide des Composants Premium - Niveau 3 🚀

Design system moderne avec floating labels, animations sophistiquées, glassmorphism et micro-interactions.

## 📦 Installation

```typescript
import {
  PremiumInput,
  PremiumSelect,
  PremiumTextarea,
  PremiumButton
} from '../modals/PremiumFormComponents';
```

## 🎨 1. PremiumInput

### Utilisation basique

```tsx
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
```

### Props disponibles

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| number` | **requis** | Valeur du champ |
| `onChange` | `(value: string) => void` | **requis** | Callback de changement |
| `label` | `string` | - | Label flottant |
| `placeholder` | `string` | - | Texte de placeholder |
| `type` | `string` | `'text'` | Type HTML5 |
| `icon` | `ReactNode` | - | Icône à gauche |
| `iconRight` | `ReactNode` | - | Icône à droite |
| `variant` | `'outlined' \| 'filled' \| 'underlined' \| 'glass'` | `'outlined'` | Style visuel |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Taille du champ |
| `error` | `string` | - | Message d'erreur |
| `success` | `boolean` | `false` | État de succès |
| `hint` | `string` | - | Texte d'aide |
| `disabled` | `boolean` | `false` | Désactivé |
| `required` | `boolean` | `false` | Requis |
| `minLength` | `number` | - | Longueur min |
| `maxLength` | `number` | - | Longueur max |
| `autoFocus` | `boolean` | `false` | Focus auto |

### Variantes

#### 1. Outlined (Défaut) - Style moderne avec bordure
```tsx
<PremiumInput
  variant="outlined"
  label="Email"
  icon={<Mail className="w-4 h-4" />}
  // ... autres props
/>
```

**Utilisation** : Formulaires standards, modales principales
**Effet** : Bordure 2px, ring au focus avec animation, floating label

#### 2. Filled - Style Material Design
```tsx
<PremiumInput
  variant="filled"
  label="Nom"
  icon={<User className="w-4 h-4" />}
  // ... autres props
/>
```

**Utilisation** : Interfaces compactes, formulaires denses
**Effet** : Background gris clair, transition douce au focus

#### 3. Underlined - Style minimaliste
```tsx
<PremiumInput
  variant="underlined"
  label="Titre"
  // ... autres props
/>
```

**Utilisation** : Formulaires épurés, dashboards modernes
**Effet** : Bordure inférieure uniquement, label statique

#### 4. Glass - Effet glassmorphism
```tsx
<PremiumInput
  variant="glass"
  label="Message"
  icon={<MessageSquare className="w-4 h-4" />}
  // ... autres props
/>
```

**Utilisation** : Sur fonds colorés ou images, effets premium
**Effet** : Background semi-transparent avec backdrop-blur

### États de validation

```tsx
{/* État d'erreur */}
<PremiumInput
  value={email}
  onChange={setEmail}
  label="Email"
  error="Format d'email invalide"
  variant="outlined"
/>

{/* État de succès */}
<PremiumInput
  value={email}
  onChange={setEmail}
  label="Email"
  success
  variant="outlined"
/>

{/* Avec hint */}
<PremiumInput
  value={password}
  onChange={setPassword}
  label="Mot de passe"
  hint="8 caractères minimum"
  variant="outlined"
/>
```

### Password avec toggle show/hide

```tsx
<PremiumInput
  type="password"
  value={password}
  onChange={setPassword}
  label="Mot de passe"
  icon={<Lock className="w-4 h-4" />}
  variant="outlined"
/>
{/* Le bouton œil est automatiquement ajouté */}
```

### Avec icône à droite personnalisée

```tsx
<PremiumInput
  type="text"
  value={search}
  onChange={setSearch}
  label="Recherche"
  icon={<Search className="w-4 h-4" />}
  iconRight={<X className="w-4 h-4 cursor-pointer" onClick={clearSearch} />}
  variant="outlined"
/>
```

## 📋 2. PremiumSelect

### Utilisation basique

```tsx
<PremiumSelect
  value={country}
  onChange={setCountry}
  options={[
    { value: 'ma', label: 'Maroc' },
    { value: 'fr', label: 'France' },
  ]}
  label="Pays"
  placeholder="Sélectionner"
  icon={<MapPin className="w-4 h-4" />}
  variant="outlined"
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string \| number` | Valeur sélectionnée |
| `onChange` | `(value: string) => void` | Callback |
| `options` | `Array<{value, label}>` | Options disponibles |
| `label` | `string` | Label flottant |
| `placeholder` | `string` | Texte par défaut |
| `icon` | `ReactNode` | Icône à gauche |
| `variant` | `'outlined' \| 'filled' \| 'underlined' \| 'glass'` | Style |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | Taille |
| `error` | `string` | Message d'erreur |
| `disabled` | `boolean` | Désactivé |

### Animations

- **Chevron** : Rotation 180° au focus
- **Label** : Flotte au focus ou quand valeur sélectionnée
- **Options** : Transition douce

## 📝 3. PremiumTextarea

### Utilisation basique

```tsx
<PremiumTextarea
  value={message}
  onChange={setMessage}
  label="Message"
  placeholder="Écrivez votre message..."
  variant="outlined"
  rows={4}
  maxLength={500}
/>
```

### Props spécifiques

| Prop | Type | Description |
|------|------|-------------|
| `rows` | `number` | Nombre de lignes (défaut: 4) |
| `autoResize` | `boolean` | Auto-ajustement hauteur |
| `maxLength` | `number` | Longueur max avec compteur |

### Auto-resize

```tsx
<PremiumTextarea
  value={message}
  onChange={setMessage}
  label="Message"
  autoResize
  maxLength={1000}
/>
{/* Le textarea grandit automatiquement avec le contenu */}
```

### Compteur de caractères

```tsx
<PremiumTextarea
  value={bio}
  onChange={setBio}
  label="Biographie"
  maxLength={200}
/>
{/* Affiche automatiquement "150/200" en bas à droite */}
```

## 🔘 4. PremiumButton

### Utilisation basique

```tsx
<PremiumButton
  variant="primary"
  size="md"
  onClick={handleSubmit}
>
  Enregistrer
</PremiumButton>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'glass'` | Style |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | Taille |
| `type` | `'button' \| 'submit' \| 'reset'` | Type HTML |
| `loading` | `boolean` | État de chargement |
| `disabled` | `boolean` | Désactivé |
| `icon` | `ReactNode` | Icône à gauche |
| `iconRight` | `ReactNode` | Icône à droite |
| `fullWidth` | `boolean` | Pleine largeur |

### Variantes

```tsx
{/* Primary - Gradient émeraude */}
<PremiumButton variant="primary">
  Enregistrer
</PremiumButton>

{/* Secondary - Bordure */}
<PremiumButton variant="secondary">
  Annuler
</PremiumButton>

{/* Ghost - Transparent */}
<PremiumButton variant="ghost">
  Options
</PremiumButton>

{/* Glass - Glassmorphism */}
<PremiumButton variant="glass">
  Continuer
</PremiumButton>
```

### Avec icônes

```tsx
<PremiumButton
  variant="primary"
  icon={<Save className="w-4 h-4" />}
>
  Enregistrer
</PremiumButton>

<PremiumButton
  variant="secondary"
  iconRight={<ChevronRight className="w-4 h-4" />}
>
  Suivant
</PremiumButton>
```

### Loading state

```tsx
<PremiumButton
  variant="primary"
  loading={isLoading}
  onClick={handleSubmit}
>
  Soumettre
</PremiumButton>
{/* Affiche automatiquement spinner + "Chargement..." */}
```

## 🎯 Exemples complets

### Formulaire de connexion moderne

```tsx
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <form className="space-y-6">
      <PremiumInput
        type="email"
        value={email}
        onChange={setEmail}
        label="Email"
        placeholder="votre@email.com"
        icon={<Mail className="w-4 h-4" />}
        variant="outlined"
        size="lg"
        required
      />

      <PremiumInput
        type="password"
        value={password}
        onChange={setPassword}
        label="Mot de passe"
        icon={<Lock className="w-4 h-4" />}
        variant="outlined"
        size="lg"
        required
      />

      <PremiumButton
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
      >
        Se connecter
      </PremiumButton>
    </form>
  );
}
```

### Formulaire de contact avec validation

```tsx
function ContactForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState({});

  return (
    <div className="space-y-6">
      <PremiumInput
        type="text"
        value={form.name}
        onChange={(v) => setForm({ ...form, name: v })}
        label="Nom complet"
        icon={<User className="w-4 h-4" />}
        variant="outlined"
        error={errors.name}
        required
      />

      <PremiumInput
        type="email"
        value={form.email}
        onChange={(v) => setForm({ ...form, email: v })}
        label="Email"
        icon={<Mail className="w-4 h-4" />}
        variant="outlined"
        error={errors.email}
        success={!errors.email && form.email.length > 0}
        required
      />

      <PremiumTextarea
        value={form.message}
        onChange={(v) => setForm({ ...form, message: v })}
        label="Message"
        variant="outlined"
        rows={6}
        maxLength={1000}
        error={errors.message}
        required
      />

      <PremiumButton variant="primary" size="lg" fullWidth>
        Envoyer le message
      </PremiumButton>
    </div>
  );
}
```

### Formulaire glassmorphism (sur fond coloré)

```tsx
function GlassForm() {
  return (
    <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-8 rounded-2xl">
      <div className="space-y-4">
        <PremiumInput
          type="text"
          value={name}
          onChange={setName}
          label="Nom"
          icon={<User className="w-4 h-4" />}
          variant="glass"
        />

        <PremiumInput
          type="email"
          value={email}
          onChange={setEmail}
          label="Email"
          icon={<Mail className="w-4 h-4" />}
          variant="glass"
        />

        <PremiumButton variant="glass" fullWidth>
          Continuer
        </PremiumButton>
      </div>
    </div>
  );
}
```

## 🎨 Design Tokens

Pour personnaliser les composants, voir `premiumDesignTokens.ts`.

### Couleurs personnalisées

Vous pouvez étendre les tokens :

```typescript
import { PREMIUM_DESIGN_TOKENS } from './premiumDesignTokens';

// Utiliser dans vos styles
className={PREMIUM_DESIGN_TOKENS.shadows.emerald}
className={PREMIUM_DESIGN_TOKENS.animations.spring.fast}
```

## 📱 Responsive

Tous les composants sont **fully responsive** :
- Adaptation automatique sur mobile
- Touch-friendly (zones cliquables > 44px)
- Grid responsive dans FormGrid

## ♿ Accessibilité

- **Labels associés** aux inputs
- **ARIA attributes** automatiques
- **Focus visible** avec ring
- **Keyboard navigation** complète
- **Screen reader friendly**

## 🔥 Performance

- **Pas de re-render** inutiles
- **Animations GPU-accelerated**
- **Lazy loading** des états
- **Tree-shakable** (importer seulement ce dont vous avez besoin)

## 📊 Voir la démo

Pour voir tous les composants en action :

```tsx
import PremiumComponentsDemo from './modals/PremiumComponentsDemo';

// Dans votre routing ou page de test
<PremiumComponentsDemo />
```

## 🚀 Migration depuis les anciens composants

```tsx
// Avant (ancien FormInput)
<FormField label="Email" required>
  <FormInput
    type="email"
    value={email}
    onChange={setEmail}
    placeholder="email@exemple.com"
  />
</FormField>

// Après (nouveau PremiumInput)
<PremiumInput
  type="email"
  value={email}
  onChange={setEmail}
  label="Email"
  placeholder="email@exemple.com"
  icon={<Mail className="w-4 h-4" />}
  variant="outlined"
  required
/>
```

**Avantages** :
- ✅ Moins de code (pas de wrapper FormField)
- ✅ Floating label automatique
- ✅ Animations incluses
- ✅ Validation visuelle
- ✅ Icons intégrées

---

**Made with ❤️ by Claude Code - Premium Level 3 Design System**
