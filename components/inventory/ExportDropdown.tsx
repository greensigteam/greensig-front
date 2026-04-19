import React, { useState, useEffect, useRef } from 'react';
import { Download, ChevronDown, FileText, Printer } from 'lucide-react';

interface ExportDropdownProps {
  onExportExcel: () => void;
  onPrint: () => void;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({ onExportExcel, onPrint }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
      >
        <Download className="w-4 h-4" />
        <span>Exporter</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={() => {
              onExportExcel();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-green-600" />
            Excel (XLSX)
          </button>
          <div className="border-t border-slate-100 my-1"></div>
          <button
            onClick={() => {
              onPrint();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            Export en PDF
          </button>
        </div>
      )}
    </div>
  );
};
