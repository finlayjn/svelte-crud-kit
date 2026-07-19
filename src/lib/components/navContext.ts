/**
 * Shared context between `NavGroup` and `NavItem`.
 *
 * A `NavItem` registers its `href` with the enclosing `NavGroup`, which forwards it up to its own
 * ancestor group. That way every group knows the full set of descendant links, so it can derive
 * whether it contains the active route (and auto-expand when you deep-link into one of its pages).
 */
export interface NavGroupApi {
	/** Registers a descendant link. Returns an unregister function. */
	register(href: string): () => void;
}

export const NAV_GROUP_KEY = Symbol('svelte-crud-kit-nav-group');
