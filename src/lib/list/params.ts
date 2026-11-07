import { DEFAULT_PAGE_SIZE, PAGE_SIZES, SEARCH_MAX_LENGTH } from './constants.js';
import type { SortDir } from './types.js';

/** The list view state read from a URL: pagination, sort and free-text search. */
export interface ListParams<K extends string> {
	/** 1-based page number. */
	page: number;
	/** Rows per page (one of the allowed sizes). */
	pageSize: number;
	/** A whitelisted sort key. */
	sortKey: K;
	sortDir: SortDir;
	/** Trimmed search term, at most {@link SEARCH_MAX_LENGTH} characters (empty when absent). */
	search: string;
}

export interface ListParamsOptions<K extends string> {
	/** Allowed sort keys (must match the server-side sort whitelist). */
	sortKeys: readonly K[];
	/** Sort applied when the URL omits or garbles the sort params. */
	defaultSort: { key: K; dir: SortDir };
	/** Page size applied when the URL omits the size param (default {@link DEFAULT_PAGE_SIZE}). */
	defaultPageSize?: number;
	/** Page sizes accepted from the URL (default {@link PAGE_SIZES}). */
	pageSizes?: readonly number[];
}

/**
 * Reads the list view params (`page`, `size`, `sort`, `dir`, `q`) from a URL, falling back to the
 * defaults for anything missing or invalid. Framework-free: call it from a server `load` with
 * `url`, and `createListUrl` uses it on the client, so both sides agree on the current view.
 *
 * ```ts
 * export const load = ({ url }) => {
 * 	const { page, pageSize, sortKey, sortDir, search } = parseListParams(url, {
 * 		sortKeys: ['name', 'createdAt'],
 * 		defaultSort: { key: 'createdAt', dir: 'desc' }
 * 	});
 * 	…
 * };
 * ```
 */
export function parseListParams<K extends string>(
	source: URL | URLSearchParams,
	options: ListParamsOptions<K>
): ListParams<K> {
	const params = source instanceof URLSearchParams ? source : source.searchParams;
	const pageSizes = options.pageSizes ?? PAGE_SIZES;

	const page = Number(params.get('page'));
	const size = Number(params.get('size'));
	const sort = params.get('sort');
	const dir = params.get('dir');

	return {
		page: Number.isInteger(page) && page >= 1 ? page : 1,
		pageSize: pageSizes.includes(size) ? size : (options.defaultPageSize ?? DEFAULT_PAGE_SIZE),
		sortKey:
			sort !== null && (options.sortKeys as readonly string[]).includes(sort)
				? (sort as K)
				: options.defaultSort.key,
		sortDir: dir === 'asc' || dir === 'desc' ? dir : options.defaultSort.dir,
		search: (params.get('q') ?? '').trim().slice(0, SEARCH_MAX_LENGTH)
	};
}
