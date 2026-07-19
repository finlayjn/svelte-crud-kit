/**
 * Default rows-per-page options. Individual lists can override these (see `Pagination`,
 * `createListUrl`, and `paginationEntries`), so a page size is just a positive integer.
 */
export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = number;

/** Default page size when a list first loads and the URL omits `size`. */
export const DEFAULT_PAGE_SIZE: PageSize = 25;

/**
 * Query-param names owned by the list view itself (pagination + sort + free-text search), as
 * opposed to the filter params a page reads from the URL (e.g. `status`, `product`). Shared so the
 * URL controller and any active-link matcher agree on which params are "view state" and can be
 * ignored when deciding whether a nav link points at the current page.
 *
 * `q` (the free-text search box) is included so a nav link stays highlighted while you search within
 * it, and so the controller owns/clears it alongside page and sort.
 */
export const LIST_VIEW_PARAMS = ['page', 'size', 'sort', 'dir', 'q'] as const;
