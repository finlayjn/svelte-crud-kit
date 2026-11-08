import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorMessage, reportError } from './errors.js';

describe('errorMessage', () => {
	it("returns a refused request's message", () => {
		expect(errorMessage({ status: 409, body: { message: 'Already on file' } })).toBe(
			'Already on file'
		);
	});

	it('ignores server errors, missing messages and non-HTTP errors', () => {
		expect(errorMessage({ status: 500, body: { message: 'Internal Error' } })).toBeUndefined();
		expect(errorMessage({ status: 400, body: {} })).toBeUndefined();
		expect(errorMessage(new TypeError('Failed to fetch'))).toBeUndefined();
		expect(errorMessage(null)).toBeUndefined();
	});

	it('shows other statuses when asked', () => {
		const error = { status: 503, body: { message: 'Down for maintenance' } };
		expect(errorMessage(error, { showStatus: () => true })).toBe('Down for maintenance');
	});
});

describe('reportError', () => {
	afterEach(() => vi.restoreAllMocks());

	it('logs the cause and falls back to the friendly text', () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		const cause = new TypeError('Failed to fetch');
		expect(reportError('widgets', cause, 'Could not save the widget.')).toBe(
			'Could not save the widget.'
		);
		expect(log).toHaveBeenCalledWith('[widgets] Could not save the widget.', cause);
	});

	it('logs where it is told to', () => {
		const log = vi.fn();
		reportError('widgets', 'x', 'Failed.', { log });
		expect(log).toHaveBeenCalledWith('[widgets] Failed.', 'x');
	});
});
