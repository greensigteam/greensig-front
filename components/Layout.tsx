import React from 'react';
import { useLocation, Outlet, ScrollRestoration } from 'react-router-dom';

import { Menu, Loader2 } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { User, MapSearchResult, SearchSuggestion, TargetLocation } from '../types';
import { useExport } from '../contexts/ExportContext';

interface LayoutProps {
  children: React.ReactNode;
  mapComponent: React.ReactNode;
  mapControls: React.ReactNode;
  user: User;
  onLogout: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isMobile?: boolean;
  isMobileSidebarOpen?: boolean;
  onCloseMobileSidebar?: () => void;

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
  children: _children,
  mapComponent,
  mapControls,
  user,
  onLogout,
  isSidebarCollapsed,
  onToggleSidebar,
  isMobile = false,
  isMobileSidebarOpen = false,
  onCloseMobileSidebar,
}) => {
  const location = useLocation();
  const { activeJobs, hasActiveJobs } = useExport();
  const isMapView = location.pathname === '/map' || location.pathname === '/';
  const panelOpen = !isMapView;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-emerald-950 font-sans">
      <ScrollRestoration />

      {/* LAYER 0: Persistent Map Background (z-0) - always there but interactive only on map view */}
      <div
        className={`absolute inset-0 z-0 ${isMapView ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        {mapComponent}
      </div>

      {/* LAYER 2: Map Controls (z-600) - visible only on map view */}
      {isMapView && (
        <div className="absolute inset-0 z-[600] pointer-events-none">{mapControls}</div>
      )}

      {/* Mobile sidebar backdrop */}
      {isMobile && isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[699] transition-opacity duration-300"
          onClick={onCloseMobileSidebar}
        />
      )}

      {/* LAYER 1: Sidebar (z-700) - Desktop: static, Mobile: overlay */}
      <div
        className={`
          absolute left-0 top-0 h-full pointer-events-auto z-[700]
          transition-transform duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]
          ${isMobile ? (isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        `}
      >
        <Sidebar
          collapsed={isMobile ? false : isSidebarCollapsed}
          onToggle={onToggleSidebar}
          onLogout={onLogout}
          userRole={user.role}
          isMobile={isMobile}
          onNavigate={isMobile ? onCloseMobileSidebar : undefined}
        />
      </div>

      {/* Mobile hamburger button - visible on map view only on mobile */}
      {isMobile && isMapView && (
        <button
          onClick={onToggleSidebar}
          className="fixed top-3 left-3 z-[650] bg-white/90 backdrop-blur-md shadow-lg rounded-xl p-2.5 border border-white/20 ring-1 ring-black/5 pointer-events-auto"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
      )}

      {/* LAYER 1: Floating Content Panel (Module) z-[500] - Positioned independently */}
      <div
        className={`
          pointer-events-auto
          absolute
          top-0 bottom-0 right-0 left-0
          md:top-4 md:bottom-4 md:right-4
          bg-white/95 backdrop-blur-xl shadow-2xl
          md:rounded-2xl md:border md:border-white/20
          transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] flex flex-col overflow-hidden
          ${isMobile ? '' : isSidebarCollapsed ? 'md:left-[88px]' : 'md:left-[276px]'}
          ${
            panelOpen
              ? 'z-[500] translate-x-0 opacity-100 scale-100'
              : 'invisible -z-10 pointer-events-none translate-x-[20px] opacity-0 scale-95'
          }
        `}
      >
        {/* Panel Header */}
        {panelOpen && (
          <>
            <div className="shrink-0">
              <Header
                user={user}
                collapsed={false}
                onToggleMobileSidebar={isMobile ? onToggleSidebar : undefined}
              />
            </div>

            {/* Panel Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-0 bg-slate-50/50">
              <Outlet />
            </div>
          </>
        )}
      </div>

      {/* Bannière export global — visible sur toutes les pages pendant un export */}
      {hasActiveJobs && (
        <div className="fixed bottom-4 right-4 z-[800] bg-emerald-800 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-medium pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>{activeJobs[0]?.label} en cours…</span>
        </div>
      )}
    </div>
  );
};

export default Layout;
