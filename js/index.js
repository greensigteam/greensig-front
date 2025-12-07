// Configuration de base
const mapConfig = {
    center: [-7.0926, 31.7917], // Centre du Maroc (lon, lat)
    zoom: 12,
    minZoom: 2,
    maxZoom: 20
};

// Objet global pour stocker les sources de végétation (pour les dessins)
window.vegetationSources = {};

// Initialisation de la carte
const map = new ol.Map({
    target: 'map',
    layers: [],
    view: new ol.View({
        center: ol.proj.fromLonLat(mapConfig.center),
        zoom: mapConfig.zoom,
        minZoom: mapConfig.minZoom,
        maxZoom: mapConfig.maxZoom
    }),
    controls: ol.control.defaults.defaults().extend([
        new ol.control.ScaleLine(),
        new ol.control.FullScreen(),
        new ol.control.ZoomSlider()
    ])
});

// Étape 4 : Couche OSM
const osmLayer = new ol.layer.Tile({
    source: new ol.source.OSM(),
    visible: true,
    title: 'OpenStreetMap'
});

// Couche satellite Esri World Imagery
const satelliteLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        attributions: 'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer">Esri</a>'
    }),
    visible: false,
    title: 'Satellite'
});

map.addLayer(satelliteLayer);
map.addLayer(osmLayer);

// Styles pour les types de végétation
const vegetationStyles = {
    'Forêt': new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(34, 139, 34, 0.6)' // Vert forêt
        }),
        stroke: new ol.style.Stroke({
            color: '#228B22',
            width: 1
        })
    }),
    'Steppe': new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(210, 180, 140, 0.6)' // Beige
        }),
        stroke: new ol.style.Stroke({
            color: '#D2B48C',
            width: 1
        })
    }),
    'Arbustes': new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(107, 142, 35, 0.6)' // Vert olive
        }),
        stroke: new ol.style.Stroke({
            color: '#6B8E23',
            width: 1
        })
    }),
    'Prairie': new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(152, 251, 152, 0.6)' // Vert pâle
        }),
        stroke: new ol.style.Stroke({
            color: '#98FB98',
            width: 1
        })
    }),
    'Désert': new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(244, 164, 96, 0.6)' // Sable
        }),
        stroke: new ol.style.Stroke({
            color: '#F4A460',
            width: 1
        })
    }),
    'Paramo': new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(176, 224, 230, 0.6)' // Bleu clair
        }),
        stroke: new ol.style.Stroke({
            color: '#B0E0E6',
            width: 1
        })
    }),
    'default': new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(50, 205, 50, 0.4)' // Vert lime
        }),
        stroke: new ol.style.Stroke({
            color: '#32CD32',
            width: 1
        })
    })
};

// Fonction pour obtenir le style selon le type de végétation
function getVegetationStyle(feature) {
    const type = feature.get('type') || feature.get('Type') || feature.get('vegetation');
    return vegetationStyles[type] || vegetationStyles['default'];
}

// Stocker les couches de végétation pour pouvoir les filtrer
const vegetationLayers = {};
let clusterLayer = null;
let allVegetationSource = null;
let clusteringEnabled = false;

// Stocker les configurations de symbologie pour chaque type
const symbologyConfig = {};

// Étape 5 : Charger les fichiers GeoJSON
async function loadGeoJSONLayers() {
    // Liste des fichiers GeoJSON dans votre dossier
    const geojsonFiles = [
        { file: 'geojson_vegetation/annuelle.geojson', type: 'Annuelle', color: 'rgba(255, 182, 193, 0.6)' },
        { file: 'geojson_vegetation/arbres.geojson', type: 'Arbres', color: 'rgba(34, 139, 34, 0.6)' },
        { file: 'geojson_vegetation/arbustes.geojson', type: 'Arbustes', color: 'rgba(107, 142, 35, 0.6)' },
        { file: 'geojson_vegetation/cactus.geojson', type: 'Cactus', color: 'rgba(46, 139, 87, 0.6)' },
        { file: 'geojson_vegetation/gazon.geojson', type: 'Gazon', color: 'rgba(124, 252, 0, 0.6)' },
        { file: 'geojson_vegetation/graminées.geojson', type: 'Graminées', color: 'rgba(173, 216, 230, 0.6)' },
        { file: 'geojson_vegetation/plamier.geojson', type: 'Palmier', color: 'rgba(255, 140, 0, 0.6)' },
        { file: 'geojson_vegetation/vivaces.geojson', type: 'Vivaces', color: 'rgba(147, 112, 219, 0.6)' }
    ];

    let allFeaturesLoaded = 0;
    const allFeatures = []; // Pour stocker toutes les features pour le clustering

    // Charger chaque fichier GeoJSON
    for (const item of geojsonFiles) {
        try {
            const response = await fetch(item.file);
            if (!response.ok) {
                console.warn(`Impossible de charger ${item.file}`);
                continue;
            }

            const geojson = await response.json();
            const format = new ol.format.GeoJSON();
            const features = format.readFeatures(geojson, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            });

            // Ajouter le type et la couleur à chaque feature
            features.forEach(feature => {
                feature.set('type_vegetation', item.type);
                feature.set('vegetation_color', item.color);
            });

            // Ajouter toutes les features au tableau global pour le clustering
            allFeatures.push(...features);

            // Créer une source pour ce type de végétation
            const vegetationSource = new ol.source.Vector({
                features: features
            });

            // Stocker la source globalement pour les dessins
            window.vegetationSources[item.type] = vegetationSource;

            // Créer une couche pour ce type de végétation
            const layer = new ol.layer.Vector({
                source: vegetationSource,
                style: new ol.style.Style({
                    fill: new ol.style.Fill({
                        color: item.color
                    }),
                    stroke: new ol.style.Stroke({
                        color: item.color.replace('0.6', '1'),
                        width: 2
                    })
                }),
                visible: true,
                title: item.type
            });

            map.addLayer(layer);
            vegetationLayers[item.type] = layer; // Stocker la référence de la couche
            allFeaturesLoaded += features.length;
            console.log(`${item.type}: ${features.length} entités chargées`);

        } catch (error) {
            console.error(`Erreur lors du chargement de ${item.file}:`, error);
        }
    }

    console.log(`Total: ${allFeaturesLoaded} entités de végétation chargées`);
    
    // Zoomer automatiquement sur l'étendue des données chargées
    if (allFeatures.length > 0) {
        const extent = new ol.extent.createEmpty();
        allFeatures.forEach(feature => {
            ol.extent.extend(extent, feature.getGeometry().getExtent());
        });
        map.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 12 });
        console.log('Zoom automatique sur les données');
    }
    
    updateLegend(geojsonFiles);
    createVegetationFilter(geojsonFiles); // Créer l'interface de filtrage
    createSymbologyPanel(geojsonFiles); // Créer le panneau de symbologie

    // Créer la couche de clustering
    createClusterLayer(allFeatures);
}

// Créer la couche de clustering
function createClusterLayer(features) {
    console.log('Création du clustering avec', features.length, 'features');

    // Convertir toutes les géométries en points (centroides)
    const pointFeatures = [];

    features.forEach(feature => {
        const geometry = feature.getGeometry();
        if (!geometry) {
            console.warn('Feature sans géométrie ignorée');
            return;
        }

        let centerCoord;

        if (geometry.getType() === 'Point') {
            centerCoord = geometry.getCoordinates();
        } else {
            // Obtenir le centroide pour les polygones et autres géométries
            const extent = geometry.getExtent();
            centerCoord = ol.extent.getCenter(extent);
        }

        // Créer une nouvelle feature avec géométrie Point
        const pointFeature = new ol.Feature({
            geometry: new ol.geom.Point(centerCoord),
            type_vegetation: feature.get('type_vegetation'),
            vegetation_color: feature.get('vegetation_color')
        });

        pointFeatures.push(pointFeature);
    });

    console.log('Features converties en points:', pointFeatures.length);

    // Créer la source vectorielle avec les features converties en points
    allVegetationSource = new ol.source.Vector({
        features: pointFeatures
    });

    // Créer la source de clustering avec ol.source.Cluster
    const clusterSource = new ol.source.Cluster({
        distance: 40, // Distance en pixels pour regrouper les features
        minDistance: 20, // Distance minimale entre les clusters
        source: allVegetationSource
    });

    console.log('Source de clustering créée');

    // Créer la couche de clustering avec un style personnalisé
    clusterLayer = new ol.layer.Vector({
        source: clusterSource,
        style: function(feature) {
            const features = feature.get('features');
            const size = features.length;

            if (size === 1) {
                // Si c'est un seul élément, utiliser le style normal
                const singleFeature = features[0];
                const color = singleFeature.get('vegetation_color') || 'rgba(50, 205, 50, 0.6)';
                return new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 8,
                        fill: new ol.style.Fill({
                            color: color
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#fff',
                            width: 2
                        })
                    })
                });
            } else {
                // Cluster avec plusieurs éléments
                const radius = Math.min(Math.max(10 + size / 5, 15), 40);

                // Compter les types de végétation dans le cluster
                const typeCounts = {};
                features.forEach(f => {
                    const type = f.get('type_vegetation');
                    typeCounts[type] = (typeCounts[type] || 0) + 1;
                });

                // Créer un style de cercle avec le nombre
                return new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: radius,
                        fill: new ol.style.Fill({
                            color: 'rgba(52, 152, 219, 0.7)'
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#fff',
                            width: 3
                        })
                    }),
                    text: new ol.style.Text({
                        text: size.toString(),
                        fill: new ol.style.Fill({
                            color: '#fff'
                        }),
                        font: 'bold 12px Arial',
                        stroke: new ol.style.Stroke({
                            color: '#000',
                            width: 3
                        })
                    })
                });
            }
        },
        visible: false, // Invisible par défaut
        zIndex: 999
    });

    map.addLayer(clusterLayer);
    console.log('✓ Couche de clustering ajoutée à la carte avec', pointFeatures.length, 'points');
}

// Basculer entre vue normale et vue clusterisée
function toggleClustering(enabled) {
    console.log('Toggle clustering:', enabled);
    clusteringEnabled = enabled;

    // Afficher/masquer les couches
    if (enabled) {
        console.log('Activation du clustering');
        // Masquer les couches individuelles
        for (const type in vegetationLayers) {
            vegetationLayers[type].setVisible(false);
        }
        // Afficher la couche de clustering
        if (clusterLayer) {
            clusterLayer.setVisible(true);
            console.log('✓ Couche de clustering visible');
        } else {
            console.error('❌ Couche de clustering non trouvée!');
        }
    } else {
        console.log('Désactivation du clustering');
        // Masquer la couche de clustering
        if (clusterLayer) {
            clusterLayer.setVisible(false);
        }
        // Afficher les couches individuelles
        for (const type in vegetationLayers) {
            vegetationLayers[type].setVisible(true);
        }
        console.log('✓ Couches individuelles affichées');
    }
}

// Mettre à jour la légende
function updateLegend(geojsonFiles) {
    const legendContent = document.getElementById('legendContent');
    let legendHTML = '';

    if (geojsonFiles) {
        geojsonFiles.forEach(item => {
            legendHTML += `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${item.color};"></div>
                    <span>${item.type}</span>
                </div>
            `;
        });
    }

    legendContent.innerHTML = legendHTML;
}

// Créer l'interface de filtrage par type de végétation
function createVegetationFilter(geojsonFiles) {
    const container = document.getElementById('vegetationTypes');

    geojsonFiles.forEach(item => {
        const div = document.createElement('div');
        div.className = 'vegetation-type-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `veg_${item.type}`;
        checkbox.checked = true;
        checkbox.addEventListener('change', function() {
            if (vegetationLayers[item.type]) {
                vegetationLayers[item.type].setVisible(this.checked);
            }
        });

        const label = document.createElement('label');
        label.htmlFor = `veg_${item.type}`;
        label.style.marginLeft = '5px';

        const colorBox = document.createElement('span');
        colorBox.className = 'filter-color-box';
        colorBox.style.backgroundColor = item.color;

        label.appendChild(colorBox);
        label.appendChild(document.createTextNode(item.type));

        div.appendChild(checkbox);
        div.appendChild(label);
        container.appendChild(div);
    });

    // Bouton "Tout sélectionner"
    document.getElementById('selectAll').addEventListener('click', function() {
        geojsonFiles.forEach(item => {
            const checkbox = document.getElementById(`veg_${item.type}`);
            if (checkbox) {
                checkbox.checked = true;
                if (vegetationLayers[item.type]) {
                    vegetationLayers[item.type].setVisible(true);
                }
            }
        });
    });

    // Bouton "Tout désélectionner"
    document.getElementById('deselectAll').addEventListener('click', function() {
        geojsonFiles.forEach(item => {
            const checkbox = document.getElementById(`veg_${item.type}`);
            if (checkbox) {
                checkbox.checked = false;
                if (vegetationLayers[item.type]) {
                    vegetationLayers[item.type].setVisible(false);
                }
            }
        });
    });
}

// La gestion des popups est maintenant dans infobulles.js

// Contrôles interactifs
document.getElementById('resetView').addEventListener('click', function() {
    map.getView().setCenter(ol.proj.fromLonLat(mapConfig.center));
    map.getView().setZoom(mapConfig.zoom);
});

// Basculer entre OSM et Satellite
document.getElementById('baseMapOSM').addEventListener('change', function(e) {
    if (e.target.checked) {
        osmLayer.setVisible(true);
        satelliteLayer.setVisible(false);
        console.log('Basculé vers OpenStreetMap');
    }
});

document.getElementById('baseMapSatellite').addEventListener('change', function(e) {
    if (e.target.checked) {
        osmLayer.setVisible(false);
        satelliteLayer.setVisible(true);
        console.log('Basculé vers Satellite');
    }
});

document.getElementById('vegetationLayer').addEventListener('change', function(e) {
    if (!clusteringEnabled) {
        map.getLayers().forEach(layer => {
            const title = layer.get('title');
            if (title && title !== 'OpenStreetMap' && title !== 'Satellite') {
                layer.setVisible(e.target.checked);
            }
        });
    }
});

// Gestionnaire pour le toggle du clustering
document.getElementById('clusteringToggle').addEventListener('change', function(e) {
    toggleClustering(e.target.checked);
});

// Gestion des onglets du panneau gauche
document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const panelName = this.getAttribute('data-panel');

        // Retirer la classe active de tous les onglets et panneaux
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));

        // Ajouter la classe active à l'onglet cliqué
        this.classList.add('active');

        // Afficher le bon panneau
        if (panelName === 'filter') {
            document.getElementById('filterPanel').classList.add('active');
        } else if (panelName === 'symbology') {
            document.getElementById('symbologyPanelContent').classList.add('active');
        } else if (panelName === 'drawing') {
            document.getElementById('drawingPanel').classList.add('active');
        }
    });
});

// Fonction pour créer le panneau de symbologie
function createSymbologyPanel(geojsonFiles) {
    const container = document.getElementById('symbologyContent');
    
    geojsonFiles.forEach(item => {
        // Initialiser la configuration de symbologie pour ce type
        symbologyConfig[item.type] = {
            fillColor: item.color,
            strokeColor: item.color.replace('0.6', '1'),
            strokeWidth: 2,
            fillOpacity: 0.6
        };

        const itemDiv = document.createElement('div');
        itemDiv.className = 'symbology-item collapsed'; // Commencer en mode réduit

        // Header avec prévisualisation de la couleur
        const header = document.createElement('div');
        header.className = 'symbology-item-header';
        header.style.cursor = 'pointer';

        const colorPreview = document.createElement('div');
        colorPreview.className = 'symbology-color-preview';
        colorPreview.id = `preview_${item.type}`;
        colorPreview.style.backgroundColor = item.color;

        const title = document.createElement('span');
        title.textContent = item.type;
        title.style.flex = '1';

        // Icône de toggle
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'symbology-toggle-icon';
        toggleIcon.textContent = '▼';

        header.appendChild(colorPreview);
        header.appendChild(title);
        header.appendChild(toggleIcon);

        // Contrôles
        const controls = document.createElement('div');
        controls.className = 'symbology-controls'; // Commencer en mode réduit
        controls.id = `controls_${item.type}`;

        // Toggle collapse/expand
        header.addEventListener('click', function() {
            const isExpanded = controls.classList.contains('expanded');
            if (isExpanded) {
                // Réduire
                controls.classList.remove('expanded');
                toggleIcon.classList.remove('rotated');
                itemDiv.classList.remove('expanded');
                itemDiv.classList.add('collapsed');
            } else {
                // Agrandir
                controls.classList.add('expanded');
                toggleIcon.classList.add('rotated');
                itemDiv.classList.remove('collapsed');
                itemDiv.classList.add('expanded');
            }
        });
        
        // Couleur de remplissage
        const fillGroup = document.createElement('div');
        fillGroup.className = 'symbology-control-group';
        fillGroup.innerHTML = `<label>Couleur de remplissage</label>`;
        
        const fillRow = document.createElement('div');
        fillRow.className = 'symbology-control-row';
        
        const fillColorInput = document.createElement('input');
        fillColorInput.type = 'color';
        fillColorInput.value = rgbaToHex(item.color);
        fillColorInput.id = `fill_${item.type}`;
        fillColorInput.addEventListener('change', function() {
            updateLayerStyle(item.type);
        });
        
        fillRow.appendChild(fillColorInput);
        fillGroup.appendChild(fillRow);
        
        // Opacité de remplissage
        const opacityGroup = document.createElement('div');
        opacityGroup.className = 'symbology-control-group';
        opacityGroup.innerHTML = `<label>Opacité (%)</label>`;
        
        const opacityRow = document.createElement('div');
        opacityRow.className = 'symbology-control-row';
        
        const opacityInput = document.createElement('input');
        opacityInput.type = 'range';
        opacityInput.min = '0';
        opacityInput.max = '100';
        opacityInput.value = '60';
        opacityInput.id = `opacity_${item.type}`;
        
        const opacityValue = document.createElement('span');
        opacityValue.textContent = '60%';
        opacityValue.id = `opacity_value_${item.type}`;
        
        opacityInput.addEventListener('input', function() {
            opacityValue.textContent = this.value + '%';
            updateLayerStyle(item.type);
        });
        
        opacityRow.appendChild(opacityInput);
        opacityRow.appendChild(opacityValue);
        opacityGroup.appendChild(opacityRow);
        
        // Couleur de bordure
        const strokeGroup = document.createElement('div');
        strokeGroup.className = 'symbology-control-group';
        strokeGroup.innerHTML = `<label>Couleur de bordure</label>`;
        
        const strokeRow = document.createElement('div');
        strokeRow.className = 'symbology-control-row';
        
        const strokeColorInput = document.createElement('input');
        strokeColorInput.type = 'color';
        strokeColorInput.value = rgbaToHex(item.color);
        strokeColorInput.id = `stroke_${item.type}`;
        strokeColorInput.addEventListener('change', function() {
            updateLayerStyle(item.type);
        });
        
        strokeRow.appendChild(strokeColorInput);
        strokeGroup.appendChild(strokeRow);
        
        // Épaisseur de bordure
        const widthGroup = document.createElement('div');
        widthGroup.className = 'symbology-control-group';
        widthGroup.innerHTML = `<label>Épaisseur de bordure (px)</label>`;
        
        const widthRow = document.createElement('div');
        widthRow.className = 'symbology-control-row';
        
        const widthInput = document.createElement('input');
        widthInput.type = 'range';
        widthInput.min = '1';
        widthInput.max = '10';
        widthInput.value = '2';
        widthInput.id = `width_${item.type}`;
        
        const widthValue = document.createElement('span');
        widthValue.textContent = '2px';
        widthValue.id = `width_value_${item.type}`;
        
        widthInput.addEventListener('input', function() {
            widthValue.textContent = this.value + 'px';
            updateLayerStyle(item.type);
        });
        
        widthRow.appendChild(widthInput);
        widthRow.appendChild(widthValue);
        widthGroup.appendChild(widthRow);
        
        // Bouton de réinitialisation
        const resetBtn = document.createElement('button');
        resetBtn.className = 'symbology-reset-btn';
        resetBtn.textContent = '↺ Réinitialiser';
        resetBtn.addEventListener('click', function() {
            resetLayerStyle(item.type, item.color);
        });
        
        // Assembler les contrôles
        controls.appendChild(fillGroup);
        controls.appendChild(opacityGroup);
        controls.appendChild(strokeGroup);
        controls.appendChild(widthGroup);
        controls.appendChild(resetBtn);
        
        itemDiv.appendChild(header);
        itemDiv.appendChild(controls);
        container.appendChild(itemDiv);
    });
}

// Fonction pour convertir rgba en hex
function rgbaToHex(rgba) {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return '#000000';
    
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// Fonction pour mettre à jour le style d'une couche
function updateLayerStyle(type) {
    const layer = vegetationLayers[type];
    if (!layer) return;
    
    const fillColor = document.getElementById(`fill_${type}`).value;
    const opacity = document.getElementById(`opacity_${type}`).value / 100;
    const strokeColor = document.getElementById(`stroke_${type}`).value;
    const strokeWidth = parseInt(document.getElementById(`width_${type}`).value);
    
    // Convertir hex en rgba
    const fillRgba = hexToRgba(fillColor, opacity);
    const strokeRgba = hexToRgba(strokeColor, 1);
    
    // Mettre à jour la configuration
    symbologyConfig[type] = {
        fillColor: fillRgba,
        strokeColor: strokeRgba,
        strokeWidth: strokeWidth,
        fillOpacity: opacity
    };
    
    // Appliquer le nouveau style
    const newStyle = new ol.style.Style({
        fill: new ol.style.Fill({
            color: fillRgba
        }),
        stroke: new ol.style.Stroke({
            color: strokeRgba,
            width: strokeWidth
        })
    });
    
    layer.setStyle(newStyle);
    
    // Mettre à jour la prévisualisation
    document.getElementById(`preview_${type}`).style.backgroundColor = fillRgba;
    
    // Mettre à jour la légende
    const legendItems = document.querySelectorAll('.legend-item');
    legendItems.forEach(item => {
        if (item.textContent.trim() === type) {
            const colorBox = item.querySelector('.legend-color');
            if (colorBox) {
                colorBox.style.backgroundColor = fillRgba;
            }
        }
    });
}

// Fonction pour réinitialiser le style d'une couche
function resetLayerStyle(type, defaultColor) {
    document.getElementById(`fill_${type}`).value = rgbaToHex(defaultColor);
    document.getElementById(`opacity_${type}`).value = 60;
    document.getElementById(`opacity_value_${type}`).textContent = '60%';
    document.getElementById(`stroke_${type}`).value = rgbaToHex(defaultColor);
    document.getElementById(`width_${type}`).value = 2;
    document.getElementById(`width_value_${type}`).textContent = '2px';
    
    updateLayerStyle(type);
}

// Fonction pour convertir hex en rgba
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Charger les couches au démarrage
loadGeoJSONLayers();

// Initialiser les modules après le chargement de la carte
window.addEventListener('load', function() {
    initDrawingTools(map);
    initInfoBulles(map);
    setupDrawingEventListeners();
    setupLegendToggle();
    setupLeftPanelToggle();
});

// Configuration des event listeners pour les outils de dessin
function setupDrawingEventListeners() {
    // Boutons de dessin
    const drawToolButtons = document.querySelectorAll('.draw-tool-btn');
    drawToolButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tool = this.getAttribute('data-tool');

            // Retirer la classe active de tous les boutons
            drawToolButtons.forEach(b => b.classList.remove('active'));

            // Ajouter la classe active au bouton cliqué
            this.classList.add('active');

            // Activer le dessin
            activateDrawing(map, tool);
        });
    });

    // Bouton arrêter
    document.getElementById('stopDrawing').addEventListener('click', function() {
        deactivateDrawing(map);
        deactivateModify(map);
        drawToolButtons.forEach(b => b.classList.remove('active'));
        console.log('Dessin arrêté');
    });

    // Bouton modifier
    document.getElementById('modifyDrawing').addEventListener('click', function() {
        deactivateDrawing(map);
        activateModify(map);
        drawToolButtons.forEach(b => b.classList.remove('active'));
    });

    // Bouton supprimer le dernier
    document.getElementById('deleteLastDrawing').addEventListener('click', function() {
        if (confirm('Supprimer le dernier dessin ?')) {
            deleteLastDrawing();
        }
    });

    // Bouton tout effacer
    document.getElementById('clearAllDrawings').addEventListener('click', function() {
        if (confirm('Supprimer tous les dessins ?')) {
            clearDrawings(map);
        }
    });

    // Bouton sauvegarder dans végétation
    document.getElementById('saveToVegetation').addEventListener('click', function() {
        saveDrawingsToVegetation();
    });

    // Bouton exporter la couche
    document.getElementById('exportVegetationLayer').addEventListener('click', function() {
        exportVegetationLayer();
    });

    // Changement de couleur
    document.getElementById('drawingColor').addEventListener('change', function(e) {
        changeDrawingColor(e.target.value);
    });

    console.log('✓ Event listeners des outils de dessin configurés');
}

// Configuration du toggle pour la légende
function setupLegendToggle() {
    const legendTitle = document.getElementById('legendTitle');
    const legendContent = document.getElementById('legendContent');
    const toggleIcon = document.querySelector('.legend-toggle-icon');

    if (legendTitle && legendContent && toggleIcon) {
        legendTitle.addEventListener('click', function() {
            const isExpanded = legendContent.classList.contains('expanded');
            if (isExpanded) {
                // Réduire
                legendContent.classList.remove('expanded');
                toggleIcon.classList.remove('rotated');
            } else {
                // Agrandir
                legendContent.classList.add('expanded');
                toggleIcon.classList.add('rotated');
            }
        });

        console.log('✓ Toggle de la légende configuré');
    }
}

// Configuration du toggle pour le panneau gauche
function setupLeftPanelToggle() {
    const leftPanel = document.getElementById('leftPanel');
    const toggleBtn = document.getElementById('panelToggleBtn');

    if (leftPanel && toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            leftPanel.classList.toggle('collapsed');
            console.log('Panneau gauche toggled');
        });

        console.log('✓ Toggle du panneau gauche configuré');
    }
}

// Redimensionner la carte quand la fenêtre change de taille
window.addEventListener('resize', function() {
    map.updateSize();
});