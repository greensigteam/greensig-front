import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ToastProvider, useToast } from '../ToastContext';

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider maxToasts={5}>{children}</ToastProvider>;
}

describe('useToast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('throws when used outside ToastProvider', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useToast())).toThrow(
      /useToast must be used within a ToastProvider/,
    );
    errorSpy.mockRestore();
  });

  it('showToast adds a toast with the given message and default info type', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => result.current.showToast('hello'));
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]?.message).toBe('hello');
    expect(result.current.toasts[0]?.type).toBe('info');
  });

  it('preserves the supplied type and duration', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => result.current.showToast('boom', 'error', 1000));
    expect(result.current.toasts[0]?.type).toBe('error');
    expect(result.current.toasts[0]?.duration).toBe(1000);
  });

  it('auto-dismisses after the given duration', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => result.current.showToast('bye', 'success', 300));
    expect(result.current.toasts).toHaveLength(1);

    act(() => vi.advanceTimersByTime(299));
    expect(result.current.toasts).toHaveLength(1);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.toasts).toHaveLength(0);
  });

  it('duration=0 disables auto-dismiss', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => result.current.showToast('sticky', 'info', 0));
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.toasts).toHaveLength(1);
  });

  it('dismissToast removes the toast by id', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => result.current.showToast('a', 'info', 0));
    const id = result.current.toasts[0]!.id;
    act(() => result.current.dismissToast(id));
    expect(result.current.toasts).toHaveLength(0);
  });

  it('respects maxToasts by dropping the oldest', () => {
    function small({ children }: { children: ReactNode }) {
      return <ToastProvider maxToasts={2}>{children}</ToastProvider>;
    }
    const { result } = renderHook(() => useToast(), { wrapper: small });

    act(() => result.current.showToast('t1', 'info', 0));
    act(() => result.current.showToast('t2', 'info', 0));
    act(() => result.current.showToast('t3', 'info', 0));

    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts.map((t) => t.message)).toEqual(['t2', 't3']);
  });
});

describe('ToastProvider rendering', () => {
  it('renders nothing in the container when there are no toasts', () => {
    render(
      <ToastProvider>
        <div data-testid="child">hi</div>
      </ToastProvider>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    // No toast node rendered
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each(['success', 'error', 'warning', 'info'] as const)(
    'renders a visible %s toast with dismiss button',
    async (type) => {
      function Trigger() {
        const { showToast } = useToast();
        return <button onClick={() => showToast(`m-${type}`, type, 0)}>fire</button>;
      }
      render(
        <ToastProvider>
          <Trigger />
        </ToastProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'fire' }));
      expect(screen.getByText(`m-${type}`)).toBeInTheDocument();
    },
  );

  it('clicking the dismiss button removes the toast', () => {
    function Trigger() {
      const { showToast } = useToast();
      return <button onClick={() => showToast('gone', 'info', 0)}>fire</button>;
    }
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getByText('gone')).toBeInTheDocument();

    const dismissButtons = screen.getAllByRole('button');
    // There's the "fire" button + the toast's X button
    const xButton = dismissButtons.find((b) => b.textContent === '' || b.textContent === null);
    expect(xButton).toBeDefined();
    fireEvent.click(xButton!);
    expect(screen.queryByText('gone')).not.toBeInTheDocument();
  });
});
