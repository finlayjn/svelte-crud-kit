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

/** What the choice fields accept as an option: a plain string is both its value and its label. */
export type FieldOptionInput = string | FieldOption;

/** A named group of options, rendered by `SelectField` as an `<optgroup>`. */
export interface FieldOptionGroup {
	label: string;
	options: readonly FieldOptionInput[];
}

/** Normalizes an option given as a plain string to a {@link FieldOption}. */
export function toFieldOption(option: FieldOptionInput): FieldOption {
	return typeof option === 'string' ? { value: option, label: option } : option;
}

export interface FieldDefaults {
	labelPlacement: LabelPlacement;
	/** Defaults for every `SelectField` (each prop still wins). */
	select?: { labelPlacement?: LabelPlacement; allowEmpty?: boolean; placeholder?: string };
	/** Defaults for every `RadioGroup`. */
	radio?: { labelPlacement?: LabelPlacement; inline?: boolean; clearable?: boolean };
	/** Defaults for every `ReadonlyField`. */
	readonly?: { empty?: string };
}

const KEY = Symbol('svelte-crud-kit-field-defaults');

const FALLBACK: FieldDefaults = { labelPlacement: 'floating' };

/**
 * Sets app-wide field defaults (e.g. `{ labelPlacement: 'top' }`) for every field rendered below,
 * plus per-type ones (`select`, `radio`, `readonly`). Call once, high in your tree. A field's own
 * props always win.
 */
export function setFieldDefaults(defaults: FieldDefaults): FieldDefaults {
	return setContext(KEY, defaults);
}

/** Reads the current field defaults, falling back to floating labels when none are set. */
export function getFieldDefaults(): FieldDefaults {
	return getContext<FieldDefaults>(KEY) ?? FALLBACK;
}
