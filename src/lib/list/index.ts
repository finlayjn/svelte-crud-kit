/**
 * `@finlayjn/svelte-crud-kit/list`
 *
 * Framework-free list contract: the types and constants shared by the client components and the
 * server-side validation, plus reusable Valibot schemas. No Svelte imports, so this entry point is
 * safe to use in `load` functions, remote functions, and API routes.
 */
export { PAGE_SIZES, DEFAULT_PAGE_SIZE, LIST_VIEW_PARAMS, type PageSize } from './constants.js';
export type { Column, SortDir, SortState } from './types.js';
export { pageNumber, pageSize, searchTerm, paginationEntries } from './validation.js';
export { isActiveLink } from './active.js';
export {
	id,
	optionalText,
	requiredText,
	optionalColor,
	optionalDate,
	optionalRef
} from './common.js';
