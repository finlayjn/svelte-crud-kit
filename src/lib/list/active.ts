import { LIST_VIEW_PARAMS } from './constants.js';

/**
 * Active-link matching for nav sidebars, aware of the list-view params.
 *
 * A sidebar link like `/clients?status=Detained` should stay highlighted while you page, sort, or
 * search *within* that list — i.e. when the URL also carries `?page=2&sort=name&q=…`. So the match
 * compares the pathname and the *filter* params, ignoring the pagination/sort/search params the list
 * view owns (see {@link LIST_VIEW_PARAMS}).
 */

/**
 * Canonicalizes a query string for comparison: drops the list-view params (page/size/sort/dir/q),
 * decodes each remaining pair (so `+` and `%20` match), and sorts so order doesn't matter. Built by
 * hand rather than via URLSearchParams to keep this helper free of mutable URL instances.
 */
function filterParams(search: string): string {
	const raw = search.startsWith('?') ? search.slice(1) : search;
	if (!raw) return '';
	const out: string[] = [];
	for (const pair of raw.split('&')) {
		if (!pair) continue;
		const eq = pair.indexOf('=');
		const key = decodeURIComponent((eq === -1 ? pair : pair.slice(0, eq)).replace(/\+/g, ' '));
		if ((LIST_VIEW_PARAMS as readonly string[]).includes(key)) continue;
		const value = eq === -1 ? '' : decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, ' '));
		out.push(`${key}=${value}`);
	}
	return out.sort().join('&');
}

/**
 * Whether a nav link pointing at `href` should be marked active for the given `current` URL.
 *
 * - `'exact'` (default): same pathname **and** same filter params (ignoring list-view params). Use
 *   for filter links that share a path and differ only by query (e.g. `?status=…`).
 * - `'prefix'`: the current path equals the link path or is nested beneath it (for section landing
 *   links that stay active on child routes, e.g. `/settings` on `/settings/x`). If the link carries
 *   its own filter query, those params must also match — so sibling filter links that share a path
 *   (e.g. `?status=A` vs `?status=B`) don't all count as active.
 *
 * @param current The current page URL.
 * @param href    A root-relative link target, optionally with a query string.
 */
export function isActiveLink(
	current: URL,
	href: string,
	match: 'exact' | 'prefix' = 'exact'
): boolean {
	const queryStart = href.indexOf('?');
	const linkPath = queryStart === -1 ? href : href.slice(0, queryStart);
	const linkSearch = queryStart === -1 ? '' : href.slice(queryStart);

	if (match === 'prefix') {
		const pathMatches =
			current.pathname === linkPath || current.pathname.startsWith(`${linkPath}/`);
		// A filtered link (one carrying its own query) only matches when its filter params match too, so
		// sibling filter links that share a path don't all count as active. A link with no query behaves
		// as a pure path-prefix match (a section landing that stays active on its child routes).
		if (pathMatches && linkSearch) {
			return filterParams(current.search) === filterParams(linkSearch);
		}
		return pathMatches;
	}

	return current.pathname === linkPath && filterParams(current.search) === filterParams(linkSearch);
}
