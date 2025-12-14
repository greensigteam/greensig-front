import { useState, useCallback } from 'react';
import type { Coordinates, UserLocation } from '../types';
import logger from '../services/logger';

export interface GeolocationResult {
  coordinates: Coordinates;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export interface UseGeolocationReturn {
  isGeolocating: boolean;
  geolocationResult: GeolocationResult | null;
  error: GeolocationError | null;
  requestGeolocation: () => void;
  clearGeolocation: () => void;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  onSuccess?: (result: GeolocationResult) => void;
  onError?: (error: GeolocationError) => void;
}

/**
 * Custom hook for HTML5 Geolocation API
 *
 * Features:
 * - High accuracy GPS positioning
 * - Error handling with user-friendly messages
 * - Loading state
 * - Detailed position data (accuracy, altitude, heading, speed)
 *
 * @param options Configuration options
 * @returns Geolocation state and handlers
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    onSuccess,
    onError
  } = options;

  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geolocationResult, setGeolocationResult] = useState<GeolocationResult | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);

  const requestGeolocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      const err: GeolocationError = {
        code: 0,
        message: "La géolocalisation n'est pas supportée par votre navigateur."
      };
      setError(err);
      if (onError) onError(err);
      return;
    }

    console.log('🌍 Requesting geolocation...');
    setIsGeolocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = position.coords;

        const result: GeolocationResult = {
          coordinates: { lat: latitude, lng: longitude },
          accuracy,
          altitude: altitude ?? undefined,
          altitudeAccuracy: altitudeAccuracy ?? undefined,
          heading: heading ?? undefined,
          speed: speed ?? undefined,
          timestamp: position.timestamp
        };

        console.log('✅ Geolocation success:', {
          latitude,
          longitude,
          accuracy: `${accuracy.toFixed(2)}m`,
          timestamp: new Date(position.timestamp).toLocaleString()
        });

        setGeolocationResult(result);
        setIsGeolocating(false);

        if (onSuccess) onSuccess(result);
      },
      (err) => {
        logger.error('❌ Geolocation error:', err);

        const geolocationError: GeolocationError = {
          code: err.code,
          message: getErrorMessage(err.code)
        };

        setError(geolocationError);
        setIsGeolocating(false);

        if (onError) onError(geolocationError);
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );
  }, [enableHighAccuracy, timeout, maximumAge, onSuccess, onError]);

  const clearGeolocation = useCallback(() => {
    setGeolocationResult(null);
    setError(null);
  }, []);

  return {
    isGeolocating,
    geolocationResult,
    error,
    requestGeolocation,
    clearGeolocation
  };
}

/**
 * Get user-friendly error message from error code
 */
function getErrorMessage(code: number): string {
  switch (code) {
    case 1: // PERMISSION_DENIED
      return "Vous avez refusé l'accès à la géolocalisation. Veuillez autoriser l'accès dans les paramètres de votre navigateur.";
    case 2: // POSITION_UNAVAILABLE
      return "Position GPS indisponible. Vérifiez que votre GPS est activé.";
    case 3: // TIMEOUT
      return "La demande de géolocalisation a expiré. Veuillez réessayer.";
    default:
      return "Impossible d'accéder à votre position GPS.";
  }
}
