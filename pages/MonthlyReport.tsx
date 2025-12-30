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
  UserCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { fetchMonthlyReport } from '../services/reportsApi';
import { fetchSites } from '../services/api';
import type { MonthlyReportData, MonthlyReportOptions } from '../types/reports';

// Extend jsPDF types for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
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
    return {
      taches_terminees: multiSiteReports.reduce((sum, r) => sum + (r.statistiques?.taches_terminees || 0), 0),
      taches_planifiees: multiSiteReports.reduce((sum, r) => sum + (r.statistiques?.taches_planifiees || 0), 0),
      taux_realisation: Math.round(
        multiSiteReports.reduce((sum, r) => sum + (r.statistiques?.taux_realisation || 0), 0) / multiSiteReports.length
      ),
      reclamations_creees: multiSiteReports.reduce((sum, r) => sum + (r.statistiques?.reclamations_creees || 0), 0),
      reclamations_resolues: multiSiteReports.reduce((sum, r) => sum + (r.statistiques?.reclamations_resolues || 0), 0),
      heures_travaillees: multiSiteReports.reduce((sum, r) => sum + (r.statistiques?.heures_travaillees || 0), 0),
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
      img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
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
      let y = margin;

      // Couleurs professionnelles
      const primaryColor: [number, number, number] = [16, 185, 129]; // emerald-500
      const darkColor: [number, number, number] = [17, 24, 39]; // gray-900
      const grayColor: [number, number, number] = [107, 114, 128]; // gray-500
      const lightGray: [number, number, number] = [243, 244, 246]; // gray-100

      // Charger le logo (avec transparence)
      let logoBase64: string | null = null;
      try {
        logoBase64 = await loadImageAsBase64('/GreenSIG_Logo_V1nobackground.png', true);
      } catch {
        console.log('Logo non chargé');
      }

      // ========== PAGE DE COUVERTURE ==========

      // Fond blanc
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Charger la carte satellite du site si coordonnées disponibles
      let mapBase64: string | null = null;
      const centroid = reportData.site?.centroid;
      if (centroid?.lat && centroid?.lng) {
        try {
          // Utiliser Esri World Imagery (satellite)
          const zoom = 17;
          const lat = centroid.lat;
          const lng = centroid.lng;
          // Calculer les coordonnées de tile
          const n = Math.pow(2, zoom);
          const xtile = Math.floor((lng + 180) / 360 * n);
          const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
          // Utiliser Esri Satellite Imagery
          const tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ytile}/${xtile}`;
          mapBase64 = await loadImageAsBase64(tileUrl);
        } catch {
          console.log('Carte satellite non chargée');
        }
      }

      // Logo plus grand (centré en haut)
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 45, 20, 90, 68);
      } else {
        // Texte de remplacement
        doc.setFontSize(40);
        doc.setTextColor(...darkColor);
        doc.setFont('helvetica', 'bold');
        doc.text('GreenSIG', pageWidth / 2, 55, { align: 'center' });
      }

      // Titre principal
      doc.setFontSize(28);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'bold');
      doc.text('RAPPORT D\'ACTIVITÉ', pageWidth / 2, 105, { align: 'center' });

      // Sous-titre
      doc.setFontSize(12);
      doc.setTextColor(...grayColor);
      doc.setFont('helvetica', 'normal');
      doc.text('Gestion des Espaces Verts', pageWidth / 2, 115, { align: 'center' });

      // Nom du site (fond gris foncé)
      const siteBoxY = 125;
      doc.setFillColor(50, 50, 50);
      doc.roundedRect(30, siteBoxY, pageWidth - 60, 25, 3, 3, 'F');

      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(reportData.site?.nom || 'Site', pageWidth / 2, siteBoxY + 17, { align: 'center' });

      // Carte du site (si disponible)
      const mapY = 158;
      const mapWidth = pageWidth - 50;
      const mapHeight = 70;
      let contentEndY = 155; // Position après la carte ou le nom du site

      if (mapBase64) {
        // Image de la carte satellite
        doc.addImage(mapBase64, 'JPEG', 25, mapY, mapWidth, mapHeight);

        // Marqueur du site au centre de la carte
        const markerX = 25 + mapWidth / 2;
        const markerY = mapY + mapHeight / 2;

        // Ombre du marqueur
        doc.setFillColor(0, 0, 0);
        doc.circle(markerX + 1, markerY + 1, 5, 'F');

        // Marqueur rouge
        doc.setFillColor(220, 38, 38); // red-600
        doc.circle(markerX, markerY, 5, 'F');

        // Point blanc au centre du marqueur
        doc.setFillColor(255, 255, 255);
        doc.circle(markerX, markerY, 2, 'F');

        contentEndY = mapY + mapHeight + 5;
      }

      // Période
      const periodeBoxY = contentEndY + 5;
      doc.setFillColor(...lightGray);
      doc.roundedRect(35, periodeBoxY, pageWidth - 70, 16, 2, 2, 'F');

      doc.setFontSize(10);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'normal');
      doc.text(formatPeriode(), pageWidth / 2, periodeBoxY + 11, { align: 'center' });

      // Informations du site
      y = periodeBoxY + 25;
      doc.setFontSize(10);
      doc.setTextColor(...darkColor);

      if (reportData.site?.adresse) {
        doc.setFont('helvetica', 'bold');
        doc.text('Adresse :', 35, y);
        doc.setFont('helvetica', 'normal');
        const adresseLines = doc.splitTextToSize(reportData.site.adresse, pageWidth - 100);
        doc.text(adresseLines, 65, y);
        y += adresseLines.length * 5 + 3;
      }
      if (reportData.site?.superficie) {
        doc.setFont('helvetica', 'bold');
        doc.text('Superficie :', 35, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${reportData.site.superficie.toLocaleString()} m²`, 65, y);
      }

      const stats = reportData.statistiques || {};

      // Pied de page couverture (bien espacé du contenu)
      doc.setFontSize(8);
      doc.setTextColor(...grayColor);
      doc.setFont('helvetica', 'normal');
      doc.text(`Document généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, pageHeight - 20, { align: 'center' });

      doc.setFontSize(9);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'bold');
      doc.text('GreenSIG - Système de Gestion des Espaces Verts', pageWidth / 2, pageHeight - 12, { align: 'center' });

      // ========== PAGE 2: SOMMAIRE & TRAVAUX ==========
      doc.addPage();
      y = margin;

      // Fonction pour ajouter un titre de section
      const addSectionTitle = (title: string, number: string) => {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = margin;
        }
        doc.setFillColor(...primaryColor);
        doc.rect(margin, y - 5, 6, 12, 'F');
        doc.setFontSize(16);
        doc.setTextColor(...darkColor);
        doc.setFont('helvetica', 'bold');
        doc.text(`${number}. ${title}`, margin + 10, y + 3);
        y += 15;
        doc.setFont('helvetica', 'normal');
      };

      // Section 1: Travaux effectués
      addSectionTitle('TRAVAUX EFFECTUÉS', '1');

      doc.setFontSize(10);
      doc.setTextColor(...grayColor);
      doc.text('Opérations validées sur la période', margin, y);
      y += 10;

      if (!reportData.travaux_effectues || reportData.travaux_effectues.length === 0) {
        doc.setTextColor(...darkColor);
        doc.text('Aucun travail validé sur cette période.', margin, y);
        y += 15;
      } else {
        autoTable(doc, {
          startY: y,
          head: [['Type d\'intervention', 'Nombre']],
          body: reportData.travaux_effectues.map(t => [t.type || 'N/A', String(t.count || 0)]),
          theme: 'striped',
          styles: { fontSize: 10, cellPadding: 4 },
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          margin: { left: margin, right: margin }
        });
        y = (doc as any).lastAutoTable.finalY + 15;
      }

      // Section 2: Travaux planifiés
      addSectionTitle('TRAVAUX PLANIFIÉS', '2');

      doc.setFontSize(10);
      doc.setTextColor(...grayColor);
      doc.text('Interventions prévues pour les 30 prochains jours', margin, y);
      y += 10;

      if (!reportData.travaux_planifies || reportData.travaux_planifies.length === 0) {
        doc.setTextColor(...darkColor);
        doc.text('Aucun travail planifié.', margin, y);
        y += 15;
      } else {
        autoTable(doc, {
          startY: y,
          head: [['Type d\'intervention', 'Nombre prévu']],
          body: reportData.travaux_planifies.map(t => [t.type || 'N/A', String(t.count || 0)]),
          theme: 'striped',
          styles: { fontSize: 10, cellPadding: 4 },
          headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          margin: { left: margin, right: margin }
        });
        y = (doc as any).lastAutoTable.finalY + 15;
      }

      // Section 3: Équipes intervenantes
      const equipes = reportData.equipes || [];
      if (equipes.length > 0) {
        addSectionTitle('ÉQUIPES INTERVENANTES', '3');

        doc.setFontSize(10);
        doc.setTextColor(...grayColor);
        doc.text('Personnel ayant travaillé sur le site', margin, y);
        y += 10;

        for (const equipe of equipes) {
          if (y > pageHeight - 50) {
            doc.addPage();
            y = margin;
          }

          // Nom de l'équipe
          doc.setFillColor(...lightGray);
          doc.roundedRect(margin, y - 3, pageWidth - 2 * margin, 10, 2, 2, 'F');
          doc.setFontSize(11);
          doc.setTextColor(...darkColor);
          doc.setFont('helvetica', 'bold');
          doc.text(equipe.nom || 'Équipe', margin + 5, y + 3);
          if (equipe.chef) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...grayColor);
            doc.text(`Chef: ${equipe.chef}`, margin + 80, y + 3);
          }
          doc.setFontSize(9);
          doc.setTextColor(...primaryColor);
          doc.text(`${(equipe.heures_totales ?? 0).toFixed(1)}h`, pageWidth - margin - 20, y + 3);
          y += 12;

          // Opérateurs
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(...darkColor);
          for (const op of (equipe.operateurs || [])) {
            doc.text(`• ${op.nom || 'Opérateur'}`, margin + 10, y);
            doc.setTextColor(...grayColor);
            doc.text(`${(op.heures ?? 0).toFixed(1)}h`, pageWidth - margin - 25, y);
            doc.setTextColor(...darkColor);
            y += 5;
          }
          y += 5;
        }
        y += 10;
      }

      // Section 4: Photos
      const photos = reportData.photos || [];
      if (photos.length > 0) {
        doc.addPage();
        y = margin;
        addSectionTitle('PHOTOS AVANT/APRÈS', equipes.length > 0 ? '4' : '3');

        doc.setFontSize(10);
        doc.setTextColor(...grayColor);
        doc.text(`${photos.length} groupe(s) de photos documentés`, margin, y);
        y += 10;

        const imgWidth = 75;
        const imgHeight = 55;
        const imgGap = 10;

        for (const group of photos.slice(0, 6)) {
          if (y > pageHeight - 85) {
            doc.addPage();
            y = margin;
          }

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

      // Section 5: Points d'attention (Réclamations)
      const reclamations = reportData.reclamations || [];
      if (reclamations.length > 0) {
        if (y > pageHeight - 60) {
          doc.addPage();
          y = margin;
        }
        const sectionNum = photos.length > 0 ? (equipes.length > 0 ? '5' : '4') : (equipes.length > 0 ? '4' : '3');
        addSectionTitle('POINTS D\'ATTENTION', sectionNum);

        doc.setFontSize(10);
        doc.setTextColor(...grayColor);
        doc.text('Réclamations enregistrées sur la période', margin, y);
        y += 10;

        autoTable(doc, {
          startY: y,
          head: [['N°', 'Description', 'Statut', 'Urgence']],
          body: reclamations.map(r => [
            r.numero || 'N/A',
            (r.description || 'N/A').substring(0, 50) + (r.description && r.description.length > 50 ? '...' : ''),
            r.statut || 'N/A',
            r.urgence || 'N/A'
          ]),
          theme: 'striped',
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 80 },
            2: { cellWidth: 30 },
            3: { cellWidth: 25 }
          },
          margin: { left: margin, right: margin }
        });
        y = (doc as any).lastAutoTable.finalY + 15;
      }

      // Section finale: Statistiques détaillées
      doc.addPage();
      y = margin;
      const finalSectionNum = String(
        1 + 1 + (equipes.length > 0 ? 1 : 0) + (photos.length > 0 ? 1 : 0) + (reclamations.length > 0 ? 1 : 0) + 1
      );
      addSectionTitle('STATISTIQUES DE LA PÉRIODE', finalSectionNum);

      const statsData = [
        ['Tâches terminées (validées)', String(stats.taches_terminees ?? 0)],
        ['Tâches planifiées sur la période', String(stats.taches_planifiees ?? 0)],
        ['Taux de réalisation', `${stats.taux_realisation ?? 0}%`],
        ['Réclamations créées', String(stats.reclamations_creees ?? 0)],
        ['Réclamations résolues', String(stats.reclamations_resolues ?? 0)],
        ['Total heures travaillées', `${stats.heures_travaillees ?? 0}h`]
      ];

      autoTable(doc, {
        startY: y,
        head: [['Indicateur', 'Valeur']],
        body: statsData,
        theme: 'grid',
        styles: { fontSize: 11, cellPadding: 6 },
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 120 },
          1: { halign: 'center', cellWidth: 40 }
        },
        margin: { left: margin, right: margin }
      });

      // Signature
      y = (doc as any).lastAutoTable.finalY + 40;
      doc.setFontSize(10);
      doc.setTextColor(...grayColor);
      doc.text(`Fait le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, pageWidth - margin, y, { align: 'right' });

      // Numéros de page (à partir de la page 2, numérotation commence à 1)
      const totalPages = doc.getNumberOfPages();
      const contentPages = totalPages - 1; // Exclure la page de couverture
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...grayColor);
        doc.text(`Page ${i - 1} / ${contentPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
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

  // Générer le PDF multi-sites
  const handleDownloadMultiPDF = async () => {
    if (multiSiteReports.length === 0) return;

    setGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let y = margin;

      // Couleurs
      const primaryColor: [number, number, number] = [16, 185, 129]; // emerald-500
      const darkColor: [number, number, number] = [17, 24, 39];
      const grayColor: [number, number, number] = [107, 114, 128];
      const lightGray: [number, number, number] = [243, 244, 246];
      const emeraldColor: [number, number, number] = [16, 185, 129];

      // Charger le logo
      let logoBase64: string | null = null;
      try {
        logoBase64 = await loadImageAsBase64('/GreenSIG_Logo_V1nobackground.png', true);
      } catch {
        console.log('Logo non chargé');
      }

      // ========== PAGE DE COUVERTURE GLOBALE ==========
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Logo
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 45, 20, 90, 68);
      } else {
        doc.setFontSize(40);
        doc.setTextColor(...darkColor);
        doc.setFont('helvetica', 'bold');
        doc.text('GreenSIG', pageWidth / 2, 55, { align: 'center' });
      }

      // Titre
      doc.setFontSize(28);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'bold');
      doc.text('RAPPORT GLOBAL', pageWidth / 2, 105, { align: 'center' });

      doc.setFontSize(16);
      doc.setTextColor(...emeraldColor);
      doc.text(`${multiSiteReports.length} Sites`, pageWidth / 2, 118, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(...grayColor);
      doc.setFont('helvetica', 'normal');
      doc.text('Gestion des Espaces Verts', pageWidth / 2, 130, { align: 'center' });

      // Période
      doc.setFillColor(...lightGray);
      doc.roundedRect(35, 145, pageWidth - 70, 16, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setTextColor(...darkColor);
      const periodeText = `Du ${format(new Date(dateDebut), 'dd MMMM yyyy', { locale: fr })} au ${format(new Date(dateFin), 'dd MMMM yyyy', { locale: fr })}`;
      doc.text(periodeText, pageWidth / 2, 156, { align: 'center' });

      // Collecter les coordonnées de tous les sites
      const siteCoords: { lat: number; lng: number; nom: string }[] = [];
      for (const report of multiSiteReports) {
        const centroid = report.site?.centroid;
        if (centroid?.lat && centroid?.lng) {
          siteCoords.push({ lat: centroid.lat, lng: centroid.lng, nom: report.site?.nom || 'Site' });
        }
      }

      // Carte globale avec tous les sites
      let globalMapY = 170;
      if (siteCoords.length > 0) {
        // Calculer le centre et le zoom pour englober tous les sites
        const lats = siteCoords.map(c => c.lat);
        const lngs = siteCoords.map(c => c.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;

        // Déterminer le zoom en fonction de l'étendue
        const latDiff = maxLat - minLat;
        const lngDiff = maxLng - minLng;
        const maxDiff = Math.max(latDiff, lngDiff);
        let zoom = 15;
        if (maxDiff > 0.5) zoom = 10;
        else if (maxDiff > 0.1) zoom = 12;
        else if (maxDiff > 0.05) zoom = 13;
        else if (maxDiff > 0.01) zoom = 14;
        else if (maxDiff > 0.005) zoom = 15;
        else zoom = 16;

        // Charger la carte satellite centrée
        try {
          const n = Math.pow(2, zoom);
          const xtile = Math.floor((centerLng + 180) / 360 * n);
          const ytile = Math.floor((1 - Math.log(Math.tan(centerLat * Math.PI / 180) + 1 / Math.cos(centerLat * Math.PI / 180)) / Math.PI) / 2 * n);
          const tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ytile}/${xtile}`;
          const globalMapBase64 = await loadImageAsBase64(tileUrl);

          if (globalMapBase64) {
            const mapWidth = pageWidth - 50;
            const mapHeight = 60;
            doc.addImage(globalMapBase64, 'JPEG', 25, globalMapY, mapWidth, mapHeight);

            // Dessiner les marqueurs pour chaque site
            for (let i = 0; i < siteCoords.length; i++) {
              const coord = siteCoords[i]!;
              // Calculer la position relative du marqueur sur la carte
              const tileSize = 256;
              const tileLng = (xtile + 0.5) / n * 360 - 180;
              const tileLatRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (ytile + 0.5) / n)));
              const tileLat = tileLatRad * 180 / Math.PI;

              // Position relative normalisée (-0.5 à 0.5)
              const relX = (coord.lng - tileLng) / (360 / n);
              const relY = (tileLat - coord.lat) / (180 / n) * 2;

              // Position sur la carte dans le PDF
              const markerX = 25 + mapWidth / 2 + relX * mapWidth;
              const markerY = globalMapY + mapHeight / 2 + relY * mapHeight;

              // Vérifier que le marqueur est dans les limites de la carte
              if (markerX >= 25 && markerX <= 25 + mapWidth && markerY >= globalMapY && markerY <= globalMapY + mapHeight) {
                // Ombre
                doc.setFillColor(0, 0, 0);
                doc.circle(markerX + 0.5, markerY + 0.5, 4, 'F');
                // Marqueur rouge
                doc.setFillColor(220, 38, 38);
                doc.circle(markerX, markerY, 4, 'F');
                // Point blanc
                doc.setFillColor(255, 255, 255);
                doc.circle(markerX, markerY, 1.5, 'F');
                // Numéro du site
                doc.setFontSize(6);
                doc.setTextColor(255, 255, 255);
                doc.text(String(i + 1), markerX, markerY + 1, { align: 'center' });
              }
            }

            globalMapY += mapHeight + 5;
          }
        } catch {
          console.log('Carte globale non chargée');
        }
      }

      // Liste des sites
      y = globalMapY + 5;
      doc.setFontSize(11);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'bold');
      doc.text('Sites inclus dans ce rapport:', margin, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      for (let i = 0; i < multiSiteReports.length; i++) {
        const report = multiSiteReports[i]!;
        doc.text(`${i + 1}. ${report.site?.nom || 'Site'}`, margin + 5, y);
        y += 5;
        if (y > 270) break;
      }

      // Pied de page
      doc.setFontSize(8);
      doc.setTextColor(...grayColor);
      doc.text(`Document généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
      doc.setFontSize(9);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'bold');
      doc.text('GreenSIG - Système de Gestion des Espaces Verts', pageWidth / 2, pageHeight - 12, { align: 'center' });

      // ========== PAGE SYNTHÈSE GLOBALE ==========
      doc.addPage();
      y = margin;

      doc.setFillColor(...primaryColor);
      doc.rect(margin, y - 5, 6, 12, 'F');
      doc.setFontSize(16);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'bold');
      doc.text('1. SYNTHÈSE GLOBALE', margin + 10, y + 3);
      y += 20;

      // Statistiques globales
      const globalStats = getGlobalStats();
      if (globalStats) {
        const statsData = [
          ['Total tâches terminées', String(globalStats.taches_terminees)],
          ['Total tâches planifiées', String(globalStats.taches_planifiees)],
          ['Taux de réalisation moyen', `${globalStats.taux_realisation}%`],
          ['Total réclamations créées', String(globalStats.reclamations_creees)],
          ['Total réclamations résolues', String(globalStats.reclamations_resolues)],
          ['Total heures travaillées', `${globalStats.heures_travaillees}h`]
        ];

        autoTable(doc, {
          startY: y,
          head: [['Indicateur', 'Valeur']],
          body: statsData,
          theme: 'grid',
          styles: { fontSize: 11, cellPadding: 6 },
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 120 },
            1: { halign: 'center', cellWidth: 40 }
          },
          margin: { left: margin, right: margin }
        });
        y = (doc as any).lastAutoTable.finalY + 20;
      }

      // ========== TABLEAU COMPARATIF DES SITES ==========
      doc.setFillColor(...primaryColor);
      doc.rect(margin, y - 5, 6, 12, 'F');
      doc.setFontSize(16);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'bold');
      doc.text('2. COMPARATIF PAR SITE', margin + 10, y + 3);
      y += 15;

      const siteRows = multiSiteReports.map(r => [
        r.site?.nom || 'Site',
        String(r.statistiques?.taches_terminees || 0),
        String(r.statistiques?.taches_planifiees || 0),
        `${r.statistiques?.taux_realisation || 0}%`,
        String(r.statistiques?.reclamations_creees || 0),
        `${r.statistiques?.heures_travaillees || 0}h`
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Site', 'Terminées', 'Planifiées', 'Taux', 'Réclam.', 'Heures']],
        body: siteRows,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: emeraldColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { halign: 'center', cellWidth: 22 },
          2: { halign: 'center', cellWidth: 22 },
          3: { halign: 'center', cellWidth: 20 },
          4: { halign: 'center', cellWidth: 20 },
          5: { halign: 'center', cellWidth: 22 }
        },
        margin: { left: margin, right: margin }
      });

      // ========== DÉTAIL PAR SITE ==========
      for (const [index, report] of multiSiteReports.entries()) {
        doc.addPage();
        y = margin;

        // Header du site
        doc.setFillColor(50, 50, 50);
        doc.roundedRect(margin, y, pageWidth - 2 * margin, 20, 3, 3, 'F');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${report.site?.nom || 'Site'}`, margin + 10, y + 14);
        y += 28;

        // Carte satellite du site
        const siteCentroid = report.site?.centroid;
        if (siteCentroid?.lat && siteCentroid?.lng) {
          try {
            const zoom = 17;
            const lat = siteCentroid.lat;
            const lng = siteCentroid.lng;
            const n = Math.pow(2, zoom);
            const xtile = Math.floor((lng + 180) / 360 * n);
            const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
            const tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ytile}/${xtile}`;
            const siteMapBase64 = await loadImageAsBase64(tileUrl);

            if (siteMapBase64) {
              const mapWidth = pageWidth - 2 * margin;
              const mapHeight = 50;
              doc.addImage(siteMapBase64, 'JPEG', margin, y, mapWidth, mapHeight);

              // Marqueur au centre
              const markerX = margin + mapWidth / 2;
              const markerY = y + mapHeight / 2;
              doc.setFillColor(0, 0, 0);
              doc.circle(markerX + 0.5, markerY + 0.5, 4, 'F');
              doc.setFillColor(220, 38, 38);
              doc.circle(markerX, markerY, 4, 'F');
              doc.setFillColor(255, 255, 255);
              doc.circle(markerX, markerY, 1.5, 'F');

              y += mapHeight + 8;
            }
          } catch {
            // Carte non chargée, continuer sans
          }
        }

        // Statistiques du site
        const siteStats = report.statistiques || {};
        doc.setFontSize(10);
        doc.setTextColor(...darkColor);
        doc.setFont('helvetica', 'normal');

        const miniStats = [
          `Tâches terminées: ${siteStats.taches_terminees || 0}`,
          `Tâches planifiées: ${siteStats.taches_planifiees || 0}`,
          `Taux: ${siteStats.taux_realisation || 0}%`,
          `Heures: ${siteStats.heures_travaillees || 0}h`
        ];
        doc.text(miniStats.join('   •   '), margin, y);
        y += 15;

        // Travaux effectués
        if (report.travaux_effectues && report.travaux_effectues.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.text('Travaux effectués', margin, y);
          y += 8;

          autoTable(doc, {
            startY: y,
            head: [['Type', 'Nombre']],
            body: report.travaux_effectues.map(t => [t.type || 'N/A', String(t.count || 0)]),
            theme: 'striped',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: emeraldColor, textColor: [255, 255, 255] },
            margin: { left: margin, right: margin }
          });
          y = (doc as any).lastAutoTable.finalY + 10;
        }

        // Équipes
        if (report.equipes && report.equipes.length > 0 && y < pageHeight - 60) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(...darkColor);
          doc.text('Équipes', margin, y);
          y += 8;

          for (const equipe of report.equipes.slice(0, 3)) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`• ${equipe.nom || 'Équipe'} - ${(equipe.heures_totales ?? 0).toFixed(1)}h`, margin + 5, y);
            y += 5;
          }
          y += 5;
        }

        // Réclamations
        if (report.reclamations && report.reclamations.length > 0 && y < pageHeight - 50) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(...darkColor);
          doc.text(`Points d'attention (${report.reclamations.length})`, margin, y);
          y += 8;

          for (const rec of report.reclamations.slice(0, 5)) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            const recText = `• ${rec.numero} - ${(rec.description || '').substring(0, 50)}${rec.description && rec.description.length > 50 ? '...' : ''} [${rec.statut}]`;
            doc.text(recText, margin + 5, y);
            y += 5;
          }
        }

        // Photos pour ce site
        const sitePhotos = report.photos || [];
        if (sitePhotos.length > 0) {
          doc.addPage();
          y = margin;

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...darkColor);
          doc.text(`Photos - ${report.site?.nom || 'Site'}`, margin, y);
          y += 10;

          const imgWidth = 75;
          const imgHeight = 55;
          const imgGap = 10;

          for (const group of sitePhotos.slice(0, 4)) {
            if (y > pageHeight - 85) {
              doc.addPage();
              y = margin;
            }

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

            // Labels
            doc.setFontSize(8);
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

            y += imgHeight + 10;
          }

          if (sitePhotos.length > 4) {
            doc.setFontSize(9);
            doc.setTextColor(...grayColor);
            doc.text(`+ ${sitePhotos.length - 4} autre(s) groupe(s) de photos`, margin, y);
          }
        }
      }

      // Numéros de page
      const totalPages = doc.getNumberOfPages();
      const contentPages = totalPages - 1;
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...grayColor);
        doc.text(`Page ${i - 1} / ${contentPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
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
    <div className="min-h-screen bg-gray-50 p-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Import Poppins font */}
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');`}
      </style>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rapport de Site</h1>
              <p className="text-gray-500">Générez un rapport d'activité complet pour un site</p>
            </div>
          </div>

          {/* Filtres */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Sites * {selectedSites.length > 0 && <span className="text-emerald-600">({selectedSites.length})</span>}
              </label>
              <button
                type="button"
                onClick={() => setShowSiteDropdown(!showSiteDropdown)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white text-left flex items-center justify-between"
              >
                <span className={selectedSites.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                  {selectedSites.length === 0
                    ? 'Sélectionner des sites'
                    : selectedSites.length === 1
                      ? sites.find(s => s.id === selectedSites[0])?.nom_site || '1 site'
                      : `${selectedSites.length} sites sélectionnés`}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showSiteDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showSiteDropdown && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                  <div className="p-2 border-b border-gray-100">
                    <button
                      type="button"
                      onClick={toggleAllSites}
                      className="w-full px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors text-left"
                    >
                      {selectedSites.length === sites.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                  </div>
                  {sites.map(site => (
                    <label
                      key={site.id}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer"
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date début
              </label>
              <input
                type="date"
                value={dateDebut}
                onChange={e => setDateDebut(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date fin
              </label>
              <input
                type="date"
                value={dateFin}
                onChange={e => setDateFin(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGenerateReport}
                disabled={loading || selectedSites.length === 0}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold shadow-lg transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Générer
                  </>
                )}
              </button>
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
          <div className="space-y-4">
            {/* Header global */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Rapport Global - {multiSiteReports.length} Sites</h2>
                  <p className="text-indigo-100 text-sm mt-2">
                    Du {format(new Date(dateDebut), 'dd MMMM yyyy', { locale: fr })} au {format(new Date(dateFin), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                <button
                  onClick={handleDownloadMultiPDF}
                  disabled={generating}
                  className="px-6 py-3 bg-white text-emerald-600 rounded-xl font-semibold hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-2 shadow-lg transition-all"
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
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Tâches terminées" value={globalStats.taches_terminees} color="emerald" />
                  <StatCard icon={<ClipboardList className="w-5 h-5" />} label="Tâches planifiées" value={globalStats.taches_planifiees} color="blue" />
                  <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Taux réalisation" value={`${globalStats.taux_realisation}%`} color="teal" />
                  <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Réclamations" value={globalStats.reclamations_creees} color="amber" />
                  <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Résolues" value={globalStats.reclamations_resolues} color="green" />
                  <StatCard icon={<Users className="w-5 h-5" />} label="Heures travail" value={`${globalStats.heures_travaillees}h`} color="teal" />
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
          <div className="space-y-4">
            {/* Header du rapport */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{reportData.site?.nom || 'Site'}</h2>
                  <p className="text-emerald-100 text-sm mt-2">
                    {formatPeriode()} • {reportData.periode.nb_jours} jours
                  </p>
                </div>
                <button
                  onClick={handleDownloadPDF}
                  disabled={generating}
                  className="px-6 py-3 bg-white text-emerald-600 rounded-xl font-semibold hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-2 shadow-lg transition-all"
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

            {/* Travaux effectués */}
            <CollapsibleSection
              title="Travaux effectués (validés)"
              icon={<ClipboardList className="w-5 h-5" />}
              count={(reportData.travaux_effectues || []).length}
              isOpen={openSections.travaux}
              onToggle={() => toggleSection('travaux')}
            >
              {!reportData.travaux_effectues || reportData.travaux_effectues.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucun travail validé sur cette période</p>
              ) : (
                <div className="space-y-2">
                  {reportData.travaux_effectues.map((travail, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-semibold text-gray-900">{travail.type || 'Type inconnu'}</p>
                        {travail.description && <p className="text-sm text-gray-500">{travail.description}</p>}
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
                        {travail.count || 0}
                      </span>
                    </div>
                  ))}
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
                          <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                            <span className="text-sm text-gray-700">{op.nom || 'Opérateur'}</span>
                            <span className="text-xs text-gray-500">{(op.heures ?? 0).toFixed(1)}h</span>
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
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Générez un rapport de site</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Sélectionnez un ou plusieurs sites et définissez la période souhaitée, puis cliquez sur "Générer" pour visualiser et télécharger le rapport.
            </p>
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