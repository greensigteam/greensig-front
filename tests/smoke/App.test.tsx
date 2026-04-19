import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('App smoke', () => {
  it('Login page mounts without crashing', async () => {
    const Login = (await import('../../pages/Login')).default;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/login']}>
          <Login onLogin={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(container).toBeTruthy();
  });
});
