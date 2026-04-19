import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

interface ProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
  route?: string;
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

function TestProviders({ children, queryClient, route = '/' }: ProvidersProps) {
  const client = queryClient ?? createTestQueryClient();
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

interface RenderOpts extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  route?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  { queryClient, route, ...rest }: RenderOpts = {},
) {
  const client = queryClient ?? createTestQueryClient();
  return {
    queryClient: client,
    ...render(ui, {
      wrapper: ({ children }) => (
        <TestProviders queryClient={client} route={route}>
          {children}
        </TestProviders>
      ),
      ...rest,
    }),
  };
}
