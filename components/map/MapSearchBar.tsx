import React from 'react';
import { Search, Navigation, Locate, Loader2, Map as MapIcon, ChevronRight, Trees, X } from 'lucide-react';
import type { Coordinates, MapSearchResult } from '../../types';

interface SiteSuggestion {
  id: string;
  name: string;
  type: string;
  coordinates?: Coordinates;
}

interface MapSearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  searchSuggestions: SiteSuggestion[];
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  onSuggestionClick: (suggestion: SiteSuggestion) => void;
  onGeolocation: () => void;
  searchContainerRef: React.RefObject<HTMLDivElement>;
  searchResult: MapSearchResult | null;
  setSearchResult: (result: MapSearchResult | null) => void;
  isSidebarCollapsed: boolean;
}

/**
 * Search Bar component for MapPage
 *
 * Features:
 * - Search input with autocomplete
 * - Suggestions dropdown
 * - Geolocation button
 * - Search result display
 *
 * ✅ Memoized to prevent focus loss on parent re-renders
 */
const MapSearchBarComponent: React.FC<MapSearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  onSearch,
  isSearching,
  searchSuggestions,
  showSuggestions,
  setShowSuggestions,
  onSuggestionClick,
  onGeolocation,
  searchContainerRef,
  searchResult,
  setSearchResult,
  isSidebarCollapsed
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div
      className="absolute top-4 transition-all duration-300 pointer-events-auto flex flex-row gap-2 items-start z-50 max-w-[calc(100vw-400px)]"
      style={{ left: isSidebarCollapsed ? '88px' : '276px' }}
    >
      {/* Search Group */}
      <div className="flex gap-2 w-72 md:w-96 shrink-0" ref={searchContainerRef}>
        <div className="flex-1 relative">
          <div className="bg-white/90 backdrop-blur-md shadow-xl rounded-xl flex items-center p-1 border border-white/20 ring-1 ring-black/5 transition-all focus-within:ring-2 focus-within:ring-emerald-600/50">
            <div className="p-2.5 text-slate-400">
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> : <Search className="w-5 h-5" />}
            </div>
            <input
              type="text"
              placeholder="Rechercher un site, équipement..."
              className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400 text-sm font-medium h-9 w-full min-w-0"
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                if (value.trim() === '') {
                  setSearchResult(null);
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => {
                if (searchSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onKeyDown={handleKeyDown}
              disabled={isSearching}
            />
            <button
              onClick={onSearch}
              className="p-2.5 text-slate-400 hover:text-emerald-600 border-l border-slate-100 transition-colors disabled:opacity-50"
              disabled={isSearching}
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-white/20 ring-1 ring-black/5 overflow-hidden z-[100]">
              {searchSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={() => onSuggestionClick(suggestion)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-50 transition-colors text-left ${
                    index !== searchSuggestions.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    {suggestion.type === 'Site' ? (
                      <MapIcon className="w-4 h-4 text-emerald-600" />
                    ) : suggestion.type === 'Arbre' ? (
                      <Trees className="w-4 h-4 text-green-600" />
                    ) : (
                      <Navigation className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-800 truncate">
                      {suggestion.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {suggestion.type}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onSearch}
          className="bg-emerald-600 text-white shadow-xl rounded-xl p-3 border border-emerald-500/20 ring-1 ring-black/5 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          disabled={isSearching}
          title="Lancer la recherche"
        >
          <Search className="w-5 h-5" />
        </button>

        <button
          onClick={onGeolocation}
          className="bg-white/90 backdrop-blur-md shadow-xl rounded-xl p-3 border border-white/20 ring-1 ring-black/5 text-slate-600 hover:text-emerald-600 active:bg-emerald-50 transition-colors disabled:opacity-50 shrink-0"
          disabled={isSearching}
          title="Ma position"
        >
          <Locate className="w-5 h-5" />
        </button>
      </div>

      {/* Search Result Info */}
      {searchResult && (
        <div className="absolute top-14 left-0 w-96 bg-white/90 backdrop-blur-md shadow-xl rounded-xl p-4 border border-white/20 animate-slide-in pointer-events-auto z-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Navigation className="w-3 h-3 text-emerald-600" />
                {searchResult.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{searchResult.description}</p>
            </div>
            <button onClick={() => setSearchResult(null)} className="text-slate-400 hover:text-slate-600 ml-2">
              <span className="sr-only">Fermer</span>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ✅ Memoize component to prevent unnecessary re-renders and maintain input focus
export const MapSearchBar = React.memo(MapSearchBarComponent);
