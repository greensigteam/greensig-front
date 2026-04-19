import React from 'react';
import {
  Bell,
  Check,
  Trash2,
  Circle,
  ClipboardList,
  AlertTriangle,
  Calendar,
  Users,
  Info,
  MapPin,
  Clock,
  User as UserIcon,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Notification } from '../../contexts/NotificationContext';

interface AdminNotification extends Notification {
  destinataire_id?: number;
  destinataire_nom?: string;
  destinataire_email?: string;
  destinataire_role?: string;
}

const NOTIFICATION_TYPES: Record<string, { label: string; icon: typeof Bell; color: string }> = {
  tache_creee: { label: 'Nouvelle tache', icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
  tache_assignee: {
    label: 'Tache assignee',
    icon: ClipboardList,
    color: 'text-blue-600 bg-blue-50',
  },
  tache_modifiee: {
    label: 'Tache modifiee',
    icon: ClipboardList,
    color: 'text-blue-600 bg-blue-50',
  },
  tache_terminee: { label: 'Tache terminee', icon: Check, color: 'text-green-600 bg-green-50' },
  tache_en_retard: {
    label: 'Tache en retard',
    icon: AlertTriangle,
    color: 'text-red-600 bg-red-50',
  },
  tache_annulee: { label: 'Tache annulee', icon: X, color: 'text-slate-600 bg-slate-50' },
  reclamation_creee: {
    label: 'Nouvelle reclamation',
    icon: AlertTriangle,
    color: 'text-orange-600 bg-orange-50',
  },
  reclamation_urgente: {
    label: 'Reclamation urgente',
    icon: AlertTriangle,
    color: 'text-red-600 bg-red-50',
  },
  reclamation_prise_en_compte: {
    label: 'Reclamation prise en compte',
    icon: Check,
    color: 'text-blue-600 bg-blue-50',
  },
  reclamation_resolue: {
    label: 'Reclamation resolue',
    icon: Check,
    color: 'text-green-600 bg-green-50',
  },
  reclamation_cloturee: {
    label: 'Reclamation cloturee',
    icon: Check,
    color: 'text-slate-600 bg-slate-50',
  },
  reclamation_rappel_cloture: {
    label: 'Rappel cloture',
    icon: Clock,
    color: 'text-amber-600 bg-amber-50',
  },
  reclamation_auto_cloture: {
    label: 'Reclamation auto-cloturee',
    icon: Clock,
    color: 'text-amber-600 bg-amber-50',
  },
  absence_demandee: {
    label: 'Demande absence',
    icon: Calendar,
    color: 'text-purple-600 bg-purple-50',
  },
  absence_validee: { label: 'Absence validee', icon: Check, color: 'text-green-600 bg-green-50' },
  absence_refusee: { label: 'Absence refusee', icon: X, color: 'text-red-600 bg-red-50' },
  equipe_membre_ajoute: {
    label: 'Membre ajoute',
    icon: Users,
    color: 'text-emerald-600 bg-emerald-50',
  },
  equipe_membre_retire: {
    label: 'Membre retire',
    icon: Users,
    color: 'text-slate-600 bg-slate-50',
  },
  site_assigne: { label: 'Site assigne', icon: MapPin, color: 'text-teal-600 bg-teal-50' },
  site_retire: { label: 'Site retire', icon: MapPin, color: 'text-slate-600 bg-slate-50' },
  site_cree: { label: 'Nouveau site', icon: MapPin, color: 'text-teal-600 bg-teal-50' },
  site_modifie: { label: 'Site modifie', icon: MapPin, color: 'text-blue-600 bg-blue-50' },
  info: { label: 'Information', icon: Info, color: 'text-slate-600 bg-slate-50' },
  alerte: { label: 'Alerte', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
};

function getTypeConfig(type: string): { label: string; icon: typeof Bell; color: string } {
  return NOTIFICATION_TYPES[type] ?? NOTIFICATION_TYPES.info!;
}

function getPriorityBadge(priorite: string) {
  switch (priorite) {
    case 'urgent':
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
          Urgent
        </span>
      );
    case 'high':
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
          Haute
        </span>
      );
    case 'normal':
      return null;
    case 'low':
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
          Basse
        </span>
      );
    default:
      return null;
  }
}

interface NotificationItemProps {
  notification: AdminNotification;
  isSelected: boolean;
  activeTab: 'mine' | 'all' | 'actions';
  userId: string;
  onToggleSelect: (id: number) => void;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  onClick: (notification: AdminNotification) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  isSelected,
  activeTab,
  userId,
  onToggleSelect,
  onMarkAsRead,
  onDelete,
  onClick,
}) => {
  const typeConfig = getTypeConfig(notification.type);
  const TypeIcon = typeConfig.icon;

  return (
    <div
      className={`flex items-start gap-4 p-4 transition-colors relative ${
        !notification.lu
          ? 'bg-gradient-to-r from-emerald-50 to-transparent border-l-4 border-l-emerald-500'
          : 'bg-white hover:bg-slate-50 border-l-4 border-l-transparent opacity-75'
      }`}
    >
      <div className="absolute top-2 right-2">
        {notification.lu ? (
          <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-200 text-slate-500">
            <Check className="w-3 h-3" />
            Lu
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-white animate-pulse">
            <Circle className="w-2 h-2 fill-current" />
            Nouveau
          </span>
        )}
      </div>

      <div className="pt-1">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(notification.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
      </div>

      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${typeConfig.color} ${
          notification.lu ? 'opacity-60' : ''
        }`}
      >
        <TypeIcon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onClick(notification)}>
        <div className="flex items-start justify-between gap-2 pr-16">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={`text-sm font-medium ${!notification.lu ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}
            >
              {notification.titre}
            </h4>
            {getPriorityBadge(notification.priorite)}
          </div>
        </div>

        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{notification.message}</p>

        <div className="flex items-center flex-wrap gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${typeConfig.color}`}>
            {typeConfig.label}
          </span>
          <span className="text-xs text-slate-400">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: fr,
            })}
          </span>
          {notification.acteur && (
            <span className="text-xs text-slate-400">par {notification.acteur.nom}</span>
          )}
          {(activeTab === 'all' || activeTab === 'actions') && notification.destinataire_nom && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
              <UserIcon className="w-3 h-3" />
              {notification.destinataire_nom}
              {notification.destinataire_role && (
                <span className="text-purple-500">({notification.destinataire_role})</span>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {!notification.lu &&
          (!notification.destinataire_id || notification.destinataire_id === Number(userId)) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Marquer comme lu"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default NotificationItem;
export type { AdminNotification };
