import { ChangeQueue, type ChangeResult } from './changeQueue.svelte.js';
import type { SaveMode } from './types.js';

/** One field of a record, set against the value it started from. */
export interface FieldChange<F extends string = string> {
	field: F;
	value: unknown;
	baseline: unknown;
}

/**
 * Whether two field values are the same once saved: blank text, `null`, `undefined` and an empty
 * list are all "no value", and text compares trimmed. Use it on the server too, so both sides agree
 * on what changed.
 */
export function sameFieldValue(a: unknown, b: unknown): boolean {
	const normal = (value: unknown): unknown => {
		if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
		if (Array.isArray(value)) return value.length === 0 ? null : value;
		return value ?? null;
	};
	return JSON.stringify(normal(a)) === JSON.stringify(normal(b));
}

export interface RecordEditorOptions<Row, F extends keyof Row & string> {
	/** The fields the form edits. */
	fields: readonly F[];
	/** The saved record (the page's load data), read live. */
	data: () => Row;
	/**
	 * Sends the changes; one result per change, in order. Resolve once the page shows the saved
	 * data (after reloading it), so values don't flash back.
	 */
	save: (changes: FieldChange<F>[]) => Promise<{ results: ChangeResult[] }>;
	/** Default `manual`: edits wait for Save. */
	mode?: SaveMode;
	/** A saved value as its form control shows it (default: `null` and `undefined` become ''). */
	toControl?: (field: F, value: unknown) => unknown;
	/** Whether two values are the same (default {@link sameFieldValue}). */
	equals?: (a: unknown, b: unknown) => boolean;
	onError?: (error: unknown) => void;
	debounceMs?: number;
}

/**
 * Editing one record field by field, on a {@link ChangeQueue}: `draft` is bindable like
 * `EditDraft`'s, but each change carries the value it started from, so the server can apply only
 * the fields that changed and report a conflict when someone else changed the same field. Pair it
 * with `SaveActions` and `ChangeProblems`.
 *
 * ```ts
 * const editor = new RecordEditor({
 * 	fields: ['name', 'notes'],
 * 	data: () => data.widget,
 * 	save: async (changes) => {
 * 		const response = await saveWidgetChanges({ id, changes });
 * 		await reload(`widget:${id}`);
 * 		return response;
 * 	}
 * });
 * ```
 */
export class RecordEditor<Row, F extends keyof Row & string> {
	readonly queue: ChangeQueue<FieldChange<F>>;
	/** The form's values: the unsaved edit, or what's saved. Assigning records a change. */
	readonly draft: { [K in F]: Row[K] };

	#data: () => Row;
	#toControl: (field: F, value: unknown) => unknown;

	constructor(options: RecordEditorOptions<Row, F>) {
		this.#data = options.data;
		this.#toControl =
			options.toControl ??
			((_field, value) => (value === null || value === undefined ? '' : value));
		this.queue = new ChangeQueue<FieldChange<F>>({
			mode: options.mode ?? 'manual',
			key: (change) => change.field,
			save: options.save,
			equals: options.equals ?? sameFieldValue,
			onError: options.onError,
			debounceMs: options.debounceMs
		});
		const draft = {} as { [K in F]: Row[K] };
		for (const field of options.fields) {
			Object.defineProperty(draft, field, {
				enumerable: true,
				get: () => this.value(field),
				set: (value: unknown) => this.set(field, value)
			});
		}
		this.draft = draft;
	}

	get dirty(): boolean {
		return this.queue.dirty;
	}

	get saving(): boolean {
		return this.queue.saving;
	}

	/** A field's value for its control. */
	value(field: F): unknown {
		const change = this.queue.get(field);
		return this.#toControl(field, change ? change.value : this.#data()[field]);
	}

	/** Records an edit against the saved value. */
	set(field: F, value: unknown): void {
		this.queue.setValue({ field, value, baseline: this.#data()[field] });
	}

	flush(): Promise<void> {
		return this.queue.flush();
	}

	destroy(): void {
		this.queue.destroy();
	}
}
