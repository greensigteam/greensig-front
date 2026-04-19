import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useDrawing } from '../contexts/DrawingContext';
import { fetchTypesReclamations, fetchUrgences } from '../services/reclamationsApi';
import type { TypeReclamation, Urgence, Reclamation } from '../types/reclamations';
import type { GeoJSONGeometry, DrawingMode } from '../types';
import type { ReportDrawingMode } from '../components/map/MapFloatingTools';

export function useMapReportProblem() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { drawnGeometry, startDrawing, cancelDrawing, clearDrawnGeometry } = useDrawing();

  const [isReportingProblem, setIsReportingProblem] = useState(false);
  const [reportDrawingMode, setReportDrawingMode] = useState<ReportDrawingMode>('none');
  const [reportGeometry, setReportGeometry] = useState<GeoJSONGeometry | null>(null);
  const [showReclamationModal, setShowReclamationModal] = useState(false);
  const [typesReclamation, setTypesReclamation] = useState<TypeReclamation[]>([]);
  const [urgences, setUrgencesReclamation] = useState<Urgence[]>([]);

  const loadReclamationData = async () => {
    try {
      const [typesData, urgencesData] = await Promise.all([
        fetchTypesReclamations(),
        fetchUrgences(),
      ]);
      setTypesReclamation(typesData);
      setUrgencesReclamation(urgencesData);
    } catch (_err: any) {
      showToast('Erreur lors du chargement des données', 'error');
    }
  };

  const handleReportProblem = async () => {
    if (typesReclamation.length === 0) {
      await loadReclamationData();
    }
    setIsReportingProblem(true);
    setReportDrawingMode('none');
  };

  const handleStartReportDrawing = (mode: ReportDrawingMode) => {
    setReportDrawingMode(mode);
    if (mode !== 'none') {
      startDrawing(mode as DrawingMode);
    }
  };

  const handleCancelReporting = () => {
    setIsReportingProblem(false);
    setReportDrawingMode('none');
    setReportGeometry(null);
    cancelDrawing();
    clearDrawnGeometry();
  };

  const handleReclamationSuccess = (reclamation: Reclamation) => {
    showToast(`Réclamation ${reclamation.numero_reclamation} créée avec succès`, 'success');
    setShowReclamationModal(false);
    setReportGeometry(null);
    setIsReportingProblem(false);
    setReportDrawingMode('none');
    navigate('/reclamations');
  };

  useEffect(() => {
    if (
      isReportingProblem &&
      drawnGeometry &&
      reportDrawingMode !== 'none' &&
      !showReclamationModal
    ) {
      setReportGeometry(drawnGeometry);
      setShowReclamationModal(true);
      setReportDrawingMode('none');
    }
  }, [isReportingProblem, drawnGeometry, reportDrawingMode, showReclamationModal]);

  return {
    isReportingProblem,
    setIsReportingProblem,
    reportDrawingMode,
    reportGeometry,
    setReportGeometry,
    showReclamationModal,
    setShowReclamationModal,
    typesReclamation,
    urgences,
    handleReportProblem,
    handleStartReportDrawing,
    handleCancelReporting,
    handleReclamationSuccess,
  };
}
