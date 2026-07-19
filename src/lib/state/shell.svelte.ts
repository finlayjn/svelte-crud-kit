import { getContext, setContext, type Snippet } from 'svelte';
import { page } from '$app/state';
import { goto } from '$app/navigation';
import type { AfterNavigate } from '@sveltejs/kit';

/**
 * Shell state: the glue between the persistent layout (navbar + sidebar) and the individual pages.
 *
 * It powers three things without any prop-drilling:
 *  1. **Navbar slots** — a page contributes `actions` and/or a `search` box to the fixed navbar.
 *  2. **Robust back navigation** — a layered model (see {@link back}) that prefers where the user
 *     actually came from and falls back to a logical parent, so a back button appears whenever it
 *     makes sense (including on a cold load / deep link).
 *  3. **Sidebar open-state memory** — which nav groups are expanded, persisted across navigations.
 *
 * Create it once in the root layout via {@link createShell} (usually through `<AppShell>`), and read
 * it anywhere below with {@link getShell}.
 */

const KEY = Symbol('svelte-crud-kit-shell');
const STORAGE_KEY = 'svelte-crud-kit:nav-open';

/** A location in the in-app drill-down trail. */
interface TrailEntry {
	path: string;
	query: string;
}

export interface ShellOptions {
	/**
	 * Resolves the logical parent of a URL, used as the back target on a cold load / deep link when
	 * there's no in-app trail. Defaults to stripping the last path segment (`/a/b/c` → `/a/b` → `/a`
	 * → `null`). Return `null` for top-level routes that have no parent.
	 */
	resolveParent?: (url: URL) => string | null;
}

/** Default parent resolver: strip the last path segment; single-segment routes have no parent. */
export function defaultResolveParent(url: URL): string | null {
	const segments = url.pathname.split('/').filter(Boolean);
	if (segments.length <= 1) return null;
	segments.pop();
	return `/${segments.join('/')}`;
}

export class ShellState {
	/** Page-specific action buttons rendered at the end of the navbar. */
	actions = $state<Snippet | undefined>(undefined);
	/** Optional search box rendered in the middle of the navbar (list pages). */
	search = $state<Snippet | undefined>(undefined);

	// Defaulted at declaration so the `#hasParent` derived below can reference it during field init.
	#resolveParent: (url: URL) => string | null = defaultResolveParent;

	/**
	 * In-memory trail of locations the user navigated *away from*, most recent last. Independent of
	 * the browser's own history: it only ever retraces an in-app drill-down, because a top-level
	 * navigation (sidebar/logo) clears it via {@link markTopLevelNavigation}.
	 */
	#trail = $state<TrailEntry[]>([]);
	/** Set by {@link markTopLevelNavigation}; the next recorded navigation clears the trail. */
	#resetNext = false;
	/** Set by {@link back}; the next recorded navigation pops the trail instead of pushing to it. */
	#goingBack = false;
	/**
	 * Whether the browser's previous history entry provably equals the current trail top — i.e. we
	 * arrived here by a clean forward push with no native back/forward since. When true, {@link back}
	 * uses `history.back()` (restoring scroll and the forward stack); when false it falls back to a
	 * deterministic `goto` of the trail top.
	 */
	#aligned = false;
	/** Whether the last {@link back} used `history.back()` (vs a `goto` fallback), to update `#aligned`. */
	#lastBackWasHistory = false;

	/** Which nav groups (by id) the user has explicitly expanded/collapsed. */
	#openGroups = $state<Record<string, boolean>>({});

	/** True when the current route has a logical parent (declared via `page.data.back` or derived). */
	#hasParent = $derived(
		((page.data as { back?: string }).back ?? this.#resolveParent(page.url)) != null
	);

	constructor(options: ShellOptions = {}) {
		if (options.resolveParent) this.#resolveParent = options.resolveParent;
		if (typeof sessionStorage !== 'undefined') {
			try {
				const raw = sessionStorage.getItem(STORAGE_KEY);
				if (raw) this.#openGroups = JSON.parse(raw) as Record<string, boolean>;
			} catch {
				// Ignore malformed / unavailable storage.
			}
		}
	}

	/* --------------------------------------------------------------------- */
	/*  Back navigation                                                      */
	/* --------------------------------------------------------------------- */

	/** Whether a back button should be shown: there's an in-app trail, or a logical parent exists. */
	get canGoBack(): boolean {
		return this.#trail.length > 0 || this.#hasParent;
	}

	/**
	 * Marks the next navigation as "top level" (a sidebar link or the logo), so the trail is cleared
	 * rather than appended to. Call from the sidebar's navigate handler (`NavItem` does this).
	 */
	markTopLevelNavigation(): void {
		this.#resetNext = true;
	}

	/**
	 * Records a completed navigation. Call once from the layout's `afterNavigate` (`AppShell` does
	 * this). Pure query-string changes on the same path (pagination/sorting/filtering) are ignored so
	 * they never become back-button steps and never desync the trail from real browser history.
	 */
	recordNavigation(nav: AfterNavigate): void {
		if (this.#resetNext) {
			// Top-level jump (sidebar/logo): start a fresh trail with nothing to step back to.
			this.#trail = [];
			this.#resetNext = false;
			this.#goingBack = false;
			this.#aligned = false;
			return;
		}
		if (this.#goingBack) {
			// This navigation is the result of our own back(). Pop the level we left. If we used
			// history.back(), the browser now sits exactly on the previous entry, so the page we're on is
			// still one real step above its parent (stays aligned); a goto fallback pushed a new entry, so
			// alignment is lost.
			this.#trail = this.#trail.slice(0, -1);
			this.#goingBack = false;
			this.#aligned = this.#lastBackWasHistory;
			return;
		}
		if (!nav.from || !nav.to) return;
		// Same page, only the query string changed (list paging/sorting/filtering): not a trail step,
		// and — being a replaceState — it doesn't add a history entry, so alignment is unchanged.
		if (nav.from.url.pathname === nav.to.url.pathname) return;

		if (nav.type === 'popstate') {
			// A native browser back/forward we didn't initiate. The stack has moved in a way the curated
			// trail can't assume, so history.back() is no longer provably the trail top — mark unaligned
			// and reconcile: if we've landed back on the level just below the top, pop it; otherwise record
			// the page we came from as a new step.
			this.#aligned = false;
			const top = this.#trail.at(-1);
			if (top && top.path === nav.to.url.pathname && top.query === nav.to.url.search) {
				this.#trail = this.#trail.slice(0, -1);
			} else {
				this.#trail = [...this.#trail, { path: nav.from.url.pathname, query: nav.from.url.search }];
			}
			return;
		}

		// A normal forward push (link/goto/form): drill one level deeper. The current page is now exactly
		// one real history entry above where we came from, so history.back() returns there.
		this.#trail = [...this.#trail, { path: nav.from.url.pathname, query: nav.from.url.search }];
		this.#aligned = true;
	}

	/**
	 * Navigates back to where the user would expect, in layers:
	 *  - with an in-app trail and an *aligned* history stack (a clean forward drill-down), use the
	 *    browser's real `history.back()` so scroll and the forward stack are preserved;
	 *  - with a trail but an ambiguous stack (a native back/forward has happened since), `goto` the
	 *    trail top so the destination is always exactly what the curated trail says;
	 *  - with no trail (cold load / deep link), navigate to the logical parent (declared or derived).
	 */
	back(): void {
		if (this.#trail.length > 0) {
			this.#goingBack = true;
			if (this.#aligned && typeof history !== 'undefined') {
				// Provably one real step back: let the browser do it, so scroll position and the forward
				// stack are preserved and native back/forward stays in sync with this button.
				this.#lastBackWasHistory = true;
				history.back();
			} else {
				// Ambiguous stack (a native back/forward happened, or no History API): navigate straight to
				// the trail top so the destination is always exactly what the curated trail says.
				this.#lastBackWasHistory = false;
				const target = this.#trail.at(-1);
				if (target) {
					// A previously-visited in-app URL captured from real navigation, not a static route.
					// eslint-disable-next-line svelte/no-navigation-without-resolve
					void goto(target.path + target.query);
				}
			}
			return;
		}
		// Cold load / deep link with no trail: fall back to the logical parent (declared or derived).
		const parent = (page.data as { back?: string }).back ?? this.#resolveParent(page.url);
		if (parent) {
			this.#goingBack = true;
			this.#lastBackWasHistory = false;
			// A logical parent, not necessarily a statically-known route.
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			void goto(parent);
		}
	}

	/* --------------------------------------------------------------------- */
	/*  Sidebar open-state memory                                            */
	/* --------------------------------------------------------------------- */

	/** Whether a nav group is open, honouring the user's stored choice or the group's default. */
	isGroupOpen(id: string, fallback: boolean): boolean {
		return this.#openGroups[id] ?? fallback;
	}

	/** Records a nav group's open/closed state and persists it for the session. */
	setGroupOpen(id: string, open: boolean): void {
		this.#openGroups = { ...this.#openGroups, [id]: open };
		if (typeof sessionStorage !== 'undefined') {
			try {
				sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.#openGroups));
			} catch {
				// Ignore unavailable storage.
			}
		}
	}
}

/** Creates the shell state and puts it in context. Call once, in the root layout. */
export function createShell(options: ShellOptions = {}): ShellState {
	return setContext(KEY, new ShellState(options));
}

/** Reads the shell state. Call from any page/component under the root layout. */
export function getShell(): ShellState {
	return getContext<ShellState>(KEY);
}
