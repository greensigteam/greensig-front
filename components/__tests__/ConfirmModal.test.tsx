import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConfirmModal from '../ConfirmModal';

function baseProps() {
  return {
    isOpen: true,
    title: 'Supprimer ?',
    message: 'Cette action est irréversible.',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };
}

describe('ConfirmModal', () => {
  it('renders nothing when closed', () => {
    const props = baseProps();
    render(<ConfirmModal {...props} isOpen={false} />);
    expect(screen.queryByText(props.title)).not.toBeInTheDocument();
  });

  it('renders title, message and default button labels when open', () => {
    const props = baseProps();
    render(<ConfirmModal {...props} />);
    expect(screen.getByText(props.title)).toBeInTheDocument();
    expect(screen.getByText(props.message)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
  });

  it('uses custom button labels', () => {
    render(<ConfirmModal {...baseProps()} confirmLabel="Supprimer" cancelLabel="Garder" />);
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Garder' })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const props = baseProps();
    render(<ConfirmModal {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const props = baseProps();
    render(<ConfirmModal {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('disables both buttons and shows loading text when loading', () => {
    const props = baseProps();
    render(<ConfirmModal {...props} loading />);

    const confirmBtn = screen.getByRole('button', { name: /Chargement/ });
    const cancelBtn = screen.getByRole('button', { name: 'Annuler' });
    expect(confirmBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();

    // Click should not fire callbacks
    fireEvent.click(confirmBtn);
    fireEvent.click(cancelBtn);
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it.each(['danger', 'warning', 'info', 'success'] as const)(
    'applies %s variant button colour class',
    (variant) => {
      render(<ConfirmModal {...baseProps()} variant={variant} />);
      const confirmBtn = screen.getByRole('button', { name: 'Confirmer' });
      const expectedColor = {
        danger: 'bg-red-600',
        warning: 'bg-amber-600',
        info: 'bg-blue-600',
        success: 'bg-emerald-600',
      }[variant];
      expect(confirmBtn.className).toContain(expectedColor);
    },
  );
});
