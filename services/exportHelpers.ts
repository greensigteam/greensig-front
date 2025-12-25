// ============================================================================
// EXPORT HELPERS - CSV et Excel pour les Clients
// ============================================================================

import type { Client } from '../types/users';

/**
 * Exporte une liste de clients au format CSV
 * Format UTF-8 avec BOM pour compatibilité Excel
 */
export function exportClientsToCSV(clients: Client[]): void {
    const headers = [
        'ID',
        'Nom Structure',
        'Contact (Nom)',
        'Contact (Prénom)',
        'Email',
        'Téléphone',
        'Adresse',
        'Contact Principal',
        'Email Facturation',
        'Statut',
        'Dernière Connexion'
    ];

    const rows = clients.map(client => [
        client.utilisateur.toString(),
        client.nomStructure,
        client.nom,
        client.prenom,
        client.email,
        client.telephone || '',
        client.adresse || '',
        client.contactPrincipal || '',
        client.emailFacturation || '',
        client.actif ? 'Actif' : 'Inactif',
        client.utilisateurDetail?.derniereConnexion
            ? new Date(client.utilisateurDetail.derniereConnexion).toLocaleDateString('fr-FR')
            : 'Jamais'
    ]);

    // Créer le contenu CSV
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Ajouter BOM UTF-8 pour Excel
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

    // Télécharger
    downloadBlob(blob, `clients_${getTimestamp()}.csv`);
}

/**
 * Exporte une liste de clients au format Excel (HTML table)
 * Format compatible avec Excel via MIME type application/vnd.ms-excel
 */
export function exportClientsToExcel(clients: Client[]): void {
    const tableRows = clients.map(client => `
        <tr>
            <td>${client.utilisateur}</td>
            <td>${escapeHtml(client.nomStructure)}</td>
            <td>${escapeHtml(client.nom)}</td>
            <td>${escapeHtml(client.prenom)}</td>
            <td>${escapeHtml(client.email)}</td>
            <td>${escapeHtml(client.telephone || '')}</td>
            <td>${escapeHtml(client.adresse || '')}</td>
            <td>${escapeHtml(client.contactPrincipal || '')}</td>
            <td>${escapeHtml(client.emailFacturation || '')}</td>
            <td>${client.actif ? 'Actif' : 'Inactif'}</td>
            <td>${
                client.utilisateurDetail?.derniereConnexion
                    ? new Date(client.utilisateurDetail.derniereConnexion).toLocaleDateString('fr-FR')
                    : 'Jamais'
            }</td>
        </tr>
    `).join('');

    const html = `
        <html>
            <head>
                <meta charset="utf-8">
                <style>
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        font-family: Arial, sans-serif;
                        font-size: 12px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                    }
                    th {
                        background-color: #10b981;
                        color: white;
                        font-weight: bold;
                    }
                    tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                </style>
            </head>
            <body>
                <h1>Export Clients - ${new Date().toLocaleDateString('fr-FR')}</h1>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nom Structure</th>
                            <th>Contact (Nom)</th>
                            <th>Contact (Prénom)</th>
                            <th>Email</th>
                            <th>Téléphone</th>
                            <th>Adresse</th>
                            <th>Contact Principal</th>
                            <th>Email Facturation</th>
                            <th>Statut</th>
                            <th>Dernière Connexion</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </body>
        </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    downloadBlob(blob, `clients_${getTimestamp()}.xls`);
}

// ============================================================================
// HELPERS PRIVÉS
// ============================================================================

/**
 * Télécharge un Blob avec un nom de fichier donné
 */
function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Génère un timestamp pour les noms de fichiers
 * Format: YYYYMMDD_HHMMSS
 */
function getTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * Échappe les caractères HTML pour éviter les injections
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
