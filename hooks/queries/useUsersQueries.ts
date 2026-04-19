import { useQuery } from '@tanstack/react-query';
import { fetchUtilisateurs, fetchClients } from '../../services/usersApi';
import { queryKeys } from '../../lib/queryKeys';

const TWO_MIN = 2 * 60 * 1000;
const THIRTY_MIN = 30 * 60 * 1000;

export function useUtilisateursQuery() {
  return useQuery({
    queryKey: queryKeys.utilisateurs.list(),
    queryFn: () => fetchUtilisateurs(),
    staleTime: TWO_MIN,
    gcTime: THIRTY_MIN,
  });
}

export function useClientsQuery() {
  return useQuery({
    queryKey: queryKeys.clients.list(),
    queryFn: () => fetchClients(),
    staleTime: TWO_MIN,
    gcTime: THIRTY_MIN,
  });
}
