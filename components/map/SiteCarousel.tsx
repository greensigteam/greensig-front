import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Plus, MapPin, Building2, Home, Hotel, Stethoscope, FlaskConical, MoreVertical, Edit2, Trash2, Eye } from 'lucide-react';
import { SiteFrontend } from '../../services/api';

interface SiteCarouselProps {
  sites: SiteFrontend[];
  isLoading?: boolean;
  isSidebarCollapsed?: boolean;
  onSiteHover?: (siteId: string | null) => void;
  onSiteSelect?: (site: SiteFrontend) => void;
  onCreateSite?: () => void;
  onEditSite?: (site: SiteFrontend) => void;
  onViewSite?: (site: SiteFrontend) => void;
  onToggle?: (isOpen: boolean) => void;
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
  isSidebarCollapsed = false,
  onSiteHover,
  onSiteSelect,
  onCreateSite,
  onEditSite,
  onViewSite,
  onToggle,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const toggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(newState);
  };

  // Notify parent on mount
  useEffect(() => {
    onToggle?.(isOpen);
  }, []);

  // Calculate left offset based on sidebar state
  const leftOffset = isSidebarCollapsed ? '72px' : '260px';

  return (
    <div
      className={`absolute bottom-0 right-0 bg-emerald-950 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-[400] transition-all duration-300 ease-out pointer-events-auto ${isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      style={{ left: leftOffset }}
    >
      {/* Toggle Button - Always visible */}
      <button
        onClick={toggle}
        className="absolute -top-9 left-1/2 -translate-x-1/2 bg-emerald-950 border-none rounded-t-xl px-5 py-1.5 shadow-[0_-4px_12px_rgba(0,0,0,0.2)] cursor-pointer flex items-center gap-2 text-emerald-200 text-sm font-medium h-9 hover:bg-emerald-900 hover:text-white transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-5 h-5" />
        ) : (
          <ChevronUp className="w-5 h-5" />
        )}
        <span>{isOpen ? 'Masquer' : 'Explorer les sites'}</span>
      </button>

      {/* Carousel Content */}
      <div className="h-44 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-emerald-800 shrink-0">
          <h3 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
            Sites ({sites.length})
          </h3>
          {onCreateSite && (
            <button
              onClick={onCreateSite}
              className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
              title="Créer un nouveau site"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Cards Container */}
        <div className="flex gap-3 px-4 py-3 overflow-x-auto flex-1 items-center scrollbar-thin scrollbar-thumb-emerald-700 scrollbar-track-emerald-900/50">
          {isLoading ? (
            // Loading skeletons
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="min-w-[140px] w-[140px] h-full rounded-xl bg-emerald-900/50 animate-pulse flex flex-col"
                >
                  <div className="flex-1 bg-emerald-800/50 rounded-t-xl m-2" />
                  <div className="h-4 bg-emerald-800/50 rounded mx-2 mb-1" />
                  <div className="h-3 bg-emerald-800/50 rounded mx-2 mb-2 w-1/2" />
                </div>
              ))}
            </>
          ) : sites.length === 0 ? (
            // Empty state
            <div className="flex-1 flex items-center justify-center text-emerald-400 text-sm">
              <MapPin className="w-5 h-5 mr-2 opacity-50" />
              Aucun site disponible
            </div>
          ) : (
            // Site cards
            sites.map((site) => (
              <div
                key={site.id}
                className="relative min-w-[140px] w-[140px] h-full rounded-xl cursor-pointer transition-all duration-200 flex flex-col bg-emerald-900/60 border border-emerald-700/50 hover:border-emerald-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/50 group"
                onMouseEnter={() => onSiteHover?.(site.id)}
                onMouseLeave={() => {
                  onSiteHover?.(null);
                  // Close menu when leaving card
                  if (menuOpenId === site.id) {
                    setMenuOpenId(null);
                  }
                }}
                onClick={() => onSiteSelect?.(site)}
              >
                {/* Menu Button - Three dots */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === site.id ? null : site.id);
                  }}
                  className="absolute top-1.5 right-1.5 p-1 rounded-md bg-emerald-800/60 hover:bg-emerald-700 text-emerald-300 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-10"
                  title="Options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}
                {menuOpenId === site.id && (
                  <div
                    className="absolute top-8 right-1.5 bg-emerald-800 border border-emerald-600 rounded-lg shadow-xl z-20 min-w-[120px] py-1 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Prioritize onViewSite, fallback to old behavior
                        if (onViewSite) {
                          onViewSite(site);
                        } else {
                          onSiteSelect?.(site);
                        }
                        setMenuOpenId(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-emerald-100 hover:bg-emerald-700 flex items-center gap-2 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Voir
                    </button>
                    {onEditSite && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditSite(site);
                          setMenuOpenId(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-emerald-100 hover:bg-emerald-700 flex items-center gap-2 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Modifier
                      </button>
                    )}
                  </div>
                )}

                {/* Image/Icon Placeholder */}
                <div
                  className="flex-1 rounded-t-xl flex items-center justify-center bg-emerald-800/40 transition-colors group-hover:bg-emerald-800/60"
                >
                  <div
                    className="transition-transform group-hover:scale-110 text-emerald-400 group-hover:text-emerald-300"
                  >
                    {getCategoryIcon(site.category)}
                  </div>
                </div>

                {/* Info */}
                <div className="p-2.5 pt-2">
                  <span className="block text-sm font-medium text-emerald-100 truncate group-hover:text-white">
                    {site.name}
                  </span>
                  <span className="block text-xs text-emerald-400 mt-0.5 group-hover:text-emerald-300">
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
