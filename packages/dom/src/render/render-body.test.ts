import { describe, it, expect } from 'vitest';
import type { IDomColumn } from '../types';
import { renderBody } from './render-body';

interface IItem { id: string; name: string; status: 'a' | 'b'; }

const COLUMNS: ReadonlyArray<IDomColumn<IItem>> = [
	{ key: 'id', name: 'ID' },
	{ key: 'name', name: 'Name' },
	{ key: 'status', name: 'Status' },
];

describe('renderBody', () => {
	it('renders one row per item using default stringify', () => {
		const { element, update } = renderBody<IItem>({ columns: COLUMNS, emptyMessage: 'empty', loadingMessage: 'loading' });
		update([{ id: '1', name: 'a', status: 'a' }, { id: '2', name: 'b', status: 'b' }], false);
		const rows = element.querySelectorAll('tr.sst-table__row');
		expect(rows).toHaveLength(2);
		const cells0 = rows[0]!.querySelectorAll('td');
		expect(cells0[0]!.textContent).toBe('1');
		expect(cells0[1]!.textContent).toBe('a');
		expect(cells0[2]!.textContent).toBe('a');
		expect(cells0[0]!.dataset['key']).toBe('id');
	});

	it('uses column.render when present and returning a string', () => {
		const cols: ReadonlyArray<IDomColumn<IItem>> = [
			{ key: 'id', name: 'ID' },
			{ key: 'name', name: 'Name', render: (row) => `>>${row.name}<<` },
			{ key: 'status', name: 'Status' },
		];
		const { element, update } = renderBody<IItem>({ columns: cols, emptyMessage: 'empty', loadingMessage: 'loading' });
		update([{ id: '1', name: 'a', status: 'a' }], false);
		const cells = element.querySelectorAll('tr.sst-table__row td');
		expect(cells[1]!.textContent).toBe('>>a<<');
	});

	it('uses column.render when returning an HTMLElement', () => {
		const cols: ReadonlyArray<IDomColumn<IItem>> = [
			{
				key: 'status',
				name: 'Status',
				render: (row) => {
					const span = document.createElement('span');
					span.className = `badge badge--${row.status}`;
					span.textContent = row.status.toUpperCase();
					return span;
				},
			},
		];
		const { element, update } = renderBody<IItem>({ columns: cols, emptyMessage: 'empty', loadingMessage: 'loading' });
		update([{ id: '1', name: 'a', status: 'b' }], false);
		const cell = element.querySelector('tr.sst-table__row td')!;
		const badge = cell.querySelector('span.badge')!;
		expect(badge).not.toBeNull();
		expect(badge.classList.contains('badge--b')).toBe(true);
		expect(badge.textContent).toBe('B');
	});

	it('renders empty-state row when data is [] and loading is false', () => {
		const { element, update } = renderBody<IItem>({ columns: COLUMNS, emptyMessage: 'no rows', loadingMessage: 'loading' });
		update([], false);
		expect(element.querySelectorAll('tr.sst-table__row')).toHaveLength(0);
		const stateRow = element.querySelector('tr.sst-table__state-row td')!;
		expect(stateRow.textContent).toBe('no rows');
		expect(stateRow.getAttribute('colspan')).toBe(String(COLUMNS.length));
	});

	it('renders loading-state row when data is [] and loading is true', () => {
		const { element, update } = renderBody<IItem>({ columns: COLUMNS, emptyMessage: 'no rows', loadingMessage: 'loading…' });
		update([], true);
		const stateRow = element.querySelector('tr.sst-table__state-row td')!;
		expect(stateRow.textContent).toBe('loading…');
	});

	it('shows the data rows even while loading is true (do not flicker)', () => {
		const { element, update } = renderBody<IItem>({ columns: COLUMNS, emptyMessage: 'no rows', loadingMessage: 'loading…' });
		update([{ id: '1', name: 'a', status: 'a' }], true);
		expect(element.querySelectorAll('tr.sst-table__row')).toHaveLength(1);
		expect(element.querySelector('tr.sst-table__state-row')).toBeNull();
	});

	it('treats null/undefined cell values as empty string', () => {
		const cols: ReadonlyArray<IDomColumn<{ id: string; missing?: string | null }>> = [
			{ key: 'id', name: 'ID' },
			{ key: 'missing', name: 'Missing' },
		];
		const { element, update } = renderBody<{ id: string; missing?: string | null }>({ columns: cols, emptyMessage: 'empty', loadingMessage: 'l' });
		update([{ id: '1' }, { id: '2', missing: null }], false);
		const cells = element.querySelectorAll('tr.sst-table__row td[data-key="missing"]');
		expect(cells[0]!.textContent).toBe('');
		expect(cells[1]!.textContent).toBe('');
	});
});
