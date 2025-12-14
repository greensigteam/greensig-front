import React from 'react';

declare global {
	namespace JSX {
		interface Element extends React.ReactElement<any, any> {}
		interface ElementClass extends React.Component<any> {}
		interface IntrinsicElements {
			[elemName: string]: any;
		}
	}
}
/// <reference types="vite/client" />
// Allow importing CSS files as side-effects in TypeScript
declare module '*.css';
declare module '*.scss';
declare module '*.png';
declare module '*.jpg';
declare module '*.svg';

// Specific declaration for leaflet-routing-machine css import path (optional but explicit)


export { };
