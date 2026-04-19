import { describe, expect, it, vi } from 'vitest';
import { drawMonthlyKpiSection } from '../kpi';
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

describe('drawMonthlyKpiSection', () => {
  it('renders only the fallback message when kpis is null', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const didDrawPage = vi.fn();
    const y = drawMonthlyKpiSection(buildCtx(doc), 38, {
      kpis: null,
      moisLabel: 'avril 2026',
      tableMargins: TABLE_MARGINS,
      didDrawPage,
    });
    expect({ finalY: y, trace }).toMatchSnapshot();
    expect(didDrawPage).not.toHaveBeenCalled();
  });

  it('renders the full KPI tables with every statut color path covered', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const didDrawPage = vi.fn();
    const kpis = {
      respect_planning: { valeur: 92.5, seuil: 90, statut: 'vert', unite: '%' },
      qualite_service: { valeur: 74.0, seuil: 80, statut: 'orange', unite: '%' },
      taux_traitement_reclamations: { valeur: 45.2, seuil: 70, statut: 'rouge', unite: '%' },
      temps_moyen_traitement: {
        global: { valeur: 12.3, seuil: 24, statut: 'vert', unite: 'h' },
        par_type: [
          { nom: 'Arbre cassé', valeur: 18.0, total: 3 },
          { nom: 'Puit bouché', valeur: 9.0, total: 5 },
        ],
      },
      temps_total_par_site: { total_heures: 180, total_heures_m1: 150, evolution: 20 },
      temps_realisation_tache: [
        {
          type_tache: 'Tonte',
          site_nom: 'Site A',
          heures: 40,
          nb_interventions: 10,
        },
        {
          type_tache: 'Tonte',
          site_nom: 'Site B',
          heures: 20,
          nb_interventions: 5,
        },
        {
          type_tache: 'Élagage',
          site_nom: 'Site A',
          heures: 15,
          nb_interventions: 3,
        },
      ],
    };
    const y = drawMonthlyKpiSection(buildCtx(doc), 38, {
      kpis,
      moisLabel: 'avril 2026',
      tableMargins: TABLE_MARGINS,
      didDrawPage,
    });
    // autoTable produit beaucoup d'ops, on snapshot la trace entière.
    expect(trace).toMatchSnapshot('kpi-full-trace');
    expect(y).toBeGreaterThan(38);
  });

  it('skips KPI4/5 tables when their source data is empty', () => {
    const { doc, trace } = createRecordedPdf('p', 'mm', 'a4');
    const didDrawPage = vi.fn();
    const kpis = {
      respect_planning: { valeur: 92.5, seuil: 90, statut: 'vert', unite: '%' },
      qualite_service: null,
      taux_traitement_reclamations: null,
      temps_moyen_traitement: { global: null, par_type: [] },
      temps_total_par_site: null,
      temps_realisation_tache: [],
    };
    const y = drawMonthlyKpiSection(buildCtx(doc), 38, {
      kpis,
      moisLabel: 'avril 2026',
      tableMargins: TABLE_MARGINS,
      didDrawPage,
    });
    expect(trace).toMatchSnapshot('kpi-minimal-trace');
    expect(y).toBeGreaterThan(38);
  });
});
