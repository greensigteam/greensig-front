import { useMemo } from 'react';
import type { EquipeList } from '../types/users';

export function useFilteredEquipes(
  equipes: EquipeList[],
  siteName: string | null | undefined,
): EquipeList[] {
  return useMemo(() => {
    if (!siteName) return equipes;

    return equipes.filter((e) => {
      if (e.sitePrincipalNom === siteName) return true;
      if (e.sitesSecondairesNoms && e.sitesSecondairesNoms.includes(siteName)) return true;
      if (e.siteNom === siteName) return true;
      return false;
    });
  }, [equipes, siteName]);
}
