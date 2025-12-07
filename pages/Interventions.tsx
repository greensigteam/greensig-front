import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Play, CheckCircle, XCircle, Camera } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { PhotoUpload } from '../components/PhotoUpload';
import {
  MOCK_INTERVENTIONS,
  MOCK_SITES,
  Intervention,
  getSiteById,
  getTeamById,
  getInterventionsToday
} from '../services/mockData';

// User 4.4.5: Finalize Intervention Form
const FinalizeInterventionModal: React.FC<{
  intervention: Intervention;
  onClose: () => void;
  onFinalize: (data: {
    photosAfter: string[];
    comments: string;
    materialsUsed: string;
    actualDuration: number;
    status: 'terminee' | 'non_realisee';
    reason?: string;
  }) => void;
}> = ({ intervention, onClose, onFinalize }) => {
  const [photosAfter, setPhotosAfter] = useState<string[]>([]);
  const [comments, setComments] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [actualDuration, setActualDuration] = useState(intervention.duration);
  const [status, setStatus] = useState<'terminee' | 'non_realisee'>('terminee');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    onFinalize({
      photosAfter,
      comments,
      materialsUsed,
      actualDuration,
      status,
      reason: status === 'non_realisee' ? reason : undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Finaliser l'intervention</h2>
          <p className="text-sm text-gray-500 mt-1">{intervention.title}</p>
        </div>

        {/* Form */}
        <div className="p-4 space-y-6">
          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <div className="flex gap-3">
              <button
                onClick={() => setStatus('terminee')}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${status === 'terminee'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <CheckCircle className={`w-6 h-6 mx-auto mb-1 ${status === 'terminee' ? 'text-green-600' : 'text-gray-400'}`} />
                <div className="text-sm font-medium">Terminée</div>
              </button>
              <button
                onClick={() => setStatus('non_realisee')}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${status === 'non_realisee'
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <XCircle className={`w-6 h-6 mx-auto mb-1 ${status === 'non_realisee' ? 'text-red-600' : 'text-gray-400'}`} />
                <div className="text-sm font-medium">Non réalisée</div>
              </button>
            </div>
          </div>

          {/* Reason if not completed */}
          {status === 'non_realisee' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motif <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Expliquez pourquoi l'intervention n'a pas pu être réalisée..."
                required
              />
            </div>
          )}

          {/* Photos After */}
          {status === 'terminee' && (
            <PhotoUpload
              photos={photosAfter}
              onPhotosChange={setPhotosAfter}
              maxPhotos={5}
              label="Photos après intervention"
            />
          )}

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Commentaires</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Observations, remarques..."
            />
          </div>

          {/* Materials Used */}
          {status === 'terminee' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Matériaux utilisés</label>
              <input
                type="text"
                value={materialsUsed}
                onChange={(e) => setMaterialsUsed(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Ex: Engrais 10kg, Eau 500L..."
              />
            </div>
          )}

          {/* Actual Duration */}
          {status === 'terminee' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Durée réelle (minutes)</label>
              <input
                type="number"
                value={actualDuration}
                onChange={(e) => setActualDuration(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                min="0"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white p-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={status === 'non_realisee' && !reason.trim()}
            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
};

// User 4.4.2: Intervention Detail Card
const InterventionDetailCard: React.FC<{
  intervention: Intervention;
  onStart?: () => void;
  onFinalize?: () => void;
}> = ({ intervention, onStart, onFinalize }) => {
  const site = getSiteById(intervention.siteId);
  const team = getTeamById(intervention.teamId);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{intervention.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{intervention.description}</p>
        </div>
        <StatusBadge status={intervention.status} type="intervention" />
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{site?.name} • {intervention.zone}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{new Date(intervention.scheduledDate).toLocaleDateString('fr-FR')}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="w-4 h-4" />
          <span>{intervention.scheduledTime || '--:--'} ({intervention.duration} min)</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Users className="w-4 h-4" />
          <span>{team?.name}</span>
        </div>
      </div>

      {/* Photos Before */}
      {intervention.photosBefore.length > 0 && (
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">Photos avant</div>
          <div className="grid grid-cols-3 gap-2">
            {intervention.photosBefore.map((photo, index) => (
              <img
                key={index}
                src={photo}
                alt={`Avant ${index + 1}`}
                className="w-full aspect-square object-cover rounded border border-gray-200"
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {intervention.status === 'planifiee' && onStart && (
          <button
            onClick={onStart}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <Play className="w-4 h-4" />
            Démarrer
          </button>
        )}
        {intervention.status === 'en_cours' && onFinalize && (
          <button
            onClick={onFinalize}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <CheckCircle className="w-4 h-4" />
            Finaliser
          </button>
        )}
      </div>
    </div>
  );
};

// Main Interventions Component
const Interventions: React.FC = () => {
  const [interventions, setInterventions] = useState(MOCK_INTERVENTIONS);
  const [filter, setFilter] = useState<'today' | 'week' | 'all'>('today');
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);

  // User 4.4.1: Filter interventions
  const filteredInterventions = interventions.filter((int) => {
    if (filter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return int.scheduledDate === today;
    }
    if (filter === 'week') {
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const intDate = new Date(int.scheduledDate);
      return intDate >= today && intDate <= weekFromNow;
    }
    return true;
  });

  // User 4.4.3: Start intervention
  const handleStartIntervention = (id: string) => {
    setInterventions((prev) =>
      prev.map((int) =>
        int.id === id
          ? {
            ...int,
            status: 'en_cours',
            startTime: new Date().toISOString()
          }
          : int
      )
    );
  };

  // User 4.4.5: Finalize intervention
  const handleFinalizeIntervention = (
    id: string,
    data: {
      photosAfter: string[];
      comments: string;
      materialsUsed: string;
      actualDuration: number;
      status: 'terminee' | 'non_realisee';
      reason?: string;
    }
  ) => {
    setInterventions((prev) =>
      prev.map((int) =>
        int.id === id
          ? {
            ...int,
            status: data.status,
            endTime: new Date().toISOString(),
            photosAfter: data.photosAfter,
            comments: data.comments,
            materialsUsed: data.materialsUsed,
            actualDuration: data.actualDuration
          }
          : int
      )
    );
    setSelectedIntervention(null);
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Interventions</h1>
        <p className="text-gray-500 mt-1">Suivi des interventions terrain</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'today', label: "Aujourd'hui", count: getInterventionsToday().length },
          { id: 'week', label: 'Cette semaine', count: 0 },
          { id: 'all', label: 'Toutes', count: interventions.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${filter === tab.id
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {tab.label}
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${filter === tab.id ? 'bg-white/20' : 'bg-gray-200'
                }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Interventions List */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {filteredInterventions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucune intervention pour cette période</p>
          </div>
        ) : (
          filteredInterventions.map((intervention) => (
            <InterventionDetailCard
              key={intervention.id}
              intervention={intervention}
              onStart={() => handleStartIntervention(intervention.id)}
              onFinalize={() => setSelectedIntervention(intervention)}
            />
          ))
        )}
      </div>

      {/* Finalize Modal */}
      {selectedIntervention && (
        <FinalizeInterventionModal
          intervention={selectedIntervention}
          onClose={() => setSelectedIntervention(null)}
          onFinalize={(data) => handleFinalizeIntervention(selectedIntervention.id, data)}
        />
      )}
    </div>
  );
};

export default Interventions;
