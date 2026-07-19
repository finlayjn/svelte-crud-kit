import * as v from 'valibot';
import { PAGE_SIZES, DEFAULT_PAGE_SIZE } from './constants.js';
import type { SortDir } from './types.js';

/**
 * Validation for paginated, sortable list queries (remote functions / API routes).
 *
 * The rows query is deliberately split from the count/stats query so that paging and sorting only
 * re-fetch rows — the more expensive aggregate stays cached against the filters alone. Both halves
 * share the same filter shape per entity; this module supplies the common `page` / `pageSize` /
 * `sort` envelope.
 *
 * `sortKey` is validated per-entity against a whitelist of sortable columns (never interpolate a raw
 * client string into SQL), so each entity passes its own key list to {@link paginationEntries}.
 */

/** 1-based page number. */
export const pageNumber = v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 1);

/** Rows per page, constrained to the allowed options. */
export const pageSize = v.optional(v.picklist(PAGE_SIZES as readonly number[]), DEFAULT_PAGE_SIZE);

/**
 * Free-text search term for a list page. Shared by an entity's rows and count/stats queries (it's a
 * filter, not view state), so spread it into the entity's filter entries alongside `status` etc.
 * Capped to keep pathological inputs out of the `LIKE` scan; the server trims and tokenises it.
 */
export const searchTerm = v.optional(v.pipe(v.string(), v.maxLength(100)));

/**
 * Builds the pagination + sort envelope for an entity, given its allowed sort keys. Returns the
 * `entries` so callers can spread them alongside their own filter fields:
 *
 * ```ts
 * const argsSchema = v.object({
 *   ...paginationEntries(['name', 'updatedAt'], 'updatedAt', { defaultDir: 'desc' }),
 *   status: v.optional(statusFilter)
 * });
 * ```
 *
 * @param sortKeys   Whitelist of sortable column keys (must match the client's `Column` keys).
 * @param defaultSort Sort key applied when the URL omits `sort`.
 * @param options.defaultDir Sort direction applied when the URL omits `dir` (default `'asc'`).
 * @param options.pageSizes Allowed page sizes (default {@link PAGE_SIZES}).
 * @param options.defaultPageSize Page size applied when the URL omits `size` (default {@link DEFAULT_PAGE_SIZE}).
 */
export function paginationEntries<const K extends readonly [string, ...string[]]>(
	sortKeys: K,
	defaultSort: K[number],
	options: { defaultDir?: SortDir; pageSizes?: readonly number[]; defaultPageSize?: number } = {}
) {
	const {
		defaultDir = 'asc',
		pageSizes = PAGE_SIZES,
		defaultPageSize = DEFAULT_PAGE_SIZE
	} = options;
	return {
		page: pageNumber,
		pageSize: v.optional(v.picklist(pageSizes), defaultPageSize),
		sortKey: v.optional(v.picklist(sortKeys), defaultSort),
		sortDir: v.optional(v.picklist(['asc', 'desc'] as const), defaultDir)
	};
}
