import { useState, useEffect, useMemo } from 'react';
import { useExport } from '../contexts/ExportContext';
import { useToast } from '../contexts/ToastContext';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, getWeek, getYear } from 'date-fns';
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
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { fetchMonthlyReport } from '../services/reportsApi';
import { fetchSites } from '../services/api';
import { StatCard } from '../components/reports/ReportHelpers';
import SingleSitePreview from '../components/reports/SingleSitePreview';
import {
  type ReportMode,
  generateSingleSitePdf,
  generateMultiSitePdf,
} from '../services/pdfSections/generateReport';
import type { MonthlyReportData, MonthlyReportOptions } from '../types/reports';

export type { ReportMode };

interface ReportPageProps {
  mode: ReportMode;
}

export default function ReportPage({ mode }: ReportPageProps) {
  const isWeekly = mode === 'weekly';
  const { startExport, endExport, completeExport, clearCompleted, completedJobs, isExportRunning } =
    useExport();
  const { showToast } = useToast();

  const exportIds = {
    single: `${mode}-pdf`,
    multi: `${mode}-multi-pdf`,
  };
  const generating = isExportRunning(exportIds.single) || isExportRunning(exportIds.multi);

  // ── State ─────────────────────────────────────────────────────────────

  const [sites, setSites] = useState<{ id: number; nom_site: string }[]>([]);
  const [selectedSites, setSelectedSites] = useState<number[]>([]);
  const [reportData, setReportData] = useState<MonthlyReportData | null>(null);
  const [multiSiteReports, setMultiSiteReports] = useState<MonthlyReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);

  const [openSections, setOpenSections] = useState({
    travaux: true,
    planifies: true,
    equipes: true,
    photos: false,
    reclamations: false,
    stats: true,
  });

  // Monthly-specific
  const [dateDebut, setDateDebut] = useState(() => {
    const now = new Date();
    return format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
  });
  const [dateFin, setDateFin] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Weekly-specific
  const [selectedWeekDate, setSelectedWeekDate] = useState<Date>(() => new Date());
  const weekDates = useMemo(() => {
    const start = startOfWeek(selectedWeekDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedWeekDate, { weekStartsOn: 1 });
    return {
      start,
      end,
      dateDebut: format(start, 'yyyy-MM-dd'),
      dateFin: format(end, 'yyyy-MM-dd'),
      weekNumber: getWeek(start, { weekStartsOn: 1 }),
      year: getYear(start),
    };
  }, [selectedWeekDate]);

  // Unified period dates
  const periodDates = isWeekly
    ? { dateDebut: weekDates.dateDebut, dateFin: weekDates.dateFin }
    : { dateDebut, dateFin };

  // ── Effects & Handlers ────────────────────────────────────────────────

  useEffect(() => {
    fetchSites()
      .then((response) => {
        let sitesData: { id: number; nom_site: string }[] = [];
        if (response?.results) {
          if ('features' in response.results && Array.isArray(response.results.features)) {
            sitesData = response.results.features.map((f: any) => ({
              id: f.id,
              nom_site: f.properties?.nom_site || `Site ${f.id}`,
            }));
          } else if (Array.isArray(response.results)) {
            sitesData = response.results.map((f: any) => ({
              id: f.id,
              nom_site: f.properties?.nom_site || f.nom_site || `Site ${f.id}`,
            }));
          }
        }
        setSites(sitesData);
      })
      .catch(() => showToast('Erreur lors du chargement des sites', 'error'));
  }, [showToast]);

  const toggleSiteSelection = (siteId: number) => {
    setSelectedSites((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId],
    );
  };

  const toggleAllSites = () => {
    setSelectedSites((prev) => (prev.length === sites.length ? [] : sites.map((s) => s.id)));
  };

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
        const options: MonthlyReportOptions = {
          siteId: selectedSites[0]!,
          dateDebut: periodDates.dateDebut,
          dateFin: periodDates.dateFin,
        };
        setReportData(await fetchMonthlyReport(options));
      } else {
        const reports: MonthlyReportData[] = [];
        for (const siteId of selectedSites) {
          try {
            const options: MonthlyReportOptions = {
              siteId,
              dateDebut: periodDates.dateDebut,
              dateFin: periodDates.dateFin,
            };
            reports.push(await fetchMonthlyReport(options));
          } catch {
            showToast(`Erreur lors du chargement du site ${siteId}`, 'error');
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

  const formatPeriode = (data?: MonthlyReportData) => {
    const source = data || reportData;
    if (!source) return '';
    const debut = new Date(source.periode.date_debut);
    const fin = new Date(source.periode.date_fin);
    return `Du ${format(debut, 'dd MMMM yyyy', { locale: fr })} au ${format(fin, 'dd MMMM yyyy', { locale: fr })}`;
  };

  const getGlobalStats = () => {
    if (multiSiteReports.length === 0) return null;
    const heures_travaillees = multiSiteReports.reduce(
      (sum, r) => sum + (r.statistiques?.heures_travaillees || 0),
      0,
    );
    const heures_theoriques = multiSiteReports.reduce(
      (sum, r) => sum + (r.statistiques?.heures_theoriques || 0),
      0,
    );
    const ratio_productivite =
      heures_theoriques > 0 && heures_travaillees > 0
        ? Math.round((heures_travaillees / heures_theoriques) * 100 * 10) / 10
        : null;
    return {
      taches_terminees: multiSiteReports.reduce(
        (sum, r) => sum + (r.statistiques?.taches_terminees || 0),
        0,
      ),
      taches_planifiees: multiSiteReports.reduce(
        (sum, r) => sum + (r.statistiques?.taches_planifiees || 0),
        0,
      ),
      taux_realisation: Math.round(
        multiSiteReports.reduce((sum, r) => sum + (r.statistiques?.taux_realisation || 0), 0) /
          multiSiteReports.length,
      ),
      reclamations_creees: multiSiteReports.reduce(
        (sum, r) => sum + (r.statistiques?.reclamations_creees || 0),
        0,
      ),
      reclamations_resolues: multiSiteReports.reduce(
        (sum, r) => sum + (r.statistiques?.reclamations_resolues || 0),
        0,
      ),
      heures_travaillees,
      heures_theoriques,
      ratio_productivite,
    };
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // ── PDF download ─────��────────────────────────────────────────────────

  const handleDownloadPDF = async () => {
    if (!reportData) return;
    startExport(exportIds.single, isWeekly ? 'Rapport hebdomadaire PDF' : 'Rapport mensuel PDF');
    try {
      const { blob, fileName } = await generateSingleSitePdf({
        mode,
        reportData,
        formattedPeriode: formatPeriode(),
        dateDebut: periodDates.dateDebut,
        dateFin: periodDates.dateFin,
        ...(isWeekly && { weekNumber: weekDates.weekNumber, weekYear: weekDates.year }),
      });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.click();
      completeExport(exportIds.single, blobUrl, fileName);
    } catch {
      setError('Erreur lors de la génération du PDF');
    } finally {
      endExport(exportIds.single);
    }
  };

  const handleDownloadMultiPDF = async () => {
    if (multiSiteReports.length === 0) return;
    startExport(
      exportIds.multi,
      isWeekly ? 'Rapport hebdomadaire multi-sites PDF' : 'Rapport mensuel multi-sites PDF',
    );
    try {
      const { blob, fileName } = await generateMultiSitePdf({
        mode,
        reports: multiSiteReports,
        dateDebut: periodDates.dateDebut,
        dateFin: periodDates.dateFin,
        formattedPeriode: isWeekly
          ? `Du ${format(weekDates.start, 'dd MMMM yyyy', { locale: fr })} au ${format(weekDates.end, 'dd MMMM yyyy', { locale: fr })}`
          : `Du ${format(new Date(dateDebut), 'dd MMMM yyyy', { locale: fr })} au ${format(new Date(dateFin), 'dd MMMM yyyy', { locale: fr })}`,
        ...(isWeekly && { weekNumber: weekDates.weekNumber, weekYear: weekDates.year }),
      });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.click();
      completeExport(exportIds.multi, blobUrl, fileName);
    } catch {
      setError('Erreur lors de la génération du PDF');
    } finally {
      endExport(exportIds.multi);
    }
  };

  // ── Period display text ───────────────────────────────────────────────

  const periodDisplayText = isWeekly
    ? `${format(weekDates.start, 'dd MMMM yyyy', { locale: fr })} → ${format(weekDates.end, 'dd MMMM yyyy', { locale: fr })}`
    : `${format(new Date(dateDebut), 'dd MMMM yyyy', { locale: fr })} → ${format(new Date(dateFin), 'dd MMMM yyyy', { locale: fr })}`;

  // ── JSX ───────────────────────────────────────────────────────────────

  return (
    <div className="bg-gray-50 p-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');`}
      </style>

      <div className="w-full max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6">
          <div className="bg-emerald-900 px-6 py-5 rounded-t-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                {isWeekly ? (
                  <Calendar className="w-6 h-6 text-white" />
                ) : (
                  <FileText className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {isWeekly ? 'Rapport Hebdomadaire' : 'Rapport de Site mensuel'}
                </h1>
                <p className="text-emerald-200 text-sm">
                  {isWeekly
                    ? "Générez un rapport d'activité pour une semaine"
                    : "Générez un rapport d'activité complet pour une période"}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="p-6">
            <div
              className={`grid grid-cols-1 gap-5 ${isWeekly ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}
            >
              {/* Site selector */}
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
                  <span
                    className={
                      selectedSites.length === 0 ? 'text-gray-400' : 'text-gray-900 font-medium'
                    }
                  >
                    {selectedSites.length === 0
                      ? 'Sélectionner des sites'
                      : selectedSites.length === 1
                        ? sites.find((s) => s.id === selectedSites[0])?.nom_site || '1 site'
                        : `${selectedSites.length} sites sélectionnés`}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform group-hover:text-emerald-600 ${showSiteDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {showSiteDropdown && (
                  <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                      <button
                        type="button"
                        onClick={toggleAllSites}
                        className="w-full px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors text-left flex items-center gap-2"
                      >
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedSites.length === sites.length ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'}`}
                        >
                          {selectedSites.length === sites.length && (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          )}
                        </div>
                        {selectedSites.length === sites.length
                          ? 'Tout désélectionner'
                          : 'Tout sélectionner'}
                      </button>
                    </div>
                    {sites.map((site) => (
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

              {/* Period selector */}
              {isWeekly ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Semaine
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedWeekDate((prev) => subWeeks(prev, 1))}
                      className="p-3 border border-gray-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all group"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-500 group-hover:text-emerald-600" />
                    </button>
                    <div className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-center">
                      <span className="font-bold text-emerald-700">S{weekDates.weekNumber}</span>
                      <span className="text-gray-500 text-sm ml-2">
                        {format(weekDates.start, 'dd/MM', { locale: fr })} -{' '}
                        {format(weekDates.end, 'dd/MM', { locale: fr })}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedWeekDate((prev) => addWeeks(prev, 1))}
                      className="p-3 border border-gray-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all group"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-emerald-600" />
                    </button>
                    <button
                      onClick={() => setSelectedWeekDate(new Date())}
                      className="px-4 py-3 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
                    >
                      Auj.
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      Date début
                    </label>
                    <input
                      type="date"
                      value={dateDebut}
                      onChange={(e) => setDateDebut(e.target.value)}
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
                      onChange={(e) => setDateFin(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-gray-50 hover:bg-white"
                    />
                  </div>
                </>
              )}

              {/* Generate button */}
              <div className="flex items-end">
                <button
                  onClick={handleGenerateReport}
                  disabled={loading || selectedSites.length === 0}
                  className="w-full px-5 py-3 bg-emerald-900 text-white rounded-xl hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Chargement...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" /> Générer le rapport
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-semibold">Erreur</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Multi-site preview */}
        {multiSiteReports.length > 0 && (
          <div className="space-y-5">
            <div className="bg-emerald-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
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
                  <h2 className="text-2xl font-bold">
                    {isWeekly
                      ? `Rapport Semaine ${weekDates.weekNumber}`
                      : 'Rapport Global Multi-sites'}
                  </h2>
                  <p className="text-emerald-200 text-sm mt-1">{periodDisplayText}</p>
                </div>
                <button
                  onClick={handleDownloadMultiPDF}
                  disabled={generating}
                  className="px-6 py-3.5 bg-white text-emerald-900 rounded-xl font-semibold hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-2 shadow-lg transition-all hover:scale-105"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Génération...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />{' '}
                      {isWeekly ? 'Télécharger PDF' : 'Télécharger PDF Global'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Global stats */}
            {(() => {
              const globalStats = getGlobalStats();
              return (
                globalStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <StatCard
                      icon={<CheckCircle2 className="w-5 h-5" />}
                      label="Tâches terminées"
                      value={globalStats.taches_terminees}
                      color="emerald"
                    />
                    <StatCard
                      icon={<ClipboardList className="w-5 h-5" />}
                      label="Tâches planifiées"
                      value={globalStats.taches_planifiees}
                      color={isWeekly ? 'emerald' : 'blue'}
                    />
                    <StatCard
                      icon={<CheckCircle2 className="w-5 h-5" />}
                      label="Taux réalisation"
                      value={`${globalStats.taux_realisation}%`}
                      color="teal"
                    />
                    <StatCard
                      icon={<AlertTriangle className="w-5 h-5" />}
                      label="Réclamations"
                      value={globalStats.reclamations_creees}
                      color="amber"
                    />
                    <StatCard
                      icon={<CheckCircle2 className="w-5 h-5" />}
                      label="Résolues"
                      value={globalStats.reclamations_resolues}
                      color="green"
                    />
                    <StatCard
                      icon={<Users className="w-5 h-5" />}
                      label="Heures travail"
                      value={`${globalStats.heures_travaillees}h`}
                      color={isWeekly ? 'emerald' : 'teal'}
                    />
                    <StatCard
                      icon={<TrendingUp className="w-5 h-5" />}
                      label="Productivité"
                      value={
                        globalStats.ratio_productivite != null
                          ? `${globalStats.ratio_productivite}%`
                          : 'N/A'
                      }
                      color={
                        globalStats.ratio_productivite != null &&
                        globalStats.ratio_productivite <= 100
                          ? 'emerald'
                          : 'amber'
                      }
                    />
                  </div>
                )
              );
            })()}

            {/* Site detail list */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Détail par site</h3>
              <div className="space-y-3">
                {multiSiteReports.map((report, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{report.site?.nom || 'Site'}</p>
                        <p className="text-sm text-gray-500">{report.site?.adresse || ''}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-emerald-600">
                            {report.statistiques?.taches_terminees || 0}
                          </p>
                          <p className="text-xs text-gray-500">terminées</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-blue-600">
                            {report.statistiques?.taches_planifiees || 0}
                          </p>
                          <p className="text-xs text-gray-500">planifiées</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-teal-600">
                            {report.statistiques?.taux_realisation || 0}%
                          </p>
                          <p className="text-xs text-gray-500">réalisation</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-amber-600">
                            {report.statistiques?.reclamations_creees || 0}
                          </p>
                          <p className="text-xs text-gray-500">réclamations</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-teal-600">
                            {report.statistiques?.heures_travaillees || 0}h
                          </p>
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

        {/* Single-site preview */}
        {reportData && (
          <SingleSitePreview
            reportData={reportData}
            isWeekly={isWeekly}
            weekDates={weekDates}
            openSections={openSections}
            generating={generating}
            exportId={exportIds.single}
            completedJobs={completedJobs}
            periodText={formatPeriode()}
            onDownloadPDF={handleDownloadPDF}
            onClearCompleted={clearCompleted}
            onToggleSection={toggleSection}
          />
        )}

        {/* Initial state */}
        {!reportData && multiSiteReports.length === 0 && !loading && !error && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center border-b border-emerald-100">
              <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                {isWeekly ? (
                  <Calendar className="w-10 h-10 text-emerald-600" />
                ) : (
                  <FileText className="w-10 h-10 text-emerald-600" />
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {isWeekly ? 'Rapport Hebdomadaire' : 'Rapport de Site mensuel'}
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                {isWeekly
                  ? "Générez un rapport d'activité détaillé pour une semaine donnée"
                  : "Générez un rapport d'activité complet pour une période personnalisée"}
              </p>
            </div>
            <div className="p-6">
              <div
                className={`grid grid-cols-1 gap-4 ${isWeekly ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}
              >
                <InitialStateStep
                  num={1}
                  title="Sélectionnez les sites"
                  desc={isWeekly ? 'Un ou plusieurs sites à inclure' : 'Un ou plusieurs sites'}
                />
                {isWeekly ? (
                  <InitialStateStep
                    num={2}
                    title="Choisissez la semaine"
                    desc="Naviguez entre les semaines"
                  />
                ) : (
                  <>
                    <InitialStateStep num={2} title="Date de début" desc="Début de la période" />
                    <InitialStateStep num={3} title="Date de fin" desc="Fin de la période" />
                  </>
                )}
                <InitialStateStep
                  num={isWeekly ? 3 : 4}
                  title="Générez le rapport"
                  desc="Visualisez et téléchargez"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─���────────────────────────���───────────────────────────

function InitialStateStep({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
        <span className="text-emerald-700 font-bold text-sm">{num}</span>
      </div>
      <div>
        <p className="font-semibold text-gray-900 text-sm">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
