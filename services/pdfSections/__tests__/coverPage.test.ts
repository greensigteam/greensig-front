import { describe, expect, it } from 'vitest';
import { drawMonthlyCoverPage } from '../coverPage';
import { createRecordedPdf } from '../../../tests/utils/jspdfRecorder';
import type { MonthlyReportData } from '../../../types/reports';

/**
 * Sprint 7 bis — snapshot de la trace jsPDF produite par la page de couverture
 * du rapport mensuel. Protège contre toute régression visuelle lors des
 * prochains découpages des sections PDF.
 *
 * Fixture : site fixe, période fixe, assets "stub" (chaîne courte vs vrai
 * base64). Le recorder ignore le payload des images — seules les dimensions
 * sont enregistrées. La trace est donc 100 % déterministe.
 */

const FIXTURE: MonthlyReportData = {
  periode: {
    date_debut: '2026-04-01',
    date_fin: '2026-04-30',
    nb_jours: 30,
  },
  site: {
    id: 42,
    nom: 'Site Test UM6P Benguerir',
    superficie: 12500,
    centroid: { lat: 32.216, lng: -7.937 },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ],
      ],
    },
  },
  travaux_effectues: { planning: [], statistiques: { total: 0, total_heures: 0, par_statut: {} } },
  travaux_planifies: { planning: [], statistiques: { total: 0, total_heures: 0, par_statut: {} } },
  equipes: [],
  photos: [],
  reclamations: [],
  statistiques: {
    taches_planifiees: 0,
    taches_terminees: 0,
    taux_realisation: 0,
    reclamations_creees: 0,
    reclamations_resolues: 0,
    heures_travaillees: 0,
    heures_theoriques: 0,
  } as MonthlyReportData['statistiques'],
};

describe('drawMonthlyCoverPage — snapshot', () => {
  it('produces a stable trace with all assets available', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    drawMonthlyCoverPage(doc, FIXTURE, {
      logoBase64: 'LOGO_BASE64_STUB',
      logoEnjrBase64: 'LOGO_ENJR_BASE64_STUB',
      mapBase64: 'MAP_BASE64_STUB',
      formattedPeriode: 'Du 01 avril 2026 au 30 avril 2026',
    });
    expect(trace).toMatchSnapshot();
  });

  it('produces a stable trace when only the main logo is available', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    drawMonthlyCoverPage(doc, FIXTURE, {
      logoBase64: 'LOGO_BASE64_STUB',
      logoEnjrBase64: null,
      mapBase64: null,
      formattedPeriode: 'Du 01 avril 2026 au 30 avril 2026',
    });
    expect(trace).toMatchSnapshot();
  });

  it('produces a stable trace when all assets are missing', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    drawMonthlyCoverPage(doc, FIXTURE, {
      logoBase64: null,
      logoEnjrBase64: null,
      mapBase64: null,
      formattedPeriode: 'Du 01 avril 2026 au 30 avril 2026',
    });
    expect(trace).toMatchSnapshot();
  });

  it('omits coordinates when centroid is missing', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    drawMonthlyCoverPage(
      doc,
      { ...FIXTURE, site: { ...FIXTURE.site, centroid: null } },
      {
        logoBase64: 'LOGO_BASE64_STUB',
        logoEnjrBase64: 'LOGO_ENJR_BASE64_STUB',
        mapBase64: 'MAP_BASE64_STUB',
        formattedPeriode: 'Du 01 avril 2026 au 30 avril 2026',
      },
    );
    expect(trace).toMatchSnapshot();
  });
});
