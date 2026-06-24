/**
 * Callbacks for {@link renderPagination}'s navigation buttons.
 */
export interface IRenderPaginationOptions {
	/** Invoked when the "Prev" button is clicked. */
	readonly onPrev: () => void;
	/** Invoked when the "Next" button is clicked. */
	readonly onNext: () => void;
}

/**
 * The current pagination state used to render the control's label and to
 * enable or disable its navigation buttons.
 */
export interface IRenderPaginationState {
	/** The current page number (1-based). */
	readonly page: number;
	/** The number of items per page, used to compute the total page count. */
	readonly pageSize: number;
	/** The total number of items across all pages. */
	readonly total: number;
}

/**
 * The rendered pagination control together with a callback to update its state.
 */
export interface IRenderPaginationResult {
	/** The pagination `<nav>` element to insert after the table. */
	readonly element: HTMLElement;
	/** Updates the info label and the disabled state of the Prev/Next buttons. */
	readonly update: (state: IRenderPaginationState) => void;
}

/**
 * Builds the pagination `<nav>` with Prev/Next buttons and an info label.
 *
 * The buttons invoke the supplied `onPrev` / `onNext` callbacks. The returned
 * `update` recomputes the total page count as `ceil(total / pageSize)` (at
 * least 1), writes a `Page X of Y · N items` label, and disables Prev on the
 * first page and Next on the last.
 *
 * @param options - The Prev/Next click callbacks.
 * @returns The `<nav>` element and a state updater.
 */
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
