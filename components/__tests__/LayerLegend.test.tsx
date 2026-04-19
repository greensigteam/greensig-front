import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LayerLegend from '../LayerLegend';
import { HYDRO_LEGEND, VEG_LEGEND } from '../../constants';

describe('LayerLegend', () => {
  it('renders both category headers with their counts', () => {
    render(<LayerLegend />);
    expect(screen.getByText('Hydrologie')).toBeInTheDocument();
    expect(screen.getByText('Végétation')).toBeInTheDocument();
    expect(screen.getByText(String(HYDRO_LEGEND.length))).toBeInTheDocument();
    expect(screen.getByText(String(VEG_LEGEND.length))).toBeInTheDocument();
  });

  it('starts with both panels collapsed (no legend items visible)', () => {
    render(<LayerLegend />);
    if (HYDRO_LEGEND[0]) {
      expect(screen.queryByText(HYDRO_LEGEND[0].type)).not.toBeInTheDocument();
    }
    if (VEG_LEGEND[0]) {
      expect(screen.queryByText(VEG_LEGEND[0].type)).not.toBeInTheDocument();
    }
  });

  it('expands the Hydrologie panel on click, showing all hydro legend entries', () => {
    render(<LayerLegend />);
    fireEvent.click(screen.getByText('Hydrologie'));
    for (const item of HYDRO_LEGEND) {
      expect(screen.getByText(item.type)).toBeInTheDocument();
    }
  });

  it('expands the Végétation panel on click, showing all veg legend entries', () => {
    render(<LayerLegend />);
    fireEvent.click(screen.getByText('Végétation'));
    for (const item of VEG_LEGEND) {
      expect(screen.getByText(item.type)).toBeInTheDocument();
    }
  });

  it('collapses the Hydrologie panel on second click', () => {
    render(<LayerLegend />);
    const header = screen.getByText('Hydrologie');
    fireEvent.click(header);
    fireEvent.click(header);
    if (HYDRO_LEGEND[0]) {
      expect(screen.queryByText(HYDRO_LEGEND[0].type)).not.toBeInTheDocument();
    }
  });
});
