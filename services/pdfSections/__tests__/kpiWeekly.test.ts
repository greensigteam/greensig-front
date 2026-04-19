import { describe, expect, it, vi } from 'vitest';
import { drawWeeklyKpiSection } from '../kpi';
import { createRecordedPdf } from '../../../tests/utils/jspdfRecorder';
import type { RenderContext } from '../renderContext';

function buildCtx(doc: ReturnType<typeof createRecordedPdf>['doc']): RenderContext {
  return {
    doc,
    pageWidth: 210,
    margin: 20,
    contentEndY: 260,
    addContentPage: () => {
      doc.addPage();
      return 38;
    },
  };
}

const TABLE_MARGINS = { top: 38, bottom: 45, left: 20, right: 20 };

describe('drawWeeklyKpiSection', () => {
  it('renders fallback text only when kpis is null', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const y = drawWeeklyKpiSection(buildCtx(doc), 38, {
      kpis: null,
      tableMargins: TABLE_MARGINS,
      didDrawPage: vi.fn(),
    });
    expect({ finalY: y, trace }).toMatchSnapshot();
  });

  it('renders KPI table + KPI4 bar chart + KPI5 bar chart (full payload)', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const kpis = {
      respect_planning: { valeur: 88, seuil: 90, statut: 'orange', unite: '%' },
      qualite_service: { valeur: 95, seuil: 80, statut: 'vert', unite: '%' },
      taux_traitement_reclamations: { valeur: 50, seuil: 70, statut: 'rouge', unite: '%' },
      temps_moyen_traitement: {
        global: { valeur: 8, seuil: 24, statut: 'vert', unite: 'h' },
        par_type: [
          { nom: 'Arbre cassé', valeur: 12, total: 2 },
          { nom: 'Puit bouché', valeur: 4, total: 6 },
        ],
      },
      temps_total_par_site: { total_heures: 50 },
      temps_realisation_tache: [
        { type_tache: 'Tonte', heures: 20, nb_interventions: 8 },
        { type_tache: 'Élagage', heures: 10, nb_interventions: 3 },
      ],
    };
    const y = drawWeeklyKpiSection(buildCtx(doc), 38, {
      kpis,
      tableMargins: TABLE_MARGINS,
      didDrawPage: vi.fn(),
    });
    expect(trace).toMatchSnapshot('weekly-kpi-full-trace');
    expect(y).toBeGreaterThan(38);
  });

  it('skips KPI4/5 charts when their source data is empty', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const kpis = {
      respect_planning: { valeur: 92, seuil: 90, statut: 'vert', unite: '%' },
      qualite_service: null,
      taux_traitement_reclamations: null,
      temps_moyen_traitement: { global: null, par_type: [] },
      temps_total_par_site: null,
      temps_realisation_tache: [],
    };
    const y = drawWeeklyKpiSection(buildCtx(doc), 38, {
      kpis,
      tableMargins: TABLE_MARGINS,
      didDrawPage: vi.fn(),
    });
    expect(trace).toMatchSnapshot('weekly-kpi-minimal-trace');
    expect(y).toBeGreaterThan(38);
  });
});
