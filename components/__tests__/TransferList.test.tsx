import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TransferList } from '../TransferList';

type Item = { id: number; name: string; dept?: string };

const ITEMS: Item[] = [
  { id: 1, name: 'Alice', dept: 'Ops' },
  { id: 2, name: 'Bob', dept: 'Eng' },
  { id: 3, name: 'Charlie', dept: 'Eng' },
];

function renderList(overrides: Partial<React.ComponentProps<typeof TransferList<Item>>> = {}) {
  const onChange = vi.fn();
  const props = {
    available: ITEMS,
    selected: [] as Item[],
    onChange,
    getItemId: (i: Item) => i.id,
    getItemLabel: (i: Item) => i.name,
    ...overrides,
  };
  const utils = render(<TransferList {...props} />);
  return { onChange, ...utils };
}

describe('TransferList', () => {
  it('renders available items and default labels', () => {
    renderList();
    expect(screen.getByText('Disponibles')).toBeInTheDocument();
    expect(screen.getByText('Sélectionnés')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Aucun élément sélectionné')).toBeInTheDocument();
  });

  it('excludes already-selected items from the available list', () => {
    renderList({ selected: [ITEMS[0]!] });
    // Alice is now in the selected list — only one node should match that text,
    // and it should be within the "Sélectionnés" pane
    const aliceNodes = screen.getAllByText('Alice');
    expect(aliceNodes).toHaveLength(1);
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('clicking an available item calls onChange with it appended', () => {
    const { onChange } = renderList();
    fireEvent.click(screen.getByText('Bob'));
    expect(onChange).toHaveBeenCalledWith([ITEMS[1]]);
  });

  it('clicking a selected item removes it from the selection', () => {
    const { onChange } = renderList({ selected: [ITEMS[0]!, ITEMS[1]!] });
    fireEvent.click(screen.getByText('Alice'));
    expect(onChange).toHaveBeenCalledWith([ITEMS[1]]);
  });

  it('addAll moves every filtered available item into the selection', () => {
    const { onChange } = renderList();
    fireEvent.click(screen.getByTitle('Tout ajouter'));
    expect(onChange).toHaveBeenCalledWith(ITEMS);
  });

  it('removeAll empties the selection', () => {
    const { onChange } = renderList({ selected: [ITEMS[0]!, ITEMS[1]!] });
    fireEvent.click(screen.getByTitle('Tout retirer'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('disables addAll when there are no available items', () => {
    renderList({ available: [], selected: [] });
    const addAllBtn = screen.getByTitle('Tout ajouter') as HTMLButtonElement;
    expect(addAllBtn.disabled).toBe(true);
  });

  it('disables removeAll when selection is empty', () => {
    renderList();
    const removeAllBtn = screen.getByTitle('Tout retirer') as HTMLButtonElement;
    expect(removeAllBtn.disabled).toBe(true);
  });

  it('filters by label and subtitle when searching', () => {
    renderList({
      getItemSubtitle: (i: Item) => i.dept ?? '',
    });
    const input = screen.getByPlaceholderText('Rechercher...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Eng' } });
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('shows "Aucun résultat" when the search matches nothing', () => {
    renderList();
    const input = screen.getByPlaceholderText('Rechercher...');
    fireEvent.change(input, { target: { value: 'zzz-nonexistent' } });
    expect(screen.getByText('Aucun résultat')).toBeInTheDocument();
  });

  it('renders the Add-new button only when onAddNew is provided', () => {
    const onAddNew = vi.fn();
    const { rerender } = renderList({ onAddNew });
    const addBtn = screen.getByTitle('Créer un nouveau');
    fireEvent.click(addBtn);
    expect(onAddNew).toHaveBeenCalledTimes(1);

    rerender(
      <TransferList
        available={ITEMS}
        selected={[]}
        onChange={vi.fn()}
        getItemId={(i: Item) => i.id}
        getItemLabel={(i: Item) => i.name}
      />,
    );
    expect(screen.queryByTitle('Créer un nouveau')).not.toBeInTheDocument();
  });

  it('uses custom labels when provided', () => {
    renderList({
      availableLabel: 'Left',
      selectedLabel: 'Right',
      emptySelectedMessage: 'Rien ici',
    });
    expect(screen.getByText('Left')).toBeInTheDocument();
    expect(screen.getByText('Right')).toBeInTheDocument();
    expect(screen.getByText('Rien ici')).toBeInTheDocument();
  });
});
