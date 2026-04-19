import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReclamationActionModal from '../ReclamationActionModal';

const defaultProps = {
  title: 'Refuser la clôture',
  subtitle: 'Expliquez pourquoi',
  warningTitle: 'Commentaire obligatoire',
  warningMessage: 'Vous devez expliquer.',
  warningColor: 'red' as const,
  textareaLabel: 'Motif',
  textareaPlaceholder: 'Décrivez...',
  textareaValue: '',
  onTextareaChange: vi.fn(),
  infoTitle: 'Après validation :',
  infoItems: ['Item 1', 'Item 2'],
  confirmLabel: 'Confirmer',
  confirmColor: 'red' as const,
  isSubmitting: false,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('ReclamationActionModal', () => {
  it('renders title and subtitle', () => {
    render(<ReclamationActionModal {...defaultProps} />);
    expect(screen.getByText('Refuser la clôture')).toBeTruthy();
    expect(screen.getByText('Expliquez pourquoi')).toBeTruthy();
  });

  it('renders warning message', () => {
    render(<ReclamationActionModal {...defaultProps} />);
    expect(screen.getByText('Commentaire obligatoire')).toBeTruthy();
    expect(screen.getByText('Vous devez expliquer.')).toBeTruthy();
  });

  it('renders info items', () => {
    render(<ReclamationActionModal {...defaultProps} />);
    expect(screen.getByText('Item 1')).toBeTruthy();
    expect(screen.getByText('Item 2')).toBeTruthy();
  });

  it('disables confirm button when textarea is empty', () => {
    render(<ReclamationActionModal {...defaultProps} textareaValue="" />);
    const confirmBtn = screen.getByText('Confirmer');
    expect(confirmBtn.closest('button')?.disabled).toBe(true);
  });

  it('enables confirm button when textarea has content', () => {
    render(<ReclamationActionModal {...defaultProps} textareaValue="some text" />);
    const confirmBtn = screen.getByText('Confirmer');
    expect(confirmBtn.closest('button')?.disabled).toBe(false);
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ReclamationActionModal {...defaultProps} textareaValue="reason" onConfirm={onConfirm} />,
    );
    fireEvent.click(screen.getByText('Confirmer'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<ReclamationActionModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Annuler'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows spinner when submitting', () => {
    render(<ReclamationActionModal {...defaultProps} isSubmitting={true} textareaValue="test" />);
    expect(screen.getByText('Envoi...')).toBeTruthy();
  });

  it('renders extra content when provided', () => {
    render(
      <ReclamationActionModal
        {...defaultProps}
        extraContent={<div data-testid="extra">Extra</div>}
      />,
    );
    expect(screen.getByTestId('extra')).toBeTruthy();
  });

  it('uses orange color scheme', () => {
    const { container } = render(
      <ReclamationActionModal
        {...defaultProps}
        warningColor="orange"
        confirmColor="orange"
        textareaValue="test"
      />,
    );
    const confirmBtn = screen.getByText('Confirmer').closest('button');
    expect(confirmBtn?.className).toContain('bg-orange-600');
    expect(container.querySelector('.bg-orange-50')).toBeTruthy();
  });
});
