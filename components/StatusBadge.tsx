import React from 'react';

export interface StatusBadgeProps {
    status: string;
    type: 'intervention' | 'claim' | 'urgency' | 'state';
}

const STATUS_COLORS = {
    intervention: {
        planifiee: 'bg-blue-100 text-blue-800 border-blue-200',
        en_cours: 'bg-orange-100 text-orange-800 border-orange-200',
        terminee: 'bg-green-100 text-green-800 border-green-200',
        non_realisee: 'bg-gray-100 text-gray-800 border-gray-200'
    },
    claim: {
        nouvelle: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        assignee: 'bg-blue-100 text-blue-800 border-blue-200',
        en_cours: 'bg-orange-100 text-orange-800 border-orange-200',
        resolue: 'bg-green-100 text-green-800 border-green-200',
        cloturee: 'bg-gray-100 text-gray-800 border-gray-200'
    },
    urgency: {
        basse: 'bg-green-100 text-green-800 border-green-200',
        moyenne: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        haute: 'bg-red-100 text-red-800 border-red-200'
    },
    state: {
        bon: 'bg-green-100 text-green-800 border-green-200',
        moyen: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        mauvais: 'bg-red-100 text-red-800 border-red-200'
    }
};

const STATUS_LABELS = {
    intervention: {
        planifiee: 'Planifiée',
        en_cours: 'En cours',
        terminee: 'Terminée',
        non_realisee: 'Non réalisée'
    },
    claim: {
        nouvelle: 'Nouvelle',
        assignee: 'Assignée',
        en_cours: 'En cours',
        resolue: 'Résolue',
        cloturee: 'Clôturée'
    },
    urgency: {
        basse: 'Basse',
        moyenne: 'Moyenne',
        haute: 'Haute'
    },
    state: {
        bon: 'Bon',
        moyen: 'Moyen',
        mauvais: 'Mauvais'
    }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type }) => {
    const colorClass = STATUS_COLORS[type][status as keyof typeof STATUS_COLORS[typeof type]] || 'bg-gray-100 text-gray-800 border-gray-200';
    const label = STATUS_LABELS[type][status as keyof typeof STATUS_LABELS[typeof type]] || status;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
            {label}
        </span>
    );
};
