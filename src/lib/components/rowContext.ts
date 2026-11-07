/** Shared context between `DataTable` rows and `RowLink`: the current row's `rowHref`. */
export interface RowContext {
	readonly href: string | undefined;
}

export const ROW_KEY = Symbol('svelte-crud-kit-row');
