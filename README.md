# @finlayjn/svelte-crud-kit

Reusable building blocks for internal admin / CRUD apps: URL-backed paginated + sortable
lists, a snippet-driven data table, pagination, list headers, a nav shell with robust
back-navigation, toasts, confirm dialogs, an unsaved-changes guard, and a small form-field
kit. Everything themes through your app's daisyUI theme — no hardcoded colors.

> **Status:** early / pre-release. APIs will change until `1.0`.

> **AI Disclaimer** — This package was developed with the assistance of AI (GitHub Copilot / Claude Opus 4.8). Users should review code for their specific use case.

## Install

```sh
npm i @finlayjn/svelte-crud-kit
```

Peer dependencies (you almost certainly already have these in a SvelteKit app):
`svelte`, `@sveltejs/kit`, and — if you use the styled components — `tailwindcss` + `daisyui`.
The `@finlayjn/svelte-crud-kit/list` validation helpers additionally use `valibot`.

### Tailwind

So Tailwind scans the library's classes, add an `@source` line to your CSS entry:

```css
@import 'tailwindcss';
@plugin 'daisyui';

@source '../node_modules/@finlayjn/svelte-crud-kit/dist';
```

## Entry points

| Import                             | Contents                                                            |
| ---------------------------------- | ------------------------------------------------------------------- |
| `@finlayjn/svelte-crud-kit`        | Components (DataTable, Pagination, …)                               |
| `@finlayjn/svelte-crud-kit/state`  | Runes controllers (`createListUrl`, …)                              |
| `@finlayjn/svelte-crud-kit/list`   | Framework-free list types + valibot validation (safe on the server) |
| `@finlayjn/svelte-crud-kit/fields` | daisyUI form-field wrappers (inputs, selects, checkboxes, …)        |

## Development

This is a SvelteKit **library** project (`@sveltejs/package`). `src/lib` is published;
`src/routes` is a local showcase used only for development.

```sh
npm install
npm run dev      # showcase app
npm run check    # types
npm run build    # produces dist/ via svelte-package
```

## License

[MIT](./LICENSE)
