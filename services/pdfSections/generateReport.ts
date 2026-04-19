import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { REPORT_COLORS } from './colors';
import type { RenderContext } from './renderContext';
import { drawSectionTitle } from './renderContext';
import { drawMonthlyCoverPage } from './coverPage';
import { drawMonthlyAvantPropos } from './avantPropos';
import { drawMonthlyActions } from './actions';
import { drawMonthlyKpiSection, drawWeeklyKpiSection } from './kpi';
import {
  drawMonthlyTravauxEffectues,
  drawMonthlyTravauxEffectuesMulti,
  drawMonthlyTravauxPlanifies,
  drawMonthlyTravauxPlanifiesMulti,
  drawWeeklyTravauxEffectues,
  drawWeeklyTravauxPlanifies,
  drawWeeklyTravauxEffectuesMulti,
  drawWeeklyTravauxPlanifiesMulti,
} from './travaux';
import {
  drawMonthlyPhotos,
  drawMonthlyPhotosMulti,
  drawWeeklyPhotos,
  drawWeeklyPhotosMulti,
  loadPhotoGroupAssets,
  type PhotoSiteAssets,
} from './photos';
import { drawMonthlyAnnexes, drawMonthlyAnnexesMulti } from './annexes';
import { paintMonthlyContentChrome } from './pageChrome';
import {
  renderSitePolygonMap,
  renderMultiSitePolygonMap,
  loadStaticAsset,
  loadImageAsBase64,
} from '../pdfGenerator';
import { apiFetch } from '../api';
import { PDF_SATELLITE_TILE_URL_TEMPLATE } from '../../constants';
import type {
  MonthlyReportData,
  MonthlyReportTravauxEffectues,
  MonthlyReportTravauxPlanifies,
} from '../../types/reports';

export type ReportMode = 'weekly' | 'monthly';

export function aggregateTravauxByType(
  section: MonthlyReportTravauxEffectues | MonthlyReportTravauxPlanifies | null | undefined,
): Array<{ type: string; count: number }> {
  const planning = section?.planning ?? [];
  const counts = new Map<string, number>();
  for (const item of planning) {
    const type = item.type || 'Type inconnu';
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return Array.from(counts, ([type, count]) => ({ type, count }));
}

interface PdfAssets {
  logoBase64: string | null;
  logoEnjrBase64: string | null;
  footerBase64: string | null;
}

async function loadPdfAssets(): Promise<PdfAssets> {
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
    /* optional */
  }

  let logoEnjrBase64: string | null = null;
  try {
    logoEnjrBase64 = await loadStaticAsset('/Logo ENJR.png', 'png');
  } catch {
    /* optional */
  }

  let footerBase64: string | null = null;
  try {
    footerBase64 = await loadStaticAsset('/footer.jpeg', 'jpeg');
  } catch {
    /* optional */
  }

  return { logoBase64, logoEnjrBase64, footerBase64 };
}

interface PdfHelpers {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  headerHeight: number;
  contentEndY: number;
  addContentPage: () => number;
  tableMargins: { top: number; bottom: number; left: number; right: number };
  didDrawPage: (data: any) => void;
  renderCtx: RenderContext;
}

function setupPdfDoc(assets: PdfAssets): PdfHelpers {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const headerHeight = 18;
  const footerHeight = 25;
  const contentEndY = pageHeight - margin - footerHeight;

  const { primary, lightGray } = REPORT_COLORS;

  const addPageHeader = () => {
    if (assets.logoBase64) {
      doc.addImage(assets.logoBase64, 'PNG', margin, 5, 25, 10);
    } else {
      doc.setFontSize(12);
      doc.setTextColor(...primary);
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

  const tableMargins = {
    top: margin + headerHeight,
    bottom: margin + footerHeight,
    left: margin,
    right: margin,
  };

  const didDrawPage = (data: any) => {
    const currentPage = doc.getNumberOfPages();
    if (currentPage > 1 && data.pageNumber > 1) addPageHeader();
  };

  const renderCtx: RenderContext = { doc, pageWidth, margin, contentEndY, addContentPage };

  return {
    doc,
    pageWidth,
    pageHeight,
    margin,
    headerHeight,
    contentEndY,
    addContentPage,
    tableMargins,
    didDrawPage,
    renderCtx,
  };
}

async function loadSiteMap(
  geometry: any | undefined,
  centroid: { lat?: number; lng?: number } | undefined,
): Promise<string | null> {
  let mapBase64: string | null = null;
  if (geometry) {
    try {
      mapBase64 = await renderSitePolygonMap(geometry);
    } catch {
      /* optional */
    }
  }
  if (!mapBase64 && centroid?.lat && centroid?.lng) {
    try {
      const zoom = 17;
      const n = Math.pow(2, zoom);
      const xtile = Math.floor(((centroid.lng + 180) / 360) * n);
      const ytile = Math.floor(
        ((1 -
          Math.log(
            Math.tan((centroid.lat * Math.PI) / 180) + 1 / Math.cos((centroid.lat * Math.PI) / 180),
          ) /
            Math.PI) /
          2) *
          n,
      );
      const tileUrl = PDF_SATELLITE_TILE_URL_TEMPLATE.replace('{z}', String(zoom))
        .replace('{y}', String(ytile))
        .replace('{x}', String(xtile));
      mapBase64 = await loadImageAsBase64(tileUrl);
    } catch {
      /* optional */
    }
  }
  return mapBase64;
}

async function fetchKpiData(periodStart: string, siteId?: number): Promise<any> {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
  const mois = periodStart.substring(0, 7);
  try {
    const params = new URLSearchParams();
    if (siteId) params.append('site_id', String(siteId));
    if (mois) params.append('mois', mois);
    const resp = await apiFetch(`${API_BASE_URL}/kpis/?${params.toString()}`);
    return await resp.json();
  } catch {
    return null;
  }
}

function finalizePdf(helpers: PdfHelpers, assets: PdfAssets): void {
  paintMonthlyContentChrome(helpers.doc, {
    logoBase64: assets.logoBase64,
    footerBase64: assets.footerBase64,
    pageWidth: helpers.pageWidth,
    pageHeight: helpers.pageHeight,
    margin: helpers.margin,
    headerHeight: helpers.headerHeight,
  });
}

// ── Single-site PDF ─────────────────────────────────────────────────────

export interface SingleSitePdfOptions {
  mode: ReportMode;
  reportData: MonthlyReportData;
  formattedPeriode: string;
  dateDebut: string;
  dateFin: string;
  weekNumber?: number;
  weekYear?: number;
}

export async function generateSingleSitePdf(
  opts: SingleSitePdfOptions,
): Promise<{ blob: Blob; fileName: string }> {
  const { mode, reportData, formattedPeriode, dateDebut, dateFin } = opts;
  const isWeekly = mode === 'weekly';

  const assets = await loadPdfAssets();
  const h = setupPdfDoc(assets);
  const { doc, renderCtx, tableMargins, didDrawPage } = h;

  // Cover page
  const mapBase64 = await loadSiteMap(
    reportData.site?.geometry,
    reportData.site?.centroid ?? undefined,
  );

  drawMonthlyCoverPage(doc, reportData, {
    logoBase64: assets.logoBase64,
    logoEnjrBase64: assets.logoEnjrBase64,
    mapBase64,
    formattedPeriode,
    ...(isWeekly && {
      title: 'RAPPORT HEBDOMADAIRE',
      subtitle: `Semaine ${opts.weekNumber} - ${opts.weekYear}`,
    }),
  });

  // Content pages
  let y = h.addContentPage();

  y = drawMonthlyAvantPropos(renderCtx, y, {
    siteNames: [reportData.site?.nom || 'Site'],
    ...(isWeekly && { periodLabel: 'cette semaine' }),
  });

  y = drawMonthlyActions(renderCtx, y);

  // KPI
  const kpiData = await fetchKpiData(dateDebut, reportData.site?.id);
  if (isWeekly) {
    y = drawSectionTitle(renderCtx, y, 'INDICATEURS DE PERFORMANCE', '3');
    y = drawWeeklyKpiSection(renderCtx, y, {
      kpis: kpiData?.kpis ?? null,
      tableMargins,
      didDrawPage,
    });
  } else {
    const mois = dateDebut.substring(0, 7);
    y = drawMonthlyKpiSection(renderCtx, y, {
      kpis: kpiData?.kpis ?? null,
      moisLabel: format(new Date(mois + '-01'), 'MMMM yyyy', { locale: fr }),
      tableMargins,
      didDrawPage,
    });
  }

  // Travaux
  const siteName = reportData.site?.nom || 'Site';
  if (isWeekly) {
    y = drawSectionTitle(renderCtx, y, 'TRAVAUX EFFECTUÉS', '4');
    y = drawWeeklyTravauxEffectues(renderCtx, y, {
      items: aggregateTravauxByType(reportData.travaux_effectues),
      tableMargins,
      didDrawPage,
    });
    y = drawSectionTitle(renderCtx, y, 'TRAVAUX PLANIFIÉS', '5');
    y = drawWeeklyTravauxPlanifies(renderCtx, y, {
      items: aggregateTravauxByType(reportData.travaux_planifies),
      tableMargins,
      didDrawPage,
    });
  } else {
    y = drawMonthlyTravauxEffectues(renderCtx, y, {
      siteName,
      items: reportData.travaux_effectues?.planning || [],
    });
    y = drawMonthlyTravauxPlanifies(renderCtx, y, {
      siteName,
      items: reportData.travaux_planifies?.planning || [],
    });
  }

  // Photos
  const photoAssets = await loadPhotoGroupAssets(reportData.photos || [], loadImageAsBase64);
  y = isWeekly
    ? drawWeeklyPhotos(renderCtx, y, photoAssets)
    : drawMonthlyPhotos(renderCtx, y, photoAssets);

  // Blank sections
  if (isWeekly) {
    y = h.addContentPage();
    y = drawSectionTitle(renderCtx, y, 'POINTAGE MENSUEL', '7');
    y = h.addContentPage();
    y = drawSectionTitle(renderCtx, y, 'MATÉRIEL EXISTANT', '8');
    y = h.addContentPage();
    y = drawSectionTitle(renderCtx, y, "POINT D'ATTENTION", '9');
  } else {
    const { dark } = REPORT_COLORS;
    const addInlineSectionTitle = (title: string, num: string) => {
      doc.setFillColor(...REPORT_COLORS.primary);
      doc.rect(h.margin, y - 5, 6, 12, 'F');
      doc.setFontSize(16);
      doc.setTextColor(...dark);
      doc.setFont('helvetica', 'bold');
      doc.text(`${num}. ${title}`, h.margin + 10, y + 3);
      y += 15;
      doc.setFont('helvetica', 'normal');
    };
    y = h.addContentPage();
    addInlineSectionTitle('POINTAGE MENSUEL', '7');
    y = h.addContentPage();
    addInlineSectionTitle('MATÉRIEL EXISTANT', '8');
    y = h.addContentPage();
    addInlineSectionTitle("POINT D'ATTENTION", '9');

    // Monthly annexes
    y = drawMonthlyAnnexes(renderCtx, y, {
      siteName,
      items: reportData.travaux_planifies?.planning || [],
      tableMargins,
      didDrawPage,
    });
  }

  finalizePdf(h, assets);

  const blob = doc.output('blob');
  let fileName: string;
  if (isWeekly) {
    fileName = `Rapport_Hebdo_S${opts.weekNumber}_${opts.weekYear}_${siteName}.pdf`.replace(
      /\s+/g,
      '_',
    );
  } else {
    const d = format(new Date(dateDebut), 'yyyyMMdd');
    const f = format(new Date(dateFin), 'yyyyMMdd');
    fileName = `Rapport_${siteName}_${d}_${f}.pdf`.replace(/\s+/g, '_');
  }

  return { blob, fileName };
}

// ── Multi-site PDF ────────��─────────────────────────────────────────────

export interface MultiSitePdfOptions {
  mode: ReportMode;
  reports: MonthlyReportData[];
  dateDebut: string;
  dateFin: string;
  formattedPeriode: string;
  weekNumber?: number;
  weekYear?: number;
}

function drawMultiSiteCover(
  helpers: PdfHelpers,
  assets: PdfAssets,
  opts: MultiSitePdfOptions,
  mapBase64: string | null,
): void {
  const { doc, pageWidth, pageHeight, margin } = helpers;
  const { dark, gray, lightGray } = REPORT_COLORS;
  const isWeekly = opts.mode === 'weekly';

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  if (assets.logoBase64 && assets.logoEnjrBase64) {
    doc.addImage(assets.logoBase64, 'PNG', margin, 15, 55, 28);
    doc.addImage(assets.logoEnjrBase64, 'PNG', pageWidth - margin - 55, 15, 55, 28);
  } else if (assets.logoBase64) {
    doc.addImage(assets.logoBase64, 'PNG', (pageWidth - 70) / 2, 15, 70, 35);
  }

  doc.setFontSize(28);
  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'bold');
  doc.text(isWeekly ? 'RAPPORT HEBDOMADAIRE' : "RAPPORT D'ACTIVITÉ", pageWidth / 2, 65, {
    align: 'center',
  });

  doc.setFontSize(12);
  doc.setTextColor(...gray);
  doc.setFont('helvetica', 'normal');
  doc.text('Gestion des Espaces Verts', pageWidth / 2, 75, { align: 'center' });

  const globalBoxY = 85;
  doc.setFillColor(50, 50, 50);
  doc.roundedRect(30, globalBoxY, pageWidth - 60, 20, 3, 3, 'F');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  const boxText = isWeekly
    ? `Semaine ${opts.weekNumber} - ${opts.reports.length} Sites`
    : `RAPPORT GLOBAL - ${opts.reports.length} Sites`;
  doc.text(boxText, pageWidth / 2, globalBoxY + 14, { align: 'center' });

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

  const periodeBoxY = coverContentY + 5;
  doc.setFillColor(...lightGray);
  doc.roundedRect(35, periodeBoxY, pageWidth - 70, 16, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'normal');
  doc.text(opts.formattedPeriode, pageWidth / 2, periodeBoxY + 11, { align: 'center' });
}

export async function generateMultiSitePdf(
  opts: MultiSitePdfOptions,
): Promise<{ blob: Blob; fileName: string }> {
  const { mode, reports, dateDebut, dateFin } = opts;
  const isWeekly = mode === 'weekly';

  const assets = await loadPdfAssets();
  const h = setupPdfDoc(assets);
  const { doc, renderCtx, tableMargins, didDrawPage } = h;

  // Cover page
  const allGeometries = reports.map((r) => r.site?.geometry).filter(Boolean);
  let mapBase64: string | null = null;
  if (allGeometries.length > 0) {
    try {
      mapBase64 = await renderMultiSitePolygonMap(allGeometries);
    } catch {
      /* optional */
    }
  }

  drawMultiSiteCover(h, assets, opts, mapBase64);

  // Content pages
  let y = h.addContentPage();

  y = drawMonthlyAvantPropos(renderCtx, y, {
    siteNames: reports.map((r) => r.site?.nom || 'Site'),
    ...(isWeekly && { periodLabel: 'cette semaine' }),
  });

  y = drawMonthlyActions(renderCtx, y);

  // KPI
  const mois = isWeekly
    ? dateDebut.substring(0, 7)
    : reports[0]?.periode?.date_debut?.substring(0, 7) || dateDebut.substring(0, 7);
  const kpiData = await fetchKpiData(mois);

  if (isWeekly) {
    y = drawSectionTitle(renderCtx, y, 'INDICATEURS DE PERFORMANCE', '3');
    y = drawWeeklyKpiSection(renderCtx, y, {
      kpis: kpiData?.kpis ?? null,
      tableMargins,
      didDrawPage,
    });
  } else {
    y = drawMonthlyKpiSection(renderCtx, y, {
      kpis: kpiData?.kpis ?? null,
      moisLabel: format(new Date(mois + '-01'), 'MMMM yyyy', { locale: fr }),
      tableMargins,
      didDrawPage,
    });
  }

  // Travaux
  if (isWeekly) {
    y = drawSectionTitle(renderCtx, y, 'TRAVAUX EFFECTUÉS', '4');
    y = drawWeeklyTravauxEffectuesMulti(renderCtx, y, {
      sites: reports.map((r) => ({
        siteName: r.site?.nom || 'Site',
        items: aggregateTravauxByType(r.travaux_effectues),
      })),
      tableMargins,
      didDrawPage,
    });
    y = drawSectionTitle(renderCtx, y, 'TRAVAUX PLANIFIÉS', '5');
    y = drawWeeklyTravauxPlanifiesMulti(renderCtx, y, {
      sites: reports.map((r) => ({
        siteName: r.site?.nom || 'Site',
        items: aggregateTravauxByType(r.travaux_planifies),
      })),
      tableMargins,
      didDrawPage,
    });
  } else {
    y = drawMonthlyTravauxEffectuesMulti(renderCtx, y, {
      sites: reports.map((r) => ({
        siteName: r.site?.nom || 'Site',
        items: r.travaux_effectues?.planning || [],
      })),
    });
    y = drawMonthlyTravauxPlanifiesMulti(renderCtx, y, {
      sites: reports.map((r) => ({
        siteName: r.site?.nom || 'Site',
        items: r.travaux_planifies?.planning || [],
      })),
    });
  }

  // Photos
  if (isWeekly) {
    const photoSites: PhotoSiteAssets[] = [];
    for (const report of reports) {
      const siteAssets = await loadPhotoGroupAssets(report.photos || [], loadImageAsBase64);
      photoSites.push({ siteName: report.site?.nom || 'Site', groups: siteAssets });
    }
    y = drawWeeklyPhotosMulti(renderCtx, y, photoSites);
  } else {
    const photoSites = await Promise.all(
      reports.map(async (report) => ({
        siteName: report.site?.nom || 'Site',
        groups: await loadPhotoGroupAssets(report.photos || [], loadImageAsBase64),
      })),
    );
    y = drawMonthlyPhotosMulti(renderCtx, y, photoSites);
  }

  // Blank sections
  if (isWeekly) {
    y = h.addContentPage();
    y = drawSectionTitle(renderCtx, y, 'POINTAGE MENSUEL', '7');
    y = h.addContentPage();
    y = drawSectionTitle(renderCtx, y, 'MATÉRIEL EXISTANT', '8');
    y = h.addContentPage();
    y = drawSectionTitle(renderCtx, y, "POINT D'ATTENTION", '9');
  } else {
    const { dark } = REPORT_COLORS;
    const ensureSpace = (requiredHeight: number) => {
      if (y + requiredHeight > h.contentEndY) y = h.addContentPage();
    };
    const addInlineSectionTitle = (title: string, num: string) => {
      ensureSpace(20);
      doc.setFillColor(...REPORT_COLORS.primary);
      doc.rect(h.margin, y - 5, 6, 12, 'F');
      doc.setFontSize(16);
      doc.setTextColor(...dark);
      doc.setFont('helvetica', 'bold');
      doc.text(`${num}. ${title}`, h.margin + 10, y + 3);
      y += 15;
      doc.setFont('helvetica', 'normal');
    };
    y = h.addContentPage();
    addInlineSectionTitle('POINTAGE MENSUEL', '7');
    y = h.addContentPage();
    addInlineSectionTitle('MATÉRIEL EXISTANT', '8');
    y = h.addContentPage();
    addInlineSectionTitle("POINT D'ATTENTION", '9');

    // Monthly annexes
    y = drawMonthlyAnnexesMulti(renderCtx, y, {
      sites: reports.map((r) => ({
        siteName: r.site?.nom || 'Site',
        items: r.travaux_planifies?.planning || [],
      })),
      tableMargins,
      didDrawPage,
    });
  }

  finalizePdf(h, assets);

  const blob = doc.output('blob');
  let fileName: string;
  if (isWeekly) {
    fileName = `Rapport_Hebdo_S${opts.weekNumber}_${opts.weekYear}_${reports.length}Sites.pdf`;
  } else {
    const d = format(new Date(dateDebut), 'yyyyMMdd');
    const f = format(new Date(dateFin), 'yyyyMMdd');
    fileName = `Rapport_Global_${reports.length}Sites_${d}_${f}.pdf`;
  }

  return { blob, fileName };
}
