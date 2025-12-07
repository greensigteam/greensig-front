import React, { useState } from 'react';
import { Plus, Filter, AlertCircle } from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { PhotoUpload } from '../components/PhotoUpload';
import {
    MOCK_CLAIMS,
    MOCK_SITES,
    MOCK_TEAMS,
    Claim,
    getSiteById,
    getTeamById
} from '../services/mockData';

// User 6.6.2: Claim Timeline Component
const ClaimTimeline: React.FC<{ claim: Claim }> = ({ claim }) => {
    return (
        <div className="space-y-4">
            {claim.timeline.map((event, index) => (
                <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${index === claim.timeline.length - 1 ? 'bg-emerald-600' : 'bg-gray-300'
                            }`} />
                        {index < claim.timeline.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 mt-1" />
                        )}
                    </div>
                    <div className="flex-1 pb-6">
                        <div className="flex items-center gap-2 mb-1">
                            <StatusBadge status={event.status} type="claim" />
                            <span className="text-xs text-gray-500">
                                {new Date(event.date).toLocaleString('fr-FR')}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600">Par {event.actor}</p>
                        {event.comment && (
                            <p className="text-sm text-gray-700 mt-1">{event.comment}</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

// User 6.6.1: Claim Declaration Form
const ClaimFormModal: React.FC<{
    onClose: () => void;
    onSubmit: (claim: Partial<Claim>) => void;
}> = ({ onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        siteId: '',
        zone: '',
        type: 'qualite' as Claim['type'],
        urgency: 'moyenne' as Claim['urgency'],
        description: '',
        photos: [] as string[]
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full sm:max-w-2xl sm:rounded-xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="sticky top-0 bg-white p-4 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">Nouvelle réclamation</h2>
                    </div>

                    {/* Form */}
                    <div className="p-4 space-y-4">
                        {/* Site */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Site <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={formData.siteId}
                                onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="">Sélectionner un site</option>
                                {MOCK_SITES.map((site) => (
                                    <option key={site.id} value={site.id}>{site.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Zone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Zone <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                value={formData.zone}
                                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Ex: Jardin principal, Allée..."
                            />
                        </div>

                        {/* Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as Claim['type'] })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="qualite">Qualité</option>
                                <option value="securite">Sécurité</option>
                                <option value="esthetique">Esthétique</option>
                                <option value="equipement">Équipement</option>
                            </select>
                        </div>

                        {/* Urgency */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Urgence <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-3">
                                {(['basse', 'moyenne', 'haute'] as const).map((level) => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, urgency: level })}
                                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${formData.urgency === level
                                                ? 'border-emerald-600 bg-emerald-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <StatusBadge status={level} type="urgency" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Décrivez le problème constaté..."
                            />
                        </div>

                        {/* Photos */}
                        <PhotoUpload
                            photos={formData.photos}
                            onPhotosChange={(photos) => setFormData({ ...formData, photos })}
                            maxPhotos={5}
                            label="Photos (optionnel)"
                        />
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-white p-4 border-t border-gray-200 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                        >
                            Soumettre
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Main Claims Component
const Claims: React.FC = () => {
    const [claims, setClaims] = useState(MOCK_CLAIMS);
    const [showForm, setShowForm] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
    const [filterStatus, setFilterStatus] = useState<Claim['status'] | 'all'>('all');

    // Filter claims
    const filteredClaims = claims.filter((claim) =>
        filterStatus === 'all' || claim.status === filterStatus
    );

    // User 6.6.1: Create new claim
    const handleCreateClaim = (data: Partial<Claim>) => {
        const newClaim: Claim = {
            id: `claim-${Date.now()}`,
            number: `REC-2024-${String(claims.length + 1).padStart(3, '0')}`,
            clientName: 'Client Mock', // Would come from auth
            siteId: data.siteId!,
            zone: data.zone!,
            type: data.type!,
            urgency: data.urgency!,
            status: 'nouvelle',
            description: data.description!,
            coordinates: { lat: 0, lng: 0 }, // Would come from map
            photos: data.photos || [],
            createdAt: new Date().toISOString(),
            timeline: [
                {
                    date: new Date().toISOString(),
                    status: 'nouvelle',
                    actor: 'Client Mock',
                    comment: 'Réclamation créée'
                }
            ]
        };
        setClaims([...claims, newClaim]);
    };

    // User 6.6.7: Assign team
    const handleAssignTeam = (claimId: string, teamId: string) => {
        setClaims((prev) =>
            prev.map((claim) =>
                claim.id === claimId
                    ? {
                        ...claim,
                        status: 'assignee',
                        assignedTeamId: teamId,
                        timeline: [
                            ...claim.timeline,
                            {
                                date: new Date().toISOString(),
                                status: 'assignee',
                                actor: 'Admin',
                                comment: `Assignée à ${getTeamById(teamId)?.name}`
                            }
                        ]
                    }
                    : claim
            )
        );
    };

    // User 6.6.12: Close claim
    const handleCloseClaim = (claimId: string) => {
        setClaims((prev) =>
            prev.map((claim) =>
                claim.id === claimId
                    ? {
                        ...claim,
                        status: 'cloturee',
                        closedAt: new Date().toISOString(),
                        timeline: [
                            ...claim.timeline,
                            {
                                date: new Date().toISOString(),
                                status: 'cloturee',
                                actor: 'Admin',
                                comment: 'Réclamation clôturée'
                            }
                        ]
                    }
                    : claim
            )
        );
    };

    // Table columns
    const columns: Column<Claim>[] = [
        {
            key: 'number',
            label: 'N°',
            render: (claim) => <span className="font-mono text-sm">{claim.number}</span>
        },
        {
            key: 'createdAt',
            label: 'Date',
            render: (claim) => new Date(claim.createdAt).toLocaleDateString('fr-FR')
        },
        {
            key: 'clientName',
            label: 'Client'
        },
        {
            key: 'siteId',
            label: 'Site',
            render: (claim) => getSiteById(claim.siteId)?.name || '-'
        },
        {
            key: 'type',
            label: 'Type',
            render: (claim) => <span className="capitalize">{claim.type}</span>
        },
        {
            key: 'urgency',
            label: 'Urgence',
            render: (claim) => <StatusBadge status={claim.urgency} type="urgency" />,
            sortable: false
        },
        {
            key: 'status',
            label: 'Statut',
            render: (claim) => <StatusBadge status={claim.status} type="claim" />,
            sortable: false
        },
        {
            key: 'assignedTeamId',
            label: 'Équipe',
            render: (claim) => claim.assignedTeamId ? getTeamById(claim.assignedTeamId)?.name : '-'
        }
    ];

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            {/* Header */}
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Réclamations</h1>
                    <p className="text-gray-500 mt-1">{filteredClaims.length} réclamation{filteredClaims.length > 1 ? 's' : ''}</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Nouvelle
                </button>
            </div>

            {/* Status Filter */}
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                {[
                    { id: 'all', label: 'Toutes' },
                    { id: 'nouvelle', label: 'Nouvelles' },
                    { id: 'assignee', label: 'Assignées' },
                    { id: 'en_cours', label: 'En cours' },
                    { id: 'resolue', label: 'Résolues' },
                    { id: 'cloturee', label: 'Clôturées' }
                ].map((status) => (
                    <button
                        key={status.id}
                        onClick={() => setFilterStatus(status.id as any)}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${filterStatus === status.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {status.label}
                    </button>
                ))}
            </div>

            {/* Claims Table */}
            <div className="flex-1 overflow-hidden">
                <DataTable
                    data={filteredClaims}
                    columns={columns}
                    onRowClick={setSelectedClaim}
                    itemsPerPage={20}
                />
            </div>

            {/* Claim Form Modal */}
            {showForm && (
                <ClaimFormModal
                    onClose={() => setShowForm(false)}
                    onSubmit={handleCreateClaim}
                />
            )}

            {/* Claim Detail Modal */}
            {selectedClaim && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedClaim.number}</h2>
                                    <p className="text-sm text-gray-500 mt-1">{selectedClaim.description}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedClaim(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <StatusBadge status={selectedClaim.status} type="claim" />
                                <StatusBadge status={selectedClaim.urgency} type="urgency" />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-6">
                                {/* Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Site</label>
                                        <p className="mt-1 text-gray-900">{getSiteById(selectedClaim.siteId)?.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Zone</label>
                                        <p className="mt-1 text-gray-900">{selectedClaim.zone}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Type</label>
                                        <p className="mt-1 text-gray-900 capitalize">{selectedClaim.type}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Client</label>
                                        <p className="mt-1 text-gray-900">{selectedClaim.clientName}</p>
                                    </div>
                                </div>

                                {/* Photos */}
                                {selectedClaim.photos.length > 0 && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 mb-2 block">Photos</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {selectedClaim.photos.map((photo, index) => (
                                                <img
                                                    key={index}
                                                    src={photo}
                                                    alt={`Photo ${index + 1}`}
                                                    className="w-full aspect-square object-cover rounded border border-gray-200"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Timeline */}
                                <div>
                                    <label className="text-sm font-medium text-gray-500 mb-4 block">Historique</label>
                                    <ClaimTimeline claim={selectedClaim} />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 border-t border-gray-200 flex gap-3">
                            {selectedClaim.status === 'nouvelle' && (
                                <select
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleAssignTeam(selectedClaim.id, e.target.value);
                                        }
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="">Assigner à une équipe...</option>
                                    {MOCK_TEAMS.map((team) => (
                                        <option key={team.id} value={team.id}>{team.name}</option>
                                    ))}
                                </select>
                            )}
                            {selectedClaim.status === 'resolue' && (
                                <button
                                    onClick={() => handleCloseClaim(selectedClaim.id)}
                                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                                >
                                    Clôturer
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Claims;
