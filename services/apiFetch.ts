// Utilitaire pour fetch avec token JWT et refresh automatique

// Flag pour eviter les appels multiples au refresh
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

// Fonction pour rafraichir le token
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch('/api/token/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.access);
      // Si le backend retourne un nouveau refresh token (rotation activee)
      if (data.refresh) {
        localStorage.setItem('refreshToken', data.refresh);
      }
      return data.access;
    } else {
      // Refresh token invalide ou expire - deconnecter l'utilisateur
      clearAuthTokens();
      return null;
    }
  } catch (error) {
    console.error('Erreur refresh token:', error);
    clearAuthTokens();
    return null;
  }
}

// Fonction pour effacer les tokens et rediriger vers login
export function clearAuthTokens() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  // Dispatch un evenement pour notifier l'app de la deconnexion
  window.dispatchEvent(new CustomEvent('auth:logout'));
}

// Fonction principale de fetch avec gestion automatique du refresh
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = localStorage.getItem('token');

  // Premiere tentative
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // Si 401 Unauthorized, tenter de refresh le token
  if (response.status === 401) {
    // Eviter les appels multiples au refresh
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken();
    }

    const newToken = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (newToken) {
      // Reessayer la requete avec le nouveau token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        },
      });
    } else {
      // Pas de nouveau token - session expiree
      console.log('Session expiree, redirection vers login...');
    }
  }

  return response;
}
