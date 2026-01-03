/**
 * NotificationContext - Contexte pour les notifications temps reel via WebSocket
 *
 * Ce contexte fournit:
 * - Connexion WebSocket automatique basee sur l'utilisateur connecte
 * - Reception des notifications en temps reel
 * - Gestion du nombre de notifications non lues
 * - Actions pour marquer comme lu
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User } from '../types';
import { apiFetch } from '../services/api';

// Types
export interface Notification {
  id: number;
  type: string;
  titre: string;
  message: string;
  priorite: 'low' | 'normal' | 'high' | 'urgent';
  data: Record<string, unknown>;
  lu: boolean;
  acteur: {
    id: number;
    nom: string;
  } | null;
  created_at: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  markAsRead: async () => { },
  markAllAsRead: async () => { },
  refreshNotifications: async () => { },
});

interface NotificationProviderProps {
  children: ReactNode;
  user: User | null;
}

/**
 * Provider pour les notifications temps reel via WebSocket
 */
export function NotificationProvider({ children, user }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  // Construire l'URL WebSocket
  const getWebSocketUrl = useCallback(() => {
    if (!user) return null;

    const token = localStorage.getItem('token');
    if (!token) return null;

    // Determiner le protocol et l'hote
    const isSecure = window.location.protocol === 'https:';
    const wsProtocol = isSecure ? 'wss:' : 'ws:';

    // En dev, utiliser le backend Django directement
    // En prod, utiliser le meme hote que l'app
    let host = window.location.host;

    // Si on est en dev avec Vite proxy, utiliser localhost:8000
    if (import.meta.env.DEV) {
      host = 'localhost:8000';
    }

    return `${wsProtocol}//${host}/ws/notifications/?token=${token}`;
  }, [user]);

  // Charger les notifications initiales via REST API
  const refreshNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const response = await apiFetch('/api/notifications/?limit=50');
      const data = await response.json();
      console.log(`[Notifications] ${data.length || 0} notifications chargees.`);
      if (Array.isArray(data)) {
        // Trier par date de création (plus récent en premier)
        const sorted = [...data].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setNotifications(sorted);
      }

      // Charger aussi le count
      const countResponse = await apiFetch('/api/notifications/unread-count/');
      const countData = await countResponse.json();
      if (countData?.count !== undefined) {
        setUnreadCount(countData.count);
        console.log(`[Notifications] Count: ${countData.count}`);
      }
    } catch (error) {
      console.error('[Notifications] Erreur chargement:', error);
    }
  }, [user]);

  // Marquer une notification comme lue
  const markAsRead = useCallback(async (id: number) => {
    try {
      await apiFetch(`/api/notifications/${id}/mark-read/`, { method: 'POST' });

      // Mettre a jour localement
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, lu: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Aussi envoyer via WebSocket si connecte
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          action: 'mark_read',
          notification_id: id,
        }));
      }
    } catch (error) {
      console.error('[Notifications] Erreur mark as read:', error);
    }
  }, []);

  // Marquer toutes les notifications comme lues
  const markAllAsRead = useCallback(async () => {
    try {
      await apiFetch('/api/notifications/mark-all-read/', { method: 'POST' });

      // Mettre a jour localement
      setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
      setUnreadCount(0);

      // Aussi envoyer via WebSocket si connecte
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'mark_all_read' }));
      }
    } catch (error) {
      console.error('[Notifications] Erreur mark all as read:', error);
    }
  }, []);

  // Connexion WebSocket
  useEffect(() => {
    if (!user) {
      // Deconnexion si pas d'utilisateur
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const wsUrl = getWebSocketUrl();
    if (!wsUrl) return;

    const connect = () => {
      console.log('[WS] Connexion a', wsUrl.replace(/token=.*/, 'token=***'));

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connecte');
        setIsConnected(true);

        // Ping periodique pour garder la connexion active
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping', timestamp: Date.now() }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WS] Message recu:', data.type, data);

          switch (data.type) {
            case 'connection_established':
              setUnreadCount(data.unread_count || 0);
              // Charger les notifications initiales
              refreshNotifications();
              break;

            case 'new_notification':
              // Nouvelle notification recue
              if (data.notification) {
                console.log('[WS] Nouvelle notification:', data.notification.type, data.notification.titre);
                setNotifications(prev => {
                  // Éviter les doublons
                  if (prev.some(n => n.id === data.notification.id)) {
                    return prev;
                  }
                  return [data.notification, ...prev];
                });
                setUnreadCount(prev => prev + 1);

                // Optionnel: jouer un son ou afficher une notification navigateur
                if (Notification.permission === 'granted') {
                  new Notification(data.notification.titre, {
                    body: data.notification.message,
                    icon: '/favicon.ico',
                  });
                }
              }
              break;

            case 'unread_notifications':
              // Dédupliquer les notifications par ID et trier par date
              const uniqueNotifs = (data.notifications || []).filter(
                (n: Notification, idx: number, arr: Notification[]) =>
                  arr.findIndex(x => x.id === n.id) === idx
              ).sort((a: Notification, b: Notification) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              setNotifications(uniqueNotifs);
              setUnreadCount(data.count || 0);
              break;

            case 'mark_read_response':
            case 'mark_all_read_response':
            case 'pong':
              // Acknowledgements, rien a faire
              break;

            default:
              console.log('[WS] Type inconnu:', data.type);
          }
        } catch (error) {
          console.error('[WS] Erreur parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Erreur:', error);
      };

      ws.onclose = (event) => {
        console.log('[WS] Deconnecte, code:', event.code);
        setIsConnected(false);

        // Nettoyer le ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Reconnexion automatique apres 5s (sauf si fermeture intentionnelle)
        if (event.code !== 1000 && event.code !== 4001) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            console.log('[WS] Tentative de reconnexion...');
            connect();
          }, 5000);
        }
      };
    };

    connect();

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
    };
  }, [user, getWebSocketUrl, refreshNotifications]);

  // Demander la permission pour les notifications navigateur
  useEffect(() => {
    if (user && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      isConnected,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook pour acceder au contexte de notification
 */
export function useNotificationContext() {
  return useContext(NotificationContext);
}