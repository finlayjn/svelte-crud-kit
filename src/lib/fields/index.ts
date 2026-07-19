/**
 * `@finlayjn/svelte-crud-kit/fields`
 *
 * Optional daisyUI form-field wrappers with configurable label placement (`floating` | `top` |
 * `left`). Every field is `$bindable` and exposes an `onchange` hook (pairs well with the autosave
 * engine). You can always bind raw daisyUI inputs instead — these just remove the boilerplate.
 *
 * Set an app-wide default with `setFieldDefaults({ labelPlacement })`; override per field via the
 * `labelPlacement` prop.
 */
export { default as FieldLabel } from './FieldLabel.svelte';
export { default as FieldBox } from './FieldBox.svelte';
export { default as TextField } from './TextField.svelte';
export { default as TextArea } from './TextArea.svelte';
export { default as SelectField } from './SelectField.svelte';
export { default as CheckboxField } from './CheckboxField.svelte';
export { default as CheckboxDateField } from './CheckboxDateField.svelte';
export { default as CheckboxGroup } from './CheckboxGroup.svelte';
export { default as RadioGroup } from './RadioGroup.svelte';
export { default as ReadonlyField } from './ReadonlyField.svelte';
export { default as FieldGrid } from './FieldGrid.svelte';
export {
	setFieldDefaults,
	getFieldDefaults,
	type LabelPlacement,
	type FieldDefaults,
	type FieldOption
} from './fieldConfig.js';
