/**
 * URL-backed controller for paginated, sortable, searchable list pages.
 *
 * The current view (page number, page size, sort column + direction, and free-text search) lives in
 * the query string so it is shareable and bookmarkable — you can link directly to "page 3, sorted by
 * name descending, 100 per page". Filters the page owns (e.g. `?status=active`) are preserved
 * untouched whenever these params change.
 *
 * The URL is the single source of truth: a page's rows query derives its arguments from these
 * getters, so navigating re-keys the remote query and loads the new slice. Because filter and page
 * always travel together in one URL, a filter change (which arrives as a fresh URL without a `page`
 * param) resets to page 1 atomically — no stale `(newFilter, oldPage)` fetch, no `$effect`.
 *
 * Only non-default params are written, keeping URLs clean (e.g. `/users` rather than
 * `/users?page=1&size=25&sort=createdAt&dir=desc`).
 */
import { page } from '$app/state';
import { goto } from '$app/navigation';
import {
	DEFAULT_PAGE_SIZE,
	LIST_VIEW_PARAMS,
	PAGE_SIZES,
	type PageSize
} from '../list/constants.js';
import type { SortDir, SortState } from '../list/types.js';

/**
 * Query-param names this controller owns. Kept short for tidy URLs; must not collide with filters.
 * The names are shared via {@link LIST_VIEW_PARAMS} so active-link matchers can ignore them.
 */
const PARAM = { page: 'page', size: 'size', sort: 'sort', dir: 'dir', search: 'q' } as const;

export interface ListUrlOptions<K extends string> {
	/** Allowed sort keys (must match the server-side sort picklist). */
	sortKeys: readonly K[];
	/** Sort applied when the URL omits sort params. */
	defaultSort: { key: K; dir: SortDir };
	/** Page size applied when the URL omits the size param (defaults to {@link DEFAULT_PAGE_SIZE}). */
	defaultPageSize?: PageSize;
	/** Allowed page sizes accepted from the URL (defaults to {@link PAGE_SIZES}). */
	pageSizes?: readonly number[];
}

export interface ListUrl<K extends string> {
	/** Current sort, parsed from the URL (falls back to the default). */
	readonly sort: SortState & { key: K };
	/** Current 1-based page number, parsed from the URL (falls back to 1). */
	readonly page: number;
	/** Current page size, parsed from the URL (falls back to the default). */
	readonly pageSize: PageSize;
	/** Current free-text search term, parsed from the URL (empty when absent). */
	readonly search: string;
	/** Toggles/sets the sort column (clicking the same column flips direction); resets to page 1. */
	toggleSort: (key: string) => void;
	/** Navigates to a 1-based page number. */
	setPage: (p: number) => void;
	/** Changes the page size; resets to page 1. */
	setPageSize: (size: PageSize) => void;
	/** Sets (or clears, when blank) the free-text search term; resets to page 1. */
	setSearch: (term: string) => void;
}

/** Reads a positive integer page number from the URL, defaulting to 1 on anything invalid. */
function parsePage(raw: string | null): number {
	const n = Number(raw);
	return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Reads a page size from the URL, accepting only the allowed options. */
function parsePageSize(
	raw: string | null,
	allowed: readonly number[],
	fallback: PageSize
): PageSize {
	const n = Number(raw);
	return allowed.includes(n) ? n : fallback;
}

/** Reads a whitelisted sort key from the URL, defaulting when absent or unknown. */
function parseSortKey<K extends string>(raw: string | null, keys: readonly K[], fallback: K): K {
	return raw && (keys as readonly string[]).includes(raw) ? (raw as K) : fallback;
}

/** Reads the sort direction from the URL, defaulting when absent or unknown. */
function parseSortDir(raw: string | null, fallback: SortDir): SortDir {
	return raw === 'asc' || raw === 'desc' ? raw : fallback;
}

/**
 * Creates a URL-backed list controller. Call once in a list page's `<script>`, passing the same sort
 * keys and defaults the backend uses.
 */
export function createListUrl<K extends string>(options: ListUrlOptions<K>): ListUrl<K> {
	const defaultPageSize = options.defaultPageSize ?? DEFAULT_PAGE_SIZE;
	const pageSizes = options.pageSizes ?? PAGE_SIZES;

	const params = $derived(page.url.searchParams);
	const sort = $derived({
		key: parseSortKey(params.get(PARAM.sort), options.sortKeys, options.defaultSort.key),
		dir: parseSortDir(params.get(PARAM.dir), options.defaultSort.dir)
	});
	const pageNumber = $derived(parsePage(params.get(PARAM.page)));
	const pageSize = $derived(parsePageSize(params.get(PARAM.size), pageSizes, defaultPageSize));
	const search = $derived(params.get(PARAM.search) ?? '');

	/**
	 * Writes the managed params (preserving any filter params), omitting values that equal their
	 * defaults so URLs stay clean, then navigates without scrolling or losing focus. `replaceState`
	 * keeps history tidy while the URL itself remains shareable at every step.
	 */
	function apply(next: {
		page: number;
		size: PageSize;
		sortKey: K;
		sortDir: SortDir;
		search: string;
	}) {
		const managed: readonly string[] = LIST_VIEW_PARAMS;

		// Preserve any filter params (e.g. ?status=active) the page owns, then append the managed ones —
		// only when they differ from their defaults, keeping URLs clean.
		const entries: [string, string][] = [];
		for (const [key, value] of params) {
			if (!managed.includes(key)) entries.push([key, value]);
		}
		const term = next.search.trim();
		if (term) entries.push([PARAM.search, term]);
		if (next.page > 1) entries.push([PARAM.page, String(next.page)]);
		if (next.size !== defaultPageSize) entries.push([PARAM.size, String(next.size)]);
		if (next.sortKey !== options.defaultSort.key) entries.push([PARAM.sort, next.sortKey]);
		if (next.sortDir !== options.defaultSort.dir) entries.push([PARAM.dir, next.sortDir]);

		const query = entries
			.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
			.join('&');
		const target = query ? `${page.url.pathname}?${query}` : page.url.pathname;

		// Dynamic same-page navigation (query string only); the typed-route lint rule can't verify it.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(target, { replaceState: true, keepFocus: true, noScroll: true });
	}

	return {
		get sort() {
			return sort;
		},
		get page() {
			return pageNumber;
		},
		get pageSize() {
			return pageSize;
		},
		get search() {
			return search;
		},
		toggleSort(key: string) {
			if (!(options.sortKeys as readonly string[]).includes(key)) return;
			const k = key as K;
			const dir: SortDir = sort.key === k && sort.dir === 'asc' ? 'desc' : 'asc';
			apply({ page: 1, size: pageSize, sortKey: k, sortDir: dir, search });
		},
		setPage(p: number) {
			apply({ page: p, size: pageSize, sortKey: sort.key, sortDir: sort.dir, search });
		},
		setPageSize(size: PageSize) {
			apply({ page: 1, size, sortKey: sort.key, sortDir: sort.dir, search });
		},
		setSearch(term: string) {
			apply({ page: 1, size: pageSize, sortKey: sort.key, sortDir: sort.dir, search: term });
		}
	};
}
