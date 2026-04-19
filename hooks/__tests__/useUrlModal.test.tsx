import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useUrlModal } from '../useUrlModal';

function makeWrapper(initialEntries: string[]) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
}

describe('useUrlModal', () => {
  it('reports closed when param is absent', () => {
    const { result } = renderHook(() => useUrlModal('edit'), {
      wrapper: makeWrapper(['/site/1']),
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('reports open when URL already has ?modal=edit', () => {
    const { result } = renderHook(() => useUrlModal('edit'), {
      wrapper: makeWrapper(['/site/1?modal=edit']),
    });
    expect(result.current.isOpen).toBe(true);
  });

  it('open() sets the param and close() removes it', () => {
    const { result } = renderHook(() => useUrlModal('edit'), {
      wrapper: makeWrapper(['/site/1']),
    });
    expect(result.current.isOpen).toBe(false);

    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it('two modals sharing the default param are mutually exclusive', () => {
    const { result } = renderHook(
      () => ({
        edit: useUrlModal('edit'),
        del: useUrlModal('delete'),
      }),
      { wrapper: makeWrapper(['/site/1']) },
    );

    act(() => result.current.edit.open());
    expect(result.current.edit.isOpen).toBe(true);
    expect(result.current.del.isOpen).toBe(false);

    act(() => result.current.del.open());
    expect(result.current.edit.isOpen).toBe(false);
    expect(result.current.del.isOpen).toBe(true);
  });

  it('close() only acts when the modal owns the param', () => {
    const { result } = renderHook(
      () => ({
        edit: useUrlModal('edit'),
        del: useUrlModal('delete'),
      }),
      { wrapper: makeWrapper(['/site/1?modal=edit']) },
    );

    // del.close() should NOT remove ?modal=edit (it's not del's modal)
    act(() => result.current.del.close());
    expect(result.current.edit.isOpen).toBe(true);
  });

  it('preserves other search params', () => {
    // Need to read the URL via useLocation to assert
    const { result } = renderHook(
      () => ({
        modal: useUrlModal('edit'),
        loc: useLocation(),
      }),
      { wrapper: makeWrapper(['/site/1?tab=stats']) },
    );

    act(() => result.current.modal.open());
    expect(result.current.loc.search).toContain('tab=stats');
    expect(result.current.loc.search).toContain('modal=edit');

    act(() => result.current.modal.close());
    expect(result.current.loc.search).toContain('tab=stats');
    expect(result.current.loc.search).not.toContain('modal=edit');
  });

  it('supports a custom param name', () => {
    const { result } = renderHook(() => useUrlModal('confirm', 'dialog'), {
      wrapper: makeWrapper(['/site/1?dialog=confirm']),
    });
    expect(result.current.isOpen).toBe(true);
  });
});
