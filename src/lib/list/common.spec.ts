import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { id, optionalColor, optionalDate } from './common.js';

describe('common schemas', () => {
	it('optionalColor accepts a hex color, null and undefined', () => {
		expect(v.parse(optionalColor, '#3b82f6')).toBe('#3b82f6');
		expect(v.parse(optionalColor, null)).toBeNull();
		expect(v.parse(optionalColor, undefined)).toBeUndefined();
		expect(v.safeParse(optionalColor, 'blue').success).toBe(false);
	});

	it('id accepts positive integers only', () => {
		expect(v.parse(id, 3)).toBe(3);
		expect(v.safeParse(id, '3').success).toBe(false);
		expect(v.safeParse(id, 0).success).toBe(false);
	});

	it('optionalDate checks the format only', () => {
		expect(v.parse(optionalDate, ' ')).toBeUndefined();
		expect(v.parse(optionalDate, '2024-02-29')).toBe('2024-02-29');
		expect(v.safeParse(optionalDate, '2024-13-01').success).toBe(false);
		expect(v.parse(optionalDate, '2024-02-30')).toBe('2024-02-30');
	});
});
