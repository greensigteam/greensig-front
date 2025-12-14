import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map as MapIcon, Package, Calendar,
  Wrench, AlertTriangle, Users, BarChart3,
  LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import { ViewState, Role } from '../types';

interface SidebarProps {
  onLogout: () => void;
  userRole: Role;
  collapsed: boolean;
  onToggle: () => void;
}

const viewToPath: Record<ViewState, string> = {
  DASHBOARD: '/dashboard',
  MAP: '/map',
  INVENTORY: '/inventory',
  PLANNING: '/planning',
  INTERVENTIONS: '/interventions',
  CLAIMS: '/claims',
  TEAMS: '/teams',
  REPORTING: '/reporting',
  CLIENT_PORTAL: '/client',
};

const Sidebar: React.FC<SidebarProps> = ({
  onLogout,
  userRole,
  collapsed,
  onToggle
}) => {

  // User Roles Configuration
  const menuItems = [
    { id: 'DASHBOARD', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['ADMIN', 'OPERATOR'] },
    { id: 'MAP', label: 'Cartographie', icon: MapIcon, roles: ['ADMIN', 'OPERATOR'] },
    { id: 'INVENTORY', label: 'Inventaire', icon: Package, roles: ['ADMIN', 'OPERATOR'] },
    { id: 'PLANNING', label: 'Planification', icon: Calendar, roles: ['ADMIN'] },
    { id: 'INTERVENTIONS', label: 'Interventions', icon: Wrench, roles: ['ADMIN', 'OPERATOR'] },
    { id: 'CLAIMS', label: 'Réclamations', icon: AlertTriangle, roles: ['ADMIN', 'OPERATOR'] },
    { id: 'TEAMS', label: 'Équipes', icon: Users, roles: ['ADMIN'] },
    { id: 'REPORTING', label: 'Rapports', icon: BarChart3, roles: ['ADMIN'] },
    { id: 'CLIENT_PORTAL', label: 'Mon Espace', icon: LayoutDashboard, roles: ['CLIENT'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(userRole));

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
          {filteredItems.map((item) => (
            <li key={item.id}>
              <NavLink
                to={viewToPath[item.id as ViewState]}
                className={({ isActive }) =>
                  `w-full flex items-center rounded-lg transition-all duration-200 group relative
                  ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 gap-3'}
                  ${isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-400/20'
                    : 'hover:bg-emerald-800/30 text-emerald-200/70 hover:text-white'}`
                }
                title={collapsed ? item.label : ''}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`
                        shrink-0 transition-colors
                        ${collapsed ? 'w-6 h-6' : 'w-5 h-5'}
                        ${isActive ? 'text-white' : 'text-emerald-300/70 group-hover:text-white'}
                      `}
                    />

                    {!collapsed && (
                      <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
                    )}

                    {/* Active Indicator Strip */}
                    {isActive && !collapsed && (
                      <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/80" />
                    )}
                  </>
                )}
              </NavLink>
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
