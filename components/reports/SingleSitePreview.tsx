import { type FC } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Download,
  MapPin,
  Loader2,
  CheckCircle2,
  Users,
  ClipboardList,
  Camera,
  AlertTriangle,
  Calendar,
  UserCheck,
} from 'lucide-react';
import { StatCard, CollapsibleSection } from './ReportHelpers';
import { aggregateTravauxByType } from '../../services/pdfSections/generateReport';
import type { MonthlyReportData } from '../../types/reports';

interface CompletedJob {
  id: string;
  completedAt: number;
  filename: string;
  downloadUrl: string;
}

interface OpenSections {
  travaux: boolean;
  planifies: boolean;
  equipes: boolean;
  photos: boolean;
  reclamations: boolean;
  stats: boolean;
}

interface WeekDates {
  weekNumber: number;
  year: number;
  start: Date;
  end: Date;
  dateDebut: string;
  dateFin: string;
}

interface SingleSitePreviewProps {
  reportData: MonthlyReportData;
  isWeekly: boolean;
  weekDates: WeekDates;
  openSections: OpenSections;
  generating: boolean;
  exportId: string;
  completedJobs: CompletedJob[];
  periodText: string;
  onDownloadPDF: () => void;
  onClearCompleted: (id: string) => void;
  onToggleSection: (section: keyof OpenSections) => void;
}

function PlanningTable({ items, headerColor }: { items: any[]; headerColor: 'emerald' | 'blue' }) {
  const bgClass = headerColor === 'emerald' ? 'bg-emerald-600' : 'bg-blue-600';
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={`${bgClass} text-white`}>
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
          {items.map((item, index) => (
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
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    item.statut === 'REALISEE'
                      ? 'bg-green-100 text-green-800'
                      : item.statut === 'EN_COURS'
                        ? 'bg-blue-100 text-blue-800'
                        : item.statut === 'REPORTEE'
                          ? 'bg-yellow-100 text-yellow-800'
                          : item.statut === 'ANNULEE'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {item.statut_label}
                </span>
              </td>
              <td
                className={`px-2 py-2 text-center text-xs ${item.priorite === 5 ? 'text-red-600 font-bold' : ''}`}
              >
                {item.priorite_label}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SingleSitePreview: FC<SingleSitePreviewProps> = ({
  reportData,
  isWeekly,
  weekDates,
  openSections,
  generating,
  exportId,
  completedJobs,
  periodText,
  onDownloadPDF,
  onClearCompleted,
  onToggleSection,
}) => (
  <div className="space-y-5">
    {/* Report header */}
    <div className="bg-emerald-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      <div className="flex items-center justify-between relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
              {isWeekly
                ? `Semaine ${weekDates.weekNumber}`
                : `${reportData.periode.nb_jours} jours`}
            </span>
          </div>
          <h2 className="text-2xl font-bold">{reportData.site?.nom || 'Site'}</h2>
          <p className="text-emerald-200 text-sm mt-1">{periodText}</p>
        </div>
        <button
          onClick={onDownloadPDF}
          disabled={generating}
          className="px-6 py-3.5 bg-white text-emerald-900 rounded-xl font-semibold hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-2 shadow-lg transition-all hover:scale-105"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Génération...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" /> Télécharger PDF
            </>
          )}
        </button>
      </div>
    </div>

    {/* Re-download banner */}
    {completedJobs.find((j) => j.id === exportId) &&
      (() => {
        const job = completedJobs.find((j) => j.id === exportId)!;
        return (
          <div className="mx-4 mt-3 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-emerald-800 flex-1">
              Rapport généré le{' '}
              {format(new Date(job.completedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
              {' — '}
              <strong>{job.filename}</strong>
            </span>
            <a
              href={job.downloadUrl}
              download={job.filename}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Re-télécharger
            </a>
            <button
              onClick={() => onClearCompleted(exportId)}
              className="text-emerald-500 hover:text-emerald-700 text-lg leading-none transition-colors"
              title="Effacer"
            >
              ×
            </button>
          </div>
        );
      })()}

    {/* Stats cards */}
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <StatCard
        icon={<CheckCircle2 className="w-5 h-5" />}
        label="Tâches terminées"
        value={reportData.statistiques?.taches_terminees ?? 0}
        color="emerald"
      />
      <StatCard
        icon={<ClipboardList className="w-5 h-5" />}
        label="Tâches planifiées"
        value={reportData.statistiques?.taches_planifiees ?? 0}
        color={isWeekly ? 'emerald' : 'blue'}
      />
      <StatCard
        icon={<CheckCircle2 className="w-5 h-5" />}
        label="Taux réalisation"
        value={`${reportData.statistiques?.taux_realisation ?? 0}%`}
        color="teal"
      />
      <StatCard
        icon={<AlertTriangle className="w-5 h-5" />}
        label="Réclamations"
        value={reportData.statistiques?.reclamations_creees ?? 0}
        color="amber"
      />
      <StatCard
        icon={<CheckCircle2 className="w-5 h-5" />}
        label="Résolues"
        value={reportData.statistiques?.reclamations_resolues ?? 0}
        color="green"
      />
      <StatCard
        icon={<Users className="w-5 h-5" />}
        label="Heures travail"
        value={`${reportData.statistiques?.heures_travaillees ?? 0}h`}
        color={isWeekly ? 'emerald' : 'blue'}
      />
    </div>

    {/* Travaux effectués */}
    {isWeekly ? (
      (() => {
        const agg = aggregateTravauxByType(reportData.travaux_effectues);
        return (
          <CollapsibleSection
            title="Travaux effectués (validés)"
            icon={<ClipboardList className="w-5 h-5" />}
            count={agg.length}
            isOpen={openSections.travaux}
            onToggle={() => onToggleSection('travaux')}
          >
            {agg.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucun travail validé cette semaine</p>
            ) : (
              <div className="space-y-2">
                {agg.map((travail, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <p className="font-semibold text-gray-900">{travail.type}</p>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
                      {travail.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        );
      })()
    ) : (
      <>
        <CollapsibleSection
          title="Travaux effectués (validés)"
          icon={<ClipboardList className="w-5 h-5" />}
          count={reportData.travaux_effectues?.statistiques?.total || 0}
          isOpen={openSections.travaux}
          onToggle={() => onToggleSection('travaux')}
        >
          {!reportData.travaux_effectues?.planning ||
          reportData.travaux_effectues.planning.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Aucun travail réalisé sur cette période
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-sm text-emerald-700">
                  <strong>{reportData.travaux_effectues.statistiques?.total || 0}</strong>{' '}
                  interventions
                </span>
                <span className="text-sm text-emerald-700">
                  <strong>{reportData.travaux_effectues.statistiques?.total_heures || 0}</strong>h
                  totales
                </span>
              </div>
              <PlanningTable items={reportData.travaux_effectues.planning} headerColor="emerald" />
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Travaux planifiés (30 prochains jours)"
          icon={<Calendar className="w-5 h-5" />}
          count={reportData.travaux_planifies?.statistiques?.total || 0}
          isOpen={openSections.planifies}
          onToggle={() => onToggleSection('planifies')}
        >
          {!reportData.travaux_planifies?.planning ||
          reportData.travaux_planifies.planning.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Aucune intervention planifiée pour les 30 prochains jours
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm text-blue-700">
                  <strong>{reportData.travaux_planifies.statistiques?.total || 0}</strong>{' '}
                  interventions
                </span>
                <span className="text-sm text-blue-700">
                  <strong>{reportData.travaux_planifies.statistiques?.total_heures || 0}</strong>h
                  totales
                </span>
              </div>
              <PlanningTable items={reportData.travaux_planifies.planning} headerColor="blue" />
            </div>
          )}
        </CollapsibleSection>
      </>
    )}

    {/* Équipes */}
    <CollapsibleSection
      title="Équipes intervenantes"
      icon={<UserCheck className="w-5 h-5" />}
      count={(reportData.equipes || []).length}
      isOpen={openSections.equipes}
      onToggle={() => onToggleSection('equipes')}
    >
      {!reportData.equipes || reportData.equipes.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          Aucune équipe n'a travaillé{' '}
          {isWeekly ? 'cette semaine' : 'sur ce site durant cette période'}
        </p>
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
                    <span
                      className={`text-sm ${op.absent ? 'text-red-600 line-through' : 'text-gray-700'}`}
                    >
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
      onToggle={() => onToggleSection('photos')}
    >
      {!reportData.photos || reportData.photos.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          Aucune photo disponible {isWeekly ? 'cette semaine' : 'pour cette période'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportData.photos.slice(0, 6).map((group, index) => (
            <div key={index} className="border border-gray-200 rounded-xl p-4">
              <p className="font-semibold text-gray-900 mb-3">
                {group.tache_nom || 'Intervention'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">AVANT</p>
                  {group.avant?.[0]?.url ? (
                    <img
                      src={group.avant[0].url}
                      alt="Avant"
                      className="w-full h-32 object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                      Pas d'image
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">APRÈS</p>
                  {group.apres?.[0]?.url ? (
                    <img
                      src={group.apres[0].url}
                      alt="Après"
                      className="w-full h-32 object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                      Pas d'image
                    </div>
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
      onToggle={() => onToggleSection('reclamations')}
    >
      {!reportData.reclamations || reportData.reclamations.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          Aucune réclamation {isWeekly ? 'cette semaine' : 'pour cette période'}
        </p>
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
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${rec.statut === 'RESOLUE' || rec.statut === 'CLOTUREE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                  >
                    {rec.statut || 'N/A'}
                  </span>
                  {rec.urgence && (
                    <span className="text-xs text-gray-500">Urgence: {rec.urgence}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CollapsibleSection>
  </div>
);

export default SingleSitePreview;
