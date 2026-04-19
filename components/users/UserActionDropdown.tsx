import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Edit2, UserX, MoreVertical } from 'lucide-react';
import type { Utilisateur } from '../../types/users';

interface UserActionDropdownProps {
  user: Utilisateur;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const UserActionDropdown: React.FC<UserActionDropdownProps> = ({
  user: _user,
  onView,
  onEdit,
  onDelete,
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
        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
          setIsOpen(false);
        }}
      >
        <UserX className="w-4 h-4" />
        Désactiver
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

export default UserActionDropdown;
