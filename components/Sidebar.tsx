import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Map as MapIcon, Package, Calendar,
  ClipboardList, Users, UserCog, BarChart3,
  LogOut, ChevronLeft, ChevronRight, AlertCircle, MapPin, Gauge, FileText, MessageSquare,
  Settings, ChevronDown
} from 'lucide-react';
import { ViewState, Role } from '../types';

interface SidebarProps {
  onLogout: () => void;
  userRole: Role;
  collapsed: boolean;
  onToggle: () => void;
}

const viewToPath: Record<string, string> = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  MAP: '/map',
  INVENTORY: '/inventory',
  SITES: '/sites',
  CLIENTS: '/clients',
  PRODUCTS: '/products',
  PLANNING: '/planning',
  RATIOS: '/ratios',
  INTERVENTIONS: '/reclamations',
  CLAIMS: '/claims',
  TEAMS: '/teams',
  REPORTING: '/reporting',
  CLIENT_PORTAL: '/client',
  USERS: '/users',
  PARAMETRES: '/parametres',
  // Client specific routes
  CLIENT_MAP: '/client/map',
  CLIENT_CLAIMS: '/reclamations',
  CLIENT_PLANNING: '/planning',
  CLIENT_INTERVENTIONS: '/claims',
};

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

interface MenuGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  children: MenuItem[];
}

type MenuEntry = MenuItem | MenuGroup;

const isMenuGroup = (entry: MenuEntry): entry is MenuGroup => {
  return 'children' in entry;
};

const Sidebar: React.FC<SidebarProps> = ({
  onLogout,
  userRole,
  collapsed,
  onToggle
}) => {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // User Roles Configuration
  const menuEntries: MenuEntry[] = [
    { id: 'DASHBOARD', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['ADMIN', 'SUPERVISEUR'] },
    { id: 'MAP', label: 'Cartographie', icon: MapIcon, roles: ['ADMIN', 'SUPERVISEUR'] },
    { id: 'INVENTORY', label: 'Inventaire', icon: Package, roles: ['ADMIN', 'SUPERVISEUR'] },
    { id: 'SITES', label: 'Gestion des sites', icon: MapPin, roles: ['ADMIN'] },
    { id: 'CLIENTS', label: 'Clients', icon: Users, roles: ['ADMIN'] },
    { id: 'PRODUCTS', label: 'Gestion de produits', icon: Package, roles: ['ADMIN'] },
    { id: 'PLANNING', label: 'Planification', icon: Calendar, roles: ['ADMIN', 'SUPERVISEUR'] },
    { id: 'INTERVENTIONS', label: 'Réclamations', icon: AlertCircle, roles: ['ADMIN', 'SUPERVISEUR'] },
    { id: 'CLAIMS', label: 'Suivi des Tâches', icon: ClipboardList, roles: ['ADMIN', 'SUPERVISEUR'] },
    { id: 'TEAMS', label: 'RH', icon: Users, roles: ['ADMIN', 'SUPERVISEUR'] },
    { id: 'REPORTING', label: 'Rapports', icon: BarChart3, roles: ['ADMIN'] },
    { id: 'PARAMETRES', label: 'Paramètres', icon: Settings, roles: ['ADMIN'] },
    // Client specific menu items
    { id: 'CLIENT_MAP', label: 'Carte', icon: MapIcon, roles: ['CLIENT'] },
    { id: 'SITES', label: 'Mes sites', icon: MapPin, roles: ['CLIENT'] },
    { id: 'INVENTORY', label: 'Inventaire', icon: Package, roles: ['CLIENT'] },
    { id: 'CLIENT_CLAIMS', label: 'Réclamations', icon: AlertCircle, roles: ['CLIENT'] },
    { id: 'CLIENT_PLANNING', label: 'Planning', icon: Calendar, roles: ['CLIENT'] },
    { id: 'CLIENT_INTERVENTIONS', label: 'Interventions', icon: ClipboardList, roles: ['CLIENT'] },
  ];

  // Filter entries based on role
  const filteredEntries = menuEntries.filter(entry => {
    if (isMenuGroup(entry)) {
      // Show group if user has access to at least one child
      return entry.children.some(child => child.roles.includes(userRole));
    }
    return entry.roles.includes(userRole);
  });

  // Check if any child in a group is active
  const isGroupActive = (group: MenuGroup): boolean => {
    return group.children.some(child => location.pathname === viewToPath[child.id]);
  };

  return (
    <aside
      className={`
        relative bg-emerald-950/95 backdrop-blur-md text-emerald-50 flex flex-col h-full shrink-0 
        transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] z-50 shadow-2xl
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}
      `}
    >
      {/* Brand Section */}
      <div className={`
        flex items-center h-16 px-4 bg-emerald-900/30
        ${collapsed ? 'justify-center' : 'justify-start gap-3'}
      `}>
        {/* Logo */}
        {collapsed ? (
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <img
              src="/logo1.png"
              alt="GreenSIG"
              className="w-8 h-8 object-contain"
            />
          </div>
        ) : (
          <div className="max-w-[160px] w-full mx-auto">
            <div className="inline-block bg-transparent rounded-sm p-0 overflow-hidden h-14 flex items-center justify-center">
              <img
                src="/logofinal.png"
                alt="GreenSIG Logo"
                className="w-auto h-10 object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar">
        <ul className="space-y-1 px-2">
          {filteredEntries.map((entry) => (
            <li key={entry.id}>
              {isMenuGroup(entry) ? (
                // Dropdown group
                <div>
                  <button
                    onClick={() => toggleGroup(entry.id)}
                    className={`
                      w-full flex items-center rounded-lg transition-all duration-200 group relative
                      ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 gap-3'}
                      ${isGroupActive(entry)
                        ? 'bg-emerald-700/50 text-white'
                        : 'hover:bg-emerald-800/30 text-emerald-200/70 hover:text-white'}
                    `}
                    title={collapsed ? entry.label : ''}
                  >
                    <entry.icon
                      className={`
                        shrink-0 transition-colors
                        ${collapsed ? 'w-6 h-6' : 'w-5 h-5'}
                        ${isGroupActive(entry) ? 'text-white' : 'text-emerald-300/70 group-hover:text-white'}
                      `}
                    />
                    {!collapsed && (
                      <>
                        <span className="font-medium text-sm whitespace-nowrap flex-1 text-left">
                          {entry.label}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${openGroups.includes(entry.id) ? 'rotate-180' : ''
                            }`}
                        />
                      </>
                    )}
                  </button>
                  {/* Dropdown children */}
                  {!collapsed && openGroups.includes(entry.id) && (
                    <ul className="mt-1 ml-4 pl-3 border-l border-emerald-700/50 space-y-1">
                      {entry.children
                        .filter(child => child.roles.includes(userRole))
                        .map(child => (
                          <li key={child.id}>
                            <NavLink
                              to={viewToPath[child.id] || '#'}
                              className={({ isActive }) =>
                                `w-full flex items-center rounded-lg transition-all duration-200 group relative px-3 py-2 gap-3
                                ${isActive
                                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-400/20'
                                  : 'hover:bg-emerald-800/30 text-emerald-200/70 hover:text-white'}`
                              }
                            >
                              {({ isActive }) => (
                                <>
                                  <child.icon
                                    className={`
                                      shrink-0 transition-colors w-4 h-4
                                      ${isActive ? 'text-white' : 'text-emerald-300/70 group-hover:text-white'}
                                    `}
                                  />
                                  <span className="font-medium text-sm whitespace-nowrap">
                                    {child.label}
                                  </span>
                                  {isActive && (
                                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/80" />
                                  )}
                                </>
                              )}
                            </NavLink>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              ) : (
                // Regular menu item
                <NavLink
                  to={viewToPath[entry.id] || '#'}
                  className={({ isActive }) =>
                    `w-full flex items-center rounded-lg transition-all duration-200 group relative
                    ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 gap-3'}
                    ${isActive
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-400/20'
                      : 'hover:bg-emerald-800/30 text-emerald-200/70 hover:text-white'}`
                  }
                  title={collapsed ? entry.label : ''}
                >
                  {({ isActive }) => (
                    <>
                      <entry.icon
                        className={`
                          shrink-0 transition-colors
                          ${collapsed ? 'w-6 h-6' : 'w-5 h-5'}
                          ${isActive ? 'text-white' : 'text-emerald-300/70 group-hover:text-white'}
                        `}
                      />

                      {!collapsed && (
                        <span className="font-medium text-sm whitespace-nowrap">{entry.label}</span>
                      )}

                      {/* Active Indicator Strip */}
                      {isActive && !collapsed && (
                        <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/80" />
                      )}
                    </>
                  )}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer / Toggle */}
      <div className="p-2 bg-emerald-900/20">
        {!collapsed && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-emerald-300/70 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm mb-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        )}

        <button
          onClick={onToggle}
          className={`
              flex items-center justify-center w-full h-8 rounded-md 
              hover:bg-emerald-800/30 text-emerald-400 hover:text-white transition-colors
            `}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
