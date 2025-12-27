import React, { useState, useCallback, useEffect } from 'react';
import {
    MapPin,
    Navigation,
    Crosshair,
    Copy,
    AlertCircle,
    Check,
} from 'lucide-react';
import { Coordinates } from '../../types';
import { BaseModal, ModalHeader, ModalBody, ModalFooter } from '../BaseModal';

interface GPSInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (coordinates: Coordinates) => void;
    initialCoordinates?: Coordinates;
    title?: string;
}

type CoordinateFormat = 'decimal' | 'dms';

interface DMSCoordinate {
    degrees: number;
    minutes: number;
    seconds: number;
    direction: 'N' | 'S' | 'E' | 'W';
}

/**
 * Modal for manual GPS coordinate input
 * Supports decimal degrees and DMS (degrees, minutes, seconds) formats
 */
export default function GPSInputModal({
    isOpen,
    onClose,
    onConfirm,
    initialCoordinates,
    title = 'Saisie de coordonnées GPS',
}: GPSInputModalProps) {
    const [format, setFormat] = useState<CoordinateFormat>('decimal');

    // Decimal format state
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');

    // DMS format state
    const [latDMS, setLatDMS] = useState<DMSCoordinate>({
        degrees: 0,
        minutes: 0,
        seconds: 0,
        direction: 'N',
    });
    const [lngDMS, setLngDMS] = useState<DMSCoordinate>({
        degrees: 0,
        minutes: 0,
        seconds: 0,
        direction: 'E',
    });

    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Initialize with initial coordinates
    useEffect(() => {
        if (initialCoordinates) {
            setLatitude(initialCoordinates.lat.toFixed(6));
            setLongitude(initialCoordinates.lng.toFixed(6));

            // Convert to DMS
            setLatDMS(decimalToDMS(initialCoordinates.lat, true));
            setLngDMS(decimalToDMS(initialCoordinates.lng, false));
        }
    }, [initialCoordinates]);

    // Convert decimal to DMS
    const decimalToDMS = (decimal: number, isLatitude: boolean): DMSCoordinate => {
        const absolute = Math.abs(decimal);
        const degrees = Math.floor(absolute);
        const minutesFloat = (absolute - degrees) * 60;
        const minutes = Math.floor(minutesFloat);
        const seconds = (minutesFloat - minutes) * 60;

        let direction: 'N' | 'S' | 'E' | 'W';
        if (isLatitude) {
            direction = decimal >= 0 ? 'N' : 'S';
        } else {
            direction = decimal >= 0 ? 'E' : 'W';
        }

        return { degrees, minutes, seconds: parseFloat(seconds.toFixed(2)), direction };
    };

    // Convert DMS to decimal
    const dmsToDecimal = (dms: DMSCoordinate): number => {
        const decimal = dms.degrees + dms.minutes / 60 + dms.seconds / 3600;
        return dms.direction === 'S' || dms.direction === 'W' ? -decimal : decimal;
    };

    // Validate coordinates
    const validateCoordinates = useCallback((): Coordinates | null => {
        setError(null);

        let lat: number;
        let lng: number;

        if (format === 'decimal') {
            lat = parseFloat(latitude);
            lng = parseFloat(longitude);

            if (isNaN(lat) || isNaN(lng)) {
                setError('Veuillez entrer des coordonnées valides');
                return null;
            }
        } else {
            lat = dmsToDecimal(latDMS);
            lng = dmsToDecimal(lngDMS);
        }

        // Validate ranges
        if (lat < -90 || lat > 90) {
            setError('La latitude doit être entre -90 et 90 degrés');
            return null;
        }

        if (lng < -180 || lng > 180) {
            setError('La longitude doit être entre -180 et 180 degrés');
            return null;
        }

        // Check if coordinates are in a reasonable area (Morocco/North Africa for GreenSIG)
        // This is a soft warning, not a blocking error
        if (lat < 20 || lat > 40 || lng < -20 || lng > 10) {
            // Just a warning, don't block
            console.warn('Coordinates outside typical GreenSIG area');
        }

        return { lat, lng };
    }, [format, latitude, longitude, latDMS, lngDMS]);

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const coords = validateCoordinates();
        if (coords) {
            onConfirm(coords);
            onClose();
        }
    };

    // Sync decimal and DMS when format changes
    const handleFormatChange = (newFormat: CoordinateFormat) => {
        if (newFormat === 'dms' && format === 'decimal') {
            // Convert decimal to DMS
            const lat = parseFloat(latitude);
            const lng = parseFloat(longitude);
            if (!isNaN(lat)) setLatDMS(decimalToDMS(lat, true));
            if (!isNaN(lng)) setLngDMS(decimalToDMS(lng, false));
        } else if (newFormat === 'decimal' && format === 'dms') {
            // Convert DMS to decimal
            setLatitude(dmsToDecimal(latDMS).toFixed(6));
            setLongitude(dmsToDecimal(lngDMS).toFixed(6));
        }
        setFormat(newFormat);
    };

    // Get current location
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError('La géolocalisation n\'est pas supportée par votre navigateur');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude: lat, longitude: lng } = position.coords;
                setLatitude(lat.toFixed(6));
                setLongitude(lng.toFixed(6));
                setLatDMS(decimalToDMS(lat, true));
                setLngDMS(decimalToDMS(lng, false));
                setError(null);
            },
            (err) => {
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setError('Permission de géolocalisation refusée');
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setError('Position non disponible');
                        break;
                    case err.TIMEOUT:
                        setError('Délai de géolocalisation dépassé');
                        break;
                    default:
                        setError('Erreur de géolocalisation');
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Copy coordinates to clipboard
    const copyToClipboard = () => {
        const coords = validateCoordinates();
        if (coords) {
            const text = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
            navigator.clipboard.writeText(text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    // Update DMS field
    const updateDMS = (
        setter: React.Dispatch<React.SetStateAction<DMSCoordinate>>,
        field: keyof DMSCoordinate,
        value: string | number
    ) => {
        setter((prev) => ({
            ...prev,
            [field]: typeof value === 'string' ? value : parseFloat(value.toString()) || 0,
        }));
    };

    if (!isOpen) return null;

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} size="md">
            <ModalHeader
                title={title}
                subtitle="Entrez les coordonnées GPS manuellement"
                icon={<MapPin className="w-5 h-5 text-green-600" />}
            />

            <ModalBody>
                <form onSubmit={handleSubmit} className="space-y-6" id="gps-form">
                    {/* Format Selector */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => handleFormatChange('decimal')}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                                format === 'decimal'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Degrés décimaux
                        </button>
                        <button
                            type="button"
                            onClick={() => handleFormatChange('dms')}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                                format === 'dms'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            DMS (° ' ")
                        </button>
                    </div>

                    {/* Decimal Format Input */}
                    {format === 'decimal' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Latitude
                                </label>
                                <input
                                    type="text"
                                    value={latitude}
                                    onChange={(e) => setLatitude(e.target.value)}
                                    placeholder="33.589886"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Entre -90 et 90 (positif = Nord)
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Longitude
                                </label>
                                <input
                                    type="text"
                                    value={longitude}
                                    onChange={(e) => setLongitude(e.target.value)}
                                    placeholder="-7.603869"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Entre -180 et 180 (positif = Est)
                                </p>
                            </div>
                        </div>
                    )}

                    {/* DMS Format Input */}
                    {format === 'dms' && (
                        <div className="space-y-4">
                            {/* Latitude DMS */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Latitude
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={latDMS.degrees}
                                        onChange={(e) =>
                                            updateDMS(setLatDMS, 'degrees', e.target.value)
                                        }
                                        className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                                        min="0"
                                        max="90"
                                    />
                                    <span className="text-gray-500">°</span>
                                    <input
                                        type="number"
                                        value={latDMS.minutes}
                                        onChange={(e) =>
                                            updateDMS(setLatDMS, 'minutes', e.target.value)
                                        }
                                        className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                                        min="0"
                                        max="59"
                                    />
                                    <span className="text-gray-500">'</span>
                                    <input
                                        type="number"
                                        value={latDMS.seconds}
                                        onChange={(e) =>
                                            updateDMS(setLatDMS, 'seconds', e.target.value)
                                        }
                                        className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                                        min="0"
                                        max="59.99"
                                        step="0.01"
                                    />
                                    <span className="text-gray-500">"</span>
                                    <select
                                        value={latDMS.direction}
                                        onChange={(e) =>
                                            updateDMS(
                                                setLatDMS,
                                                'direction',
                                                e.target.value as 'N' | 'S'
                                            )
                                        }
                                        className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="N">N</option>
                                        <option value="S">S</option>
                                    </select>
                                </div>
                            </div>

                            {/* Longitude DMS */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Longitude
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={lngDMS.degrees}
                                        onChange={(e) =>
                                            updateDMS(setLngDMS, 'degrees', e.target.value)
                                        }
                                        className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                                        min="0"
                                        max="180"
                                    />
                                    <span className="text-gray-500">°</span>
                                    <input
                                        type="number"
                                        value={lngDMS.minutes}
                                        onChange={(e) =>
                                            updateDMS(setLngDMS, 'minutes', e.target.value)
                                        }
                                        className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                                        min="0"
                                        max="59"
                                    />
                                    <span className="text-gray-500">'</span>
                                    <input
                                        type="number"
                                        value={lngDMS.seconds}
                                        onChange={(e) =>
                                            updateDMS(setLngDMS, 'seconds', e.target.value)
                                        }
                                        className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                                        min="0"
                                        max="59.99"
                                        step="0.01"
                                    />
                                    <span className="text-gray-500">"</span>
                                    <select
                                        value={lngDMS.direction}
                                        onChange={(e) =>
                                            updateDMS(
                                                setLngDMS,
                                                'direction',
                                                e.target.value as 'E' | 'W'
                                            )
                                        }
                                        className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="E">E</option>
                                        <option value="W">W</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={getCurrentLocation}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <Navigation className="w-4 h-4" />
                            Ma position
                        </button>
                        <button
                            type="button"
                            onClick={copyToClipboard}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-green-600" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                            {copied ? 'Copié!' : 'Copier'}
                        </button>
                    </div>
                </form>
            </ModalBody>

            <ModalFooter>
                <div className="flex items-center justify-end gap-3 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        form="gps-form"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                    >
                        <Crosshair className="w-4 h-4" />
                        Placer sur la carte
                    </button>
                </div>
            </ModalFooter>
        </BaseModal>
    );
}
