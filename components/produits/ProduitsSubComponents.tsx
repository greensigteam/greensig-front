import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  MoreVertical,
  Eye,
  Edit2,
  Power,
  PowerOff,
  Plus,
  ChevronDown,
  Beaker,
  Leaf,
  Bug,
} from 'lucide-react';
import type {
  ProduitList,
  FertilisantList,
  RavageurMaladieList,
  TypeProduitUnifie,
} from '../../types/suiviTaches';

export interface UnifiedProduct {
  id: number;
  type: TypeProduitUnifie;
  nom: string;
  details: string;
  actif: boolean;
  dateCreation: string;
  original: ProduitList | FertilisantList | RavageurMaladieList;
}

// ============================================================================
// STAT CARD
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
    <div className="text-sm font-medium text-slate-500 mb-1">{label}</div>
    <div className="text-3xl font-bold text-slate-800">{value}</div>
    <div className={`absolute top-4 right-4 p-2 rounded-lg ${color}`}>{icon}</div>
  </div>
);

// ============================================================================
// ACTION DROPDOWN (PORTAL)
// ============================================================================

interface ActionDropdownProps {
  item: UnifiedProduct;
  onView: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
}

export const ActionDropdown: React.FC<ActionDropdownProps> = ({
  item,
  onView,
  onEdit,
  onToggleActive,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      const openUpwards = spaceBelow < 200;

      if (openUpwards) {
        setDropdownStyle({
          position: 'fixed',
          bottom: windowHeight - rect.top + 5,
          right: window.innerWidth - rect.right,
          zIndex: 9999,
        });
      } else {
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 5,
          right: window.innerWidth - rect.right,
          zIndex: 9999,
        });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  const menu = (
    <div
      ref={menuRef}
      style={dropdownStyle}
      className="w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-in fade-in zoom-in-95 duration-100"
    >
      <button
        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        onClick={(e) => {
          e.stopPropagation();
          onView();
          setIsOpen(false);
        }}
      >
        <Eye className="w-4 h-4 text-gray-500" />
        Voir les détails
      </button>
      <button
        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
          setIsOpen(false);
        }}
      >
        <Edit2 className="w-4 h-4 text-blue-500" />
        Modifier
      </button>
      <div className="border-t border-gray-100 my-1"></div>
      <button
        className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
          item.actif ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleActive();
          setIsOpen(false);
        }}
      >
        {item.actif ? (
          <>
            <PowerOff className="w-4 h-4" />
            Désactiver
          </>
        ) : (
          <>
            <Power className="w-4 h-4" />
            Réactiver
          </>
        )}
      </button>
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        title="Actions"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {isOpen && createPortal(menu, document.body)}
    </div>
  );
};

// ============================================================================
// CREATE MENU DROPDOWN
// ============================================================================

interface CreateMenuProps {
  onSelect: (type: TypeProduitUnifie) => void;
}

export const CreateMenu: React.FC<CreateMenuProps> = ({ onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 5,
        right: window.innerWidth - rect.right,
        zIndex: 9999,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menu = (
    <div
      ref={menuRef}
      style={dropdownStyle}
      className="w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 animate-in fade-in zoom-in-95 duration-100"
    >
      <button
        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
        onClick={() => {
          onSelect('PHYTOSANITAIRE');
          setIsOpen(false);
        }}
      >
        <div className="p-2 rounded-lg bg-cyan-100">
          <Beaker className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">Produit phytosanitaire</p>
          <p className="text-xs text-gray-500">Herbicides, fongicides, insecticides...</p>
        </div>
      </button>
      <button
        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
        onClick={() => {
          onSelect('FERTILISANT');
          setIsOpen(false);
        }}
      >
        <div className="p-2 rounded-lg bg-green-100">
          <Leaf className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">Fertilisant</p>
          <p className="text-xs text-gray-500">Engrais, composts, amendements...</p>
        </div>
      </button>
      <button
        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
        onClick={() => {
          onSelect('RAVAGEUR_MALADIE');
          setIsOpen(false);
        }}
      >
        <div className="p-2 rounded-lg bg-red-100">
          <Bug className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">Ravageur / Maladie</p>
          <p className="text-xs text-gray-500">Insectes nuisibles, maladies...</p>
        </div>
      </button>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Nouveau
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && createPortal(menu, document.body)}
    </>
  );
};
