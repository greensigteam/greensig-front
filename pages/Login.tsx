



import React, { useState } from 'react';
import { User, Role } from '../types';
import { Lock, Mail, UserCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const ROLES: Role[] = ['ADMIN', 'OPERATEUR', 'CLIENT'];

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('ADMIN');
  const [userInfo, setUserInfo] = useState<User | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      // Authentification JWT
      const resp = await fetch('/api/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (resp.ok && data.access) {
        localStorage.setItem('token', data.access);
        if (data.refresh) {
          localStorage.setItem('refreshToken', data.refresh);
        }
        // Récupérer le profil utilisateur connecté
        const meResp = await fetch('/api/users/me/', {
          headers: { Authorization: `Bearer ${data.access}` },
        });
        if (!meResp.ok) throw new Error('Impossible de récupérer le profil utilisateur');
        const userRaw = await meResp.json();
        // Vérifier si l'utilisateur a le rôle sélectionné
        let roles: Role[] = [];
        if (Array.isArray(userRaw.roles) && userRaw.roles.length > 0) {
          roles = userRaw.roles as Role[];
        } else if (userRaw.type_utilisateur) {
          roles = [userRaw.type_utilisateur as Role];
        } else {
          roles = ['CLIENT'];
        }
        if (!roles.includes(selectedRole)) {
          setError("Vous n'avez pas accès à ce rôle.");
          setIsLoading(false);
          return;
        }
        // Connexion avec le rôle sélectionné
        const user: User = {
          id: userRaw.id,
          name: userRaw.full_name || `${userRaw.prenom || ''} ${userRaw.nom || ''}`.trim() || userRaw.email,
          email: userRaw.email,
          role: selectedRole,
          avatar: undefined
        };
        setUserInfo(user);
        onLogin(user);
      } else {
        setError('Identifiants invalides');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  // Sélection du rôle (onglet)
  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-emerald-950 flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900 via-emerald-950 to-black">
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="bg-emerald-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          {/* Decorative pattern */}
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-lime-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>

          <div className="flex justify-center mb-4 relative z-10">
            <figure className="flex items-center justify-center bg-transparent rounded-md p-0 w-40 md:w-52 lg:w-56 xl:w-60 h-20 md:h-24 lg:h-28">
              <img
                src="/logofinal.png"
                alt="GreenSIG Logo"
                className="block w-auto max-h-full object-contain"
              />
            </figure>
          </div>
        </div>

        {/* Onglets de sélection de rôle */}
        <div className="p-6 pb-0">
          <label className="text-sm font-medium text-slate-700">Sélectionnez votre rôle</label>
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 border border-slate-200 rounded-lg mt-2">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleSelect(r)}
                className={`text-xs font-bold py-2 rounded-md transition-all ${selectedRole === r
                  ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
              >
                {r === 'OPERATEUR' ? 'OPÉRATEUR' : r}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && <div className="text-red-600 text-sm text-center mb-2">{error}</div>}
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-emerald-600/50" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                placeholder="Email professionnel"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-emerald-600/50" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                placeholder="Mot de passe"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Accéder au portail</span>
                <UserCircle className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-400 mt-4">
            GreenSIG v3.1 • Solution de Gestion Territoriale
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;

