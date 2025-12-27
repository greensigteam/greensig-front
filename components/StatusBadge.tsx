import React from 'react';
import { Shield, Users, User } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type BadgeSize = 'xs' | 'sm' | 'md';
export type BadgeVariant = 'status' | 'boolean' | 'role' | 'custom';

export interface StatusBadgeProps {
    // Mode compatibilité (ancien API)
    status?: string;
    type?: 'intervention' | 'claim' | 'urgency' | 'state' | 'operateur' | 'equipe' | 'absence' | 'competence' | 'tache' | 'priorite';

    // Nouveau API étendu
    variant?: BadgeVariant;
    value?: string | boolean | number;

    // Pour variant="boolean"
    labels?: { true: string; false: string };

    // Pour variant="custom"
    bg?: string;
    text?: string;
    border?: string;
    children?: React.ReactNode;

    // Options
    size?: BadgeSize;
    className?: string;
}

// ============================================================================
// COLOR MAPPINGS
// ============================================================================

const STATUS_COLORS = {
    // Interventions / Tâches
    intervention: {
        'planifiee': 'bg-blue-100 text-blue-800 border-blue-200',
        'en_cours': 'bg-orange-100 text-orange-800 border-orange-200',
        'terminee': 'bg-green-100 text-green-800 border-green-200',
        'non_realisee': 'bg-gray-100 text-gray-800 border-gray-200',
        'PLANIFIEE': 'bg-blue-100 text-blue-800 border-blue-200',
        'EN_COURS': 'bg-orange-100 text-orange-800 border-orange-200',
        'TERMINEE': 'bg-green-100 text-green-800 border-green-200',
        'NON_REALISEE': 'bg-gray-100 text-gray-800 border-gray-200',
        'A_FAIRE': 'bg-blue-100 text-blue-800 border-blue-200',
        'TERMINE': 'bg-green-100 text-green-800 border-green-200',
    },

    tache: {
        'A_FAIRE': 'bg-blue-100 text-blue-800 border-blue-200',
        'EN_COURS': 'bg-orange-100 text-orange-800 border-orange-200',
        'TERMINEE': 'bg-green-100 text-green-800 border-green-200',
        'ANNULEE': 'bg-red-100 text-red-800 border-red-200',
    },

    // Claims / Réclamations
    claim: {
        'nouvelle': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'assignee': 'bg-blue-100 text-blue-800 border-blue-200',
        'en_cours': 'bg-orange-100 text-orange-800 border-orange-200',
        'resolue': 'bg-green-100 text-green-800 border-green-200',
        'cloturee': 'bg-gray-100 text-gray-800 border-gray-200',
        'NOUVELLE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'PRISE_EN_COMPTE': 'bg-blue-100 text-blue-800 border-blue-200',
        'EN_COURS': 'bg-orange-100 text-orange-800 border-orange-200',
        'RESOLUE': 'bg-green-100 text-green-800 border-green-200',
        'CLOTUREE': 'bg-gray-100 text-gray-800 border-gray-200',
        'REJETEE': 'bg-red-100 text-red-800 border-red-200',
    },

    // Urgence / Priorité
    urgency: {
        'basse': 'bg-green-100 text-green-800 border-green-200',
        'moyenne': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'haute': 'bg-orange-100 text-orange-800 border-orange-200',
        'FAIBLE': 'bg-green-100 text-green-800 border-green-200',
        'MOYENNE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'HAUTE': 'bg-orange-100 text-orange-800 border-orange-200',
        'CRITIQUE': 'bg-red-100 text-red-800 border-red-200',
    },

    priorite: {
        'FAIBLE': 'bg-green-100 text-green-800 border-green-200',
        'MOYENNE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'HAUTE': 'bg-orange-100 text-orange-800 border-orange-200',
        'CRITIQUE': 'bg-red-100 text-red-800 border-red-200',
    },

    // État
    state: {
        'bon': 'bg-green-100 text-green-800 border-green-200',
        'moyen': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'mauvais': 'bg-red-100 text-red-800 border-red-200',
        'critique': 'bg-red-100 text-red-800 border-red-200',
    },

    // Statut Opérateur (Teams.tsx)
    operateur: {
        'DISPONIBLE': 'bg-green-100 text-green-800 border-green-200',
        'OCCUPE': 'bg-orange-100 text-orange-800 border-orange-200',
        'ABSENT': 'bg-gray-100 text-gray-800 border-gray-200',
        'EN_CONGE': 'bg-blue-100 text-blue-800 border-blue-200',
        'MALADIE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },

    // Statut Équipe (Teams.tsx)
    equipe: {
        'ACTIVE': 'bg-green-100 text-green-800 border-green-200',
        'INACTIVE': 'bg-gray-100 text-gray-800 border-gray-200',
        'EN_MISSION': 'bg-blue-100 text-blue-800 border-blue-200',
    },

    // Type d'absence (Teams.tsx)
    absence: {
        'CONGE': 'bg-blue-100 text-blue-800 border-blue-200',
        'MALADIE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'FORMATION': 'bg-purple-100 text-purple-800 border-purple-200',
        'AUTRE': 'bg-gray-100 text-gray-800 border-gray-200',
    },

    // Niveau de compétence (Teams.tsx)
    competence: {
        'DEBUTANT': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'INTERMEDIAIRE': 'bg-blue-100 text-blue-800 border-blue-200',
        'AVANCE': 'bg-purple-100 text-purple-800 border-purple-200',
        'EXPERT': 'bg-green-100 text-green-800 border-green-200',
    },
} as const;

const STATUS_LABELS = {
    intervention: {
        'planifiee': 'Planifiée',
        'en_cours': 'En cours',
        'terminee': 'Terminée',
        'non_realisee': 'Non réalisée',
        'PLANIFIEE': 'Planifiée',
        'EN_COURS': 'En cours',
        'TERMINEE': 'Terminée',
        'NON_REALISEE': 'Non réalisée',
        'A_FAIRE': 'À faire',
        'TERMINE': 'Terminé',
    },
    tache: {
        'A_FAIRE': 'À faire',
        'EN_COURS': 'En cours',
        'TERMINEE': 'Terminée',
        'ANNULEE': 'Annulée',
    },
    claim: {
        'nouvelle': 'Nouvelle',
        'assignee': 'Assignée',
        'en_cours': 'En cours',
        'resolue': 'Résolue',
        'cloturee': 'Clôturée',
        'NOUVELLE': 'Nouvelle',
        'PRISE_EN_COMPTE': 'Prise en compte',
        'EN_COURS': 'En cours',
        'RESOLUE': 'Résolue',
        'CLOTUREE': 'Clôturée',
        'REJETEE': 'Rejetée',
    },
    urgency: {
        'basse': 'Basse',
        'moyenne': 'Moyenne',
        'haute': 'Haute',
        'FAIBLE': 'Faible',
        'MOYENNE': 'Moyenne',
        'HAUTE': 'Haute',
        'CRITIQUE': 'Critique',
    },
    priorite: {
        'FAIBLE': 'Faible',
        'MOYENNE': 'Moyenne',
        'HAUTE': 'Haute',
        'CRITIQUE': 'Critique',
    },
    state: {
        'bon': 'Bon',
        'moyen': 'Moyen',
        'mauvais': 'Mauvais',
        'critique': 'Critique',
    },
    operateur: {
        'DISPONIBLE': 'Disponible',
        'OCCUPE': 'Occupé',
        'ABSENT': 'Absent',
        'EN_CONGE': 'En congé',
        'MALADIE': 'Maladie',
    },
    equipe: {
        'ACTIVE': 'Active',
        'INACTIVE': 'Inactive',
        'EN_MISSION': 'En mission',
    },
    absence: {
        'CONGE': 'Congé',
        'MALADIE': 'Maladie',
        'FORMATION': 'Formation',
        'AUTRE': 'Autre',
    },
    competence: {
        'DEBUTANT': 'Débutant',
        'INTERMEDIAIRE': 'Intermédiaire',
        'AVANCE': 'Avancé',
        'EXPERT': 'Expert',
    },
} as const;

// ============================================================================
// SIZE CLASSES
// ============================================================================

const SIZE_CLASSES = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
};

// ============================================================================
// COMPONENT
// ============================================================================

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    type,
    variant,
    value,
    labels,
    bg,
    text,
    border,
    children,
    size = 'sm',
    className = '',
}) => {
    let colorClass = '';
    let label = '';
    let icon: React.ReactNode = null;

    // Mode compatibilité : si status et type sont fournis (ancien API)
    if (status && type && !variant) {
        const statusType = STATUS_COLORS[type];
        const labelType = STATUS_LABELS[type];

        if (statusType && labelType) {
            colorClass = (statusType as any)[status] || 'bg-gray-100 text-gray-800 border-gray-200';
            label = (labelType as any)[status] || status;
        } else {
            colorClass = 'bg-gray-100 text-gray-800 border-gray-200';
            label = status;
        }
    }
    // Nouveau mode avec variant
    else if (variant) {
        switch (variant) {
            case 'status': {
                if (!type || typeof value !== 'string') {
                    colorClass = 'bg-gray-100 text-gray-800 border-gray-200';
                    label = 'N/A';
                    break;
                }

                const statusType = STATUS_COLORS[type];
                const labelType = STATUS_LABELS[type];

                if (statusType && labelType) {
                    colorClass = (statusType as any)[value] || 'bg-gray-100 text-gray-800 border-gray-200';
                    label = (labelType as any)[value] || value;
                } else {
                    colorClass = 'bg-gray-100 text-gray-800 border-gray-200';
                    label = value;
                }
                break;
            }

            case 'boolean': {
                const boolValue = Boolean(value);
                colorClass = boolValue
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-gray-100 text-gray-800 border-gray-200';

                if (labels) {
                    label = boolValue ? labels.true : labels.false;
                } else {
                    label = boolValue ? 'Oui' : 'Non';
                }
                break;
            }

            case 'role': {
                const roleColors: Record<string, string> = {
                    'ADMIN': 'bg-purple-100 text-purple-800 border-purple-200',
                    'SUPERVISEUR': 'bg-blue-100 text-blue-800 border-blue-200',
                    'CLIENT': 'bg-orange-100 text-orange-800 border-orange-200',
                };

                const roleIcons: Record<string, React.ReactNode> = {
                    'ADMIN': <Shield className="w-3 h-3" />,
                    'SUPERVISEUR': <Users className="w-3 h-3" />,
                    'CLIENT': <User className="w-3 h-3" />,
                };

                const roleValue = String(value || '').toUpperCase();
                colorClass = roleColors[roleValue] || 'bg-gray-100 text-gray-800 border-gray-200';
                icon = roleIcons[roleValue] || null;
                label = String(value || 'N/A');
                break;
            }

            case 'custom': {
                colorClass = `${bg || 'bg-gray-100'} ${text || 'text-gray-800'} ${border || 'border-gray-200'}`;
                label = children ? '' : String(value || '');
                break;
            }
        }
    }
    // Fallback si aucune configuration valide
    else {
        colorClass = 'bg-gray-100 text-gray-800 border-gray-200';
        label = String(value || status || 'N/A');
    }

    const sizeClass = SIZE_CLASSES[size];

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${sizeClass} ${colorClass} ${className}`}>
            {icon}
            {children || label}
        </span>
    );
};
