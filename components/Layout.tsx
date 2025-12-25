
import React from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { ViewState, User, MapSearchResult, SearchSuggestion, TargetLocation } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  mapComponent: React.ReactNode;
  mapControls: React.ReactNode;
  user: User;
  onLogout: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;

  // Search Props (kept for compatibility but unused by Header now)
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  onSearch?: () => void;
  isSearching?: boolean;
  searchResult?: MapSearchResult | null;
  searchSuggestions?: SearchSuggestion[];
  onGeolocation?: () => void;
  setSearchResult?: (res: MapSearchResult | null) => void;
  setTargetLocation?: (loc: TargetLocation | null) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  mapComponent,
  mapControls,
  user,
  onLogout,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const location = useLocation();
  const isMapView = location.pathname === '/map' || location.pathname === '/';
  const panelOpen = !isMapView;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-emerald-950 font-sans">

      {/* LAYER 0: Persistent Map Background (z-0) - always there but interactive only on map view */}
      <div className={`absolute inset-0 z-0 ${isMapView ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {mapComponent}
      </div>

      {/* LAYER 2: Map Controls (z-600) - visible only on map view */}
      {isMapView && (
        <div className="absolute inset-0 z-[600] pointer-events-none">
          {mapControls}
        </div>
      )}

      {/* LAYER 1: Sidebar (z-700) - Positioned independently */}
      <div className="absolute left-0 top-0 h-full pointer-events-auto z-[700]">
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggle={onToggleSidebar}
          onLogout={onLogout}
          userRole={user.role}
        />
      </div>

      {/* LAYER 1: Floating Content Panel (Module) z-[500] - Positioned independently */}
      <div
        className={`
          pointer-events-auto
          absolute top-4 bottom-4 right-4
          bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl border border-white/20
          transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] flex flex-col overflow-hidden
          ${isSidebarCollapsed ? 'left-[88px]' : 'left-[276px]'}
          ${panelOpen
            ? 'z-[500] translate-x-0 opacity-100 scale-100'
            : 'invisible -z-10 pointer-events-none translate-x-[20px] opacity-0 scale-95'}
        `}
      >
        {/* Panel Header */}
        {panelOpen && (
          <>
            <div className="shrink-0">
              <Header
                user={user}
                collapsed={false}
              />
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-slate-50/50">
              <Outlet />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Layout;
