import React from 'react';
import { Package, Construction } from 'lucide-react';

const Produits: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-50">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Construction className="w-10 h-10 text-amber-500" />
                </div>
                
                <h1 className="text-2xl font-bold text-slate-800 mb-3 flex items-center justify-center gap-2">
                    <Package className="w-6 h-6 text-emerald-600" />
                    Gestion des Produits
                </h1>
                
                <div className="space-y-4 text-slate-600">
                    <p>
                        Le module de gestion des produits phytosanitaires et engrais est actuellement en cours de maintenance évolutive.
                    </p>
                    <p className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                        Nous travaillons à améliorer la traçabilité et la gestion des stocks pour mieux répondre à vos besoins.
                    </p>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
                        Bientôt disponible
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Produits;
