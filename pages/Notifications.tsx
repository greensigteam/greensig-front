/**
 * Page Notifications - Liste complete des notifications
 *
 * Fonctionnalites:
 * - Liste paginee des notifications
 * - Filtres par type, statut lu/non lu, priorite
 * - Actions: marquer lu, supprimer
 * - Navigation vers l'element concerne
 * - [ADMIN] Onglet pour voir toutes les notifications du systeme
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  X,
  Circle,
  ClipboardList,
  AlertTriangle,
  Calendar,
  Users,
  Info,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
  Eye,
  User as UserIcon,
  MapPin,
} from 'lucide-react';
import { useNotificationContext, Notification } from '../contexts/NotificationContext';
import { apiFetch } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { User } from '../types';

// Extended notification type for admin view (includes recipient info)
interface AdminNotification extends Notification {
  destinataire_id?: number;
  destinataire_nom?: string;
  destinataire_email?: string;
  destinataire_role?: string;
}

// Types de notification avec icones et couleurs
const NOTIFICATION_TYPES: Record<string, { label: string; icon: typeof Bell; color: string }> = {
  // Taches
  tache_creee: { label: 'Nouvelle tache', icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
  tache_assignee: { label: 'Tache assignee', icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
  tache_modifiee: { label: 'Tache modifiee', icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
  tache_terminee: { label: 'Tache terminee', icon: Check, color: 'text-green-600 bg-green-50' },
  tache_en_retard: { label: 'Tache en retard', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  tache_annulee: { label: 'Tache annulee', icon: X, color: 'text-slate-600 bg-slate-50' },
  // Reclamations
  reclamation_creee: { label: 'Nouvelle reclamation', icon: AlertTriangle, color: 'text-orange-600 bg-orange-50' },
  reclamation_urgente: { label: 'Reclamation urgente', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  reclamation_prise_en_compte: { label: 'Reclamation prise en compte', icon: Check, color: 'text-blue-600 bg-blue-50' },
  reclamation_resolue: { label: 'Reclamation resolue', icon: Check, color: 'text-green-600 bg-green-50' },
  reclamation_cloturee: { label: 'Reclamation cloturee', icon: Check, color: 'text-slate-600 bg-slate-50' },
  // Absences
  absence_demandee: { label: 'Demande absence', icon: Calendar, color: 'text-purple-600 bg-purple-50' },
  absence_validee: { label: 'Absence validee', icon: Check, color: 'text-green-600 bg-green-50' },
  absence_refusee: { label: 'Absence refusee', icon: X, color: 'text-red-600 bg-red-50' },
  // Equipes
  equipe_membre_ajoute: { label: 'Membre ajoute', icon: Users, color: 'text-emerald-600 bg-emerald-50' },
  equipe_membre_retire: { label: 'Membre retire', icon: Users, color: 'text-slate-600 bg-slate-50' },
  // Sites
  site_assigne: { label: 'Site assigne', icon: MapPin, color: 'text-teal-600 bg-teal-50' },
  site_retire: { label: 'Site retire', icon: MapPin, color: 'text-slate-600 bg-slate-50' },
  site_cree: { label: 'Nouveau site', icon: MapPin, color: 'text-teal-600 bg-teal-50' },
  site_modifie: { label: 'Site modifie', icon: MapPin, color: 'text-blue-600 bg-blue-50' },
  // Systeme
  info: { label: 'Information', icon: Info, color: 'text-slate-600 bg-slate-50' },
  alerte: { label: 'Alerte', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
};

const PRIORITY_OPTIONS = [
  { value: '', label: 'Toutes priorites' },
  { value: 'urgent', label: 'Urgente', color: 'text-red-600' },
  { value: 'high', label: 'Haute', color: 'text-orange-600' },
  { value: 'normal', label: 'Normale', color: 'text-emerald-600' },
  { value: 'low', label: 'Basse', color: 'text-slate-500' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'false', label: 'Non lus' },
  { value: 'true', label: 'Lus' },
];

const ROLE_OPTIONS = [
  { value: '', label: 'Tous les roles' },
  { value: 'ADMIN', label: 'Administrateurs' },
  { value: 'SUPERVISEUR', label: 'Superviseurs' },
  { value: 'CLIENT', label: 'Clients' },
];

interface NotificationsPageProps {
  user: User;
}

export default function NotificationsPage({ user }: NotificationsPageProps) {
  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    isConnected,
    markAsRead,
    markAllAsRead,
    notifications: contextNotifications,
  } = useNotificationContext();

  // State
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);


  // Admin: Onglet actif (mes notifications vs toutes)
  const [activeTab, setActiveTab] = useState<'mine' | 'all' | 'actions'>('mine');

  // Stats pour les badges dans les onglets
  const [tabStats, setTabStats] = useState<{
    mineUnread: number;
    mineTotal: number;
    allUnread: number;
    allTotal: number;
    actionsTotal: number;
  }>({ mineUnread: 0, mineTotal: 0, allUnread: 0, allTotal: 0, actionsTotal: 0 });

  // Filtres
  const [filterType, setFilterType] = useState(searchParams.get('type') || '');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('lu') || '');
  const [filterPriority, setFilterPriority] = useState(searchParams.get('priorite') || '');
  const [filterRole, setFilterRole] = useState(''); // Admin only: filter by recipient role

  // Ref pour tracker les notifications du contexte
  const prevContextCountRef = useRef(contextNotifications.length);

  const ITEMS_PER_PAGE = 20;

  // Charger les notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(ITEMS_PER_PAGE));
      params.set('offset', String((page - 1) * ITEMS_PER_PAGE));

      // Filtering based on active tab
      if (activeTab === 'actions') {
        params.set('by_me', 'true');
      } else if (isAdmin && activeTab === 'all') {
        params.set('all', 'true');
        if (filterRole) params.set('role', filterRole);
      }

      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('lu', filterStatus);
      if (filterPriority) params.set('priorite', filterPriority);

      const url = `/api/notifications/?${params.toString()}`;
      console.log('[Notifications] Fetching:', url);

      const response = await apiFetch(url);
      const data = await response.json();
      console.log('[Notifications] Response:', { isArray: Array.isArray(data), length: Array.isArray(data) ? data.length : 'N/A', data });

      if (Array.isArray(data)) {
        // Dédupliquer par ID et trier par date (plus récent en premier)
        const seen = new Set<number>();
        const uniqueData = data.filter((n: AdminNotification) => {
          if (seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        }).sort((a: AdminNotification, b: AdminNotification) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setNotifications(uniqueData);
        console.log('[Notifications] State updated with', uniqueData.length, 'notifications (sorted by date)');
      } else {
        console.warn('[Notifications] Response is not an array:', typeof data, data);
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterStatus, filterPriority, isAdmin, activeTab, filterRole]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Charger les stats pour les onglets (admin)
  const loadTabStats = useCallback(async () => {
    try {
      // Stats pour "Mes notifications" (Inbox)
      const [mineRes, mineUnreadRes, actionsRes] = await Promise.all([
        apiFetch('/api/notifications/?limit=1'),
        apiFetch('/api/notifications/?lu=false&limit=200'),
        apiFetch('/api/notifications/?by_me=true&limit=1'),
      ]);
      const mineData = await mineRes.json();
      const mineUnreadData = await mineUnreadRes.json();
      const actionsData = await actionsRes.json();
      const mineUnread = Array.isArray(mineUnreadData) ? mineUnreadData.length : 0;

      let allUnread = 0;
      let allTotal = 0;

      // Stats pour "Toutes" (admin only)
      if (isAdmin) {
        const [allRes, allUnreadRes] = await Promise.all([
          apiFetch('/api/notifications/?all=true&limit=1'),
          apiFetch('/api/notifications/?all=true&lu=false&limit=200'),
        ]);
        const allData = await allRes.json();
        const allUnreadData = await allUnreadRes.json();
        allTotal = Array.isArray(allData) ? allData.length : (allData.count || 0); // Handle potential count response
        allUnread = Array.isArray(allUnreadData) ? allUnreadData.length : 0;
      }

      setTabStats({
        mineUnread,
        mineTotal: Array.isArray(mineData) ? mineData.length : 0,
        allUnread,
        allTotal,
        actionsTotal: Array.isArray(actionsData) ? actionsData.length : 0,
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadTabStats();
  }, [loadTabStats]);

  // Mettre a jour l'URL avec les filtres
  useEffect(() => {
    const params = new URLSearchParams();
    if (filterType) params.set('type', filterType);
    if (filterStatus) params.set('lu', filterStatus);
    if (filterPriority) params.set('priorite', filterPriority);
    setSearchParams(params);
  }, [filterType, filterStatus, filterPriority, setSearchParams]);

  // Synchroniser les nouvelles notifications du contexte (temps reel)
  useEffect(() => {
    const hasFilters = filterType || filterStatus || filterPriority;

    // Si le contexte a plus de notifications qu'avant, c'est qu'il y en a une nouvelle
    if (contextNotifications.length > prevContextCountRef.current) {
      // Trouver les nouvelles notifications (pas encore dans la liste locale)
      const currentIds = new Set(notifications.map(n => n.id));
      const newNotifications = contextNotifications.filter(n => !currentIds.has(n.id));

      if (newNotifications.length > 0 && page === 1 && !hasFilters && activeTab === 'mine') {
        // Ajouter en haut de la liste et dédupliquer
        setNotifications(prev => {
          const combined = [...newNotifications, ...prev];
          // Dédupliquer par ID
          const seen = new Set<number>();
          return combined.filter(n => {
            if (seen.has(n.id)) return false;
            seen.add(n.id);
            return true;
          });
        });
      }
    }
    prevContextCountRef.current = contextNotifications.length;
  }, [contextNotifications, notifications, page, filterType, filterStatus, filterPriority, activeTab]);

  // Handlers
  const handleNotificationClick = async (notification: Notification) => {
    // Marquer comme lu
    if (!notification.lu) {
      await markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, lu: true } : n)
      );
      loadTabStats();
    }

    // Navigation basee sur le type
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
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
    // Rafraîchir les compteurs des onglets
    loadTabStats();
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    setDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          apiFetch(`/api/notifications/${id}/`, { method: 'DELETE' })
        )
      );
      setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Erreur suppression:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const resetFilters = () => {
    setFilterType('');
    setFilterStatus('');
    setFilterPriority('');
    setFilterRole('');
    setPage(1);
  };



  const hasActiveFilters = filterType || filterStatus || filterPriority;

  // Render helpers
  const getTypeConfig = (type: string): { label: string; icon: typeof Bell; color: string } => {
    return NOTIFICATION_TYPES[type] ?? NOTIFICATION_TYPES.info!;
  };

  const getPriorityBadge = (priorite: string) => {
    switch (priorite) {
      case 'urgent':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">Haute</span>;
      case 'normal':
        return null;
      case 'low':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">Basse</span>;
      default:
        return null;
    }
  };

  const unreadCount = notifications.filter(n => !n.lu).length;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 mb-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Bell className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Notifications</h1>
              <p className="text-sm text-slate-500">
                {unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Toutes lues'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Indicateur connexion */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${isConnected ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
              {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isConnected ? 'Connecte' : 'Hors ligne'}
            </div>



            {/* Bouton rafraichir */}
            <button
              onClick={loadNotifications}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Rafraichir"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Bouton filtres */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${showFilters || hasActiveFilters
                ? 'bg-emerald-100 text-emerald-600'
                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
              title="Filtres"
            >
              <Filter className="w-5 h-5" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Onglets Admin avec compteurs */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-0">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('mine'); setPage(1); setFilterRole(''); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'mine'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              <Bell className="w-4 h-4" />
              Inbox (Reçues)
              {tabStats.mineUnread > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-bold bg-emerald-500 text-white rounded-full min-w-[20px] text-center">
                  {tabStats.mineUnread}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('actions'); setPage(1); setFilterRole(''); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'actions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              <Zap className="w-4 h-4" />
              Mes opérations
            </button>
            {isAdmin && (
              <button
                onClick={() => { setActiveTab('all'); setPage(1); }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'all'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
              >
                <Eye className="w-4 h-4" />
                Activités Système
                {tabStats.allUnread > 0 && (
                  <span className="px-1.5 py-0.5 text-xs font-bold bg-purple-500 text-white rounded-full min-w-[20px] text-center">
                    {tabStats.allUnread}
                  </span>
                )}
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded-full font-bold">ADMIN</span>
              </button>
            )}
          </div>

          {/* Filtres rapides Lu/Non lu - Déplacé ici */}
          <div className="flex items-center gap-2 pb-2 sm:pb-0">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">Afficher:</span>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => { setFilterStatus(''); setPage(1); }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterStatus === ''
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Toutes
              </button>
              <button
                onClick={() => { setFilterStatus('false'); setPage(1); }}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterStatus === 'false'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <Circle className="w-2 h-2 fill-current" />
                Non lues
              </button>
              <button
                onClick={() => { setFilterStatus('true'); setPage(1); }}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterStatus === 'true'
                  ? 'bg-slate-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <Check className="w-3 h-3" />
                Lues
              </button>
            </div>
            {activeTab === 'all' && (
              <span className="ml-2 text-xs text-slate-400 hidden lg:inline">
                {tabStats.allTotal} notifs
              </span>
            )}
          </div>
        </div>

        {/* Filtres */}
        {showFilters && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex flex-wrap gap-4">
              {/* Filtre type */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Tous les types</option>
                  <optgroup label="Taches">
                    <option value="tache_creee">Nouvelle tache</option>
                    <option value="tache_assignee">Tache assignee</option>
                    <option value="tache_terminee">Tache terminee</option>
                    <option value="tache_en_retard">Tache en retard</option>
                  </optgroup>
                  <optgroup label="Reclamations">
                    <option value="reclamation_creee">Nouvelle reclamation</option>
                    <option value="reclamation_urgente">Reclamation urgente</option>
                    <option value="reclamation_resolue">Reclamation resolue</option>
                  </optgroup>
                  <optgroup label="Absences">
                    <option value="absence_demandee">Demande absence</option>
                    <option value="absence_validee">Absence validee</option>
                    <option value="absence_refusee">Absence refusee</option>
                  </optgroup>
                  <optgroup label="Sites">
                    <option value="site_assigne">Site assigne</option>
                    <option value="site_retire">Site retire</option>
                  </optgroup>
                </select>
              </div>

              {/* Filtre statut */}
              <div className="min-w-[150px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Statut</label>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Filtre priorite */}
              <div className="min-w-[150px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Priorite</label>
                <select
                  value={filterPriority}
                  onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {PRIORITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Filtre role (Admin only, when viewing all) */}
              {isAdmin && activeTab === 'all' && (
                <div className="min-w-[180px]">
                  <label className="block text-xs font-medium text-purple-600 mb-1">
                    <UserIcon className="w-3 h-3 inline mr-1" />
                    Role destinataire
                  </label>
                  <select
                    value={filterRole}
                    onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50"
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reset */}
              {hasActiveFilters && (
                <div className="flex items-end">
                  <button
                    onClick={resetFilters}
                    className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Reinitialiser
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions groupees */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.size > 0 && selectedIds.size === notifications.length}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-600">
              {selectedIds.size > 0 ? `${selectedIds.size} selectionnee(s)` : 'Tout selectionner'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            )}

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Tout marquer lu
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Liste des notifications */}
      <div className="w-full">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">Aucune notification</h3>
            <p className="text-sm text-slate-500">
              {hasActiveFilters
                ? "Aucune notification ne correspond à vos filtres"
                : "Vous n'avez pas encore de notifications"}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-4 text-sm text-emerald-600 hover:text-emerald-700"
              >
                Reinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => {
                const typeConfig = getTypeConfig(notification.type);
                const TypeIcon = typeConfig.icon;

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 transition-colors relative ${!notification.lu
                      ? 'bg-gradient-to-r from-emerald-50 to-transparent border-l-4 border-l-emerald-500'
                      : 'bg-white hover:bg-slate-50 border-l-4 border-l-transparent opacity-75'
                      }`}
                  >
                    {/* Badge Lu/Non lu */}
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

                    {/* Checkbox */}
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(notification.id)}
                        onChange={() => toggleSelect(notification.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Icone */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${typeConfig.color} ${notification.lu ? 'opacity-60' : ''
                        }`}
                    >
                      <TypeIcon className="w-5 h-5" />
                    </div>

                    {/* Contenu - cliquable */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between gap-2 pr-16">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-sm font-medium ${!notification.lu ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                            {notification.titre}
                          </h4>
                          {getPriorityBadge(notification.priorite)}
                        </div>
                      </div>

                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                        {notification.message}
                      </p>

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
                          <span className="text-xs text-slate-400">
                            par {notification.acteur.nom}
                          </span>
                        )}
                        {/* Admin or Actions view: show recipient info */}
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

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {/* On ne peut marquer comme lu que si on est le destinataire */}
                      {!notification.lu && (!notification.destinataire_id || notification.destinataire_id === Number(user.id)) && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await markAsRead(notification.id);
                            setNotifications(prev =>
                              prev.map(n => n.id === notification.id ? { ...n, lu: true } : n)
                            );
                            loadTabStats();
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Marquer comme lu"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await apiFetch(`/api/notifications/${notification.id}/`, { method: 'DELETE' });
                            setNotifications(prev => prev.filter(n => n.id !== notification.id));
                          } catch (error) {
                            console.error('Erreur suppression:', error);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Precedent
              </button>

              <span className="text-sm text-slate-600">
                Page {page}
              </span>

              <button
                onClick={() => setPage(p => p + 1)}
                disabled={notifications.length < ITEMS_PER_PAGE}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div >
  );
}