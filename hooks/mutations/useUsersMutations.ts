import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { updateUtilisateur, deleteUtilisateur } from '../../services/usersApi';
import { queryKeys } from '../../lib/queryKeys';
import type { UtilisateurUpdate } from '../../types/users';

function invalidateUtilisateurs(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.utilisateurs.all });
  qc.invalidateQueries({ queryKey: queryKeys.clients.all });
}

export function useUpdateUtilisateur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UtilisateurUpdate }) =>
      updateUtilisateur(id, data),
    onSuccess: (_res, { id }) => {
      invalidateUtilisateurs(qc);
      qc.invalidateQueries({ queryKey: queryKeys.utilisateurs.detail(id) });
    },
  });
}

export function useDeleteUtilisateur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteUtilisateur(id),
    onSuccess: () => invalidateUtilisateurs(qc),
  });
}
