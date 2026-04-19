import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Ban, Gauge, ExternalLink } from 'lucide-react';

interface ValidationWarningsAlertProps {
  warnings: string[];
}

export const ValidationWarningsAlert: React.FC<ValidationWarningsAlertProps> = ({ warnings }) => {
  if (warnings.length === 0) return null;

  return (
    <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-orange-800">Attention</h3>
          <div className="mt-1 text-sm text-orange-700">
            <ul className="list-disc list-inside space-y-1">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

interface IncompatibleObjectsErrorProps {
  error: string | null;
}

export const IncompatibleObjectsError: React.FC<IncompatibleObjectsErrorProps> = ({ error }) => {
  if (!error) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Ban className="h-5 w-5 text-red-500" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Objets incompatibles</h3>
          <div className="mt-1 text-sm text-red-700">{error}</div>
          <div className="mt-2">
            <Link
              to="/parametres?tab=ratios"
              target="_blank"
              className="text-sm text-red-600 hover:text-red-800 underline flex items-center gap-1"
            >
              <Gauge className="w-3 h-3" />
              Configurer les ratios de productivité
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
