import { describe, expect, it } from 'vitest';
import { parseListParams } from './params.js';

const options = {
	sortKeys: ['name', 'createdAt'] as const,
	defaultSort: { key: 'createdAt' as const, dir: 'desc' as const }
};

describe('parseListParams', () => {
	it('falls back to the defaults', () => {
		expect(parseListParams(new URL('https://x.test/list'), options)).toEqual({
			page: 1,
			pageSize: 25,
			sortKey: 'createdAt',
			sortDir: 'desc',
			search: ''
		});
	});

	it('reads valid params from a URL or URLSearchParams', () => {
		const query = 'page=3&size=50&sort=name&dir=asc&q=ada';
		const expected = { page: 3, pageSize: 50, sortKey: 'name', sortDir: 'asc', search: 'ada' };
		expect(parseListParams(new URL(`https://x.test/list?${query}`), options)).toEqual(expected);
		expect(parseListParams(new URLSearchParams(query), options)).toEqual(expected);
	});

	it('rejects invalid values', () => {
		const params = new URLSearchParams('page=0&size=7&sort=password&dir=up');
		expect(parseListParams(params, options)).toMatchObject({
			page: 1,
			pageSize: 25,
			sortKey: 'createdAt',
			sortDir: 'desc'
		});
		expect(parseListParams(new URLSearchParams('page=2.5'), options).page).toBe(1);
	});

	it('honors custom page sizes and default size', () => {
		const custom = { ...options, pageSizes: [10, 20], defaultPageSize: 20 };
		expect(parseListParams(new URLSearchParams('size=10'), custom).pageSize).toBe(10);
		expect(parseListParams(new URLSearchParams('size=25'), custom).pageSize).toBe(20);
	});

	it('trims the search term and caps it at 100 characters', () => {
		expect(parseListParams(new URLSearchParams('q=%20%20ada%20'), options).search).toBe('ada');
		const long = 'a'.repeat(150);
		expect(parseListParams(new URLSearchParams(`q=${long}`), options).search).toHaveLength(100);
	});
});
