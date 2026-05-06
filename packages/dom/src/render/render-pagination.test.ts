import { describe, it, expect, vi } from 'vitest';
import { renderPagination } from './render-pagination';

describe('renderPagination', () => {
	it('renders prev / info / next inside a <nav>', () => {
		const { element } = renderPagination({ onPrev: vi.fn(), onNext: vi.fn() });
		expect(element.tagName).toBe('NAV');
		expect(element.querySelector('.sst-pagination__btn--prev')).not.toBeNull();
		expect(element.querySelector('.sst-pagination__btn--next')).not.toBeNull();
		expect(element.querySelector('.sst-pagination__info')).not.toBeNull();
	});

	it('update sets the info text in "Page X of Y · N items" form', () => {
		const { element, update } = renderPagination({ onPrev: vi.fn(), onNext: vi.fn() });
		update({ page: 3, pageSize: 10, total: 47 });
		expect(element.querySelector('.sst-pagination__info')!.textContent).toBe('Page 3 of 5 · 47 items');
	});

	it('coerces totalPages to at least 1 when total is 0', () => {
		const { element, update } = renderPagination({ onPrev: vi.fn(), onNext: vi.fn() });
		update({ page: 1, pageSize: 10, total: 0 });
		expect(element.querySelector('.sst-pagination__info')!.textContent).toBe('Page 1 of 1 · 0 items');
	});

	it('disables prev at page 1 and enables it otherwise', () => {
		const { element, update } = renderPagination({ onPrev: vi.fn(), onNext: vi.fn() });
		const prev = element.querySelector('.sst-pagination__btn--prev') as HTMLButtonElement;
		update({ page: 1, pageSize: 10, total: 47 });
		expect(prev.disabled).toBe(true);
		update({ page: 2, pageSize: 10, total: 47 });
		expect(prev.disabled).toBe(false);
	});

	it('disables next at the last page and enables it otherwise', () => {
		const { element, update } = renderPagination({ onPrev: vi.fn(), onNext: vi.fn() });
		const next = element.querySelector('.sst-pagination__btn--next') as HTMLButtonElement;
		update({ page: 5, pageSize: 10, total: 47 });
		expect(next.disabled).toBe(true);
		update({ page: 4, pageSize: 10, total: 47 });
		expect(next.disabled).toBe(false);
	});

	it('clicking prev / next invokes the supplied callbacks', () => {
		const onPrev = vi.fn();
		const onNext = vi.fn();
		const { element } = renderPagination({ onPrev, onNext });
		(element.querySelector('.sst-pagination__btn--prev') as HTMLElement).click();
		(element.querySelector('.sst-pagination__btn--next') as HTMLElement).click();
		expect(onPrev).toHaveBeenCalledTimes(1);
		expect(onNext).toHaveBeenCalledTimes(1);
	});
});
