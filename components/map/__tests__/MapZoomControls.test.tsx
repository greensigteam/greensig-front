import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MapZoomControls } from '../MapZoomControls';

describe('MapZoomControls', () => {
  it('renders the two zoom buttons with titles', () => {
    render(<MapZoomControls onZoomIn={vi.fn()} onZoomOut={vi.fn()} isSidebarCollapsed={false} />);
    expect(screen.getByTitle('Zoom Avant')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom Arrière')).toBeInTheDocument();
  });

  it('calls onZoomIn / onZoomOut on click', () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    render(
      <MapZoomControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} isSidebarCollapsed={false} />,
    );
    fireEvent.click(screen.getByTitle('Zoom Avant'));
    fireEvent.click(screen.getByTitle('Zoom Arrière'));
    expect(onZoomIn).toHaveBeenCalledTimes(1);
    expect(onZoomOut).toHaveBeenCalledTimes(1);
  });

  it('uses 88px left when sidebar is collapsed', () => {
    const { container } = render(
      <MapZoomControls onZoomIn={vi.fn()} onZoomOut={vi.fn()} isSidebarCollapsed />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.left).toBe('88px');
  });

  it('uses 276px left when sidebar is expanded', () => {
    const { container } = render(
      <MapZoomControls onZoomIn={vi.fn()} onZoomOut={vi.fn()} isSidebarCollapsed={false} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.left).toBe('276px');
  });

  it('lifts up when the carousel is open', () => {
    const { container } = render(
      <MapZoomControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        isSidebarCollapsed={false}
        isCarouselOpen
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.bottom).toBe('220px');
  });

  it('uses default bottom when carousel is closed', () => {
    const { container } = render(
      <MapZoomControls onZoomIn={vi.fn()} onZoomOut={vi.fn()} isSidebarCollapsed={false} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.bottom).toBe('32px');
  });
});
