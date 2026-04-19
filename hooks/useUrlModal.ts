import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * useUrlModal — syncs a modal's open/close state to a URL search parameter.
 *
 * Example:
 *   const edit = useUrlModal('edit');   // reads ?modal=edit
 *   const del = useUrlModal('delete');  // reads ?modal=delete
 *   edit.isOpen  // boolean
 *   edit.open()  // sets ?modal=edit (pushes history entry)
 *   edit.close() // removes ?modal (replaces entry, no back-button spam)
 *
 * Why: modal state in useState is lost on reload / deep-linking / Back button.
 * Putting it in the URL makes it bookmarkable and survives navigation.
 */
export function useUrlModal(key: string, paramName: string = 'modal') {
  const [searchParams, setSearchParams] = useSearchParams();
  const isOpen = searchParams.get(paramName) === key;

  const open = useCallback(() => {
    setSearchParams((prev) => {
      prev.set(paramName, key);
      return prev;
    });
  }, [setSearchParams, key, paramName]);

  const close = useCallback(() => {
    setSearchParams(
      (prev) => {
        if (prev.get(paramName) === key) {
          prev.delete(paramName);
        }
        return prev;
      },
      { replace: true },
    );
  }, [setSearchParams, key, paramName]);

  return { isOpen, open, close };
}
