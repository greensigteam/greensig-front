import React, { useEffect, useState, useRef } from 'react';
import logger from '../services/logger';

interface LoadingScreenProps {
    onLoadingComplete?: () => void;
    minDuration?: number; // Minimum duration in milliseconds (0 = wait indefinitely)
    isLoading?: boolean; // External loading state - when false, triggers completion
    loop?: boolean; // Whether to loop the video
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
    onLoadingComplete,
    minDuration = 0,
    isLoading = true,
    loop = true
}) => {
    const [minTimeElapsed, setMinTimeElapsed] = useState(minDuration === 0);
    const [fadeOut, setFadeOut] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (minDuration === 0) {
            setMinTimeElapsed(true);
            return;
        }

        // Set minimum time elapsed after specified duration
        const timer = setTimeout(() => {
            setMinTimeElapsed(true);
        }, minDuration);

        return () => clearTimeout(timer);
    }, [minDuration]);

    useEffect(() => {
        // Start fade out when loading is complete and minimum time elapsed
        if (!isLoading && minTimeElapsed) {
            setFadeOut(true);
            // Complete loading after fade out animation
            const fadeOutTimer = setTimeout(() => {
                if (onLoadingComplete) {
                    onLoadingComplete();
                }
            }, 800); // Match the transition duration
            return () => clearTimeout(fadeOutTimer);
        }
        return undefined;
    }, [isLoading, minTimeElapsed, onLoadingComplete]);

    const handleVideoEnd = () => {
        logger.debug('Video ended (will loop if enabled)');
        // Video will auto-loop if loop prop is true
    };

    const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
        logger.error('Video loading error:', e);
        setVideoError(true);
        // If video fails, just wait for minimum time then complete
        setVideoEnded(true);
    };

    const handleVideoLoaded = () => {
        logger.debug('Video loaded successfully');
        // Video loaded - no state needed, just logging
    };

    const handleCanPlay = () => {
        logger.debug('Video can play');
        // Ensure video plays
        if (videoRef.current) {
            videoRef.current.play().catch(err => {
                logger.error('Video play error:', err);
                setVideoError(true);
                setVideoEnded(true);
            });
        }
    };

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-800 ${fadeOut ? 'opacity-0' : 'opacity-100'
                }`}
        >
            <div className="relative w-full h-full flex items-center justify-center">
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 via-white to-slate-100/50 animate-pulse"></div>

                {/* Video Container */}
                <div className="relative max-w-2xl w-full px-8 z-10 animate-fade-in">
                    {!videoError ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            loop={loop}
                            onEnded={handleVideoEnd}
                            onError={handleVideoError}
                            onLoadedData={handleVideoLoaded}
                            onCanPlay={handleCanPlay}
                            className="w-full h-auto"
                        >
                            <source src="/video/logo.mp4" type="video/mp4" />
                            Votre navigateur ne supporte pas la lecture de vidéos.
                        </video>
                    ) : (
                        // Fallback: Show logo PNG if video fails — transparent background and centered
                        <div className="flex items-center justify-center">
                            <figure className="inline-flex w-auto bg-transparent rounded-sm p-0 overflow-hidden">
                                <img
                                    src="/logofinal.png"
                                    alt="GreenSIG Logo"
                                    className="block w-auto h-auto max-w-xs animate-fade-in object-contain"
                                />
                            </figure>
                        </div>
                    )}
                </div>

                {/* Loading indicator */}
                <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex gap-2">
                            <div
                                className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce"
                                style={{ animationDelay: '0ms' }}
                            ></div>
                            <div
                                className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce"
                                style={{ animationDelay: '150ms' }}
                            ></div>
                            <div
                                className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce"
                                style={{ animationDelay: '300ms' }}
                            ></div>
                        </div>
                        <p className="text-slate-700 text-sm font-medium tracking-wide animate-pulse">
                            Chargement en cours...
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
      `}</style>
        </div>
    );
};

export default LoadingScreen;
