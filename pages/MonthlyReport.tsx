// pages/MonthlyReport.tsx
// Page de génération du rapport de site - Version améliorée

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileText,
  Download,
  Calendar,
  MapPin,
  Loader2,
  CheckCircle2,
  Users,
  ClipboardList,
  Camera,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  UserCheck,
  TrendingUp,
  Clock,
  CalendarDays
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { fetchMonthlyReport } from '../services/reportsApi';
import { fetchSites, apiFetch } from '../services/api';
import { renderSitePolygonMap, renderMultiSitePolygonMap, loadStaticAsset } from '../services/pdfGenerator';
import type { MonthlyReportData, MonthlyReportOptions } from '../types/reports';

// Extend jsPDF types for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

// URL du backend pour les images (media files)
const getBackendUrl = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
  // Si l'API est /api, on utilise la même origine
  if (apiUrl === '/api' || apiUrl === '') {
    return window.location.origin;
  }
  // Sinon on extrait le host de l'URL de l'API
  return apiUrl.replace('/api', '');
};

// ===== KPI Table Helpers =====
const KPI_LABELS: Record<string, string> = {
  respect_planning: 'Respect du planning',
  qualite_service: 'Qualité de service',
  taux_realisation_reclamations: 'Taux de réalisation réclamations',
  temps_moyen_traitement: 'Temps moyen traitement réclamations',
  temps_total_par_site: 'Temps total de travail',
};

const KPI_KEYS = Object.keys(KPI_LABELS);

function formatKpiStatut(statut: string | undefined | null): string {
  switch (statut) {
    case 'vert': return 'Conforme';
    case 'orange': return 'Attention';
    case 'rouge': return 'Non conforme';
    default: return '-';
  }
}

function extractKpiRow(key: string, kpis: any): [string, string, string, string] {
  const label = KPI_LABELS[key] || key;

  // KPI 1, 2, 3 — simple structure {valeur, seuil, statut, unite}
  if (['respect_planning', 'qualite_service', 'taux_realisation_reclamations'].includes(key)) {
    const kpi = kpis[key];
    if (!kpi) return [label, '-', '-', '-'];
    const valeur = kpi.valeur != null ? `${Number(kpi.valeur).toFixed(1)}${kpi.unite || ''}` : '-';
    const seuil = kpi.seuil != null ? `${kpi.seuil}${kpi.unite || ''}` : '-';
    const statut = formatKpiStatut(kpi.statut);
    return [label, valeur, seuil, statut];
  }

  // KPI 4 — nested {global: {valeur, seuil, statut, unite}, par_type: [...]}
  if (key === 'temps_moyen_traitement') {
    const kpi = kpis.temps_moyen_traitement;
    if (!kpi?.global) return [label, '-', '-', '-'];
    const valeur = kpi.global.valeur != null ? `${Number(kpi.global.valeur).toFixed(1)}${kpi.global.unite || 'h'}` : '-';
    const seuil = kpi.global.seuil != null ? `${kpi.global.seuil}${kpi.global.unite || 'h'}` : '-';
    const statut = formatKpiStatut(kpi.global.statut);
    return [label, valeur, seuil, statut];
  }

  // KPI 6 — object {total_heures, total_heures_m1, evolution}
  if (key === 'temps_total_par_site') {
    const kpi = kpis.temps_total_par_site;
    if (!kpi) return [label, '-', '-', '-'];
    const valeur = `${kpi.total_heures ?? '-'}h`;
    const m1 = kpi.total_heures_m1 != null ? `${kpi.total_heures_m1}h` : '-';
    return [label, valeur, m1, '-'];
  }

  return [label, '-', '-', '-'];
}

function buildKpiRows(kpis: any): [string, string, string, string][] {
  return KPI_KEYS.map(key => extractKpiRow(key, kpis));
}

const kpiDidParseCell = (data: any) => {
  if (data.section === 'body' && data.column.index === 3) {
    const val = data.cell.raw;
    if (val === 'Conforme') {
      data.cell.styles.textColor = [22, 163, 74];
      data.cell.styles.fontStyle = 'bold';
    } else if (val === 'Attention') {
      data.cell.styles.textColor = [217, 119, 6];
      data.cell.styles.fontStyle = 'bold';
    } else if (val === 'Non conforme') {
      data.cell.styles.textColor = [220, 38, 38];
      data.cell.styles.fontStyle = 'bold';
    }
  }
};

// ===== KPI 4 & 5 Chart Helpers =====

function drawHorizontalBarChart(
  doc: jsPDF,
  bars: { label: string; value: number; detail?: string }[],
  options: {
    x: number;
    y: number;
    width: number;
    barHeight: number;
    barGap: number;
    barColor: [number, number, number];
    maxValue?: number;
  }
): number {
  const { x, y, width, barHeight, barGap, barColor } = options;
  const maxVal = options.maxValue || Math.max(...bars.map(b => b.value), 1);
  const labelWidth = 55;
  const valueWidth = 30;
  const chartWidth = width - labelWidth - valueWidth;
  let currentY = y;

  for (const bar of bars) {
    // Label (left)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    const truncatedLabel = bar.label.length > 22 ? bar.label.substring(0, 20) + '...' : bar.label;
    doc.text(truncatedLabel, x, currentY + barHeight / 2 + 1);

    // Bar background track
    const barWidth = maxVal > 0 ? (bar.value / maxVal) * chartWidth : 0;
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(x + labelWidth, currentY, chartWidth, barHeight, 1.5, 1.5, 'F');
    if (barWidth > 0) {
      doc.setFillColor(...barColor);
      doc.roundedRect(x + labelWidth, currentY, Math.max(barWidth, 3), barHeight, 1.5, 1.5, 'F');
    }

    // Value (right)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    const valText = bar.detail || String(bar.value);
    doc.text(valText, x + labelWidth + chartWidth + 3, currentY + barHeight / 2 + 1);

    currentY += barHeight + barGap;
  }

  return currentY;
}

function renderKpi4Detail(
  doc: jsPDF,
  kpis: any,
  y: number,
  margin: number,
  pageWidth: number,
  ensureSpace: (h: number) => number,
  darkColor: [number, number, number],
): number {
  const kpi = kpis.temps_moyen_traitement;
  if (!kpi?.par_type || !Array.isArray(kpi.par_type) || kpi.par_type.length === 0) return y;

  const chartHeight = 15 + kpi.par_type.length * 9 + 5;
  y = ensureSpace(chartHeight);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Détail par type de réclamation', margin, y);
  y += 7;

  const bars = kpi.par_type.map((t: any) => ({
    label: t.nom || 'N/A',
    value: t.valeur || 0,
    detail: `${(t.valeur || 0).toFixed(1)}h (${t.total})`
  }));
  y = drawHorizontalBarChart(doc, bars, {
    x: margin,
    y,
    width: pageWidth - 2 * margin,
    barHeight: 6,
    barGap: 3,
    barColor: [245, 158, 11] as [number, number, number],
  });

  return y + 5;
}

function renderKpi5(
  doc: jsPDF,
  kpis: any,
  y: number,
  margin: number,
  pageWidth: number,
  ensureSpace: (h: number) => number,
  darkColor: [number, number, number],
  primaryColor: [number, number, number],
): number {
  const entries = kpis.temps_realisation_tache;
  if (!Array.isArray(entries) || entries.length === 0) return y;

  const byType: Record<string, { heures: number; interventions: number }> = {};
  for (const e of entries) {
    const key = e.type_tache || 'Autre';
    if (!byType[key]) byType[key] = { heures: 0, interventions: 0 };
    byType[key].heures += e.heures || 0;
    byType[key].interventions += e.nb_interventions || 0;
  }

  const aggregated = Object.entries(byType)
    .sort((a, b) => b[1].heures - a[1].heures);

  const chartHeight = 15 + aggregated.length * 9 + 10;
  y = ensureSpace(chartHeight);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Temps de réalisation par type de tâche', margin, y);
  y += 7;

  const totalH = aggregated.reduce((s, [, v]) => s + v.heures, 0);
  const totalI = aggregated.reduce((s, [, v]) => s + v.interventions, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(`Total : ${totalH.toFixed(1)}h — ${totalI} intervention(s)`, margin, y);
  y += 8;

  const bars = aggregated.map(([type, data]) => ({
    label: type,
    value: data.heures,
    detail: `${data.heures.toFixed(1)}h (${data.interventions})`
  }));
  y = drawHorizontalBarChart(doc, bars, {
    x: margin,
    y,
    width: pageWidth - 2 * margin,
    barHeight: 6,
    barGap: 3,
    barColor: primaryColor,
  });

  return y + 5;
}

export default function MonthlyReport() {
  // State
  const [sites, setSites] = useState<{ id: number; nom_site: string }[]>([]);
  const [selectedSites, setSelectedSites] = useState<number[]>([]);
  const [dateDebut, setDateDebut] = useState(() => {
    const now = new Date();
    return format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
  });
  const [dateFin, setDateFin] = useState(() => {
    return format(new Date(), 'yyyy-MM-dd');
  });
  const [reportData, setReportData] = useState<MonthlyReportData | null>(null);
  const [multiSiteReports, setMultiSiteReports] = useState<MonthlyReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);

  // Sections ouvertes/fermées
  const [openSections, setOpenSections] = useState({
    travaux: true,
    planifies: true,
    equipes: true,
    photos: false,
    reclamations: false,
    stats: true
  });

  // Charger les sites au montage
  useEffect(() => {
    fetchSites()
      .then(response => {
        let sitesData: { id: number; nom_site: string }[] = [];
        if (response?.results) {
          if ('features' in response.results && Array.isArray(response.results.features)) {
            sitesData = response.results.features.map((f: any) => ({
              id: f.id,
              nom_site: f.properties?.nom_site || `Site ${f.id}`
            }));
          } else if (Array.isArray(response.results)) {
            sitesData = response.results.map((f: any) => ({
              id: f.id,
              nom_site: f.properties?.nom_site || f.nom_site || `Site ${f.id}`
            }));
          }
        }
        setSites(sitesData);
      })
      .catch(err => console.error('Erreur chargement sites:', err));
  }, []);

  // Toggle site selection
  const toggleSiteSelection = (siteId: number) => {
    setSelectedSites(prev =>
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  // Sélectionner/désélectionner tous les sites
  const toggleAllSites = () => {
    if (selectedSites.length === sites.length) {
      setSelectedSites([]);
    } else {
      setSelectedSites(sites.map(s => s.id));
    }
  };

  // Générer le rapport (un ou plusieurs sites)
  const handleGenerateReport = async () => {
    if (selectedSites.length === 0) {
      setError('Veuillez sélectionner au moins un site');
      return;
    }

    setLoading(true);
    setError(null);
    setReportData(null);
    setMultiSiteReports([]);

    try {
      if (selectedSites.length === 1) {
        // Un seul site - comportement existant
        const options: MonthlyReportOptions = {
          siteId: selectedSites[0]!,
          dateDebut: dateDebut,
          dateFin: dateFin
        };
        const data = await fetchMonthlyReport(options);
        setReportData(data);
      } else {
        // Plusieurs sites - récupérer les rapports pour chaque site
        const reports: MonthlyReportData[] = [];
        for (const siteId of selectedSites) {
          try {
            const options: MonthlyReportOptions = {
              siteId,
              dateDebut: dateDebut,
              dateFin: dateFin
            };
            const data = await fetchMonthlyReport(options);
            reports.push(data);
          } catch (err) {
            console.error(`Erreur pour le site ${siteId}:`, err);
          }
        }
        setMultiSiteReports(reports);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la génération du rapport');
    } finally {
      setLoading(false);
    }
  };

  // Formater la période pour l'affichage
  const formatPeriode = (data?: MonthlyReportData) => {
    const source = data || reportData;
    if (!source) return '';
    const debut = new Date(source.periode.date_debut);
    const fin = new Date(source.periode.date_fin);
    return `Du ${format(debut, 'dd MMMM yyyy', { locale: fr })} au ${format(fin, 'dd MMMM yyyy', { locale: fr })}`;
  };

  // Calculer les statistiques globales pour multi-sites
  const getGlobalStats = () => {
    if (multiSiteReports.length === 0) return null;
    const heures_travaillees = multiSiteReports.reduce((sum, r) => sum + (r.statistiques?.heures_travaillees || 0), 0);
    const heures_theoriques = multiSiteReports.reduce((sum, r) => sum + (r.statistiques?.heures_theoriques || 0), 0);
    // Ratio de productivité global: heures réelles / heures théoriques * 100
    const ratio_productivite = heures_theoriques > 0 && heures_travaillees > 0
      ? Math.round((heures_travaillees / heures_theoriques) * 100 * 10) / 10
      : null;
    return {
      taches_terminees: multiSiteReports.reduce((sum, r) => sum + (r.statistiques?.taches_terminees || 0), 0),
      taches_planifiees: multiSiteReports.reduce((sum, r) => sum + (r.statistiques?.taches_planifiees || 0), 0),
      taux_realisation: Math.round(
        multiSiteReports.reduce((sum, r) => sum + (r.statistiques?.taux_realisation || 0), 0) / multiSiteReports.length
      ),
      reclamations_creees: multiSiteReports.reduce((sum, r) => sum + (r.statistiques?.reclamations_creees || 0), 0),
      reclamations_resolues: multiSiteReports.reduce((sum, r) => sum + (r.statistiques?.reclamations_resolues || 0), 0),
      heures_travaillees,
      heures_theoriques,
      ratio_productivite,
    };
  };

  // Fonction pour charger une image en base64
  const loadImageAsBase64 = (url: string, keepTransparency = false): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Pour les images avec transparence (PNG), ne pas remplir de fond
            if (!keepTransparency) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img, 0, 0);
            // Utiliser PNG pour préserver la transparence, JPEG sinon
            resolve(canvas.toDataURL(keepTransparency ? 'image/png' : 'image/jpeg', 0.8));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      // Construire l'URL complète si c'est une URL relative (ex: /media/...)
      let fullUrl = url;
      if (url && url.startsWith('/')) {
        fullUrl = getBackendUrl() + url;
      }
      img.src = fullUrl + (fullUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
    });
  };

  // Générer le PDF amélioré
  const handleDownloadPDF = async () => {
    if (!reportData) return;

    setGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const headerHeight = 18; // Espace réservé pour le header (logo)
      const footerHeight = 25; // Espace réservé pour le footer (infos société ENJR)
      const contentEndY = pageHeight - margin - footerHeight; // Limite basse du contenu
      let y = margin;

      // Couleurs professionnelles
      const primaryColor: [number, number, number] = [16, 185, 129]; // emerald-500
      const darkColor: [number, number, number] = [17, 24, 39]; // gray-900
      const grayColor: [number, number, number] = [107, 114, 128]; // gray-500
      const lightGray: [number, number, number] = [243, 244, 246]; // gray-100

      // Charger le logo (asset statique Vite, pas via le backend)
      let logoBase64: string | null = null;
      try {
        logoBase64 = await new Promise<string | null>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } else resolve(null);
          };
          img.onerror = () => resolve(null);
          img.src = '/logo.png';
        });
      } catch {
        console.log('Logo non chargé');
      }

      // Charger le logo ENJR (asset statique Vite)
      let logoEnjrBase64: string | null = null;
      try {
        logoEnjrBase64 = await loadStaticAsset('/Logo ENJR.png', 'png');
      } catch {
        console.log('Logo ENJR non chargé');
      }

      // Charger l'image footer (asset statique Vite)
      let footerBase64: string | null = null;
      try {
        footerBase64 = await loadStaticAsset('/footer.jpeg', 'jpeg');
      } catch {
        console.log('Footer image non chargée');
      }

      // Fonction pour ajouter le header sur les pages de contenu
      const addPageHeader = () => {
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', margin, 5, 25, 10);
        } else {
          doc.setFontSize(12);
          doc.setTextColor(...primaryColor);
          doc.setFont('helvetica', 'bold');
          doc.text('GreenSIG', margin, 12);
        }
        // Ligne de séparation
        doc.setDrawColor(...lightGray);
        doc.setLineWidth(0.3);
        doc.line(margin, headerHeight, pageWidth - margin, headerHeight);
      };

      // Fonction pour ajouter une nouvelle page avec header
      const addContentPage = () => {
        doc.addPage();
        addPageHeader();
        return margin + headerHeight; // Retourne la position Y de départ
      };

      // Fonction pour vérifier l'espace et ajouter une page si nécessaire
      const ensureSpace = (requiredHeight: number): number => {
        if (y + requiredHeight > contentEndY) {
          return addContentPage();
        }
        return y;
      };

      // Configuration des marges pour autoTable (respecte header/footer)
      const tableMargins = {
        top: margin + headerHeight,
        bottom: margin + footerHeight,
        left: margin,
        right: margin
      };

      // Callback pour ajouter le header quand autoTable crée une nouvelle page
      const didDrawPage = (data: any) => {
        const currentPage = doc.getNumberOfPages();
        // Ajouter le header sur les pages de contenu (pas la couverture)
        if (currentPage > 1 && data.pageNumber > 1) {
          addPageHeader();
        }
      };

      // ========== PAGE DE COUVERTURE ==========

      // Fond blanc
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Charger la carte satellite avec polygone du site
      let mapBase64: string | null = null;
      const siteGeometry = reportData.site?.geometry;
      const centroid = reportData.site?.centroid;

      // Essayer le rendu polygone d'abord, fallback sur tuile unique
      if (siteGeometry) {
        try {
          mapBase64 = await renderSitePolygonMap(siteGeometry);
        } catch {
          console.log('Rendu polygone échoué, fallback tuile unique');
        }
      }
      if (!mapBase64 && centroid?.lat && centroid?.lng) {
        try {
          const zoom = 17;
          const n = Math.pow(2, zoom);
          const xtile = Math.floor((centroid.lng + 180) / 360 * n);
          const ytile = Math.floor((1 - Math.log(Math.tan(centroid.lat * Math.PI / 180) + 1 / Math.cos(centroid.lat * Math.PI / 180)) / Math.PI) / 2 * n);
          const tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ytile}/${xtile}`;
          mapBase64 = await loadImageAsBase64(tileUrl);
        } catch {
          console.log('Carte satellite non chargée');
        }
      }

      // Logos en haut : GreenSIG à gauche, ENJR à droite
      if (logoBase64 && logoEnjrBase64) {
        doc.addImage(logoBase64, 'PNG', margin, 15, 55, 28);
        doc.addImage(logoEnjrBase64, 'PNG', pageWidth - margin - 55, 15, 55, 28);
      } else if (logoBase64) {
        const logoW = 70;
        const logoH = 35;
        doc.addImage(logoBase64, 'PNG', (pageWidth - logoW) / 2, 15, logoW, logoH);
      }

      // Titre principal
      doc.setFontSize(28);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'bold');
      doc.text('RAPPORT D\'ACTIVITÉ', pageWidth / 2, 65, { align: 'center' });

      // Sous-titre
      doc.setFontSize(12);
      doc.setTextColor(...grayColor);
      doc.setFont('helvetica', 'normal');
      doc.text('Gestion des Espaces Verts', pageWidth / 2, 75, { align: 'center' });

      // Nom du site (fond gris foncé)
      const siteBoxY = 85;
      doc.setFillColor(50, 50, 50);
      doc.roundedRect(30, siteBoxY, pageWidth - 60, 20, 3, 3, 'F');

      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(reportData.site?.nom || 'Site', pageWidth / 2, siteBoxY + 14, { align: 'center' });

      // Carte du site (si disponible)
      const mapY = 115;
      const mapWidth = pageWidth - 40;
      const mapHeight = 100;
      let coverContentY = 112;

      if (mapBase64) {
        // Cadre léger autour de la carte
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(20 - 0.5, mapY - 0.5, mapWidth + 1, mapHeight + 1);

        doc.addImage(mapBase64, 'JPEG', 20, mapY, mapWidth, mapHeight);
        coverContentY = mapY + mapHeight + 5;
      }

      // Période
      const periodeBoxY = coverContentY + 5;
      doc.setFillColor(...lightGray);
      doc.roundedRect(35, periodeBoxY, pageWidth - 70, 16, 2, 2, 'F');

      doc.setFontSize(10);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'normal');
      doc.text(formatPeriode(), pageWidth / 2, periodeBoxY + 11, { align: 'center' });

      // Informations du site - Coordonnées géographiques + Superficie
      y = periodeBoxY + 25;
      doc.setFontSize(10);
      doc.setTextColor(...darkColor);

      if (centroid?.lat != null && centroid?.lng != null) {
        doc.setFont('helvetica', 'bold');
        doc.text('Coordonnées :', 35, y);
        doc.setFont('helvetica', 'normal');
        const latDir = centroid.lat >= 0 ? 'N' : 'S';
        const lngDir = centroid.lng >= 0 ? 'E' : 'W';
        const coordStr = `${latDir} ${Math.abs(centroid.lat).toFixed(4)}\u00B0  ${lngDir} ${Math.abs(centroid.lng).toFixed(4)}\u00B0`;
        doc.text(coordStr, 70, y);
        y += 7;
      }
      if (reportData.site?.superficie) {
        doc.setFont('helvetica', 'bold');
        doc.text('Superficie :', 35, y);
        doc.setFont('helvetica', 'normal');
        const superficieFormatted = reportData.site.superficie.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        doc.text(`${superficieFormatted} m\u00B2`, 70, y);
      }

      // ========== PAGE 2: CONTENU ==========
      y = addContentPage();

      // Fonction pour ajouter un titre de section
      const addSectionTitle = (title: string, number: string) => {
        y = ensureSpace(20);
        doc.setFillColor(...primaryColor);
        doc.rect(margin, y - 5, 6, 12, 'F');
        doc.setFontSize(16);
        doc.setTextColor(...darkColor);
        doc.setFont('helvetica', 'bold');
        doc.text(`${number}. ${title}`, margin + 10, y + 3);
        y += 15;
        doc.setFont('helvetica', 'normal');
      };

      // ========== SECTION 1: AVANT-PROPOS ==========
      addSectionTitle('AVANT-PROPOS', '1');

      doc.setFontSize(10);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'normal');

      const avantProposIntro = [
        'Grâce à nos experts éprouvés, nos techniques bien conçues, et nos méthodes convenablement exécutées, la société ENJR a pour objectif principal la réussite de l\'opération d\'entretien et de jardinage et ce dans les règles de l\'art.',
        '',
        'Ainsi, durant ce mois, nos équipes de jardiniers ont effectué les travaux d\'entretien des espaces verts des sites suivants :',
      ];

      for (const text of avantProposIntro) {
        if (text === '') {
          y += 4;
        } else {
          const wrappedLines = doc.splitTextToSize(text, pageWidth - 2 * margin);
          for (const line of wrappedLines) {
            y = ensureSpace(6);
            doc.text(line, margin, y);
            y += 5;
          }
          y += 2;
        }
      }

      // Nom du site en puce
      y += 2;
      doc.setFont('helvetica', 'bold');
      y = ensureSpace(8);
      doc.text(`\u2022  ${reportData.site?.nom || 'Site'}`, margin + 5, y);
      y += 10;
      doc.setFont('helvetica', 'normal');

      const avantProposFin = [
        'L\'encadrement d\'ENJR met en \u0153uvre toutes les dispositions nécessaires pour une amélioration continue des conditions de travail de ce projet.',
        '',
        'Aussi, nous supervisons de près toutes les actions opérationnelles afin d\'avoir un livrable à la hauteur des espérances de nos clients.',
        '',
        'Grâce à toutes ces actions, nous constatons, indéniablement un changement favorable et motivant au niveau de tous les sites.',
        '',
        'Dans ce qui suit, les photos prises illustrent l\'avancement et les situations de chaque site.',
      ];

      for (const text of avantProposFin) {
        if (text === '') {
          y += 4;
        } else {
          const wrappedLines = doc.splitTextToSize(text, pageWidth - 2 * margin);
          for (const line of wrappedLines) {
            y = ensureSpace(6);
            doc.text(line, margin, y);
            y += 5;
          }
          y += 2;
        }
      }
      y += 10;

      // ========== SECTION 2: ACTIONS MISES EN PLACE ==========
      addSectionTitle('ACTIONS MISES EN PLACE', '2');

      doc.setFontSize(10);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'normal');

      const actionsIntro = 'Afin d\'améliorer notre rendement, et éviter les éventuelles dérives de nos process, nous avons mis en place plusieurs actions notamment :';
      const actionsIntroLines = doc.splitTextToSize(actionsIntro, pageWidth - 2 * margin);
      for (const line of actionsIntroLines) {
        y = ensureSpace(6);
        doc.text(line, margin, y);
        y += 5;
      }
      y += 5;

      const actionsListe = [
        'Instaurer une réunion hebdomadaire chaque lundi en présence de tous les responsables des sites',
        'Standardiser les méthodes de travail pour tous les sites : explications théoriques et suivi sur le terrain : bordures du gazon, hauteur de taille, ...',
        'Augmenter la fréquence de nettoyage des ordures éventuelles à trois fois par jour',
        'Désinfecter systématiquement les outils de travail',
        'Nommer un caporal par site pour le suivi et l\'exécution des travaux',
        'Programmer au minimum deux visites par jour du superviseur de tous les sites pour la planification des actions et le suivi des réalisations',
        'Recueillir le besoin de chaque site en outillage et en consommable et distribuer le matériel nécessaire selon les besoins (asperseurs, tuyaux, ...)',
        '\u00C9diter une matrice de polyvalence pour connaître le niveau de compétence des techniques et la maîtrise des outils de travail pour définir les affectations des jardiniers en fonction des spécificités de chaque site',
      ];

      for (const action of actionsListe) {
        const bulletLines = doc.splitTextToSize(`\u2022  ${action}`, pageWidth - 2 * margin - 5);
        for (const line of bulletLines) {
          y = ensureSpace(6);
          doc.text(line, margin + 5, y);
          y += 5;
        }
        y += 3;
      }
      y += 10;

      // ========== SECTION 3: INDICATEURS DE PERFORMANCE (KPI) ==========
      addSectionTitle('INDICATEURS DE PERFORMANCE', '3');

      // Charger les KPI depuis l'API
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const siteId = reportData.site?.id;
      const moisDebut = reportData.periode.date_debut.substring(0, 7); // YYYY-MM
      let kpiData: any = null;
      try {
        const kpiParams = new URLSearchParams();
        if (siteId) kpiParams.append('site_id', String(siteId));
        if (moisDebut) kpiParams.append('mois', moisDebut);
        const kpiResp = await apiFetch(`${API_BASE_URL}/kpis/?${kpiParams.toString()}`);
        kpiData = await kpiResp.json();
      } catch {
        console.log('KPI data non chargée');
      }

      if (kpiData?.kpis) {
        const kpiRows = buildKpiRows(kpiData.kpis);

        autoTable(doc, {
          startY: y,
          head: [['Indicateur', 'Valeur', 'Seuil', 'Statut']],
          body: kpiRows,
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 70 },
            1: { halign: 'center', cellWidth: 35 },
            2: { halign: 'center', cellWidth: 30 },
            3: { halign: 'center', cellWidth: 30 },
          },
          margin: tableMargins,
          didDrawPage: didDrawPage,
          didParseCell: kpiDidParseCell,
        });
        y = (doc as any).lastAutoTable.finalY + 15;

        // KPI 4 — Temps moyen traitement réclamations (graphique)
        y = renderKpi4Detail(doc, kpiData.kpis, y, margin, pageWidth, ensureSpace, darkColor);

        // KPI 5 — Temps réalisation par tâche (graphique)
        y = renderKpi5(doc, kpiData.kpis, y, margin, pageWidth, ensureSpace, darkColor, primaryColor);
      } else {
        doc.setFontSize(10);
        doc.setTextColor(...darkColor);
        doc.text('Données KPI non disponibles pour cette période.', margin, y);
        y += 15;
      }

      // ========== SECTION 4: TRAVAUX EFFECTUÉS ==========
      addSectionTitle('TRAVAUX EFFECTUÉS', '4');

      doc.setFontSize(10);
      doc.setTextColor(...grayColor);
      doc.text('Planning des opérations réalisées sur la période', margin, y);
      y += 10;

      const travauxEffectues = reportData.travaux_effectues;
      const planningEffectues = travauxEffectues?.planning || [];
      const statsEffectues = travauxEffectues?.statistiques;

      if (planningEffectues.length === 0) {
        doc.setTextColor(...darkColor);
        doc.text('Aucun travail réalisé sur cette période.', margin, y);
        y += 15;
      } else {
        // Couleurs par statut
        const STATUT_COLORS: Record<string, [number, number, number]> = {
          'REALISEE': [200, 230, 201],    // Vert clair
          'EN_COURS': [187, 222, 251],    // Bleu clair
          'REPORTEE': [255, 249, 196],    // Jaune clair
          'ANNULEE': [255, 205, 210],     // Rouge clair
          'NON_REALISEE': [255, 255, 255], // Blanc
        };

        // Construire les données du tableau
        const tableBody = planningEffectues.map(item => [
          item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-',
          item.reference || '-',
          item.type || '-',
          item.equipes || '-',
          item.horaires || '-',
          item.charge ? `${item.charge}h` : '-',
          item.statut_label || '-',
          item.priorite_label || '-'
        ]);

        // Ligne de statistiques
        const statsText = `Total: ${statsEffectues?.total || 0} interventions, ${statsEffectues?.total_heures || 0}h`;
        tableBody.push([statsText, '', '', '', '', '', '', '']);

        autoTable(doc, {
          startY: y,
          head: [['Date', 'Réf.', 'Type', 'Équipe(s)', 'Horaires', 'Charge', 'Statut', 'Priorité']],
          body: tableBody,
          theme: 'striped',
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 18 },  // Date
            1: { cellWidth: 18 },  // Réf
            2: { cellWidth: 30 },  // Type
            3: { cellWidth: 35 },  // Équipes
            4: { cellWidth: 22 },  // Horaires
            5: { cellWidth: 14 },  // Charge
            6: { cellWidth: 18 },  // Statut
            7: { cellWidth: 22 },  // Priorité
          },
          margin: tableMargins,
          didDrawPage: didDrawPage,
          didParseCell: (data: any) => {
            // Appliquer couleur par statut (colonne 6)
            if (data.section === 'body' && data.column.index === 6 && data.row.index < planningEffectues.length) {
              const item = planningEffectues[data.row.index];
              if (item && STATUT_COLORS[item.statut]) {
                data.cell.styles.fillColor = STATUT_COLORS[item.statut];
              }1
            }
            // Priorité urgente en rouge (colonne 7)
            if (data.section === 'body' && data.column.index === 7 && data.row.index < planningEffectues.length) {
              const item = planningEffectues[data.row.index];
              if (item && item.priorite === 5) {
                data.cell.styles.textColor = [220, 38, 38];
                data.cell.styles.fontStyle = 'bold';
              }
            }
            // Ligne de stats (dernière ligne)
            if (data.section === 'body' && data.row.index === planningEffectues.length) {
              data.cell.styles.fillColor = [232, 245, 233];
              data.cell.styles.textColor = [46, 125, 50];
              data.cell.styles.fontStyle = 'italic';
              if (data.column.index === 0) {
                data.cell.colSpan = 8;
              }
            }
          }
        });
        y = (doc as any).lastAutoTable.finalY + 15;
      }

      // ========== SECTION 5: TRAVAUX PLANIFIÉS ==========
      addSectionTitle('TRAVAUX PLANIFIÉS', '5');

      doc.setFontSize(10);
      doc.setTextColor(...grayColor);
      doc.text('Planning des interventions prévues pour les 30 prochains jours', margin, y);
      y += 10;

      const travauxPlanifies = reportData.travaux_planifies;
      const planningPlanifies = travauxPlanifies?.planning || [];
      const statsPlanifies = travauxPlanifies?.statistiques;

      if (planningPlanifies.length === 0) {
        doc.setTextColor(...darkColor);
        doc.text('Aucune intervention planifiée.', margin, y);
        y += 15;
      } else {
        // Couleurs par statut
        const STATUT_COLORS_PLANIF: Record<string, [number, number, number]> = {
          'REALISEE': [200, 230, 201],    // Vert clair
          'EN_COURS': [187, 222, 251],    // Bleu clair
          'REPORTEE': [255, 249, 196],    // Jaune clair
          'ANNULEE': [255, 205, 210],     // Rouge clair
          'NON_REALISEE': [255, 255, 255], // Blanc
        };

        // Construire les données du tableau
        const tableBodyPlanif = planningPlanifies.map(item => [
          item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-',
          item.reference || '-',
          item.type || '-',
          item.equipes || '-',
          item.horaires || '-',
          item.charge ? `${item.charge}h` : '-',
          item.statut_label || '-',
          item.priorite_label || '-'
        ]);

        // Ligne de statistiques
        const statsTextPlanif = `Total: ${statsPlanifies?.total || 0} interventions, ${statsPlanifies?.total_heures || 0}h`;
        tableBodyPlanif.push([statsTextPlanif, '', '', '', '', '', '', '']);

        autoTable(doc, {
          startY: y,
          head: [['Date', 'Réf.', 'Type', 'Équipe(s)', 'Horaires', 'Charge', 'Statut', 'Priorité']],
          body: tableBodyPlanif,
          theme: 'striped',
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 18 },  // Date
            1: { cellWidth: 18 },  // Réf
            2: { cellWidth: 30 },  // Type
            3: { cellWidth: 35 },  // Équipes
            4: { cellWidth: 22 },  // Horaires
            5: { cellWidth: 14 },  // Charge
            6: { cellWidth: 18 },  // Statut
            7: { cellWidth: 22 },  // Priorité
          },
          margin: tableMargins,
          didDrawPage: didDrawPage,
          didParseCell: (data: any) => {
            // Appliquer couleur par statut (colonne 6)
            if (data.section === 'body' && data.column.index === 6 && data.row.index < planningPlanifies.length) {
              const item = planningPlanifies[data.row.index];
              if (item && STATUT_COLORS_PLANIF[item.statut]) {
                data.cell.styles.fillColor = STATUT_COLORS_PLANIF[item.statut];
              }
            }
            // Priorité urgente en rouge (colonne 7)
            if (data.section === 'body' && data.column.index === 7 && data.row.index < planningPlanifies.length) {
              const item = planningPlanifies[data.row.index];
              if (item && item.priorite === 5) {
                data.cell.styles.textColor = [220, 38, 38];
                data.cell.styles.fontStyle = 'bold';
              }
            }
            // Ligne de stats (dernière ligne)
            if (data.section === 'body' && data.row.index === planningPlanifies.length) {
              data.cell.styles.fillColor = [219, 234, 254];
              data.cell.styles.textColor = [29, 78, 216];
              data.cell.styles.fontStyle = 'italic';
              if (data.column.index === 0) {
                data.cell.colSpan = 8;
              }
            }
          }
        });
        y = (doc as any).lastAutoTable.finalY + 15;
      }

      // ========== SECTION 6: PHOTOS AVANT/APRÈS ==========
      const photos = reportData.photos || [];
      if (photos.length > 0) {
        y = addContentPage();
        addSectionTitle('PHOTOS AVANT/APRÈS', '6');

        doc.setFontSize(10);
        doc.setTextColor(...grayColor);
        y += 10;

        const imgWidth = 75;
        const imgHeight = 55;
        const imgGap = 10;

        for (const group of photos.slice(0, 6)) {
          y = ensureSpace(85);

          const taskName = group.tache_nom || 'Intervention';
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(...darkColor);
          doc.text(taskName, margin, y);
          y += 6;

          const avantUrl = group.avant?.[0]?.url;
          const apresUrl = group.apres?.[0]?.url;

          let avantBase64: string | null = null;
          let apresBase64: string | null = null;

          if (avantUrl) avantBase64 = await loadImageAsBase64(avantUrl);
          if (apresUrl) apresBase64 = await loadImageAsBase64(apresUrl);

          // Labels
          doc.setFontSize(9);
          doc.setTextColor(...grayColor);
          doc.setFont('helvetica', 'normal');
          doc.text('AVANT', margin + imgWidth / 2, y, { align: 'center' });
          doc.text('APRÈS', margin + imgWidth + imgGap + imgWidth / 2, y, { align: 'center' });
          y += 4;

          // Images
          if (avantBase64) {
            doc.addImage(avantBase64, 'JPEG', margin, y, imgWidth, imgHeight);
          } else {
            doc.setFillColor(...lightGray);
            doc.roundedRect(margin, y, imgWidth, imgHeight, 2, 2, 'F');
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('Image non disponible', margin + imgWidth / 2, y + imgHeight / 2, { align: 'center' });
          }

          if (apresBase64) {
            doc.addImage(apresBase64, 'JPEG', margin + imgWidth + imgGap, y, imgWidth, imgHeight);
          } else {
            doc.setFillColor(...lightGray);
            doc.roundedRect(margin + imgWidth + imgGap, y, imgWidth, imgHeight, 2, 2, 'F');
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('Image non disponible', margin + imgWidth + imgGap + imgWidth / 2, y + imgHeight / 2, { align: 'center' });
          }

          y += imgHeight + 12;
        }

        if (photos.length > 6) {
          doc.setFontSize(9);
          doc.setTextColor(...grayColor);
          doc.text(`+ ${photos.length - 6} autre(s) groupe(s) de photos`, margin, y);
        }
      }

      // ========== SECTION 7: POINTAGE MENSUEL (page vierge) ==========
      y = addContentPage();
      addSectionTitle('POINTAGE MENSUEL', '7');

      // ========== SECTION 8: MATÉRIEL EXISTANT (page vierge) ==========
      y = addContentPage();
      addSectionTitle('MATÉRIEL EXISTANT', '8');

      // ========== SECTION 9: POINT D'ATTENTION (page vierge) ==========
      y = addContentPage();
      addSectionTitle('POINT D\'ATTENTION', '9');

      // Ajouter headers et footers sur toutes les pages de contenu
      const totalPages = doc.getNumberOfPages();
      const contentPages = totalPages - 1; // Exclure la page de couverture
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);

        // Header (logo)
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', margin, 5, 25, 10);
        }
        // Ligne de séparation header
        doc.setDrawColor(...lightGray);
        doc.setLineWidth(0.3);
        doc.line(margin, headerHeight, pageWidth - margin, headerHeight);

        // Footer - image ou texte de fallback
        if (footerBase64) {
          const footerImgW = pageWidth - 2 * margin;
          const footerImgH = 12;
          doc.addImage(footerBase64, 'JPEG', margin, pageHeight - 22, footerImgW, footerImgH);
        } else {
          doc.setDrawColor(...lightGray);
          doc.setLineWidth(0.3);
          doc.line(margin, pageHeight - 22, pageWidth - margin, pageHeight - 22);
          doc.setFontSize(5.5);
          doc.setTextColor(120, 120, 120);
          doc.setFont('helvetica', 'bold');
          doc.text('EXPERT NETTOYAGE & JARDINAGE RHAMNA SARL au capital social : 100 000,00DH', pageWidth / 2, pageHeight - 18, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.text(
            'Si\u00E8ge social : Hay Massira N\u00B0 22 BENGUERIR - Email : enjr.contact@gmail.com  IF : 51685065  ICE : 002948885000033  Patente : 45404667  RC : 3051',
            pageWidth / 2, pageHeight - 14, { align: 'center' }
          );
        }

        // Numéro de page
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(`Page ${i - 1} / ${contentPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
      }

      // Télécharger
      const debutFormatted = format(new Date(reportData.periode.date_debut), 'yyyyMMdd');
      const finFormatted = format(new Date(reportData.periode.date_fin), 'yyyyMMdd');
      const fileName = `Rapport_${reportData.site?.nom || 'Site'}_${debutFormatted}_${finFormatted}.pdf`.replace(/\s+/g, '_');
      doc.save(fileName);

    } catch (err: any) {
      console.error('Erreur génération PDF:', err);
      setError('Erreur lors de la génération du PDF');
    } finally {
      setGenerating(false);
    }
  };

  // Générer le PDF multi-sites (8 sections)
  const handleDownloadMultiPDF = async () => {
    if (multiSiteReports.length === 0) return;

    setGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const headerHeight = 18;
      const footerHeight = 25;
      const contentEndY = pageHeight - margin - footerHeight;
      let y = margin;

      const primaryColor: [number, number, number] = [16, 185, 129];
      const darkColor: [number, number, number] = [17, 24, 39];
      const grayColor: [number, number, number] = [107, 114, 128];
      const lightGray: [number, number, number] = [243, 244, 246];

      // Charger le logo GreenSIG
      let logoBase64: string | null = null;
      try {
        logoBase64 = await loadStaticAsset('/logo.png', 'png');
      } catch { console.log('Logo non chargé'); }

      // Charger le logo ENJR
      let logoEnjrBase64: string | null = null;
      try {
        logoEnjrBase64 = await loadStaticAsset('/Logo ENJR.png', 'png');
      } catch { console.log('Logo ENJR non chargé'); }

      // Charger l'image footer
      let footerBase64: string | null = null;
      try {
        footerBase64 = await loadStaticAsset('/footer.jpeg', 'jpeg');
      } catch { console.log('Footer image non chargée'); }

      const addPageHeader = () => {
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', margin, 5, 25, 10);
        } else {
          doc.setFontSize(12);
          doc.setTextColor(...primaryColor);
          doc.setFont('helvetica', 'bold');
          doc.text('GreenSIG', margin, 12);
        }
        doc.setDrawColor(...lightGray);
        doc.setLineWidth(0.3);
        doc.line(margin, headerHeight, pageWidth - margin, headerHeight);
      };

      const addContentPage = () => {
        doc.addPage();
        addPageHeader();
        return margin + headerHeight;
      };

      const ensureSpace = (requiredHeight: number): number => {
        if (y + requiredHeight > contentEndY) {
          return addContentPage();
        }
        return y;
      };

      const tableMargins = {
        top: margin + headerHeight,
        bottom: margin + footerHeight,
        left: margin,
        right: margin
      };

      const didDrawPage = (data: any) => {
        const currentPage = doc.getNumberOfPages();
        if (currentPage > 1 && data.pageNumber > 1) {
          addPageHeader();
        }
      };

      const addSectionTitle = (title: string, number: string) => {
        y = ensureSpace(20);
        doc.setFillColor(...primaryColor);
        doc.rect(margin, y - 5, 6, 12, 'F');
        doc.setFontSize(16);
        doc.setTextColor(...darkColor);
        doc.setFont('helvetica', 'bold');
        doc.text(`${number}. ${title}`, margin + 10, y + 3);
        y += 15;
        doc.setFont('helvetica', 'normal');
      };

      // ========== PAGE DE COUVERTURE GLOBALE ==========
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Logos : GreenSIG à gauche, ENJR à droite
      if (logoBase64 && logoEnjrBase64) {
        doc.addImage(logoBase64, 'PNG', margin, 15, 55, 28);
        doc.addImage(logoEnjrBase64, 'PNG', pageWidth - margin - 55, 15, 55, 28);
      } else if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', (pageWidth - 70) / 2, 15, 70, 35);
      }

      // Titre
      doc.setFontSize(28);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'bold');
      doc.text('RAPPORT D\'ACTIVITÉ', pageWidth / 2, 65, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(...grayColor);
      doc.setFont('helvetica', 'normal');
      doc.text('Gestion des Espaces Verts', pageWidth / 2, 75, { align: 'center' });

      // Bandeau "RAPPORT GLOBAL"
      const globalBoxY = 85;
      doc.setFillColor(50, 50, 50);
      doc.roundedRect(30, globalBoxY, pageWidth - 60, 20, 3, 3, 'F');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(`RAPPORT GLOBAL - ${multiSiteReports.length} Sites`, pageWidth / 2, globalBoxY + 14, { align: 'center' });

      // Carte multi-polygones
      const allGeometries = multiSiteReports.map(r => r.site?.geometry).filter(Boolean);
      let mapBase64: string | null = null;
      if (allGeometries.length > 0) {
        try {
          mapBase64 = await renderMultiSitePolygonMap(allGeometries as any);
        } catch {
          console.log('Rendu multi-polygone échoué');
        }
      }

      const mapY = 115;
      const mapWidth = pageWidth - 40;
      const mapHeight = 100;
      let coverContentY = 112;

      if (mapBase64) {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(20 - 0.5, mapY - 0.5, mapWidth + 1, mapHeight + 1);
        doc.addImage(mapBase64, 'JPEG', 20, mapY, mapWidth, mapHeight);
        coverContentY = mapY + mapHeight + 5;
      }

      // Période
      const periodeBoxY = coverContentY + 5;
      doc.setFillColor(...lightGray);
      doc.roundedRect(35, periodeBoxY, pageWidth - 70, 16, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'normal');
      const periodeText = `Du ${format(new Date(dateDebut), 'dd MMMM yyyy', { locale: fr })} au ${format(new Date(dateFin), 'dd MMMM yyyy', { locale: fr })}`;
      doc.text(periodeText, pageWidth / 2, periodeBoxY + 11, { align: 'center' });

      // ========== SECTION 1: AVANT-PROPOS ==========
      y = addContentPage();
      addSectionTitle('AVANT-PROPOS', '1');

      doc.setFontSize(10);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'normal');

      const avantProposIntro = [
        'Grâce à nos experts éprouvés, nos techniques bien conçues, et nos méthodes convenablement exécutées, la société ENJR a pour objectif principal la réussite de l\'opération d\'entretien et de jardinage et ce dans les règles de l\'art.',
        '',
        'Ainsi, durant ce mois, nos équipes de jardiniers ont effectué les travaux d\'entretien des espaces verts des sites suivants :',
      ];

      for (const text of avantProposIntro) {
        if (text === '') { y += 4; }
        else {
          const wrappedLines = doc.splitTextToSize(text, pageWidth - 2 * margin);
          for (const line of wrappedLines) {
            y = ensureSpace(6);
            doc.text(line, margin, y);
            y += 5;
          }
          y += 2;
        }
      }

      // Liste de TOUS les sites en puces
      y += 2;
      doc.setFont('helvetica', 'bold');
      for (const report of multiSiteReports) {
        y = ensureSpace(8);
        doc.text(`\u2022  ${report.site?.nom || 'Site'}`, margin + 5, y);
        y += 6;
      }
      y += 4;
      doc.setFont('helvetica', 'normal');

      const avantProposFin = [
        'L\'encadrement d\'ENJR met en \u0153uvre toutes les dispositions nécessaires pour une amélioration continue des conditions de travail de ce projet.',
        '',
        'Aussi, nous supervisons de près toutes les actions opérationnelles afin d\'avoir un livrable à la hauteur des espérances de nos clients.',
        '',
        'Grâce à toutes ces actions, nous constatons, indéniablement un changement favorable et motivant au niveau de tous les sites.',
        '',
        'Dans ce qui suit, les photos prises illustrent l\'avancement et les situations de chaque site.',
      ];

      for (const text of avantProposFin) {
        if (text === '') { y += 4; }
        else {
          const wrappedLines = doc.splitTextToSize(text, pageWidth - 2 * margin);
          for (const line of wrappedLines) {
            y = ensureSpace(6);
            doc.text(line, margin, y);
            y += 5;
          }
          y += 2;
        }
      }
      y += 10;

      // ========== SECTION 2: ACTIONS MISES EN PLACE ==========
      addSectionTitle('ACTIONS MISES EN PLACE', '2');

      doc.setFontSize(10);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'normal');

      const actionsIntro = 'Afin d\'améliorer notre rendement, et éviter les éventuelles dérives de nos process, nous avons mis en place plusieurs actions notamment :';
      const actionsIntroLines = doc.splitTextToSize(actionsIntro, pageWidth - 2 * margin);
      for (const line of actionsIntroLines) {
        y = ensureSpace(6);
        doc.text(line, margin, y);
        y += 5;
      }
      y += 5;

      const actionsListe = [
        'Instaurer une réunion hebdomadaire chaque lundi en présence de tous les responsables des sites',
        'Standardiser les méthodes de travail pour tous les sites : explications théoriques et suivi sur le terrain : bordures du gazon, hauteur de taille, ...',
        'Augmenter la fréquence de nettoyage des ordures éventuelles à trois fois par jour',
        'Désinfecter systématiquement les outils de travail',
        'Nommer un caporal par site pour le suivi et l\'exécution des travaux',
        'Programmer au minimum deux visites par jour du superviseur de tous les sites pour la planification des actions et le suivi des réalisations',
        'Recueillir le besoin de chaque site en outillage et en consommable et distribuer le matériel nécessaire selon les besoins (asperseurs, tuyaux, ...)',
        '\u00C9diter une matrice de polyvalence pour connaître le niveau de compétence des techniques et la maîtrise des outils de travail pour définir les affectations des jardiniers en fonction des spécificités de chaque site',
      ];

      for (const action of actionsListe) {
        const bulletLines = doc.splitTextToSize(`\u2022  ${action}`, pageWidth - 2 * margin - 5);
        for (const line of bulletLines) {
          y = ensureSpace(6);
          doc.text(line, margin + 5, y);
          y += 5;
        }
        y += 3;
      }
      y += 10;

      // ========== SECTION 3: INDICATEURS DE PERFORMANCE (KPI) ==========
      addSectionTitle('INDICATEURS DE PERFORMANCE', '3');

      {
        const API_BASE_URL_MULTI = import.meta.env.VITE_API_BASE_URL || '/api';
        const moisDebutMulti = multiSiteReports[0]?.travaux_effectues ?
          (multiSiteReports[0] as any).periode?.date_debut?.substring(0, 7) :
          dateDebut.substring(0, 7);
        let kpiDataMulti: any = null;
        try {
          const kpiParams = new URLSearchParams();
          if (moisDebutMulti) kpiParams.append('mois', moisDebutMulti);
          const kpiResp = await apiFetch(`${API_BASE_URL_MULTI}/kpis/?${kpiParams.toString()}`);
          kpiDataMulti = await kpiResp.json();
        } catch {
          console.log('KPI data non chargée (multi-site)');
        }

        if (kpiDataMulti?.kpis) {
          const kpiRows = buildKpiRows(kpiDataMulti.kpis);

          autoTable(doc, {
            startY: y,
            head: [['Indicateur', 'Valeur', 'Seuil', 'Statut']],
            body: kpiRows,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
              0: { fontStyle: 'bold', cellWidth: 70 },
              1: { halign: 'center' as const, cellWidth: 35 },
              2: { halign: 'center' as const, cellWidth: 30 },
              3: { halign: 'center' as const, cellWidth: 30 },
            },
            margin: tableMargins,
            didDrawPage: didDrawPage,
            didParseCell: kpiDidParseCell,
          });
          y = (doc as any).lastAutoTable.finalY + 15;

          // KPI 4 — Temps moyen traitement réclamations (graphique)
          y = renderKpi4Detail(doc, kpiDataMulti.kpis, y, margin, pageWidth, ensureSpace, darkColor);

          // KPI 5 — Temps réalisation par tâche (graphique)
          y = renderKpi5(doc, kpiDataMulti.kpis, y, margin, pageWidth, ensureSpace, darkColor, primaryColor);
        } else {
          doc.setFontSize(10);
          doc.setTextColor(...darkColor);
          doc.text('Données KPI non disponibles pour cette période.', margin, y);
          y += 15;
        }
      }

      // ========== SECTION 4: TRAVAUX EFFECTUÉS (par site) ==========
      addSectionTitle('TRAVAUX EFFECTUÉS', '4');

      for (const report of multiSiteReports) {
        // Sous-titre site
        y = ensureSpace(15);
        doc.setFillColor(50, 50, 50);
        doc.roundedRect(margin, y - 3, pageWidth - 2 * margin, 12, 2, 2, 'F');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(report.site?.nom || 'Site', margin + 5, y + 5);
        y += 15;

        const planningEffectues = report.travaux_effectues?.planning || [];
        if (planningEffectues.length === 0) {
          doc.setFontSize(10);
          doc.setTextColor(...darkColor);
          doc.setFont('helvetica', 'normal');
          doc.text('Aucun travail réalisé sur cette période.', margin, y);
          y += 10;
        } else {
          const STATUT_COLORS: Record<string, [number, number, number]> = {
            'REALISEE': [200, 230, 201],
            'EN_COURS': [187, 222, 251],
            'REPORTEE': [255, 249, 196],
            'ANNULEE': [255, 205, 210],
            'NON_REALISEE': [255, 255, 255],
          };

          const tableBody = planningEffectues.map(item => [
            item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-',
            item.reference || '-',
            item.type || '-',
            item.equipes || '-',
            item.horaires || '-',
            item.charge ? `${item.charge}h` : '-',
            item.statut_label || '-',
            item.priorite_label || '-'
          ]);

          const statsEffectues = report.travaux_effectues?.statistiques;
          const statsText = `Total: ${statsEffectues?.total || 0} interventions, ${statsEffectues?.total_heures || 0}h`;
          tableBody.push([statsText, '', '', '', '', '', '', '']);

          autoTable(doc, {
            startY: y,
            head: [['Date', 'Réf.', 'Type', 'Équipe(s)', 'Horaires', 'Charge', 'Statut', 'Priorité']],
            body: tableBody,
            theme: 'striped',
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            columnStyles: {
              0: { cellWidth: 18 }, 1: { cellWidth: 18 }, 2: { cellWidth: 30 },
              3: { cellWidth: 35 }, 4: { cellWidth: 22 }, 5: { cellWidth: 14 },
              6: { cellWidth: 18 }, 7: { cellWidth: 22 },
            },
            margin: tableMargins,
            didDrawPage: didDrawPage,
            didParseCell: (data: any) => {
              if (data.section === 'body' && data.column.index === 6 && data.row.index < planningEffectues.length) {
                const item = planningEffectues[data.row.index];
                if (item && STATUT_COLORS[item.statut]) {
                  data.cell.styles.fillColor = STATUT_COLORS[item.statut];
                }
              }
              if (data.section === 'body' && data.row.index === planningEffectues.length) {
                data.cell.styles.fillColor = [232, 245, 233];
                data.cell.styles.textColor = [46, 125, 50];
                data.cell.styles.fontStyle = 'italic';
                if (data.column.index === 0) data.cell.colSpan = 8;
              }
            }
          });
          y = (doc as any).lastAutoTable.finalY + 10;
        }
      }

      // ========== SECTION 5: TRAVAUX PLANIFIÉS (par site) ==========
      y = ensureSpace(20);
      addSectionTitle('TRAVAUX PLANIFIÉS', '5');

      for (const report of multiSiteReports) {
        y = ensureSpace(15);
        doc.setFillColor(50, 50, 50);
        doc.roundedRect(margin, y - 3, pageWidth - 2 * margin, 12, 2, 2, 'F');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(report.site?.nom || 'Site', margin + 5, y + 5);
        y += 15;

        const planningPlanifies = report.travaux_planifies?.planning || [];
        if (planningPlanifies.length === 0) {
          doc.setFontSize(10);
          doc.setTextColor(...darkColor);
          doc.setFont('helvetica', 'normal');
          doc.text('Aucune intervention planifiée.', margin, y);
          y += 10;
        } else {
          const tableBodyPlanif = planningPlanifies.map(item => [
            item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-',
            item.reference || '-',
            item.type || '-',
            item.equipes || '-',
            item.horaires || '-',
            item.charge ? `${item.charge}h` : '-',
            item.statut_label || '-',
            item.priorite_label || '-'
          ]);

          const statsPlanifies = report.travaux_planifies?.statistiques;
          const statsTextPlanif = `Total: ${statsPlanifies?.total || 0} interventions, ${statsPlanifies?.total_heures || 0}h`;
          tableBodyPlanif.push([statsTextPlanif, '', '', '', '', '', '', '']);

          autoTable(doc, {
            startY: y,
            head: [['Date', 'Réf.', 'Type', 'Équipe(s)', 'Horaires', 'Charge', 'Statut', 'Priorité']],
            body: tableBodyPlanif,
            theme: 'striped',
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            columnStyles: {
              0: { cellWidth: 18 }, 1: { cellWidth: 18 }, 2: { cellWidth: 30 },
              3: { cellWidth: 35 }, 4: { cellWidth: 22 }, 5: { cellWidth: 14 },
              6: { cellWidth: 18 }, 7: { cellWidth: 22 },
            },
            margin: tableMargins,
            didDrawPage: didDrawPage,
            didParseCell: (data: any) => {
              if (data.section === 'body' && data.row.index === planningPlanifies.length) {
                data.cell.styles.fillColor = [219, 234, 254];
                data.cell.styles.textColor = [29, 78, 216];
                data.cell.styles.fontStyle = 'italic';
                if (data.column.index === 0) data.cell.colSpan = 8;
              }
            }
          });
          y = (doc as any).lastAutoTable.finalY + 10;
        }
      }

      // ========== SECTION 6: PHOTOS AVANT/APRÈS (par site) ==========
      const hasAnyPhotos = multiSiteReports.some(r => (r.photos || []).length > 0);
      if (hasAnyPhotos) {
        y = addContentPage();
        addSectionTitle('PHOTOS AVANT/APRÈS', '6');

        for (const report of multiSiteReports) {
          const sitePhotos = report.photos || [];
          if (sitePhotos.length === 0) continue;

          // Sous-titre site
          y = ensureSpace(15);
          doc.setFillColor(50, 50, 50);
          doc.roundedRect(margin, y - 3, pageWidth - 2 * margin, 12, 2, 2, 'F');
          doc.setFontSize(11);
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.text(report.site?.nom || 'Site', margin + 5, y + 5);
          y += 15;

          const imgWidth = 75;
          const imgHeight = 55;
          const imgGap = 10;

          for (const group of sitePhotos.slice(0, 4)) {
            y = ensureSpace(85);

            const taskName = group.tache_nom || 'Intervention';
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(...darkColor);
            doc.text(taskName, margin, y);
            y += 6;

            const avantUrl = group.avant?.[0]?.url;
            const apresUrl = group.apres?.[0]?.url;

            let avantBase64: string | null = null;
            let apresBase64: string | null = null;

            if (avantUrl) avantBase64 = await loadImageAsBase64(avantUrl);
            if (apresUrl) apresBase64 = await loadImageAsBase64(apresUrl);

            doc.setFontSize(8);
            doc.setTextColor(...grayColor);
            doc.setFont('helvetica', 'normal');
            doc.text('AVANT', margin + imgWidth / 2, y, { align: 'center' });
            doc.text('APRÈS', margin + imgWidth + imgGap + imgWidth / 2, y, { align: 'center' });
            y += 4;

            if (avantBase64) {
              doc.addImage(avantBase64, 'JPEG', margin, y, imgWidth, imgHeight);
            } else {
              doc.setFillColor(...lightGray);
              doc.roundedRect(margin, y, imgWidth, imgHeight, 2, 2, 'F');
              doc.setFontSize(8);
              doc.setTextColor(150, 150, 150);
              doc.text('Image non disponible', margin + imgWidth / 2, y + imgHeight / 2, { align: 'center' });
            }

            if (apresBase64) {
              doc.addImage(apresBase64, 'JPEG', margin + imgWidth + imgGap, y, imgWidth, imgHeight);
            } else {
              doc.setFillColor(...lightGray);
              doc.roundedRect(margin + imgWidth + imgGap, y, imgWidth, imgHeight, 2, 2, 'F');
              doc.setFontSize(8);
              doc.setTextColor(150, 150, 150);
              doc.text('Image non disponible', margin + imgWidth + imgGap + imgWidth / 2, y + imgHeight / 2, { align: 'center' });
            }

            y += imgHeight + 10;
          }

          if (sitePhotos.length > 4) {
            doc.setFontSize(9);
            doc.setTextColor(...grayColor);
            doc.text(`+ ${sitePhotos.length - 4} autre(s) groupe(s) de photos`, margin, y);
            y += 8;
          }
        }
      }

      // ========== SECTION 7: POINTAGE MENSUEL (page vierge) ==========
      y = addContentPage();
      addSectionTitle('POINTAGE MENSUEL', '7');

      // ========== SECTION 8: MATÉRIEL EXISTANT (page vierge) ==========
      y = addContentPage();
      addSectionTitle('MATÉRIEL EXISTANT', '8');

      // ========== SECTION 9: POINT D'ATTENTION (page vierge) ==========
      y = addContentPage();
      addSectionTitle('POINT D\'ATTENTION', '9');

      // Ajouter headers et footers sur toutes les pages de contenu
      const totalPages = doc.getNumberOfPages();
      const contentPages = totalPages - 1;
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);

        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', margin, 5, 25, 10);
        }
        doc.setDrawColor(...lightGray);
        doc.setLineWidth(0.3);
        doc.line(margin, headerHeight, pageWidth - margin, headerHeight);

        // Footer - image ou texte de fallback
        if (footerBase64) {
          const footerImgW = pageWidth - 2 * margin;
          const footerImgH = 12;
          doc.addImage(footerBase64, 'JPEG', margin, pageHeight - 22, footerImgW, footerImgH);
        } else {
          doc.setDrawColor(...lightGray);
          doc.setLineWidth(0.3);
          doc.line(margin, pageHeight - 22, pageWidth - margin, pageHeight - 22);
          doc.setFontSize(5.5);
          doc.setTextColor(120, 120, 120);
          doc.setFont('helvetica', 'bold');
          doc.text('EXPERT NETTOYAGE & JARDINAGE RHAMNA SARL au capital social : 100 000,00DH', pageWidth / 2, pageHeight - 18, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.text(
            'Si\u00E8ge social : Hay Massira N\u00B0 22 BENGUERIR - Email : enjr.contact@gmail.com  IF : 51685065  ICE : 002948885000033  Patente : 45404667  RC : 3051',
            pageWidth / 2, pageHeight - 14, { align: 'center' }
          );
        }

        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(`Page ${i - 1} / ${contentPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
      }

      // Télécharger
      const debutFormatted = format(new Date(dateDebut), 'yyyyMMdd');
      const finFormatted = format(new Date(dateFin), 'yyyyMMdd');
      const fileName = `Rapport_Global_${multiSiteReports.length}Sites_${debutFormatted}_${finFormatted}.pdf`;
      doc.save(fileName);

    } catch (err: any) {
      console.error('Erreur génération PDF multi-sites:', err);
      setError('Erreur lors de la génération du PDF');
    } finally {
      setGenerating(false);
    }
  };

  // Toggle section
  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="bg-gray-50 p-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Import Poppins font */}
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');`}
      </style>

      <div className="w-full max-w-[1920px] mx-auto">
        {/* Header amélioré */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6">
          {/* Bandeau supérieur avec couleur sidebar */}
          <div className="bg-emerald-900 px-6 py-5 rounded-t-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Rapport de Site mensuel</h1>
                <p className="text-emerald-200 text-sm">Générez un rapport d'activité complet pour une période</p>
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Sites
                  {selectedSites.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                      {selectedSites.length}
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => setShowSiteDropdown(!showSiteDropdown)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-gray-50 hover:bg-white text-left flex items-center justify-between group"
                >
                  <span className={selectedSites.length === 0 ? 'text-gray-400' : 'text-gray-900 font-medium'}>
                    {selectedSites.length === 0
                      ? 'Sélectionner des sites'
                      : selectedSites.length === 1
                        ? sites.find(s => s.id === selectedSites[0])?.nom_site || '1 site'
                        : `${selectedSites.length} sites sélectionnés`}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform group-hover:text-emerald-600 ${showSiteDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showSiteDropdown && (
                  <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                      <button
                        type="button"
                        onClick={toggleAllSites}
                        className="w-full px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors text-left flex items-center gap-2"
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedSites.length === sites.length ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'}`}>
                          {selectedSites.length === sites.length && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        {selectedSites.length === sites.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                      </button>
                    </div>
                    {sites.map(site => (
                      <label
                        key={site.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSites.includes(site.id)}
                          onChange={() => toggleSiteSelection(site.id)}
                          className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                        />
                        <span className="text-sm text-gray-700">{site.nom_site}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Date début
                </label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={e => setDateDebut(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-gray-50 hover:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Date fin
                </label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={e => setDateFin(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-gray-50 hover:bg-white"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleGenerateReport}
                  disabled={loading || selectedSites.length === 0}
                  className="w-full px-5 py-3 bg-emerald-900 text-white rounded-xl hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      Générer le rapport
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-semibold">Erreur</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Aperçu du rapport multi-sites */}
        {multiSiteReports.length > 0 && (
          <div className="space-y-5">
            {/* Header global */}
            <div className="bg-emerald-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              {/* Motif décoratif */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="flex items-center justify-between relative z-10">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                      {multiSiteReports.length} site{multiSiteReports.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold">Rapport Global Multi-sites</h2>
                  <p className="text-emerald-200 text-sm mt-1">
                    {format(new Date(dateDebut), 'dd MMMM yyyy', { locale: fr })} → {format(new Date(dateFin), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                <button
                  onClick={handleDownloadMultiPDF}
                  disabled={generating}
                  className="px-6 py-3.5 bg-white text-emerald-900 rounded-xl font-semibold hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-2 shadow-lg transition-all hover:scale-105"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Télécharger PDF Global
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Statistiques globales */}
            {(() => {
              const globalStats = getGlobalStats();
              return globalStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Tâches terminées" value={globalStats.taches_terminees} color="emerald" />
                  <StatCard icon={<ClipboardList className="w-5 h-5" />} label="Tâches planifiées" value={globalStats.taches_planifiees} color="blue" />
                  <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Taux réalisation" value={`${globalStats.taux_realisation}%`} color="teal" />
                  <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Réclamations" value={globalStats.reclamations_creees} color="amber" />
                  <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Résolues" value={globalStats.reclamations_resolues} color="green" />
                  <StatCard icon={<Users className="w-5 h-5" />} label="Heures travail" value={`${globalStats.heures_travaillees}h`} color="teal" />
                  <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Productivité" value={globalStats.ratio_productivite != null ? `${globalStats.ratio_productivite}%` : 'N/A'} color={globalStats.ratio_productivite != null && globalStats.ratio_productivite <= 100 ? 'emerald' : 'amber'} />
                </div>
              );
            })()}

            {/* Liste des sites avec leurs stats */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Détail par site</h3>
              <div className="space-y-3">
                {multiSiteReports.map((report, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{report.site?.nom || 'Site'}</p>
                        <p className="text-sm text-gray-500">{report.site?.adresse || ''}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-emerald-600">{report.statistiques?.taches_terminees || 0}</p>
                          <p className="text-xs text-gray-500">terminées</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-blue-600">{report.statistiques?.taches_planifiees || 0}</p>
                          <p className="text-xs text-gray-500">planifiées</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-teal-600">{report.statistiques?.taux_realisation || 0}%</p>
                          <p className="text-xs text-gray-500">réalisation</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-amber-600">{report.statistiques?.reclamations_creees || 0}</p>
                          <p className="text-xs text-gray-500">réclamations</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-teal-600">{report.statistiques?.heures_travaillees || 0}h</p>
                          <p className="text-xs text-gray-500">heures</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Aperçu du rapport (un seul site) */}
        {reportData && (
          <div className="space-y-5">
            {/* Header du rapport */}
            <div className="bg-emerald-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              {/* Motif décoratif */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="flex items-center justify-between relative z-10">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                      {reportData.periode.nb_jours} jours
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold">{reportData.site?.nom || 'Site'}</h2>
                  <p className="text-emerald-200 text-sm mt-1">{formatPeriode()}</p>
                </div>
                <button
                  onClick={handleDownloadPDF}
                  disabled={generating}
                  className="px-6 py-3.5 bg-white text-emerald-900 rounded-xl font-semibold hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-2 shadow-lg transition-all hover:scale-105"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Télécharger PDF
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Statistiques rapides */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Tâches terminées" value={reportData.statistiques?.taches_terminees ?? 0} color="emerald" />
              <StatCard icon={<ClipboardList className="w-5 h-5" />} label="Tâches planifiées" value={reportData.statistiques?.taches_planifiees ?? 0} color="blue" />
              <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Taux réalisation" value={`${reportData.statistiques?.taux_realisation ?? 0}%`} color="teal" />
              <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Réclamations" value={reportData.statistiques?.reclamations_creees ?? 0} color="amber" />
              <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Résolues" value={reportData.statistiques?.reclamations_resolues ?? 0} color="green" />
              <StatCard icon={<Users className="w-5 h-5" />} label="Heures travail" value={`${reportData.statistiques?.heures_travaillees ?? 0}h`} color="blue" />
            </div>

            {/* Travaux effectués - Format planning */}
            <CollapsibleSection
              title="Travaux effectués (validés)"
              icon={<ClipboardList className="w-5 h-5" />}
              count={reportData.travaux_effectues?.statistiques?.total || 0}
              isOpen={openSections.travaux}
              onToggle={() => toggleSection('travaux')}
            >
              {!reportData.travaux_effectues?.planning || reportData.travaux_effectues.planning.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucun travail réalisé sur cette période</p>
              ) : (
                <div className="space-y-4">
                  {/* Statistiques */}
                  <div className="flex items-center gap-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-sm text-emerald-700">
                      <strong>{reportData.travaux_effectues.statistiques?.total || 0}</strong> interventions
                    </span>
                    <span className="text-sm text-emerald-700">
                      <strong>{reportData.travaux_effectues.statistiques?.total_heures || 0}</strong>h totales
                    </span>
                  </div>

                  {/* Tableau planning */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-emerald-600 text-white">
                          <th className="px-2 py-2 text-left">Date</th>
                          <th className="px-2 py-2 text-left">Réf.</th>
                          <th className="px-2 py-2 text-left">Type</th>
                          <th className="px-2 py-2 text-left">Équipe(s)</th>
                          <th className="px-2 py-2 text-left">Horaires</th>
                          <th className="px-2 py-2 text-center">Charge</th>
                          <th className="px-2 py-2 text-center">Statut</th>
                          <th className="px-2 py-2 text-center">Priorité</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.travaux_effectues.planning.map((item, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-2 py-2 whitespace-nowrap">
                              {item.date ? format(new Date(item.date), 'dd/MM/yy') : '-'}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap font-mono text-xs">{item.reference}</td>
                            <td className="px-2 py-2">{item.type}</td>
                            <td className="px-2 py-2 text-xs">{item.equipes}</td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs">{item.horaires || '-'}</td>
                            <td className="px-2 py-2 text-center whitespace-nowrap">{item.charge}h</td>
                            <td className="px-2 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                item.statut === 'REALISEE' ? 'bg-green-100 text-green-800' :
                                item.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-800' :
                                item.statut === 'REPORTEE' ? 'bg-yellow-100 text-yellow-800' :
                                item.statut === 'ANNULEE' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {item.statut_label}
                              </span>
                            </td>
                            <td className={`px-2 py-2 text-center text-xs ${item.priorite === 5 ? 'text-red-600 font-bold' : ''}`}>
                              {item.priorite_label}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CollapsibleSection>

            {/* Travaux planifiés - Format planning */}
            <CollapsibleSection
              title="Travaux planifiés (30 prochains jours)"
              icon={<Calendar className="w-5 h-5" />}
              count={reportData.travaux_planifies?.statistiques?.total || 0}
              isOpen={openSections.planifies}
              onToggle={() => toggleSection('planifies')}
            >
              {!reportData.travaux_planifies?.planning || reportData.travaux_planifies.planning.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucune intervention planifiée pour les 30 prochains jours</p>
              ) : (
                <div className="space-y-4">
                  {/* Statistiques */}
                  <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-sm text-blue-700">
                      <strong>{reportData.travaux_planifies.statistiques?.total || 0}</strong> interventions
                    </span>
                    <span className="text-sm text-blue-700">
                      <strong>{reportData.travaux_planifies.statistiques?.total_heures || 0}</strong>h totales
                    </span>
                  </div>

                  {/* Tableau planning */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-blue-600 text-white">
                          <th className="px-2 py-2 text-left">Date</th>
                          <th className="px-2 py-2 text-left">Réf.</th>
                          <th className="px-2 py-2 text-left">Type</th>
                          <th className="px-2 py-2 text-left">Équipe(s)</th>
                          <th className="px-2 py-2 text-left">Horaires</th>
                          <th className="px-2 py-2 text-center">Charge</th>
                          <th className="px-2 py-2 text-center">Statut</th>
                          <th className="px-2 py-2 text-center">Priorité</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.travaux_planifies.planning.map((item, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-2 py-2 whitespace-nowrap">
                              {item.date ? format(new Date(item.date), 'dd/MM/yy') : '-'}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap font-mono text-xs">{item.reference}</td>
                            <td className="px-2 py-2">{item.type}</td>
                            <td className="px-2 py-2 text-xs">{item.equipes}</td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs">{item.horaires || '-'}</td>
                            <td className="px-2 py-2 text-center whitespace-nowrap">{item.charge}h</td>
                            <td className="px-2 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                item.statut === 'REALISEE' ? 'bg-green-100 text-green-800' :
                                item.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-800' :
                                item.statut === 'REPORTEE' ? 'bg-yellow-100 text-yellow-800' :
                                item.statut === 'ANNULEE' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {item.statut_label}
                              </span>
                            </td>
                            <td className={`px-2 py-2 text-center text-xs ${item.priorite === 5 ? 'text-red-600 font-bold' : ''}`}>
                              {item.priorite_label}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CollapsibleSection>

            {/* Équipes */}
            <CollapsibleSection
              title="Équipes intervenantes"
              icon={<UserCheck className="w-5 h-5" />}
              count={(reportData.equipes || []).length}
              isOpen={openSections.equipes}
              onToggle={() => toggleSection('equipes')}
            >
              {!reportData.equipes || reportData.equipes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucune équipe n'a travaillé sur ce site durant cette période</p>
              ) : (
                <div className="space-y-4">
                  {reportData.equipes.map((equipe, index) => (
                    <div key={index} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{equipe.nom || 'Équipe'}</p>
                          {equipe.chef && <p className="text-sm text-gray-500">Chef: {equipe.chef}</p>}
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                          {(equipe.heures_totales ?? 0).toFixed(1)}h
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {(equipe.operateurs || []).map((op, i) => (
                          <div
                            key={i}
                            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                              op.absent ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                            }`}
                          >
                            <span className={`text-sm ${op.absent ? 'text-red-600 line-through' : 'text-gray-700'}`}>
                              {op.nom || 'Opérateur'}
                              {op.absent && <span className="ml-1 text-xs">(absent)</span>}
                            </span>
                            <span className={`text-xs ${op.absent ? 'text-red-500' : 'text-gray-500'}`}>
                              {(op.heures ?? 0).toFixed(1)}h
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            {/* Photos */}
            <CollapsibleSection
              title="Photos avant/après"
              icon={<Camera className="w-5 h-5" />}
              count={(reportData.photos || []).length}
              isOpen={openSections.photos}
              onToggle={() => toggleSection('photos')}
            >
              {!reportData.photos || reportData.photos.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucune photo disponible pour cette période</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportData.photos.slice(0, 6).map((group, index) => (
                    <div key={index} className="border border-gray-200 rounded-xl p-4">
                      <p className="font-semibold text-gray-900 mb-3">{group.tache_nom || 'Intervention'}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">AVANT</p>
                          {group.avant?.[0]?.url ? (
                            <img src={group.avant[0].url} alt="Avant" className="w-full h-32 object-cover rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">Pas d'image</div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">APRÈS</p>
                          {group.apres?.[0]?.url ? (
                            <img src={group.apres[0].url} alt="Après" className="w-full h-32 object-cover rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">Pas d'image</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            {/* Points d'attention */}
            <CollapsibleSection
              title="Points d'attention"
              icon={<AlertTriangle className="w-5 h-5" />}
              count={(reportData.reclamations || []).length}
              isOpen={openSections.reclamations}
              onToggle={() => toggleSection('reclamations')}
            >
              {!reportData.reclamations || reportData.reclamations.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucune réclamation pour cette période</p>
              ) : (
                <div className="space-y-2">
                  {reportData.reclamations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <span className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{rec.numero}</span>
                          {rec.zone && <span className="text-sm text-gray-500">• {rec.zone}</span>}
                        </div>
                        <p className="text-sm text-gray-700">{rec.description || 'Aucune description'}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${rec.statut === 'RESOLUE' || rec.statut === 'CLOTUREE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {rec.statut || 'N/A'}
                          </span>
                          {rec.urgence && <span className="text-xs text-gray-500">Urgence: {rec.urgence}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleSection>
          </div>
        )}

        {/* État initial */}
        {!reportData && multiSiteReports.length === 0 && !loading && !error && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center border-b border-emerald-100">
              <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Rapport de Site mensuel</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Générez un rapport d'activité complet pour une période personnalisée
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-700 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Sélectionnez les sites</p>
                    <p className="text-xs text-gray-500 mt-0.5">Un ou plusieurs sites</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-700 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Date de début</p>
                    <p className="text-xs text-gray-500 mt-0.5">Début de la période</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-700 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Date de fin</p>
                    <p className="text-xs text-gray-500 mt-0.5">Fin de la période</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-700 font-bold text-sm">4</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Générez le rapport</p>
                    <p className="text-xs text-gray-500 mt-0.5">Visualisez et téléchargez</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant StatCard
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    teal: 'bg-teal-50 text-teal-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

// Composant CollapsibleSection
function CollapsibleSection({ title, icon, count, isOpen, onToggle, children }: {
  title: string; icon: React.ReactNode; count: number; isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button onClick={onToggle} className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">{icon}</div>
          <span className="font-semibold text-gray-900">{title}</span>
          <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">{count}</span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {isOpen && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}