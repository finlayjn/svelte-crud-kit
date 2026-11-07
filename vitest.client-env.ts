import { builtinEnvironments, type Environment } from 'vitest/runtime';

// Node globals, but modules are transformed for the browser so runes and effects run as in the app.
export default {
	...builtinEnvironments.node,
	name: 'svelte-client',
	viteEnvironment: 'client'
} satisfies Environment;
