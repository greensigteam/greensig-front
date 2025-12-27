import React from 'react';
import LoadingScreen from './LoadingScreen';

interface LoadingWrapperProps {
  isLoading: boolean;
  children: React.ReactNode;
  fullScreen?: boolean; // Si true, utilise fixed inset-0, sinon relatif au parent
  minDuration?: number;
}

/**
 * Wrapper universel pour gérer les états de chargement avec LoadingScreen
 *
 * Usage:
 * <LoadingWrapper isLoading={loading}>
 *   <YourContent />
 * </LoadingWrapper>
 */
const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  isLoading,
  children,
  fullScreen = true,
  minDuration = 0
}) => {
  if (isLoading) {
    return (
      <div className={fullScreen ? "fixed inset-0 z-50" : "absolute inset-0 z-50"}>
        <LoadingScreen isLoading={true} loop={true} minDuration={minDuration} />
      </div>
    );
  }

  return <>{children}</>;
};

export default LoadingWrapper;
