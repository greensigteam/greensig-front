// Allow importing CSS files as side-effects in TypeScript
declare module '*.css';
declare module '*.scss';
declare module '*.png';
declare module '*.jpg';
declare module '*.svg';

// Specific declaration for leaflet-routing-machine css import path (optional but explicit)
declare module 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

export {};
