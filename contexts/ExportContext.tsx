import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

export interface ExportJob {
  id: string;
  label: string;
  startedAt: number;
  /** Si true, useBlocker empêche la navigation. Défaut: false. */
  blocking: boolean;
}

export interface CompletedJob {
  id: string;
  label: string;
  completedAt: number;
  downloadUrl: string;
  filename: string;
}

interface ExportContextValue {
  activeJobs: ExportJob[];
  completedJobs: CompletedJob[];
  startExport: (id: string, label: string, options?: { blocking?: boolean }) => void;
  endExport: (id: string) => void;
  /** Marque le job comme terminé avec succès et mémorise l'URL de téléchargement. */
  completeExport: (id: string, downloadUrl: string, filename: string) => void;
  clearCompleted: (id: string) => void;
  isExportRunning: (id: string) => boolean;
  hasActiveJobs: boolean;
}

const ExportContext = createContext<ExportContextValue | null>(null);

export function ExportProvider({ children }: { children: React.ReactNode }) {
  const [activeJobs, setActiveJobs] = useState<ExportJob[]>([]);
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const hasActiveJobs = activeJobs.length > 0;

  const startExport = useCallback((id: string, label: string, options?: { blocking?: boolean }) => {
    setActiveJobs((prev) => {
      if (prev.some((j) => j.id === id)) return prev;
      return [...prev, { id, label, startedAt: Date.now(), blocking: options?.blocking ?? false }];
    });
  }, []);

  const endExport = useCallback((id: string) => {
    setActiveJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const completeExport = useCallback((id: string, downloadUrl: string, filename: string) => {
    setActiveJobs((prev) => {
      const job = prev.find((j) => j.id === id);
      if (job) {
        setCompletedJobs((cPrev) => [
          ...cPrev.filter((j) => j.id !== id),
          { id, label: job.label, completedAt: Date.now(), downloadUrl, filename },
        ]);
      }
      return prev.filter((j) => j.id !== id);
    });
  }, []);

  const clearCompleted = useCallback((id: string) => {
    setCompletedJobs((prev) => {
      const job = prev.find((j) => j.id === id);
      if (job?.downloadUrl) URL.revokeObjectURL(job.downloadUrl);
      return prev.filter((j) => j.id !== id);
    });
  }, []);

  const isExportRunning = useCallback(
    (id: string) => activeJobs.some((j) => j.id === id),
    [activeJobs],
  );

  // Bloquer la navigation seulement pour les exports marqués blocking: true (ex: capture DOM)
  const hasBlockingJobs = activeJobs.some((j) => j.blocking);
  const blocker = useBlocker(hasBlockingJobs);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const jobLabels = activeJobs.map((j) => j.label).join(', ');
      const confirmed = window.confirm(
        `Un export est en cours : ${jobLabels}.\n\n` +
          `L'opération continuera en arrière-plan mais vous n'aurez plus de retour visuel.\n\n` +
          `Voulez-vous quitter quand même ?`,
      );
      if (confirmed) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Avertir aussi si l'utilisateur ferme l'onglet/navigateur
  useEffect(() => {
    if (!hasActiveJobs) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasActiveJobs]);

  return (
    <ExportContext.Provider
      value={{
        activeJobs,
        completedJobs,
        startExport,
        endExport,
        completeExport,
        clearCompleted,
        isExportRunning,
        hasActiveJobs,
      }}
    >
      {children}
    </ExportContext.Provider>
  );
}

export function useExport() {
  const ctx = useContext(ExportContext);
  if (!ctx) throw new Error('useExport must be used within ExportProvider');
  return ctx;
}
