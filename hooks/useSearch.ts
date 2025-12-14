import { useState, useEffect, useRef } from 'react';
import { searchObjects, geoJSONToLatLng } from '../services/api';
import type { MapSearchResult, Coordinates } from '../types';
import logger from '../services/logger';

export interface SearchSuggestion {
  id: string;
  name: string;
  type: string;
  coordinates?: Coordinates;
}

export interface Site {
  id: string | number;
  name: string;
  code_site?: string;
  coordinates: Coordinates;
  [key: string]: unknown;
}

export interface UseSearchOptions {
  sites?: Site[];
  debounceMs?: number;
  maxSuggestions?: number;
  minQueryLength?: number;
}

export interface UseSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchSuggestions: SearchSuggestion[];
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  isSearching: boolean;
  setIsSearching: (searching: boolean) => void;
  searchResult: MapSearchResult | null;
  setSearchResult: (result: MapSearchResult | null) => void;
  searchContainerRef: React.RefObject<HTMLDivElement>;
  handleSuggestionClick: (suggestion: SearchSuggestion) => void;
}

/**
 * Custom hook for search functionality with autocomplete suggestions
 *
 * Features:
 * - Debounced autocomplete (300ms default)
 * - Multi-source search (local sites + Django API)
 * - Click-outside handling
 * - Search result state management
 *
 * @param options Configuration options
 * @returns Search state and handlers
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    sites = [],
    debounceMs = 300,
    maxSuggestions = 5,
    minQueryLength = 2
  } = options;

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<MapSearchResult | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced search suggestions
  useEffect(() => {
    if (searchQuery.length < minQueryLength) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const suggestions: SearchSuggestion[] = [];

        // 1. Search in local sites (instant, no network)
        const normalizedQuery = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const matchedSites = sites.filter(s => {
          const name = s.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const code = (s.code_site || '').toLowerCase();
          return name.includes(normalizedQuery) || code.includes(normalizedQuery);
        }).slice(0, 3);

        matchedSites.forEach(site => {
          suggestions.push({
            id: `site-${site.id}`,
            name: site.name,
            type: 'Site',
            coordinates: site.coordinates
          });
        });

        // 2. Search Django API backend (if we need more suggestions)
        if (suggestions.length < maxSuggestions) {
          try {
            const apiResults = await searchObjects(searchQuery);
            apiResults.slice(0, maxSuggestions - suggestions.length).forEach(result => {
              if (result.location) {
                suggestions.push({
                  id: result.id,
                  name: result.name,
                  type: result.type,
                  coordinates: geoJSONToLatLng(result.location.coordinates)
                });
              }
            });
          } catch (error) {
            logger.error('API search error:', error);
          }
        }

        setSearchSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } catch (error) {
        logger.error('Search suggestions error:', error);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, sites, debounceMs, maxSuggestions, minQueryLength]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handler for selecting a suggestion
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.coordinates) {
      setSearchQuery(suggestion.name);
      setSearchResult({
        name: suggestion.name,
        description: suggestion.type,
        coordinates: suggestion.coordinates,
        zoom: 18,
        objectId: suggestion.id,
        objectType: suggestion.type
      });
      setShowSuggestions(false);
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    searchSuggestions,
    showSuggestions,
    setShowSuggestions,
    isSearching,
    setIsSearching,
    searchResult,
    setSearchResult,
    searchContainerRef,
    handleSuggestionClick
  };
}
