import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, ViewState, MapSearchResult, SearchSuggestion, TargetLocation } from '../types';
import { Bell, X, Search, Loader2, MapPin, ChevronRight, Command } from 'lucide-react';
import { useSearch } from '../contexts/SearchContext';

interface HeaderProps {
  user: User;
  collapsed: boolean;
}

const VIEW_TITLES: Record<ViewState, string> = {
  'LOGIN': 'Connexion',
  'DASHBOARD': 'Tableau de Bord',
  'MAP': 'Système d\'Information Géographique',
  'INVENTORY': 'Inventaire',
  'PLANNING': 'Planning',
  'INTERVENTIONS': 'Rapports Terrain',
  'CLAIMS': 'Signalements',
  'TEAMS': 'Équipes',
  'USERS': 'Utilisateurs',
  'REPORTING': 'Statistiques',
  'CLIENT_PORTAL': 'Espace Client',
  'PRODUCTS': 'Gestion des Produits',
  'SITES': 'Gestion des Sites'
};

const PATH_TO_VIEW: Record<string, ViewState> = {
  '/dashboard': 'DASHBOARD',
  '/map': 'MAP',
  '/inventory': 'INVENTORY',
  '/planning': 'PLANNING',
  '/interventions': 'INTERVENTIONS',
  '/claims': 'CLAIMS',
  '/teams': 'TEAMS',
  '/reporting': 'REPORTING',
  '/client': 'CLIENT_PORTAL',
  '/sites': 'SITES',
  '/products': 'PRODUCTS'
};

const Header: React.FC<HeaderProps> = ({ user }) => {
  const location = useLocation();
  const {
    searchQuery,
    setSearchQuery,
    placeholder,
    isSearching,
  } = useSearch();

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);

  // Determine current view from path
  const currentPath = location.pathname;
  const currentView = Object.keys(PATH_TO_VIEW).find(path => currentPath.startsWith(path))
                      ? PATH_TO_VIEW[Object.keys(PATH_TO_VIEW).find(path => currentPath.startsWith(path))!]
                      : 'DASHBOARD';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
        setMobileSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (mobileSearchOpen && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        desktopInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Ne pas afficher la barre de recherche sur certaines pages
  const hideSearch = currentPath.startsWith('/map') || currentPath.startsWith('/client');

  const handleClearSearch = () => {
    setSearchQuery('');
    desktopInputRef.current?.focus();
  };

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm flex items-center justify-between px-6 z-20 shrink-0 transition-all duration-300 sticky top-0">
      
      {/* LEFT: Title & Breadcrumbs */}
      <div className="flex flex-col justify-center min-w-0 w-1/4">
        <h2 className="text-base md:text-lg font-bold text-slate-800 tracking-tight truncate leading-tight">
          {VIEW_TITLES[currentView] || 'GreenSIG'}
        </h2>
        <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-slate-500 truncate">
          <span className="text-slate-400 hidden sm:inline">GreenSIG</span>
          <span className="hidden sm:inline text-slate-300">/</span>
          <span className="font-medium text-emerald-600 truncate">
            {currentView ? (currentView.charAt(0) + currentView.slice(1).toLowerCase()) : ''}
          </span>
        </div>
      </div>

      {/* CENTER: Search Bar */}
      <div className="flex-1 flex justify-center max-w-2xl px-4">
        {!hideSearch && (
          <div className={`relative w-full group transition-all duration-300 ease-out ${isFocused ? 'scale-[1.02] -translate-y-0.5' : ''}`}>
            <div className={`absolute inset-0 bg-emerald-500/5 rounded-xl blur-sm transition-opacity duration-300 ${isFocused ? 'opacity-100' : 'opacity-0'}`}></div>
            <div className={`relative flex items-center w-full bg-slate-100/50 border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 ${isFocused ? 'bg-white border-emerald-500/50 shadow-lg ring-4 ring-emerald-500/10' : 'hover:border-slate-300 hover:bg-white'}`}>
              <div className="pl-4 pr-3 text-slate-400 group-hover:text-slate-500 transition-colors">
                {isSearching ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                ) : (
                  <Search className={`w-5 h-5 transition-colors ${isFocused ? 'text-emerald-600' : ''}`} />
                )}
              </div>
              
              <input
                ref={desktopInputRef}
                type="text"
                placeholder={placeholder}
                className="w-full py-3 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />

              {searchQuery && (
                <button 
                  onClick={handleClearSearch}
                  className="p-1.5 mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {!searchQuery && !isFocused && (
                <div className="pr-4 flex items-center pointer-events-none">
                  <kbd className="hidden lg:inline-flex h-6 items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 font-mono text-[10px] font-medium text-slate-500 opacity-100 shadow-sm">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Actions & Profile */}
      <div className="flex items-center justify-end gap-3 md:gap-5 w-1/4">
        <button className="relative p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all duration-200 group">
          <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-200/60 h-10">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-bold text-slate-700 leading-none mb-0.5">{user.name}</span>
            <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide bg-emerald-50 px-2 py-0.5 rounded-full">{user.role}</span>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20 ring-2 ring-white text-sm cursor-pointer hover:scale-105 transition-transform duration-200">
            {user.avatar || (user.name ? user.name.charAt(0) : '')}
          </div>
        </div>

        <div className="pl-2">
          <Link
            to="/map"
            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="Fermer le panneau"
          >
            <X className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {mobileSearchOpen && !hideSearch && (
        <div
          ref={mobileSearchRef}
          className="md:hidden fixed inset-x-0 top-0 bg-white shadow-xl z-50 animate-slide-down"
        >
          <div className="flex items-center gap-2 p-4 border-b border-slate-100">
            <button
              onClick={() => setMobileSearchOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex-1 relative">
              <input
                ref={mobileInputRef}
                type="text"
                placeholder={placeholder}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              {isSearching && (
                <Loader2 className="absolute right-4 top-3.5 w-5 h-5 text-emerald-600 animate-spin" />
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
