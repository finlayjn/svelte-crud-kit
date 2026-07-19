# Changelog

All notable changes to `@finlayjn/svelte-crud-kit` are documented here. This project adheres to
[Semantic Versioning](https://semver.org/). While the package is pre-`1.0`, minor versions may
include breaking changes.

## 0.1.1

### Fixed

- **Pagination** — the current page is now highlighted with `btn-primary`. The previous
  `btn-active` was nearly invisible on a plain join button, so the selected page didn't read as
  selected.

## 0.1.0

Initial public release: SvelteKit primitives for building internal CRUD admin tools, built on
daisyUI + Tailwind.

- **Lists** — URL-backed, paginated, sortable, and searchable list pages: `createListUrl`,
  `DataTable`, `Pagination`, `ListHeader`, `ListSearch`, `ListPage`.
- **App shell** — responsive drawer shell with layered back-navigation: `AppShell`, `Navbar`,
  `NavGroup`, `NavItem`, `SidebarFooter`.
- **Feedback** — toasts, confirm dialogs, and an unsaved-changes guard: `createToasts` /
  `Toaster`, `createConfirm` / `ConfirmModal`, `useUnsavedGuard`.
- **Autosave** — single-record `AutosaveController` and multi-key `SaveTracker`.
- **Fields** — daisyUI form-field wrappers (`/fields`).
- **List contract** — a framework-free entry point (`/list`) with shared types, constants, and
  valibot validation, safe to import in `load` functions, remote functions, and API routes.
