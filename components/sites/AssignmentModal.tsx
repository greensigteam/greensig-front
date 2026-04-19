import React, { useState } from 'react';
import { Search, Users, Plus, X as XIcon } from 'lucide-react';
import LoadingScreen from '../LoadingScreen';

export interface AssignmentItem {
  id: number | string;
  title: string;
  subtitle?: string;
}

interface AssignmentModalProps {
  title: string;
  placeholder: string;
  emptyMessage: string;
  items: AssignmentItem[];
  isLoading: boolean;
  onSelect: (id: number | string) => void;
  onClose: () => void;
  headerAction?: React.ReactNode;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({
  title,
  placeholder,
  emptyMessage,
  items,
  isLoading,
  onSelect,
  onClose,
  headerAction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {headerAction}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="fixed inset-0 z-50">
              <LoadingScreen isLoading={true} loop={true} minDuration={0} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {searchQuery ? `Aucun résultat pour "${searchQuery}"` : emptyMessage}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className="w-full p-4 border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 group-hover:text-emerald-700">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-sm text-gray-500 mt-1">{item.subtitle}</div>
                      )}
                    </div>
                    <Plus className="w-5 h-5 text-gray-400 group-hover:text-emerald-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignmentModal;
