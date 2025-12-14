import React, { useState } from 'react';
import { Package, Calendar, FileText, MessageSquare } from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import {
    MOCK_INVENTORY,
    MOCK_INTERVENTIONS,
    MOCK_CLAIMS,
    MOCK_SITES,
    InventoryItem,
    Intervention,
    Claim,
    getSiteById
} from '../services/mockData';

interface ClientPortalProps {
    user: { name: string; email: string };
    forcedTab?: 'inventory' | 'planning' | 'interventions' | 'claims';
}

// User 7.7.1: Client Portal - Read-only views
const ClientPortal: React.FC<ClientPortalProps> = ({ user, forcedTab }) => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'planning' | 'interventions' | 'claims'>(forcedTab || 'inventory');

    // Si forcedTab change, synchroniser l'onglet actif
    React.useEffect(() => {
        if (forcedTab && forcedTab !== activeTab) {
            setActiveTab(forcedTab);
        }
    }, [forcedTab]);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    // Mock client data - in real app, filter by client ID
    const clientSites = MOCK_SITES.filter(site => site.client === 'M. Ahmed Benali' || user.name.includes('Ahmed'));
    const clientSiteIds = clientSites.length > 0 ? clientSites.map(s => s.id) : MOCK_SITES.map(s => s.id); // Fallback for demo

    // User 7.7.3: Client inventory (read-only)
    const clientInventory = MOCK_INVENTORY.filter(item => clientSiteIds.includes(item.siteId));

    // User 7.7.5: Client planning (read-only)
    const clientInterventions = MOCK_INTERVENTIONS.filter(int => clientSiteIds.includes(int.siteId));

    // User 7.7.6: Client completed interventions
    const completedInterventions = clientInterventions.filter(int => int.status === 'terminee');

    // User 7.7.8: Client claims
    const clientClaims = MOCK_CLAIMS.filter(claim => clientSiteIds.includes(claim.siteId));

    // Inventory columns (User 7.7.3)
    const inventoryColumns: Column<InventoryItem>[] = [
        {
            key: 'type',
            label: 'Type',
            render: (item) => <span className="capitalize">{item.type}</span>
        },
        {
            key: 'code',
            label: 'Code',
            render: (item) => <span className="font-mono text-sm">{item.code}</span>
        },
        {
            key: 'name',
            label: 'Nom'
        },
        {
            key: 'siteId',
            label: 'Site',
            render: (item) => getSiteById(item.siteId)?.name || '-'
        },
        {
            key: 'zone',
            label: 'Zone'
        },
        {
            key: 'state',
            label: 'État',
            render: (item) => <StatusBadge status={item.state} type="state" />,
            sortable: false
        }
    ];

    // Planning columns (User 7.7.5)
    const planningColumns: Column<Intervention>[] = [
        {
            key: 'scheduledDate',
            label: 'Date',
            render: (int) => new Date(int.scheduledDate).toLocaleDateString('fr-FR')
        },
        {
            key: 'title',
            label: 'Intervention'
        },
        {
            key: 'type',
            label: 'Type',
            render: (int) => <span className="capitalize">{int.type}</span>
        },
        {
            key: 'siteId',
            label: 'Site',
            render: (int) => getSiteById(int.siteId)?.name || '-'
        },
        {
            key: 'zone',
            label: 'Zone'
        },
        {
            key: 'status',
            label: 'Statut',
            render: (int) => <StatusBadge status={int.status} type="intervention" />,
            sortable: false
        }
    ];

    // Claims columns (User 7.7.8)
    const claimsColumns: Column<Claim>[] = [
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
        }
    ];

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full flex flex-col">
                {/* Tabs */}
                <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                    {[
                        { id: 'inventory', label: 'Inventaire', icon: Package, count: clientInventory.length },
                        { id: 'planning', label: 'Planning', icon: Calendar, count: clientInterventions.length },
                        { id: 'interventions', label: 'Interventions', icon: FileText, count: completedInterventions.length },
                        { id: 'claims', label: 'Réclamations', icon: MessageSquare, count: clientClaims.length }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200'
                                }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    {activeTab === 'inventory' && (
                        <div className="flex-1 flex flex-col p-4">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Inventaire de mes sites</h2>
                                <p className="text-sm text-gray-500">Vue lecture seule (User 7.7.3)</p>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <DataTable
                                    data={clientInventory}
                                    columns={inventoryColumns}
                                    onRowClick={setSelectedItem}
                                    itemsPerPage={20}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'planning' && (
                        <div className="flex-1 flex flex-col p-4">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Planning des interventions</h2>
                                <p className="text-sm text-gray-500">Interventions prévues (User 7.7.5)</p>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <DataTable
                                    data={clientInterventions}
                                    columns={planningColumns}
                                    onRowClick={setSelectedItem}
                                    itemsPerPage={20}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'interventions' && (
                        <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Interventions réalisées</h2>
                                <p className="text-sm text-gray-500">Historique avec photos (User 7.7.6)</p>
                            </div>
                            <div className="space-y-4">
                                {completedInterventions.map((int) => (
                                    <div key={int.id} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{int.title}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {new Date(int.scheduledDate).toLocaleDateString('fr-FR')} • {getSiteById(int.siteId)?.name}
                                                </p>
                                            </div>
                                            <StatusBadge status={int.status} type="intervention" />
                                        </div>

                                        {/* Photos */}
                                        {(int.photosBefore.length > 0 || int.photosAfter.length > 0) && (
                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                {int.photosBefore.length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500 mb-2">Avant</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {int.photosBefore.map((photo, idx) => (
                                                                <img
                                                                    key={idx}
                                                                    src={photo}
                                                                    alt={`Avant ${idx + 1}`}
                                                                    className="w-full aspect-square object-cover rounded border border-gray-200"
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {int.photosAfter.length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500 mb-2">Après</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {int.photosAfter.map((photo, idx) => (
                                                                <img
                                                                    key={idx}
                                                                    src={photo}
                                                                    alt={`Après ${idx + 1}`}
                                                                    className="w-full aspect-square object-cover rounded border border-gray-200"
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {int.comments && (
                                            <div className="mt-3 p-3 bg-gray-50 rounded">
                                                <p className="text-sm text-gray-700">{int.comments}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {completedInterventions.length === 0 && (
                                    <div className="text-center py-12 text-gray-500">
                                        Aucune intervention réalisée
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'claims' && (
                        <div className="flex-1 flex flex-col p-4">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Mes réclamations</h2>
                                <p className="text-sm text-gray-500">Suivi en temps réel (User 7.7.8)</p>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <DataTable
                                    data={clientClaims}
                                    columns={claimsColumns}
                                    onRowClick={setSelectedItem}
                                    itemsPerPage={20}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientPortal;
