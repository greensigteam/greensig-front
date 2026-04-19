import React from 'react';
import { Info, Tag, MapPin, Calendar, AlertCircle, Clock, X } from 'lucide-react';
import { RECLAMATION_STATUS_COLORS } from '../../constants';
import { formatLocalDate } from '../../utils/dateHelpers';
import type { Reclamation } from '../../types/reclamations';

const DATE_FORMAT_OPTIONS = {
  day: 'numeric' as const,
  month: 'long' as const,
  year: 'numeric' as const,
  hour: '2-digit' as const,
  minute: '2-digit' as const,
};

function RefusalCard({
  color,
  icon,
  title,
  byLabel,
  byName,
  date,
  motifLabel,
  motif,
  extraRows,
}: {
  color: 'red' | 'purple' | 'orange';
  icon: React.ReactNode;
  title: string;
  byLabel: string;
  byName?: string | null;
  date?: string | null;
  motifLabel: string;
  motif?: string | null;
  extraRows?: React.ReactNode;
}) {
  const colors = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-600',
      textDark: 'text-red-800',
      borderLine: 'border-red-200',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-600',
      textDark: 'text-purple-800',
      borderLine: 'border-purple-200',
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-600',
      textDark: 'text-orange-800',
      borderLine: 'border-orange-200',
    },
  }[color];

  return (
    <div className={`mt-6 ${colors.bg} p-4 rounded-lg border ${colors.border}`}>
      <h4 className={`text-xs font-semibold uppercase ${colors.text} mb-3 flex items-center gap-1`}>
        {icon}
        {title}
      </h4>
      <div className="space-y-2">
        {byName && (
          <div className="flex items-center gap-2">
            <span className={`text-xs ${colors.text} font-medium w-24`}>{byLabel} :</span>
            <span className={`text-sm font-semibold ${colors.textDark}`}>{byName}</span>
          </div>
        )}
        {date && (
          <div className="flex items-center gap-2">
            <span className={`text-xs ${colors.text} font-medium w-24`}>Date :</span>
            <span className={`text-sm ${colors.textDark}`}>
              {formatLocalDate(date, DATE_FORMAT_OPTIONS)}
            </span>
          </div>
        )}
        {extraRows}
        {motif && (
          <div className={`mt-3 pt-3 border-t ${colors.borderLine}`}>
            <span className={`text-xs ${colors.text} font-medium block mb-1`}>{motifLabel} :</span>
            <p className={`text-sm ${colors.textDark} italic bg-white/50 rounded-lg p-3`}>
              "{motif}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ReclamationInfoPanelProps {
  reclamation: Reclamation;
}

const ReclamationInfoPanel: React.FC<ReclamationInfoPanelProps> = ({ reclamation }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Info className="w-5 h-5 text-emerald-600" />
        Informations
      </h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
          <dt className="text-xs font-medium text-slate-500 mb-1">Type</dt>
          <dd className="font-semibold text-slate-800 flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-600" />
            {reclamation.type_reclamation_nom}
            {reclamation.type_autre_description && (
              <span className="text-sm font-normal text-slate-600">
                : {reclamation.type_autre_description}
              </span>
            )}
          </dd>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
          <dt className="text-xs font-medium text-slate-500 mb-1">Urgence</dt>
          <dd>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: (reclamation.urgence_couleur || '#ccc') + '20',
                color: reclamation.urgence_couleur || '#666',
              }}
            >
              {reclamation.urgence_niveau}
            </span>
          </dd>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
          <dt className="text-xs font-medium text-slate-500 mb-1">Localisation</dt>
          <dd className="font-semibold text-slate-800 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            {reclamation.site_nom || '-'} / {reclamation.zone_nom || '-'}
          </dd>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
          <dt className="text-xs font-medium text-slate-500 mb-1">Statut</dt>
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium"
            style={{
              backgroundColor: (RECLAMATION_STATUS_COLORS[reclamation.statut] || '#6b7280') + '20',
              color: RECLAMATION_STATUS_COLORS[reclamation.statut] || '#6b7280',
            }}
          >
            {reclamation.statut_display || reclamation.statut}
          </span>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
          <dt className="text-xs font-medium text-slate-500 mb-1">Date de constatation</dt>
          <dd className="font-semibold text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            {formatLocalDate(reclamation.date_constatation, DATE_FORMAT_OPTIONS)}
          </dd>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
          <dt className="text-xs font-medium text-slate-500 mb-1">Créé par</dt>
          <dd className="font-semibold text-slate-800">{reclamation.createur_nom || 'Anonyme'}</dd>
        </div>
      </div>

      {reclamation.justification_rejet && (
        <RefusalCard
          color="red"
          icon={<X className="w-3 h-3" />}
          title="Réclamation rejetée par l'administrateur"
          byLabel="Rejetée par"
          byName={reclamation.rejetee_par_nom}
          date={reclamation.date_rejet}
          motifLabel="Motif du rejet"
          motif={reclamation.justification_rejet}
        />
      )}

      {reclamation.commentaire_refus_cloture && (
        <RefusalCard
          color="purple"
          icon={<Clock className="w-3 h-3" />}
          title="Clôture refusée par le client"
          byLabel="Refusée par"
          byName={reclamation.cloture_refusee_par_nom}
          date={reclamation.date_refus_cloture}
          motifLabel="Motif du refus"
          motif={reclamation.commentaire_refus_cloture}
        />
      )}

      {(reclamation.statut === 'INTERVENTION_REFUSEE' || reclamation.motif_refus_intervention) && (
        <RefusalCard
          color="orange"
          icon={<AlertCircle className="w-3 h-3" />}
          title="Intervention refusée par le client"
          byLabel="Refusée par"
          byName={reclamation.intervention_refusee_par_nom}
          date={reclamation.date_refus_intervention}
          motifLabel="Motif du refus"
          motif={reclamation.motif_refus_intervention}
          extraRows={
            reclamation.nombre_refus && reclamation.nombre_refus > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-orange-600 font-medium w-24">Nb de refus :</span>
                <span className="text-sm font-semibold text-orange-800">
                  {reclamation.nombre_refus} fois
                </span>
              </div>
            ) : null
          }
        />
      )}
    </div>
  );
};

export default ReclamationInfoPanel;
