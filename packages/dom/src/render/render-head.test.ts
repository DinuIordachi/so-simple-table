import { describe, it, expect, vi } from 'vitest';
import { ESortOrder } from '@bridgebyte/sst-core';
import type { IDomColumn } from '../types';
import { renderHead } from './render-head';

interface IItem {
	id: string;
	name: string;
	createdAt: string;
}

const COLUMNS: ReadonlyArray<IDomColumn<IItem>> = [
	{ key: 'id', name: 'ID' },
	{ key: 'name', name: 'Name', sortable: true },
	{ key: 'createdAt', name: 'Created', sortable: true },
];

describe('renderHead', () => {
	it('renders one <th> per column with the correct label and data-key', () => {
		const { element } = renderHead<IItem>({ columns: COLUMNS, onSortClick: vi.fn() });
		const ths = element.querySelectorAll('th');
		expect(ths).toHaveLength(3);
		expect(ths[0]!.textContent).toBe('ID');
		expect(ths[0]!.getAttribute('data-key')).toBe('id');
		expect(ths[1]!.querySelector('.sst-table__head-label')!.textContent).toBe('Name');
		expect(ths[1]!.classList.contains('sst-table__head-cell--sortable')).toBe(true);
		expect(ths[0]!.classList.contains('sst-table__head-cell--sortable')).toBe(false);
	});

	it('sortable headers contain a sort indicator span', () => {
		const { element } = renderHead<IItem>({ columns: COLUMNS, onSortClick: vi.fn() });
		const sortable = element.querySelectorAll('.sst-table__head-cell--sortable');
		for (const th of Array.from(sortable)) {
			expect(th.querySelector('.sst-table__head-indicator')).not.toBeNull();
		}
	});

	it('clicking a sortable header invokes onSortClick with the column', () => {
		const onSortClick = vi.fn();
		const { element } = renderHead<IItem>({ columns: COLUMNS, onSortClick });
		(element.querySelectorAll('th')[1] as HTMLElement).click();
		expect(onSortClick).toHaveBeenCalledTimes(1);
		expect(onSortClick).toHaveBeenCalledWith(COLUMNS[1]);
	});

	it('clicking a non-sortable header does NOT invoke onSortClick', () => {
		const onSortClick = vi.fn();
		const { element } = renderHead<IItem>({ columns: COLUMNS, onSortClick });
		(element.querySelectorAll('th')[0] as HTMLElement).click();
		expect(onSortClick).not.toHaveBeenCalled();
	});

	it('updateSort sets data-sort to "asc" / "desc" / "none" on the right header only', () => {
		const { element, updateSort } = renderHead<IItem>({ columns: COLUMNS, onSortClick: vi.fn() });
		const ths = element.querySelectorAll('th');

		updateSort({ id: 'name-ASC', field: 'name', order: ESortOrder.ASC });
		expect(ths[0]!.getAttribute('data-sort')).toBe('none');
		expect(ths[1]!.getAttribute('data-sort')).toBe('asc');
		expect(ths[2]!.getAttribute('data-sort')).toBe('none');

		updateSort({ id: 'name-DESC', field: 'name', order: ESortOrder.DESC });
		expect(ths[1]!.getAttribute('data-sort')).toBe('desc');

		updateSort(undefined);
		expect(ths[1]!.getAttribute('data-sort')).toBe('none');
	});
});
