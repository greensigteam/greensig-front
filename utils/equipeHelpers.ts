/**
 * Helpers unifiant l'accès au nom d'équipe.
 *
 * Les serializers backend renvoient tantôt `nomEquipe` (camelCase, nouveau module
 * api_users), tantôt `nom_equipe` (snake_case, legacy). Plutôt que saupoudrer les
 * composants de `x.nomEquipe || x.nom_equipe`, centraliser ici pour que la
 * migration côté backend puisse se faire en un seul endroit.
 */

interface EquipeLike {
  nomEquipe?: string | null;
  nom_equipe?: string | null;
}

/**
 * Retourne le nom d'une équipe quel que soit le format envoyé par le backend.
 * Fallback fourni pour éviter les "undefined" dans l'UI.
 */
export function getEquipeName(equipe: EquipeLike | null | undefined, fallback = '-'): string {
  if (!equipe) return fallback;
  return equipe.nomEquipe ?? equipe.nom_equipe ?? fallback;
}

/**
 * Formate la liste d'équipes d'une tâche. Gère le cas 0, 1 ou N équipes.
 */
export function formatEquipesList(
  equipes: EquipeLike[] | null | undefined,
  fallback = '-',
): string {
  if (!equipes || equipes.length === 0) return fallback;
  return (
    equipes
      .map((e) => getEquipeName(e, ''))
      .filter(Boolean)
      .join(', ') || fallback
  );
}
