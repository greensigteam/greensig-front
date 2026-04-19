import { useEffect, useCallback } from 'react';
import { Coordinates, SearchSuggestion } from '../types';
import { searchObjects, geoJSONToLatLng, SiteFrontend } from '../services/api';
import { useSearch } from '../contexts/SearchContext';
import logger from '../services/logger';

interface UseMapSearchParams {
  setTargetLocation: (loc: { coordinates: Coordinates; zoom?: number } | null) => void;
  sites: SiteFrontend[];
}

export function useMapSearch({ setTargetLocation, sites }: UseMapSearchParams) {
  const {
    searchQuery,
    setSearchQuery,
    searchSuggestions,
    showSuggestions,
    setShowSuggestions,
    isSearching,
    setIsSearching,
    searchResult,
    setSearchResult: setGlobalSearchResult,
    searchContainerRef,
    handleSuggestionClick: hookHandleSuggestionClick,
    setPlaceholder,
    selectedSuggestion,
    setSelectedSuggestion,
    setSearchSuggestions,
  } = useSearch();

  const handleSuggestionClick = useCallback(
    (suggestion: (typeof searchSuggestions)[0]) => {
      hookHandleSuggestionClick(suggestion);
    },
    [hookHandleSuggestionClick],
  );

  const handleSearch = useCallback(async () => {
    if (!searchQuery || searchQuery.trim().length < 2) return;
    setIsSearching(true);
  }, [searchQuery, setIsSearching]);

  useEffect(() => {
    if (selectedSuggestion && selectedSuggestion.coordinates) {
      setTargetLocation({ coordinates: selectedSuggestion.coordinates, zoom: 18 });

      setGlobalSearchResult({
        name: selectedSuggestion.name,
        description: `${selectedSuggestion.type} - ID: ${selectedSuggestion.id}`,
        coordinates: selectedSuggestion.coordinates,
        zoom: 18,
        objectId: selectedSuggestion.id,
        objectType: selectedSuggestion.type,
      });

      setSelectedSuggestion(null);
    }
  }, [selectedSuggestion]);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        setSearchSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsSearching(true);

      try {
        const suggestions: SearchSuggestion[] = [];

        try {
          const apiResults = await searchObjects(searchQuery);
          if (apiResults && apiResults.length > 0) {
            apiResults.slice(0, 8).forEach((result) => {
              if (result.location) {
                const coords = geoJSONToLatLng(result.location.coordinates);
                suggestions.push({
                  id: result.id.toString(),
                  name: result.name,
                  type: result.type,
                  coordinates: coords,
                });
              }
            });
          }
        } catch (error) {
          logger.error('Erreur recherche API Django:', error);
        }

        if (suggestions.length === 0) {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=3`,
            );
            if (response.ok) {
              const data = await response.json();
              data.forEach((result: any) => {
                suggestions.push({
                  id: `nominatim-${result.place_id}`,
                  name: result.display_name,
                  type: 'Lieu',
                  coordinates: { lat: parseFloat(result.lat), lng: parseFloat(result.lon) },
                });
              });
            }
          } catch (error) {
            logger.error('Error during Nominatim search:', error);
          }
        }

        setSearchSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(() => {
      if (searchQuery) performSearch();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, sites]);

  return {
    searchQuery,
    setSearchQuery,
    searchSuggestions,
    showSuggestions,
    setShowSuggestions,
    isSearching,
    setIsSearching,
    searchResult,
    setGlobalSearchResult,
    searchContainerRef,
    handleSuggestionClick,
    handleSearch,
    setPlaceholder,
  };
}
