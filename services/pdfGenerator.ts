/**
 * PDFGenerator - Classe utilitaire pour la génération de PDFs avec headers/footers automatiques
 *
 * Features:
 * - Header automatique avec logo sur chaque page (sauf couverture)
 * - Footer automatique avec numéro de page
 * - Gestion automatique des sauts de page
 * - Marges réservées pour header/footer
 */

import { jsPDF } from 'jspdf';
import {
  computeBBox,
  padBBox,
  findOptimalZoom,
  computeTileGrid,
  loadAndCompositeTiles,
  makeGeoToPixel,
  drawPolygonRing,
  cropCanvas,
} from './mapTileUtils';

// Types
export interface PDFColors {
  primary: [number, number, number];
  dark: [number, number, number];
  gray: [number, number, number];
  lightGray: [number, number, number];
  white: [number, number, number];
}

export interface PDFGeneratorOptions {
  orientation?: 'portrait' | 'landscape';
  logoPath?: string;
  showHeaderOnCover?: boolean;
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

// Constantes par défaut
const DEFAULT_COLORS: PDFColors = {
  primary: [16, 185, 129], // emerald-500
  dark: [17, 24, 39], // gray-900
  gray: [107, 114, 128], // gray-500
  lightGray: [243, 244, 246], // gray-100
  white: [255, 255, 255],
};

const DEFAULT_MARGINS = {
  top: 20,
  bottom: 20,
  left: 20,
  right: 20,
};

const HEADER_HEIGHT = 15; // Hauteur réservée pour le header
const FOOTER_HEIGHT = 12; // Hauteur réservée pour le footer

import { PDF_IMAGE_LOAD_TIMEOUT_MS } from '../constants';

/**
 * Charge une image en base64. Résout à `null` après `timeoutMs` si le réseau
 * est bloqué (ni `onload` ni `onerror` ne sont appelés) — évite que la
 * génération PDF ne reste suspendue indéfiniment sur une tuile indisponible.
 */
export const loadImageAsBase64 = (
  url: string,
  keepTransparency = false,
  timeoutMs: number = PDF_IMAGE_LOAD_TIMEOUT_MS,
): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let settled = false;
    const settle = (value: string | null) => {
      if (settled) return;
      settled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      resolve(value);
    };

    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      // Détacher la source pour annuler la requête en cours côté navigateur.
      img.src = '';
      settle(null);
    }, timeoutMs);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (!keepTransparency) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, 0, 0);
          settle(canvas.toDataURL(keepTransparency ? 'image/png' : 'image/jpeg', 0.8));
        } else {
          settle(null);
        }
      } catch {
        settle(null);
      }
    };
    img.onerror = () => settle(null);

    // Construire l'URL complète si c'est une URL relative
    let fullUrl = url;
    if (url && url.startsWith('/')) {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
      const backendUrl =
        apiUrl === '/api' || apiUrl === '' ? window.location.origin : apiUrl.replace('/api', '');
      fullUrl = backendUrl + url;
    }
    img.src = fullUrl + (fullUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
  });
};

/**
 * Classe principale pour la génération de PDF
 */
export class PDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margins: typeof DEFAULT_MARGINS;
  private colors: PDFColors;
  private logoBase64: string | null = null;
  private logoPath: string;
  private showHeaderOnCover: boolean;
  private currentY: number;
  private isFirstPage: boolean = true;
  private coverPageCount: number = 1; // Nombre de pages de couverture (sans header/footer)

  constructor(options: PDFGeneratorOptions = {}) {
    const orientation = options.orientation === 'landscape' ? 'l' : 'p';
    this.doc = new jsPDF(orientation, 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margins = { ...DEFAULT_MARGINS, ...options.margins };
    this.colors = DEFAULT_COLORS;
    this.logoPath = options.logoPath || '/logo.png';
    this.showHeaderOnCover = options.showHeaderOnCover ?? false;
    this.currentY = this.margins.top;
  }

  /**
   * Initialise le générateur (charge le logo)
   */
  async init(): Promise<void> {
    try {
      this.logoBase64 = await new Promise<string | null>((resolve) => {
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
        img.src = this.logoPath;
      });
    } catch {
      console.warn('Logo non chargé pour le PDF');
    }
  }

  /**
   * Retourne le document jsPDF pour les opérations avancées
   */
  getDoc(): jsPDF {
    return this.doc;
  }

  /**
   * Retourne les dimensions de la page
   */
  getDimensions() {
    return {
      pageWidth: this.pageWidth,
      pageHeight: this.pageHeight,
      contentWidth: this.pageWidth - this.margins.left - this.margins.right,
      contentHeight:
        this.pageHeight - this.margins.top - this.margins.bottom - HEADER_HEIGHT - FOOTER_HEIGHT,
      margins: this.margins,
    };
  }

  /**
   * Retourne les couleurs
   */
  getColors(): PDFColors {
    return this.colors;
  }

  /**
   * Retourne la position Y actuelle
   */
  getCurrentY(): number {
    return this.currentY;
  }

  /**
   * Définit la position Y
   */
  setCurrentY(y: number): void {
    this.currentY = y;
  }

  /**
   * Retourne le logo en base64
   */
  getLogo(): string | null {
    return this.logoBase64;
  }

  /**
   * Définit le nombre de pages de couverture (pages sans header/footer)
   */
  setCoverPageCount(count: number): void {
    this.coverPageCount = count;
  }

  /**
   * Calcule la zone de contenu disponible (en tenant compte du header/footer)
   */
  getContentArea() {
    const startY =
      this.isFirstPage && !this.showHeaderOnCover
        ? this.margins.top
        : this.margins.top + HEADER_HEIGHT;
    const endY = this.pageHeight - this.margins.bottom - FOOTER_HEIGHT;
    return { startY, endY, height: endY - startY };
  }

  /**
   * Vérifie si on doit ajouter une nouvelle page et l'ajoute si nécessaire
   * @param requiredHeight Hauteur requise pour le prochain contenu
   * @returns true si une nouvelle page a été ajoutée
   */
  ensureSpace(requiredHeight: number): boolean {
    const { endY } = this.getContentArea();
    if (this.currentY + requiredHeight > endY) {
      this.addPage();
      return true;
    }
    return false;
  }

  /**
   * Ajoute une nouvelle page avec header automatique
   */
  addPage(): void {
    this.doc.addPage();
    this.isFirstPage = false;
    this.currentY = this.margins.top + HEADER_HEIGHT;
    this.addHeader();
  }

  /**
   * Ajoute le header sur la page courante
   */
  private addHeader(): void {
    const pageNum = this.doc.getNumberOfPages();

    // Ne pas ajouter de header sur les pages de couverture
    if (pageNum <= this.coverPageCount) return;

    if (this.logoBase64) {
      // Logo petit en haut à gauche
      const logoWidth = 25;
      const logoHeight = 8;
      this.doc.addImage(this.logoBase64, 'PNG', this.margins.left, 5, logoWidth, logoHeight);
    } else {
      // Texte de remplacement
      this.doc.setFontSize(10);
      this.doc.setTextColor(...this.colors.primary);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('GreenSIG', this.margins.left, 10);
    }

    // Ligne de séparation
    this.doc.setDrawColor(...this.colors.lightGray);
    this.doc.setLineWidth(0.3);
    this.doc.line(
      this.margins.left,
      this.margins.top + HEADER_HEIGHT - 3,
      this.pageWidth - this.margins.right,
      this.margins.top + HEADER_HEIGHT - 3,
    );
  }

  /**
   * Ajoute les footers (numéros de page) sur toutes les pages
   * À appeler avant save()
   */
  private addAllFooters(): void {
    const totalPages = this.doc.getNumberOfPages();
    const contentPages = totalPages - this.coverPageCount;

    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);

      // Ne pas ajouter de footer sur les pages de couverture
      if (i <= this.coverPageCount) continue;

      const pageNum = i - this.coverPageCount;

      // Ligne de séparation
      this.doc.setDrawColor(...this.colors.lightGray);
      this.doc.setLineWidth(0.3);
      this.doc.line(
        this.margins.left,
        this.pageHeight - this.margins.bottom - FOOTER_HEIGHT + 2,
        this.pageWidth - this.margins.right,
        this.pageHeight - this.margins.bottom - FOOTER_HEIGHT + 2,
      );

      // Numéro de page
      this.doc.setFontSize(9);
      this.doc.setTextColor(...this.colors.gray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(
        `Page ${pageNum} / ${contentPages}`,
        this.pageWidth / 2,
        this.pageHeight - this.margins.bottom,
        { align: 'center' },
      );
    }
  }

  /**
   * Ajoute les headers sur toutes les pages (sauf couverture)
   * Utile si le contenu a été ajouté avant l'appel à init()
   */
  addAllHeaders(): void {
    const totalPages = this.doc.getNumberOfPages();
    const currentPage = this.doc.getCurrentPageInfo().pageNumber;

    for (let i = this.coverPageCount + 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.addHeader();
    }

    // Restaurer la page courante
    this.doc.setPage(currentPage);
  }

  /**
   * Finalise le PDF et retourne le Blob
   */
  finalize(): Blob {
    this.addAllFooters();
    return this.doc.output('blob');
  }

  /**
   * Sauvegarde le PDF avec le nom spécifié
   */
  save(filename: string): void {
    this.addAllFooters();
    this.doc.save(filename);
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * Ajoute un titre de section
   */
  addSectionTitle(title: string, number?: string): number {
    this.ensureSpace(15);

    this.doc.setFillColor(...this.colors.primary);
    this.doc.roundedRect(
      this.margins.left,
      this.currentY - 2,
      this.pageWidth - this.margins.left - this.margins.right,
      10,
      2,
      2,
      'F',
    );

    this.doc.setFontSize(12);
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');

    const text = number ? `${number}. ${title}` : title;
    this.doc.text(text, this.margins.left + 5, this.currentY + 5);

    this.currentY += 15;
    return this.currentY;
  }

  /**
   * Ajoute un sous-titre
   */
  addSubTitle(title: string): number {
    this.ensureSpace(10);

    this.doc.setFontSize(11);
    this.doc.setTextColor(...this.colors.dark);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margins.left, this.currentY);

    this.currentY += 7;
    return this.currentY;
  }

  /**
   * Ajoute du texte simple
   */
  addText(
    text: string,
    options?: {
      fontSize?: number;
      color?: [number, number, number];
      bold?: boolean;
      align?: 'left' | 'center' | 'right';
    },
  ): number {
    const fontSize = options?.fontSize || 10;
    const color = options?.color || this.colors.dark;
    const align = options?.align || 'left';

    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(...color);
    this.doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');

    const maxWidth = this.pageWidth - this.margins.left - this.margins.right;
    const lines = this.doc.splitTextToSize(text, maxWidth);
    const lineHeight = fontSize * 0.4;

    for (const line of lines) {
      this.ensureSpace(lineHeight + 2);

      let x = this.margins.left;
      if (align === 'center') x = this.pageWidth / 2;
      if (align === 'right') x = this.pageWidth - this.margins.right;

      this.doc.text(line, x, this.currentY, { align });
      this.currentY += lineHeight + 1;
    }

    return this.currentY;
  }

  /**
   * Ajoute un espace vertical
   */
  addSpace(height: number): number {
    this.currentY += height;
    return this.currentY;
  }

  /**
   * Ajoute une ligne horizontale
   */
  addHorizontalLine(color?: [number, number, number]): number {
    this.doc.setDrawColor(...(color || this.colors.lightGray));
    this.doc.setLineWidth(0.3);
    this.doc.line(
      this.margins.left,
      this.currentY,
      this.pageWidth - this.margins.right,
      this.currentY,
    );
    this.currentY += 3;
    return this.currentY;
  }
}

/**
 * Rend le polygone du site sur fond satellite Esri.
 * Retourne une image base64 JPEG ou null en cas d'échec.
 *
 * @param geometry GeoJSON geometry (Polygon) du site
 * @param canvasWidth Largeur souhaitée du canvas en pixels (défaut 800)
 */
export async function renderSitePolygonMap(
  geometry: { type: string; coordinates: number[][][] } | null | undefined,
  canvasWidth = 800,
): Promise<string | null> {
  if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) return null;

  try {
    const ring = geometry.coordinates[0];
    if (!ring || ring.length < 3) return null;

    const bbox = computeBBox([ring]);
    if (!bbox) return null;

    const padded = padBBox(bbox);
    const zoom = findOptimalZoom(padded, canvasWidth);
    const grid = computeTileGrid(padded, zoom);

    if (grid.tilesX * grid.tilesY > 36) return null;

    const canvas = await loadAndCompositeTiles(grid, zoom);
    if (!canvas) return null;

    const geoToPixel = makeGeoToPixel(zoom, grid.tileXMin, grid.tileYMin);
    const ctx = canvas.getContext('2d')!;
    drawPolygonRing(ctx, ring, geoToPixel);

    return cropCanvas(canvas, geoToPixel, padded);
  } catch {
    return null;
  }
}

/**
 * Charge un asset statique Vite (depuis public/) en base64.
 * N'utilise PAS le backend URL - sert directement via Vite dev server.
 */
export const loadStaticAsset = (
  path: string,
  format: 'png' | 'jpeg' = 'png',
): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (format === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.9));
      } else resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = path;
  });
};

/**
 * Rend PLUSIEURS polygones de sites sur fond satellite Esri.
 * Utilisé pour la couverture du rapport global multi-sites.
 * Retourne une image base64 JPEG ou null en cas d'échec.
 */
export async function renderMultiSitePolygonMap(
  geometries: Array<{ type: string; coordinates: number[][][] } | null | undefined>,
  canvasWidth = 800,
): Promise<string | null> {
  const validGeometries = geometries.filter(
    (g): g is { type: string; coordinates: number[][][] } =>
      !!g && !!g.coordinates && g.coordinates.length > 0,
  );
  if (validGeometries.length === 0) return null;

  try {
    const allRings: number[][][] = [];
    for (const geometry of validGeometries) {
      const ring = geometry.coordinates[0];
      if (ring && ring.length >= 3) allRings.push(ring);
    }
    if (allRings.length === 0) return null;

    const bbox = computeBBox(allRings);
    if (!bbox) return null;

    const padded = padBBox(bbox);
    const zoom = findOptimalZoom(padded, canvasWidth);
    const grid = computeTileGrid(padded, zoom);

    if (grid.tilesX * grid.tilesY > 64) return null;

    const canvas = await loadAndCompositeTiles(grid, zoom);
    if (!canvas) return null;

    const geoToPixel = makeGeoToPixel(zoom, grid.tileXMin, grid.tileYMin);
    const ctx = canvas.getContext('2d')!;
    for (const ring of allRings) {
      drawPolygonRing(ctx, ring, geoToPixel);
    }

    return cropCanvas(canvas, geoToPixel, padded);
  } catch {
    return null;
  }
}

export default PDFGenerator;
