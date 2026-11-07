import { describe, expect, it } from 'vitest';
import { isActiveLink } from './active.js';

const url = (s: string) => new URL(s, 'https://example.test');

describe('isActiveLink', () => {
	it('matches the same path and filters, ignoring list-view params', () => {
		expect(isActiveLink(url('/orders?status=A&page=2&q=x'), '/orders?status=A')).toBe(true);
		expect(isActiveLink(url('/orders?status=B'), '/orders?status=A')).toBe(false);
		expect(isActiveLink(url('/orders'), '/orders')).toBe(true);
	});

	it('ignores param order and treats + and %20 alike', () => {
		expect(isActiveLink(url('/c?b=2&a=1'), '/c?a=1&b=2')).toBe(true);
		expect(isActiveLink(url('/c?s=Big%20One'), '/c?s=Big+One')).toBe(true);
	});

	it('does not throw on a malformed percent escape', () => {
		expect(() => isActiveLink(url('/orders?status=%'), '/orders?status=A')).not.toThrow();
		expect(isActiveLink(url('/orders?status=%'), '/orders?status=A')).toBe(false);
		expect(isActiveLink(url('/orders?status=%E0%A4%A'), '/orders')).toBe(false);
		expect(isActiveLink(url('/orders'), '/orders?status=%')).toBe(false);
	});

	it('prefix-matches nested routes, honoring a filtered link', () => {
		expect(isActiveLink(url('/settings/x'), '/settings', 'prefix')).toBe(true);
		expect(isActiveLink(url('/settingsx'), '/settings', 'prefix')).toBe(false);
		expect(isActiveLink(url('/c/1?status=A'), '/c?status=A', 'prefix')).toBe(true);
		expect(isActiveLink(url('/c/1?status=B'), '/c?status=A', 'prefix')).toBe(false);
	});
});
