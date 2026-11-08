/**
 * `@finlayjn/svelte-crud-kit/theme`
 *
 * Light, dark or "follow the system" for a daisyUI app, without a flash of the wrong theme. The
 * effective theme lives in a cookie, so the server can stamp `<html data-theme>` before paint; on
 * the client, `apply()` resolves "system" against `prefers-color-scheme`, follows changes to it,
 * and keeps the cookie current for the next first paint. Framework-free: use it from
 * `hooks.server.ts` and from a layout.
 */

/** What a user can choose. "system" follows the operating system's appearance. */
export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export interface ThemeOptions<Light extends string, Dark extends string> {
	/** The daisyUI theme names for light and dark. */
	light: Light;
	dark: Dark;
	/** The preference for someone who hasn't chosen one (default `system`). */
	defaultPreference?: ThemePreference;
	/** Cookie holding the effective theme (default `theme`). */
	cookie?: string;
	/** Cookie lifetime in seconds (default one year). */
	maxAge?: number;
}

export interface Themes<Light extends string, Dark extends string> {
	readonly light: Light;
	readonly dark: Dark;
	readonly cookie: string;
	readonly defaultPreference: ThemePreference;
	/** Cookie options for SvelteKit's `cookies.set` (readable by the client, which updates it). */
	readonly cookieOptions: {
		path: '/';
		maxAge: number;
		sameSite: 'lax';
		httpOnly: false;
	};
	/** An untrusted value (a cookie, say) as a known theme; light when unknown. */
	normalize(value: string | null | undefined): Light | Dark;
	/** A preference as a theme. "system" uses `prefersDark`. */
	resolve(preference: ThemePreference, prefersDark: boolean): Light | Dark;
	/**
	 * The theme to render a request in, from the user's preference (`defaultPreference` when
	 * unset) and the cookie. "system" can't be resolved on the server, so it uses the cookie (the
	 * last theme the client applied).
	 * `persist` says whether to write `theme` back to the cookie.
	 */
	forRequest(
		preference: ThemePreference | null | undefined,
		cookieValue: string | null | undefined
	): { theme: Light | Dark; persist: boolean };
	/**
	 * Applies a preference (`defaultPreference` when unset) in the browser (`<html data-theme>`
	 * and the cookie) and, for "system", keeps following the OS appearance. Call it from an
	 * `$effect`; it returns the cleanup.
	 */
	apply(preference: ThemePreference | null | undefined): () => void;
}

export function createThemes<Light extends string, Dark extends string>(
	options: ThemeOptions<Light, Dark>
): Themes<Light, Dark> {
	const { light, dark } = options;
	const cookie = options.cookie ?? 'theme';
	const defaultPreference = options.defaultPreference ?? 'system';
	const maxAge = options.maxAge ?? 31_536_000;

	const resolve = (preference: ThemePreference, prefersDark: boolean): Light | Dark =>
		preference === 'system' ? (prefersDark ? dark : light) : preference === 'dark' ? dark : light;
	const normalize = (value: string | null | undefined): Light | Dark =>
		value === dark ? dark : light;

	function setEffective(theme: Light | Dark) {
		document.documentElement.dataset.theme = theme;
		document.cookie = `${cookie}=${theme}; path=/; max-age=${maxAge}; samesite=lax`;
	}

	return {
		light,
		dark,
		cookie,
		defaultPreference,
		cookieOptions: { path: '/', maxAge, sameSite: 'lax', httpOnly: false },
		normalize,
		resolve,
		forRequest(preference, cookieValue) {
			const fromCookie = normalize(cookieValue);
			const chosen = preference ?? defaultPreference;
			if (chosen === 'system') return { theme: fromCookie, persist: false };
			const theme = resolve(chosen, false);
			return { theme, persist: theme !== cookieValue };
		},
		apply(preference) {
			const chosen = preference ?? defaultPreference;
			const media = window.matchMedia('(prefers-color-scheme: dark)');
			setEffective(resolve(chosen, media.matches));
			if (chosen !== 'system') return () => {};
			const onChange = (event: MediaQueryListEvent) =>
				setEffective(resolve('system', event.matches));
			media.addEventListener('change', onChange);
			return () => media.removeEventListener('change', onChange);
		}
	};
}
