import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PrivateRoute from '../PrivateRoute';

function renderWithRouter(initialEntry = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <PrivateRoute>
              <div data-testid="protected-content">Protected</div>
            </PrivateRoute>
          }
        />
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PrivateRoute', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('redirects to /login when no token in localStorage', () => {
    renderWithRouter();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('renders children when token exists in localStorage', () => {
    localStorage.setItem('token', 'test-token');
    renderWithRouter();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('redirects when token is empty string', () => {
    localStorage.setItem('token', '');
    renderWithRouter();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });
});
