import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge — legacy API (status + type)', () => {
  it('renders with mapped label and colour for known status', () => {
    render(<StatusBadge status="EN_COURS" type="intervention" />);
    const badge = screen.getByText(/en cours|EN_COURS/i);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-orange-100/);
  });

  it('falls back to gray and raw status when status is unknown', () => {
    render(<StatusBadge status="UNKNOWN_THING" type="intervention" />);
    const badge = screen.getByText('UNKNOWN_THING');
    expect(badge.className).toMatch(/bg-gray-100/);
  });

  it('renders tache status colour for ANNULEE', () => {
    render(<StatusBadge status="ANNULEE" type="tache" />);
    const badge = screen.getByText(/annul|ANNULEE/i);
    expect(badge.className).toMatch(/bg-red-100/);
  });

  it('renders claim EN_ATTENTE_VALIDATION_CLOTURE with emerald', () => {
    render(<StatusBadge status="EN_ATTENTE_VALIDATION_CLOTURE" type="claim" />);
    const badge = screen.getByText(/.+/);
    expect(badge.className).toMatch(/bg-emerald-100/);
  });
});

describe('StatusBadge — custom labels/colors map', () => {
  it('uses the provided labels map when no type is given', () => {
    render(
      <StatusBadge
        status="A"
        labels={{ A: 'Alpha', B: 'Bravo' }}
        colors={{ A: 'bg-pink-100 text-pink-800' }}
      />,
    );
    const badge = screen.getByText('Alpha');
    expect(badge.className).toMatch(/bg-pink-100/);
  });

  it('accepts an object colour entry with bg/text/border', () => {
    render(
      <StatusBadge
        status="X"
        labels={{ X: 'Xray' }}
        colors={{ X: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' } }}
      />,
    );
    const badge = screen.getByText('Xray');
    expect(badge.className).toMatch(/bg-teal-100/);
    expect(badge.className).toMatch(/border-teal-200/);
  });

  it('falls back to gray when status is not in colors map', () => {
    render(<StatusBadge status="MISSING" labels={{ MISSING: 'Missing' }} colors={{}} />);
    const badge = screen.getByText('Missing');
    expect(badge.className).toMatch(/bg-gray-100/);
  });
});

describe('StatusBadge — variant="boolean"', () => {
  it('green Oui when value is truthy', () => {
    render(<StatusBadge variant="boolean" value={true} />);
    const badge = screen.getByText('Oui');
    expect(badge.className).toMatch(/bg-green-100/);
  });

  it('gray Non when value is falsy', () => {
    render(<StatusBadge variant="boolean" value={false} />);
    const badge = screen.getByText('Non');
    expect(badge.className).toMatch(/bg-gray-100/);
  });

  it('uses custom true/false labels when provided', () => {
    render(
      <StatusBadge variant="boolean" value={true} labels={{ true: 'Actif', false: 'Inactif' }} />,
    );
    expect(screen.getByText('Actif')).toBeInTheDocument();
  });
});

describe('StatusBadge — variant="role"', () => {
  it('renders ADMIN with purple and shield icon', () => {
    const { container } = render(<StatusBadge variant="role" value="ADMIN" />);
    const badge = screen.getByText('ADMIN');
    expect(badge.className).toMatch(/bg-purple-100/);
    // role badges include an svg icon
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it.each([
    ['SUPERVISEUR', /bg-blue-100/],
    ['CLIENT', /bg-orange-100/],
  ])('renders %s with the right colour', (role, pattern) => {
    render(<StatusBadge variant="role" value={role} />);
    expect(screen.getByText(role).className).toMatch(pattern);
  });

  it('falls back to gray for unknown role and N/A label when value is nullish', () => {
    render(<StatusBadge variant="role" value={undefined} />);
    const badge = screen.getByText('N/A');
    expect(badge.className).toMatch(/bg-gray-100/);
  });
});

describe('StatusBadge — variant="custom"', () => {
  it('uses the provided bg/text/border classes', () => {
    render(
      <StatusBadge
        variant="custom"
        value="X"
        bg="bg-indigo-100"
        text="text-indigo-800"
        border="border-indigo-200"
      />,
    );
    const badge = screen.getByText('X');
    expect(badge.className).toMatch(/bg-indigo-100/);
    expect(badge.className).toMatch(/text-indigo-800/);
  });

  it('renders children when provided, ignoring value', () => {
    render(
      <StatusBadge variant="custom" value="ignored">
        <span data-testid="custom-child">child</span>
      </StatusBadge>,
    );
    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
  });
});

describe('StatusBadge — variant="status" edge cases', () => {
  it('renders N/A when variant=status but value is missing', () => {
    render(<StatusBadge variant="status" />);
    const badge = screen.getByText('N/A');
    expect(badge.className).toMatch(/bg-gray-100/);
  });

  it('renders raw value when the type is unknown', () => {
    render(<StatusBadge variant="status" type={'nonsense' as never} value="FOO" />);
    const badge = screen.getByText('FOO');
    expect(badge.className).toMatch(/bg-gray-100/);
  });
});

describe('StatusBadge — fallback', () => {
  it('renders N/A when nothing is configured', () => {
    render(<StatusBadge />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });
});

describe('StatusBadge — size classes', () => {
  it.each([
    ['xs', /text-\[10px\]/],
    ['sm', /text-xs/],
    ['md', /text-sm/],
  ] as const)('applies %s size class', (size, pattern) => {
    render(
      <StatusBadge status="X" size={size}>
        label
      </StatusBadge>,
    );
    const badge = screen.getByText('label');
    expect(badge.className).toMatch(pattern);
  });
});
