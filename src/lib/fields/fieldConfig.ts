import { getContext, setContext } from 'svelte';

/**
 * How a field renders its label:
 *  - `floating`: daisyUI floating label (label doubles as placeholder, floats when filled).
 *  - `top`: label stacked above the control.
 *  - `left`: label on the same row, to the left of the control.
 */
export type LabelPlacement = 'floating' | 'top' | 'left';

/** An option for the choice fields (`SelectField`, `RadioGroup`, `CheckboxGroup`). */
export interface FieldOption {
	value: string;
	label: string;
	disabled?: boolean;
}

export interface FieldDefaults {
	labelPlacement: LabelPlacement;
}

const KEY = Symbol('svelte-crud-kit-field-defaults');

const FALLBACK: FieldDefaults = { labelPlacement: 'floating' };

/**
 * Sets app-wide field defaults (e.g. `{ labelPlacement: 'top' }`) for every field rendered below.
 * Call once, high in your tree. Individual fields can still override via their own `labelPlacement`.
 */
export function setFieldDefaults(defaults: FieldDefaults): FieldDefaults {
	return setContext(KEY, defaults);
}

/** Reads the current field defaults, falling back to floating labels when none are set. */
export function getFieldDefaults(): FieldDefaults {
	return getContext<FieldDefaults>(KEY) ?? FALLBACK;
}
