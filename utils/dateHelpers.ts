/**
 * Utilitaires pour la gestion des dates et fuseaux horaires
 *
 * Le backend Django utilise UTC pour toutes les dates.
 * Ces fonctions permettent de convertir entre UTC et le fuseau horaire local du navigateur.
 */

/**
 * Convertit une date UTC (string ISO ou Date) vers le fuseau horaire local
 * et retourne une string au format ISO sans le 'Z' (pour les inputs datetime-local)
 *
 * @param utcDate - Date en UTC (string ISO ou objet Date)
 * @returns String au format 'YYYY-MM-DDTHH:mm' (pour input datetime-local)
 *
 * @example
 * // Backend renvoie "2025-12-27T15:00:00Z" (UTC)
 * // Au Maroc (UTC+1), cela devient "2025-12-27T16:00"
 * utcToLocalInput("2025-12-27T15:00:00Z") // "2025-12-27T16:00"
 */
export function utcToLocalInput(utcDate: string | Date | null | undefined): string {
  if (!utcDate) {
    // Par défaut, retourner la date/heure actuelle locale
    const now = new Date();
    return formatDateForInput(now);
  }

  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return formatDateForInput(date);
}

/**
 * Formate une date pour un input datetime-local HTML5
 * Format attendu: 'YYYY-MM-DDTHH:mm'
 *
 * @param date - Objet Date
 * @returns String au format 'YYYY-MM-DDTHH:mm'
 */
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convertit une date UTC vers le fuseau horaire local pour affichage
 *
 * @param utcDate - Date en UTC (string ISO ou objet Date)
 * @param options - Options de formatage (Intl.DateTimeFormat)
 * @returns String formatée selon le fuseau horaire local
 *
 * @example
 * // Affichage court
 * formatLocalDate("2025-12-27T15:00:00Z") // "27/12/2025, 16:00" (au Maroc)
 *
 * // Affichage long
 * formatLocalDate("2025-12-27T15:00:00Z", {
 *   dateStyle: 'long',
 *   timeStyle: 'short'
 * }) // "27 décembre 2025 à 16:00"
 */
export function formatLocalDate(
  utcDate: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
): string {
  if (!utcDate) return '-';

  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  // Utilise le fuseau horaire du navigateur automatiquement
  return new Intl.DateTimeFormat('fr-FR', options).format(date);
}

/**
 * Retourne la date/heure actuelle au format attendu par un input datetime-local
 * Utile pour les valeurs par défaut
 *
 * @returns String au format 'YYYY-MM-DDTHH:mm' (heure locale)
 */
export function getCurrentLocalDateTimeForInput(): string {
  return formatDateForInput(new Date());
}

/**
 * Calcule la différence entre deux dates en heures
 *
 * @param date1 - Première date
 * @param date2 - Deuxième date
 * @returns Nombre d'heures de différence
 */
export function getHoursDifference(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60));
}

/**
 * Compare deux dates au jour près (ignore heures/minutes/timezone).
 *
 * Retourne true si `end` tombe AVANT `start` strictement.
 * Utile pour valider qu'un intervalle de tâche est bien ordonné.
 *
 * Bug historique (avant cette fonction) : l'ancien code comparait
 * `end.getDate() < start.getDate()`, ce qui ne regarde que le jour du mois.
 * Une tâche du 30 avril au 1er mai était donc faussement signalée invalide
 * (1 < 30). Cette fonction compare les timestamps à minuit.
 */
export function isEndBeforeStartDay(start: string | Date, end: string | Date): boolean {
  const startDate = typeof start === 'string' ? new Date(start) : new Date(start);
  const endDate = typeof end === 'string' ? new Date(end) : new Date(end);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  return endDate.getTime() < startDate.getTime();
}
