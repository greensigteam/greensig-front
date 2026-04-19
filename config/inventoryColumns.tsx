import { Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import type { InventoryItem } from '../types/inventory';

interface SiteLookup {
  id: string;
  name: string;
}

function baseColumns(sites: SiteLookup[], nameLabel = 'Nom'): Column<InventoryItem>[] {
  return [
    { key: 'name', label: nameLabel },
    {
      key: 'siteId',
      label: 'Site',
      render: (item) => sites.find((s) => s.id === item.siteId)?.name || item.siteId || '-',
    },
    {
      key: 'type',
      label: 'Type',
      render: (item) => <span className="capitalize">{item.type}</span>,
    },
    {
      key: 'state',
      label: 'État',
      render: (item) => <StatusBadge status={item.state} type="state" />,
      sortable: false,
    },
  ];
}

const familyCol: Column<InventoryItem> = {
  key: 'species',
  label: 'Famille',
  render: (item) => item.species || '-',
};
const heightCol: Column<InventoryItem> = {
  key: 'height',
  label: 'Taille',
  render: (item) => item.height || '-',
};
const lastInterventionCol: Column<InventoryItem> = {
  key: 'lastIntervention',
  label: 'Dernière intervention',
  render: (item) =>
    item.lastIntervention ? new Date(item.lastIntervention).toLocaleDateString('fr-FR') : '-',
};
const surfaceCol: Column<InventoryItem> = {
  key: 'surface',
  label: 'Surface (m²)',
  render: (item) =>
    item.surface
      ? Number(item.surface).toLocaleString('fr-FR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '-',
};
const densityCol: Column<InventoryItem> = {
  key: 'diameter',
  label: 'Densité',
  render: (item) => (item.diameter != null ? item.diameter : '-'),
};
const diameterCol: Column<InventoryItem> = {
  key: 'diameter',
  label: 'Diamètre (cm)',
  render: (item) => item.diameter || '-',
};
const depthCol: Column<InventoryItem> = {
  key: 'height',
  label: 'Profondeur (m)',
  render: (item) => item.height || '-',
};

export function buildCommonColumns(sites: SiteLookup[]): Column<InventoryItem>[] {
  return baseColumns(sites);
}

export function buildTypeSpecificColumns(
  sites: SiteLookup[],
): Record<string, Column<InventoryItem>[]> {
  const base = (nameLabel?: string) => baseColumns(sites, nameLabel);

  return {
    Arbre: [...base(), familyCol, heightCol, lastInterventionCol],
    Palmier: [...base(), familyCol, heightCol, lastInterventionCol],
    Gazon: [...base(), familyCol, surfaceCol, lastInterventionCol],
    Arbuste: [...base(), familyCol, surfaceCol, densityCol, lastInterventionCol],
    Vivace: [...base(), familyCol, surfaceCol, densityCol, lastInterventionCol],
    Cactus: [...base(), familyCol, surfaceCol, densityCol, lastInterventionCol],
    Graminee: [...base(), familyCol, surfaceCol, densityCol, lastInterventionCol],
    Puit: [...base(), depthCol, diameterCol, lastInterventionCol],
    Pompe: [...base(), diameterCol, lastInterventionCol],
    Vanne: [...base('Marque'), diameterCol],
    Clapet: [...base('Marque'), diameterCol],
    Ballon: [...base('Marque')],
    Canalisation: [...base('Marque'), diameterCol],
    Aspersion: [...base('Marque'), diameterCol],
    Goutte: [
      { key: 'name', label: 'Type' },
      ...baseColumns(sites).slice(1, 2),
      {
        key: 'type',
        label: 'Catégorie',
        render: (item: InventoryItem) => <span className="capitalize">{item.type}</span>,
      },
      ...baseColumns(sites).slice(3),
      diameterCol,
    ],
  };
}

export function getColumnsForType(
  filterType: string,
  sites: SiteLookup[],
): Column<InventoryItem>[] {
  if (filterType !== 'all') {
    const specific = buildTypeSpecificColumns(sites)[filterType];
    if (specific) return specific;
  }
  return buildCommonColumns(sites);
}
