/**
 * NotificationBell - Composant cloche de notifications via WebSocket
 *
 * Affiche une cloche avec badge de notifications non lues.
 * Au clic, ouvre un popover avec la liste des notifications.
 * Utilise le theme GreenSIG (emerald).
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, X, Circle } from 'lucide-react';
import { useNotificationContext, Notification } from '../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NotificationBellProps {
  className?: string;
}

/**
 * Composant NotificationBell
 * Affiche la cloche avec badge et popover de notifications
 */
export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
  } = useNotificationContext();

  // Fermer le popover en cliquant ailleurs
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handler de clic sur notification
  const handleNotificationClick = async (notification: Notification) => {
    // Marquer comme lu
    if (!notification.lu) {
      await markAsRead(notification.id);
    }

    // Navigation basee sur le type de notification
    const data = notification.data;

    if (data.tache_id) {
      navigate(`/planning?tache=${data.tache_id}`);
    } else if (data.reclamation_id) {
      navigate(`/reclamations/${data.reclamation_id}`);
    } else if (data.absence_id) {
      navigate('/teams?tab=absences');
    } else if (data.site_id) {
      navigate(`/sites/${data.site_id}`);
    }

    setIsOpen(false);
  };

  // Couleur selon priorite
  const getPriorityColor = (priorite: string) => {
    switch (priorite) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'normal': return 'text-emerald-600 bg-emerald-50';
      case 'low': return 'text-slate-500 bg-slate-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  // Icone selon type
  const getTypeIcon = (type: string) => {
    if (type.includes('tache')) return 'T';
    if (type.includes('reclamation')) return 'R';
    if (type.includes('absence')) return 'A';
    if (type.includes('site')) return 'S';
    if (type.includes('equipe')) return 'E';
    return 'N';
  };

  return (
    <div className="relative">
      {/* Bouton cloche */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 md:p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all duration-200 group ${className}`}
        title={isConnected ? 'Notifications' : 'Notifications (hors ligne)'}
      >
        <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />

        {/* Badge nombre non lu */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}

        {/* Indicateur connexion */}
        {!isConnected && (
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-amber-400 border border-white" title="Hors ligne" />
        )}
      </button>

      {/* Popover notifications */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Tout marquer lu
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                      !notification.lu ? 'bg-emerald-50/50' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Icone type */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getPriorityColor(notification.priorite)}`}>
                        {getTypeIcon(notification.type)}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium truncate ${!notification.lu ? 'text-slate-900' : 'text-slate-600'}`}>
                            {notification.titre}
                          </p>
                          {!notification.lu && (
                            <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                          {notification.acteur && (
                            <span className="text-[10px] text-slate-400">
                              par {notification.acteur.nom}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action marquer lu */}
                      {!notification.lu && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="flex-shrink-0 p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Marquer comme lu"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - toujours visible */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
            <button
              onClick={() => {
                navigate('/notifications');
                setIsOpen(false);
              }}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium w-full text-center"
            >
              Voir toutes les notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}