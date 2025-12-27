import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';
import { MapSearchResult, SearchSuggestion } from '../types';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  placeholder: string;
  setPlaceholder: (placeholder: string) => void;
  isSearching: boolean;
  setIsSearching: (isSearching: boolean) => void;
  
  // Suggestions & Results
  searchResult: MapSearchResult | null;
  setSearchResult: (result: MapSearchResult | null) => void;
  searchSuggestions: SearchSuggestion[];
  setSearchSuggestions: (suggestions: SearchSuggestion[]) => void;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  
  // Selected Suggestion (pour la navigation)
  selectedSuggestion: SearchSuggestion | null;
  setSelectedSuggestion: (suggestion: SearchSuggestion | null) => void;
  
  // Refs & Handlers
  searchContainerRef: React.RefObject<HTMLDivElement>;
  handleSuggestionClick: (suggestion: SearchSuggestion) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholder, setPlaceholder] = useState('Rechercher...');
  const [isSearching, setIsSearching] = useState(false);
  
  const [searchResult, setSearchResult] = useState<MapSearchResult | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SearchSuggestion | null>(null);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
    setSelectedSuggestion(suggestion); // Notifie les consommateurs qu'une suggestion a été choisie
  };

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        placeholder,
        setPlaceholder,
        isSearching,
        setIsSearching,
        searchResult,
        setSearchResult,
        searchSuggestions,
        setSearchSuggestions,
        showSuggestions,
        setShowSuggestions,
        selectedSuggestion,
        setSelectedSuggestion,
        searchContainerRef,
        handleSuggestionClick,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
