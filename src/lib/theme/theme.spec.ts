import { describe, expect, it } from 'vitest';
import { createThemes } from './index.js';

const themes = createThemes({ light: 'brightish', dark: 'darkish' });

describe('createThemes', () => {
	it('resolves preferences and normalizes unknown values to light', () => {
		expect(themes.resolve('dark', false)).toBe('darkish');
		expect(themes.resolve('system', true)).toBe('darkish');
		expect(themes.resolve('system', false)).toBe('brightish');
		expect(themes.normalize('nonsense')).toBe('brightish');
	});

	it('renders a request from an explicit preference and asks to persist a stale cookie', () => {
		expect(themes.forRequest('dark', 'brightish')).toEqual({ theme: 'darkish', persist: true });
		expect(themes.forRequest('dark', 'darkish')).toEqual({ theme: 'darkish', persist: false });
	});

	it('uses the cookie for "system", which only the browser can resolve', () => {
		expect(themes.forRequest('system', 'darkish')).toEqual({ theme: 'darkish', persist: false });
		expect(themes.forRequest(undefined, 'darkish')).toEqual({ theme: 'darkish', persist: false });
	});

	it('uses defaultPreference when the user has none', () => {
		const light = createThemes({ light: 'brightish', dark: 'darkish', defaultPreference: 'light' });
		expect(light.forRequest(null, 'darkish')).toEqual({ theme: 'brightish', persist: true });
		expect(themes.defaultPreference).toBe('system');
	});
});
