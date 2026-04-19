import { jsPDF } from 'jspdf';

/**
 * Recorder jsPDF — enveloppe une instance `jsPDF` et enregistre chaque
 * opération de rendu dans une trace déterministe, exploitable comme snapshot.
 *
 * Usage :
 *   const { doc, trace } = createRecordedPdf({ orientation: 'p', unit: 'mm', format: 'a4' });
 *   drawMonthlyCoverPage(doc, fixture, deps);
 *   expect(trace).toMatchSnapshot();
 *
 * Les images (`addImage`) sont enregistrées avec leurs dimensions mais pas
 * leur payload base64 (pour éviter des snapshots de 500 ko qui changent dès
 * qu'un byte varie). Le format est lisible et diff-friendly.
 */

export type PdfOp =
  | { op: 'text'; args: [string | string[], number, number, unknown?] }
  | { op: 'addPage' }
  | { op: 'setFont'; args: [string, string?] }
  | { op: 'setFontSize'; args: [number] }
  | { op: 'setTextColor'; args: number[] }
  | { op: 'setFillColor'; args: number[] }
  | { op: 'setDrawColor'; args: number[] }
  | { op: 'setLineWidth'; args: [number] }
  | { op: 'rect'; args: [number, number, number, number, string?] }
  | { op: 'roundedRect'; args: [number, number, number, number, number, number, string?] }
  | { op: 'line'; args: [number, number, number, number] }
  | { op: 'addImage'; args: [string /* format */, number, number, number, number] }
  | { op: 'autoTable'; args: [unknown] };

export interface RecordedPdf {
  doc: jsPDF;
  trace: PdfOp[];
}

export function createRecordedPdf(
  options: ConstructorParameters<typeof jsPDF>[0] = 'p',
  unit: string = 'mm',
  format: string = 'a4',
): RecordedPdf {
  const doc = new jsPDF(options as never, unit as never, format as never);
  const trace: PdfOp[] = [];

  // Méthodes peinture : on wrappe en préservant la signature de retour (chain).
  // On enregistre l'appel puis on délègue à l'implémentation originale.
  const recordAndCall = <K extends keyof jsPDF>(
    method: K,
    argsMapper: (args: unknown[]) => PdfOp,
  ) => {
    const original = (doc[method] as unknown as (...args: unknown[]) => unknown).bind(doc);
    (doc[method] as unknown) = (...args: unknown[]) => {
      trace.push(argsMapper(args));
      return original(...args);
    };
  };

  recordAndCall('text', (a) => ({
    op: 'text',
    args: a as PdfOp extends { op: 'text'; args: infer T } ? T : never,
  }));
  recordAndCall('addPage', () => ({ op: 'addPage' }));
  recordAndCall('setFont', (a) => ({ op: 'setFont', args: a as [string, string?] }));
  recordAndCall('setFontSize', (a) => ({ op: 'setFontSize', args: a as [number] }));
  recordAndCall('setTextColor', (a) => ({ op: 'setTextColor', args: a as number[] }));
  recordAndCall('setFillColor', (a) => ({ op: 'setFillColor', args: a as number[] }));
  recordAndCall('setDrawColor', (a) => ({ op: 'setDrawColor', args: a as number[] }));
  recordAndCall('setLineWidth', (a) => ({ op: 'setLineWidth', args: a as [number] }));
  recordAndCall('rect', (a) => ({
    op: 'rect',
    args: a as [number, number, number, number, string?],
  }));
  recordAndCall('roundedRect', (a) => ({
    op: 'roundedRect',
    args: a as [number, number, number, number, number, number, string?],
  }));
  recordAndCall('line', (a) => ({ op: 'line', args: a as [number, number, number, number] }));

  // addImage : on enregistre le geom + format MAIS on n'exécute pas
  // l'implémentation jsPDF d'origine — elle essaie de décoder le payload
  // base64 et fait planter les tests qui passent des stubs courts. La trace
  // suffit pour valider les régressions ; le rendu effectif est vérifié
  // manuellement en fin de sprint.
  const origAddImage = doc.addImage.bind(doc);
  (doc.addImage as unknown) = (...args: unknown[]) => {
    const [, format, x, y, width, height] = args as [
      string,
      string,
      number,
      number,
      number,
      number,
    ];
    trace.push({ op: 'addImage', args: [format, x, y, width, height] });
    return doc;
  };
  // Preserve original for rare cases where a test uses real base64 assets.
  (doc as unknown as { __origAddImage: typeof origAddImage }).__origAddImage = origAddImage;

  return { doc, trace };
}
