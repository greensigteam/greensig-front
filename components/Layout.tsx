
import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { ViewState, User } from '../types';

interface LayoutProps {
  children: React.ReactNode; // The content of the active module (Panel)
  mapComponent: React.ReactNode; // The persistent map background
  mapControls: React.ReactNode; // The floating map controls (Search, Zoom, etc.)
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  user: User;
  onLogout: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;

  // Search Props
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  onSearch?: () => void;
  isSearching?: boolean;
  searchResult?: any;
  searchSuggestions?: any[];
  onGeolocation?: () => void;
  setSearchResult?: (res: any) => void;
  setTargetLocation?: (loc: any) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  mapComponent,
  mapControls,
  currentView,
  onNavigate,
  user,
  onLogout,
  isSidebarCollapsed,
  onToggleSidebar,
  searchQuery,
  setSearchQuery,
  onSearch,
  isSearching,
  searchResult,
  searchSuggestions,
  onGeolocation,
  setSearchResult,
  setTargetLocation
}) => {
  const panelOpen = currentView !== 'MAP';

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-emerald-950 font-sans">

      {/* LAYER 0: Persistent Map Background (z-0) */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        {mapComponent}
      </div>

      {/* LAYER 2: Map Controls (z-600) 
          Placed ABOVE the panel (z-500) to ensure zoom/geolocation buttons are always clickable 
          even when the admin panel covers the map.
          IMPORTANT: pointer-events-none IS REQUIRED here so clicks pass through to the map (z-0)
          The controls inside (MapPage) have pointer-events-auto on interactive elements.
      */}
      <div className="absolute inset-0 z-[600] pointer-events-none">
        {mapControls}
      </div>

      {/* LAYER 1: Sidebar (z-700) - Positioned independently */}
      <div className="absolute left-0 top-0 h-full pointer-events-auto z-[700]">
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggle={onToggleSidebar}
          currentView={currentView}
          onNavigate={onNavigate}
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
                currentView={currentView}
                collapsed={false}
                onClose={() => onNavigate('MAP')}

                // Search pass-through
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSearch={onSearch}
                isSearching={isSearching}
                searchResult={searchResult}
                searchSuggestions={searchSuggestions}
                onGeolocation={onGeolocation}
                setSearchResult={setSearchResult}
                setTargetLocation={setTargetLocation}
              />
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-slate-50/50">
              {children}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Layout;
