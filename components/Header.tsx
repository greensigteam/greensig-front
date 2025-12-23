import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, ViewState, MapSearchResult, SearchSuggestion, TargetLocation } from '../types';
import { Bell, X, Search, Loader2, MapPin, ChevronRight } from 'lucide-react';

interface HeaderProps {
  user: User;
  collapsed: boolean;
  // Search Props
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

const VIEW_TITLES: Record<ViewState, string> = {
  'LOGIN': 'Connexion',
  'DASHBOARD': 'Tableau de Bord',
  'MAP': 'Système d\'Information Géographique',
  'INVENTORY': 'Gestion de Parc',
  'PLANNING': 'Planning',
  'INTERVENTIONS': 'Rapports Terrain',
  'CLAIMS': 'Signalements',
  'TEAMS': 'Équipes',
  'USERS': 'Utilisateurs',
  'REPORTING': 'Statistiques',
  'CLIENT_PORTAL': 'Espace Client'
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
  '/client': 'CLIENT_PORTAL'
};

const Header: React.FC<HeaderProps> = ({
  user,
  searchQuery,
  setSearchQuery,
  onSearch,
  isSearching,
  searchSuggestions,
  setTargetLocation,
  setSearchResult,
  onGeolocation
}) => {
  const location = useLocation();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Determine current view from path
  const currentView = Object.keys(PATH_TO_VIEW).find(path => location.pathname.startsWith(path))
                      ? PATH_TO_VIEW[Object.keys(PATH_TO_VIEW).find(path => location.pathname.startsWith(path))!]
                      : 'DASHBOARD';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
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

  useEffect(() => {
    if (searchSuggestions && searchSuggestions.length > 0 && searchQuery && searchQuery.trim().length >= 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchSuggestions, searchQuery]);

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    let coords: { lat: number; lng: number };
    if (suggestion.coordinates) {
      coords = suggestion.coordinates;
    } else {
      coords = { lat: 32.219, lng: -7.934 };
    }
    if (setSearchResult) {
      setSearchResult({
        name: suggestion.name,
        description: `${suggestion.type} - ID: ${suggestion.id}`,
        coordinates: coords,
        zoom: 18
      });
    }
    if (setTargetLocation) {
      setTargetLocation({ coordinates: coords, zoom: 18 });
    }
    if (setSearchQuery) {
      setSearchQuery(suggestion.name);
    }
    setShowSuggestions(false);
    setMobileSearchOpen(false);
  };

  return (
    <header className="h-16 bg-white border-b border-emerald-100 shadow-sm flex items-center justify-between px-4 md:px-6 z-10 shrink-0 transition-all duration-300">
      <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
        <div className="flex flex-col justify-center min-w-0 mr-4">
          <h2 className="text-base md:text-lg font-bold text-slate-800 tracking-tight truncate leading-tight">
            {VIEW_TITLES[currentView] || 'GreenSIG'}
          </h2>
          <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-slate-500 truncate">
            <span className="text-emerald-800/60 hidden sm:inline">GreenSIG</span>
            <span className="hidden sm:inline">/</span>
            <span className="font-medium text-emerald-600 truncate">
              {currentView ? (currentView.charAt(0) + currentView.slice(1).toLowerCase()) : ''}
            </span>
          </div>
        </div>

        {setSearchQuery && (
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="md:hidden p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
            title="Rechercher"
          >
            <Search className="w-5 h-5" />
          </button>
        )}

        {setSearchQuery && (
          <div className="hidden md:flex flex-1 max-w-xl mx-auto">
            <div ref={searchContainerRef} className="relative w-full group">
              <input
                type="text"
                placeholder="Rechercher un site, un équipement, une intervention..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
                onFocus={() => {
                  if (searchSuggestions && searchSuggestions.length > 0 && searchQuery && searchQuery.trim().length >= 2) {
                    setShowSuggestions(true);
                  }
                }}
              />
              <div className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                <Search className="w-[18px] h-[18px]" />
              </div>
              {isSearching && (
                <div className="absolute right-3 top-2.5 text-emerald-600">
                  <Loader2 className="w-[18px] h-[18px] animate-spin" />
                </div>
              )}

              {showSuggestions && searchSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                  {searchSuggestions.map((suggestion, index) => (
                    <div
                      key={`${suggestion.id}-${index}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-4 py-2.5 hover:bg-emerald-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-800 truncate">
                            {suggestion.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {suggestion.type} • ID: {suggestion.id}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {setSearchQuery && mobileSearchOpen && (
          <div
            ref={mobileSearchRef}
            className="md:hidden fixed inset-x-0 top-0 bg-white shadow-xl z-50 animate-slide-down"
          >
            <div className="flex items-center gap-2 p-3 border-b border-slate-100">
              <button
                onClick={() => setMobileSearchOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex-1 relative">
                <input
                  ref={mobileInputRef}
                  type="text"
                  placeholder="Rechercher..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSearch?.();
                      setMobileSearchOpen(false);
                    }
                  }}
                />
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-3 w-4 h-4 text-emerald-600 animate-spin" />
                )}
              </div>
              <button
                onClick={() => {
                  onSearch?.();
                  setMobileSearchOpen(false);
                }}
                className="p-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {searchSuggestions && searchSuggestions.length > 0 && searchQuery && searchQuery.trim().length >= 2 && (
              <div className="max-h-[60vh] overflow-y-auto">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={`mobile-${suggestion.id}-${index}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-50 transition-colors border-b border-slate-100 text-left"
                  >
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">
                        {suggestion.name}
                      </div>
                      <div className="text-sm text-slate-500 truncate">
                        {suggestion.type}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {searchQuery && searchQuery.trim().length >= 2 && (!searchSuggestions || searchSuggestions.length === 0) && !isSearching && (
              <div className="p-8 text-center text-slate-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Aucun résultat pour "{searchQuery}"</p>
                <p className="text-xs mt-1">Appuyez sur Entrée pour rechercher</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-2">
        <button className="relative p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="flex items-center gap-3 pl-2 md:pl-4 border-l border-slate-100">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-bold text-slate-700 leading-none">{user.name}</span>
            <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">{user.role}</span>
            <span className="text-[10px] text-slate-500">{user.email}</span>
          </div>
          <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold shadow-sm ring-2 ring-white text-xs md:text-sm">
            {user.avatar || (user.name ? user.name.charAt(0) : '')}
          </div>
        </div>

        <div className="pl-2 ml-2 border-l border-slate-100">
          <Link
            to="/map"
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="Fermer le panneau"
          >
            <X className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
