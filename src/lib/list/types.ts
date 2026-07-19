/** Sort direction. */
export type SortDir = 'asc' | 'desc';

/** The current sort: which column and which direction. */
export interface SortState {
	key: string;
	dir: SortDir;
}

/**
 * A column definition for a data table header. Cell contents are rendered by the page's `row`
 * snippet, so this describes only the header and sort behaviour.
 */
export interface Column {
	/** Stable key; also the server-side sort key when `sortable`. */
	key: string;
	label: string;
	/** Whether the column header can be clicked to sort (server-side). */
	sortable?: boolean;
	/** Text alignment for the header (cells align themselves). */
	align?: 'start' | 'center' | 'end';
	/** Extra classes for the header cell. */
	class?: string;
	/** Initial column width in px. Only applied when the table is `resizable`. */
	width?: number;
}
