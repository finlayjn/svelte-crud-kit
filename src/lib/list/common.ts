import * as v from 'valibot';

/**
 * Small, reusable Valibot primitives for CRUD entity schemas. Framework-free and safe to import
 * from both client and server code — these are the single source of truth for common field shapes,
 * so a form control and its server validation can never drift.
 */

/** A database row id: a positive integer. Accepts numeric strings from form data. */
export const id = v.pipe(v.number(), v.integer(), v.minValue(1));

/** Optional free-text field. Empty strings are normalised to `undefined`. */
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

/** A hex color like `#3b82f6`, or `undefined`. */
export const optionalColor = v.optional(
	v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color, e.g. #3b82f6'))
);

/**
 * An optional `YYYY-MM-DD` date string. Empty strings normalise to `undefined` (so a cleared date
 * picker stores null), and a non-empty value must be a valid ISO calendar date.
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
