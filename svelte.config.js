import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// `vitePreprocess` lets the showcase app and the packaged library share the same
	// TypeScript / PostCSS pipeline.
	preprocess: vitePreprocess(),
	kit: {
		// The adapter only affects the local showcase/dev app in `src/routes`; it is never
		// shipped. `svelte-package` publishes `src/lib` on its own.
		adapter: adapter()
	}
};

export default config;
