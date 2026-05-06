export interface IRenderPaginationOptions {
	readonly onPrev: () => void;
	readonly onNext: () => void;
}

export interface IRenderPaginationState {
	readonly page: number;
	readonly pageSize: number;
	readonly total: number;
}

export interface IRenderPaginationResult {
	readonly element: HTMLElement;
	readonly update: (state: IRenderPaginationState) => void;
}

export function renderPagination(options: IRenderPaginationOptions): IRenderPaginationResult {
	const nav = document.createElement('nav');
	nav.className = 'sst-pagination';
	nav.setAttribute('aria-label', 'pagination');

	const prev = document.createElement('button');
	prev.type = 'button';
	prev.className = 'sst-pagination__btn sst-pagination__btn--prev';
	prev.textContent = '← Prev';
	prev.addEventListener('click', () => options.onPrev());

	const info = document.createElement('span');
	info.className = 'sst-pagination__info';

	const next = document.createElement('button');
	next.type = 'button';
	next.className = 'sst-pagination__btn sst-pagination__btn--next';
	next.textContent = 'Next →';
	next.addEventListener('click', () => options.onNext());

	nav.appendChild(prev);
	nav.appendChild(info);
	nav.appendChild(next);

	const update = (state: IRenderPaginationState): void => {
		const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
		info.textContent = `Page ${state.page} of ${totalPages} · ${state.total} items`;
		prev.disabled = state.page <= 1;
		next.disabled = state.page >= totalPages;
	};

	return { element: nav, update };
}
