import { useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { API_FORBIDDEN_EVENT, ApiForbiddenEventDetail } from '@/services/api';

/**
 * Messages d'erreur contextuels basés sur l'URL de l'API
 */
const CONTEXTUAL_MESSAGES: Record<string, string> = {
  // Sites
  '/sites': 'Vous n\'avez pas les permissions pour gérer ce site',
  '/sites/': 'Vous n\'avez pas les permissions pour modifier ce site',

  // Équipes
  '/equipes': 'Vous n\'avez pas les permissions pour gérer les équipes',
  '/operateurs': 'Vous n\'avez pas les permissions pour gérer les opérateurs',
  '/absences': 'Vous n\'avez pas les permissions pour gérer les absences',

  // Tâches
  '/taches': 'Vous n\'avez pas les permissions pour gérer les tâches',
  '/planification': 'Vous n\'avez pas les permissions pour modifier la planification',

  // Réclamations
  '/reclamations': 'Vous n\'avez pas les permissions pour gérer cette réclamation',

  // Import/Export
  '/import': 'L\'import de données est réservé aux administrateurs et superviseurs',

  // Utilisateurs
  '/users': 'Vous n\'avez pas les permissions pour gérer les utilisateurs',
  '/clients': 'Vous n\'avez pas les permissions pour gérer les clients',
  '/superviseurs': 'Vous n\'avez pas les permissions pour gérer les superviseurs',

  // Structures
  '/structures': 'Vous n\'avez pas les permissions pour gérer les structures',
};

/**
 * Trouve un message contextuel basé sur l'URL
 */
function getContextualMessage(url: string, defaultMessage: string): string {
  // Chercher une correspondance dans les messages contextuels
  for (const [pattern, message] of Object.entries(CONTEXTUAL_MESSAGES)) {
    if (url.includes(pattern)) {
      return message;
    }
  }
  return defaultMessage;
}

/**
 * ApiErrorListener - Écoute les erreurs API globales et affiche des toasts
 *
 * Ce composant doit être placé à l'intérieur du ToastProvider pour fonctionner.
 * Il écoute les événements personnalisés émis par le service API et affiche
 * des notifications appropriées.
 *
 * Erreurs gérées :
 * - 403 Forbidden : Accès refusé (permissions insuffisantes)
 */
export function ApiErrorListener() {
  const { showToast } = useToast();

  useEffect(() => {
    const handleForbiddenError = (event: CustomEvent<ApiForbiddenEventDetail>) => {
      const { url, message } = event.detail;

      // Utiliser le message du backend s'il est spécifique,
      // sinon utiliser un message contextuel basé sur l'URL
      const displayMessage = message.includes('permissions nécessaires')
        ? getContextualMessage(url, message)
        : message;

      showToast(displayMessage, 'error', 6000);
    };

    // Écouter les événements 403
    window.addEventListener(
      API_FORBIDDEN_EVENT,
      handleForbiddenError as EventListener
    );

    return () => {
      window.removeEventListener(
        API_FORBIDDEN_EVENT,
        handleForbiddenError as EventListener
      );
    };
  }, [showToast]);

  // Ce composant ne rend rien visuellement
  return null;
}
