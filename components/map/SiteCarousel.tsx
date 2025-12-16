import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Plus, MapPin, Building2, Home, Hotel, Stethoscope, FlaskConical } from 'lucide-react';
import { SiteFrontend } from '../../services/api';

interface SiteCarouselProps {
  sites: SiteFrontend[];
  isLoading?: boolean;
  onSiteHover?: (siteId: string | null) => void;
  onSiteSelect?: (site: SiteFrontend) => void;
  onCreateSite?: () => void;
}

// Icon based on category
const getCategoryIcon = (category: string) => {
  const iconClass = "w-6 h-6";
  switch (category) {
    case 'RECHERCHE':
      return <FlaskConical className={iconClass} />;
    case 'INFRASTRUCTURE':
      return <Building2 className={iconClass} />;
    case 'RESIDENCE':
      return <Home className={iconClass} />;
    case 'SANTE':
      return <Stethoscope className={iconClass} />;
    case 'HOTELLERIE':
      return <Hotel className={iconClass} />;
    default:
      return <MapPin className={iconClass} />;
  }
};

// Category label in French
const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'RECHERCHE':
      return 'Recherche';
    case 'INFRASTRUCTURE':
      return 'Infrastructure';
    case 'RESIDENCE':
      return 'Résidence';
    case 'SANTE':
      return 'Santé';
    case 'HOTELLERIE':
      return 'Hôtellerie';
    default:
      return 'Site';
  }
};

export const SiteCarousel: React.FC<SiteCarouselProps> = ({
  sites,
  isLoading = false,
  onSiteHover,
  onSiteSelect,
  onCreateSite,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const toggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-[400] transition-transform duration-300 ease-out ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {/* Toggle Button - Always visible */}
      <button
        onClick={toggle}
        className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white border-none rounded-t-2xl px-4 py-1 shadow-[0_-2px_4px_rgba(0,0,0,0.05)] cursor-pointer flex items-center gap-2 text-slate-500 text-sm font-medium h-8 hover:bg-slate-50 hover:text-slate-700 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-5 h-5" />
        ) : (
          <ChevronUp className="w-5 h-5" />
        )}
        <span>{isOpen ? 'Masquer' : 'Explorer les sites'}</span>
      </button>

      {/* Carousel Content */}
      <div className="h-40 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 shrink-0">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Sites ({sites.length})
          </h3>
          {onCreateSite && (
            <button
              onClick={onCreateSite}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95"
              title="Créer un nouveau site"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Cards Container */}
        <div className="flex gap-3 px-4 py-3 overflow-x-auto flex-1 items-center scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          {isLoading ? (
            // Loading skeletons
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="min-w-[140px] w-[140px] h-full rounded-lg bg-slate-100 animate-pulse flex flex-col"
                >
                  <div className="flex-1 bg-slate-200 rounded-lg m-2" />
                  <div className="h-4 bg-slate-200 rounded mx-2 mb-1" />
                  <div className="h-3 bg-slate-200 rounded mx-2 mb-2 w-1/2" />
                </div>
              ))}
            </>
          ) : sites.length === 0 ? (
            // Empty state
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Aucun site disponible
            </div>
          ) : (
            // Site cards
            sites.map((site) => (
              <div
                key={site.id}
                className="min-w-[140px] w-[140px] h-full rounded-lg cursor-pointer transition-all duration-200 flex flex-col bg-white border border-slate-200 hover:border-emerald-300 hover:-translate-y-0.5 hover:shadow-lg group"
                onMouseEnter={() => onSiteHover?.(site.id)}
                onMouseLeave={() => onSiteHover?.(null)}
                onClick={() => onSiteSelect?.(site)}
              >
                {/* Image/Icon Placeholder */}
                <div
                  className="flex-1 rounded-t-lg flex items-center justify-center transition-colors"
                  style={{ backgroundColor: `${site.color}15` }}
                >
                  <div
                    className="transition-transform group-hover:scale-110"
                    style={{ color: site.color }}
                  >
                    {getCategoryIcon(site.category)}
                  </div>
                </div>

                {/* Info */}
                <div className="p-2 pt-1.5">
                  <span className="block text-sm font-medium text-slate-800 truncate">
                    {site.name}
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    {getCategoryLabel(site.category)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SiteCarousel;
