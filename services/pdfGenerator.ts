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
  primary: [16, 185, 129],    // emerald-500
  dark: [17, 24, 39],         // gray-900
  gray: [107, 114, 128],      // gray-500
  lightGray: [243, 244, 246], // gray-100
  white: [255, 255, 255],
};

const DEFAULT_MARGINS = {
  top: 20,
  bottom: 20,
  left: 20,
  right: 20,
};

const HEADER_HEIGHT = 15;  // Hauteur réservée pour le header
const FOOTER_HEIGHT = 12;  // Hauteur réservée pour le footer

/**
 * Charge une image en base64
 */
export const loadImageAsBase64 = (url: string, keepTransparency = false): Promise<string | null> => {
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
          if (!keepTransparency) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL(keepTransparency ? 'image/png' : 'image/jpeg', 0.8));
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);

    // Construire l'URL complète si c'est une URL relative
    let fullUrl = url;
    if (url && url.startsWith('/')) {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
      const backendUrl = apiUrl === '/api' || apiUrl === ''
        ? window.location.origin
        : apiUrl.replace('/api', '');
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
      contentHeight: this.pageHeight - this.margins.top - this.margins.bottom - HEADER_HEIGHT - FOOTER_HEIGHT,
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
    const startY = this.isFirstPage && !this.showHeaderOnCover
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
      this.doc.addImage(
        this.logoBase64,
        'PNG',
        this.margins.left,
        5,
        logoWidth,
        logoHeight
      );
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
      this.margins.top + HEADER_HEIGHT - 3
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
        this.pageHeight - this.margins.bottom - FOOTER_HEIGHT + 2
      );

      // Numéro de page
      this.doc.setFontSize(9);
      this.doc.setTextColor(...this.colors.gray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(
        `Page ${pageNum} / ${contentPages}`,
        this.pageWidth / 2,
        this.pageHeight - this.margins.bottom,
        { align: 'center' }
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
      2, 2, 'F'
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
  addText(text: string, options?: {
    fontSize?: number;
    color?: [number, number, number];
    bold?: boolean;
    align?: 'left' | 'center' | 'right';
  }): number {
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
      this.currentY
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
  canvasWidth = 800
): Promise<string | null> {
  if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) {
    return null;
  }

  try {
    // 1. Extraire l'anneau extérieur
    const ring = geometry.coordinates[0];
    if (!ring || ring.length < 3) return null;

    // 2. Calculer la bounding box
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    for (const coord of ring) {
      const lng = coord[0]!;
      const lat = coord[1]!;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    // 3. Ajouter ~30% de padding
    const lngPad = (maxLng - minLng) * 0.3;
    const latPad = (maxLat - minLat) * 0.3;
    const padMinLng = minLng - lngPad;
    const padMaxLng = maxLng + lngPad;
    const padMinLat = minLat - latPad;
    const padMaxLat = maxLat + latPad;

    // Conversion helpers
    const lngToTileX = (lng: number, z: number) => ((lng + 180) / 360) * Math.pow(2, z);
    const latToTileY = (lat: number, z: number) => {
      const latRad = (lat * Math.PI) / 180;
      return ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, z);
    };

    // 4. Trouver le zoom optimal pour que la bbox tienne dans canvasWidth
    let zoom = 18;
    for (let z = 18; z >= 1; z--) {
      const tileXMin = lngToTileX(padMinLng, z);
      const tileXMax = lngToTileX(padMaxLng, z);
      const widthInTiles = tileXMax - tileXMin;
      const widthInPx = widthInTiles * 256;
      if (widthInPx <= canvasWidth * 1.5) {
        zoom = z;
        break;
      }
    }

    // 5. Calculer la grille de tuiles couvrant la bbox paddée
    const tileXMinF = lngToTileX(padMinLng, zoom);
    const tileXMaxF = lngToTileX(padMaxLng, zoom);
    const tileYMinF = latToTileY(padMaxLat, zoom); // Note: lat plus haute → Y plus petit
    const tileYMaxF = latToTileY(padMinLat, zoom);

    const tileXMin = Math.floor(tileXMinF);
    const tileXMax = Math.floor(tileXMaxF);
    const tileYMin = Math.floor(tileYMinF);
    const tileYMax = Math.floor(tileYMaxF);

    const tilesX = tileXMax - tileXMin + 1;
    const tilesY = tileYMax - tileYMin + 1;

    // Limiter le nombre de tuiles pour éviter les abus
    if (tilesX * tilesY > 36) {
      console.warn('Trop de tuiles requises, fallback');
      return null;
    }

    // 6. Charger toutes les tuiles en parallèle
    const loadTile = (tx: number, ty: number): Promise<HTMLImageElement | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };

    const tilePromises: Promise<{ img: HTMLImageElement | null; tx: number; ty: number }>[] = [];
    for (let tx = tileXMin; tx <= tileXMax; tx++) {
      for (let ty = tileYMin; ty <= tileYMax; ty++) {
        tilePromises.push(
          loadTile(tx, ty).then((img) => ({ img, tx, ty }))
        );
      }
    }

    const tiles = await Promise.all(tilePromises);

    // 7. Composite les tuiles sur un canvas
    const fullWidth = tilesX * 256;
    const fullHeight = tilesY * 256;
    const canvas = document.createElement('canvas');
    canvas.width = fullWidth;
    canvas.height = fullHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    for (const tile of tiles) {
      if (tile.img) {
        const x = (tile.tx - tileXMin) * 256;
        const y = (tile.ty - tileYMin) * 256;
        ctx.drawImage(tile.img, x, y, 256, 256);
      }
    }

    // 8. Convertir les coordonnées géo → pixels sur le canvas
    const geoToPixel = (lng: number, lat: number): [number, number] => {
      const px = (lngToTileX(lng, zoom) - tileXMin) * 256;
      const py = (latToTileY(lat, zoom) - tileYMin) * 256;
      return [px, py];
    };

    // 9. Dessiner le polygone
    ctx.beginPath();
    const [startX, startY] = geoToPixel(ring[0]![0]!, ring[0]![1]!);
    ctx.moveTo(startX, startY);
    for (let i = 1; i < ring.length; i++) {
      const [px, py] = geoToPixel(ring[i]![0]!, ring[i]![1]!);
      ctx.lineTo(px, py);
    }
    ctx.closePath();

    // Remplissage semi-transparent emerald
    ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.fill();

    // Bordure solide emerald
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 10. Recadrer sur la zone utile (bbox paddée)
    const [cropX1, cropY1] = geoToPixel(padMinLng, padMaxLat);
    const [cropX2, cropY2] = geoToPixel(padMaxLng, padMinLat);
    const cropX = Math.max(0, Math.floor(cropX1));
    const cropY = Math.max(0, Math.floor(cropY1));
    const cropW = Math.min(fullWidth - cropX, Math.ceil(cropX2 - cropX1));
    const cropH = Math.min(fullHeight - cropY, Math.ceil(cropY2 - cropY1));

    if (cropW <= 0 || cropH <= 0) return null;

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return null;
    croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    return croppedCanvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.error('renderSitePolygonMap error:', err);
    return null;
  }
}

/**
 * Charge un asset statique Vite (depuis public/) en base64.
 * N'utilise PAS le backend URL - sert directement via Vite dev server.
 */
export const loadStaticAsset = (path: string, format: 'png' | 'jpeg' = 'png'): Promise<string | null> => {
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
  canvasWidth = 800
): Promise<string | null> {
  const validGeometries = geometries.filter(
    (g): g is { type: string; coordinates: number[][][] } =>
      !!g && !!g.coordinates && g.coordinates.length > 0
  );
  if (validGeometries.length === 0) return null;

  try {
    // 1. Collecter tous les anneaux et calculer la bounding box globale
    const allRings: number[][][] = [];
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;

    for (const geometry of validGeometries) {
      const ring = geometry.coordinates[0];
      if (!ring || ring.length < 3) continue;
      allRings.push(ring);

      for (const coord of ring) {
        const lng = coord[0]!;
        const lat = coord[1]!;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }

    if (allRings.length === 0) return null;

    // 2. Padding ~30%
    const lngPad = (maxLng - minLng) * 0.3 || 0.001;
    const latPad = (maxLat - minLat) * 0.3 || 0.001;
    const padMinLng = minLng - lngPad;
    const padMaxLng = maxLng + lngPad;
    const padMinLat = minLat - latPad;
    const padMaxLat = maxLat + latPad;

    // Helpers
    const lngToTileX = (lng: number, z: number) => ((lng + 180) / 360) * Math.pow(2, z);
    const latToTileY = (lat: number, z: number) => {
      const latRad = (lat * Math.PI) / 180;
      return ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, z);
    };

    // 3. Zoom optimal
    let zoom = 18;
    for (let z = 18; z >= 1; z--) {
      const tileXMin = lngToTileX(padMinLng, z);
      const tileXMax = lngToTileX(padMaxLng, z);
      const widthInTiles = tileXMax - tileXMin;
      const widthInPx = widthInTiles * 256;
      if (widthInPx <= canvasWidth * 1.5) {
        zoom = z;
        break;
      }
    }

    // 4. Grille de tuiles
    const tileXMinF = lngToTileX(padMinLng, zoom);
    const tileXMaxF = lngToTileX(padMaxLng, zoom);
    const tileYMinF = latToTileY(padMaxLat, zoom);
    const tileYMaxF = latToTileY(padMinLat, zoom);

    const tileXMin = Math.floor(tileXMinF);
    const tileXMax = Math.floor(tileXMaxF);
    const tileYMin = Math.floor(tileYMinF);
    const tileYMax = Math.floor(tileYMaxF);

    const tilesX = tileXMax - tileXMin + 1;
    const tilesY = tileYMax - tileYMin + 1;

    if (tilesX * tilesY > 64) {
      console.warn('Trop de tuiles requises pour multi-site, fallback');
      return null;
    }

    // 5. Charger les tuiles
    const loadTile = (tx: number, ty: number): Promise<HTMLImageElement | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };

    const tilePromises: Promise<{ img: HTMLImageElement | null; tx: number; ty: number }>[] = [];
    for (let tx = tileXMin; tx <= tileXMax; tx++) {
      for (let ty = tileYMin; ty <= tileYMax; ty++) {
        tilePromises.push(loadTile(tx, ty).then((img) => ({ img, tx, ty })));
      }
    }

    const tiles = await Promise.all(tilePromises);

    // 6. Composite
    const fullWidth = tilesX * 256;
    const fullHeight = tilesY * 256;
    const canvas = document.createElement('canvas');
    canvas.width = fullWidth;
    canvas.height = fullHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    for (const tile of tiles) {
      if (tile.img) {
        const x = (tile.tx - tileXMin) * 256;
        const y = (tile.ty - tileYMin) * 256;
        ctx.drawImage(tile.img, x, y, 256, 256);
      }
    }

    // 7. Coordonnées géo → pixels
    const geoToPixel = (lng: number, lat: number): [number, number] => {
      const px = (lngToTileX(lng, zoom) - tileXMin) * 256;
      const py = (latToTileY(lat, zoom) - tileYMin) * 256;
      return [px, py];
    };

    // 8. Dessiner TOUS les polygones
    for (const ring of allRings) {
      ctx.beginPath();
      const [startX, startY] = geoToPixel(ring[0]![0]!, ring[0]![1]!);
      ctx.moveTo(startX, startY);
      for (let i = 1; i < ring.length; i++) {
        const [px, py] = geoToPixel(ring[i]![0]!, ring[i]![1]!);
        ctx.lineTo(px, py);
      }
      ctx.closePath();

      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.fill();

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // 9. Recadrer
    const [cropX1, cropY1] = geoToPixel(padMinLng, padMaxLat);
    const [cropX2, cropY2] = geoToPixel(padMaxLng, padMinLat);
    const cropX = Math.max(0, Math.floor(cropX1));
    const cropY = Math.max(0, Math.floor(cropY1));
    const cropW = Math.min(fullWidth - cropX, Math.ceil(cropX2 - cropX1));
    const cropH = Math.min(fullHeight - cropY, Math.ceil(cropY2 - cropY1));

    if (cropW <= 0 || cropH <= 0) return null;

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return null;
    croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    return croppedCanvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.error('renderMultiSitePolygonMap error:', err);
    return null;
  }
}

export default PDFGenerator;
