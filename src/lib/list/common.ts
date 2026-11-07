import * as v from 'valibot';

/**
 * Small, reusable Valibot primitives for CRUD entity schemas. Framework-free and safe to import
 * from both client and server code — these are the single source of truth for common field shapes,
 * so a form control and its server validation can never drift.
 */

/**
 * A database row id: a positive integer. It accepts numbers only; convert a string from form data
 * or the URL first (e.g. `v.pipe(v.string(), v.transform(Number), id)`).
 */
export const id = v.pipe(v.number(), v.integer(), v.minValue(1));

/** Optional free-text field. Empty strings are normalized to `undefined`. */
export const optionalText = v.optional(
	v.pipe(
		v.string(),
		v.transform((s) => s.trim()),
		v.transform((s) => (s === '' ? undefined : s))
	)
);

/** A required, non-empty, trimmed string (e.g. an entity name). */
export const requiredText = v.pipe(
	v.string(),
	v.transform((s) => s.trim()),
	v.nonEmpty('This field is required')
);

/** A hex color like `#3b82f6`; `null` (to clear it) or `undefined` (to leave it) are accepted too. */
export const optionalColor = v.nullish(
	v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color, e.g. #3b82f6'))
);

/**
 * An optional `YYYY-MM-DD` date string. Empty strings normalize to `undefined` (so a cleared date
 * picker stores null). A non-empty value must have the `YYYY-MM-DD` format with a month of 01-12
 * and a day of 01-31; the check is format-only, so an impossible date such as `2024-02-30` passes.
 */
export const optionalDate = v.optional(
	v.pipe(
		v.string(),
		v.transform((s) => s.trim()),
		v.transform((s): string | undefined => (s === '' ? undefined : s)),
		v.union([v.undefined(), v.pipe(v.string(), v.isoDate('Must be a valid date'))])
	)
);

/** A nullable foreign-key reference. Treats empty string / 0 as "no reference" (`null`). */
export const optionalRef = v.optional(
	v.pipe(
		v.union([v.number(), v.pipe(v.string(), v.transform(Number))]),
		v.transform((n) => (Number.isInteger(n) && n > 0 ? n : null))
	)
);
