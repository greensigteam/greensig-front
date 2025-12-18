import React from 'react';
import { Construction } from 'lucide-react';

interface ClientPortalProps {
    user: { name: string; email: string; id?: string | number; client_id?: number };
}

// Client Portal - Claims/Réclamations
const ClientPortal: React.FC<ClientPortalProps> = ({ user }) => {
    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full flex flex-col">
                <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center max-w-md">
                            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Construction className="w-10 h-10 text-amber-600" />
                            </div>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                                Page en cours de développement
                            </h2>
                            <p className="text-gray-500 mb-6">
                                Cette fonctionnalité sera bientôt disponible.
                                Nous travaillons activement pour vous offrir la meilleure expérience possible.
                            </p>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
                                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                                En cours de développement
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientPortal;
