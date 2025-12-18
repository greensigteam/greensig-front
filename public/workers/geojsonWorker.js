/**
 * GeoJSON Parsing Worker
 * Déporte le parsing CPU-intensif des gros GeoJSON hors du thread principal.
 */

self.onmessage = (e) => {
    const { data, task } = e.data;

    if (task === 'parse_geojson') {
        try {
            // Si la donnée est déjà un objet, on la traite
            // Sinon on fait le JSON.parse
            const collection = typeof data === 'string' ? JSON.parse(data) : data;

            if (!collection || !collection.features) {
                self.postMessage({ error: 'Format GeoJSON invalide : features manquantes' });
                return;
            }

            // On pré-groupe par type d'objet pour accélérer le rendu OpenLayers
            const grouped = {};
            const stats = {
                total: collection.features.length,
                types: {}
            };

            collection.features.forEach(feature => {
                const type = feature.properties?.object_type || 'Unknown';
                if (!grouped[type]) {
                    grouped[type] = [];
                    stats.types[type] = 0;
                }
                grouped[type].push(feature);
                stats.types[type]++;
            });

            self.postMessage({
                success: true,
                features: collection.features,
                grouped,
                stats
            });
        } catch (err) {
            self.postMessage({ error: 'Erreur de parsing GeoJSON: ' + err.message });
        }
    }
};
