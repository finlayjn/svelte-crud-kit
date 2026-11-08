# Changelog

All notable changes to `@finlayjn/svelte-crud-kit` are documented here. This project adheres to
[Semantic Versioning](https://semver.org/). While the package is pre-`1.0`, minor versions may
include breaking changes.

## 0.3.0

### Breaking

- **DataTable** — rows are no longer `role="button"` or focusable. With `rowHref`, put the new
  `RowLink` around the label in each row's first cell: it's a real `<a>` (Tab, Cmd/Ctrl/middle
  click and Copy link work), and a click elsewhere on the row follows it (Cmd/Ctrl/Shift or
  middle-click opens a new tab). `onRowClick` is ignored when `rowHref` is set, so drop it where
  it only navigated. Without `rowHref`, `onRowClick` is a mouse shortcut; give the row a button
  for keyboard users.
- **AutosaveController / SaveTracker** — `destroy()` now sends pending edits in autosave mode
  (fire and forget) instead of dropping them; `destroy({ flush: false })` restores the old
  behavior. `onError` fires once per failure streak (plus every failed explicit `flush()` /
  `commit()`), not on every retry. `SaveState` gains `'failed'`.
- **Toasts** — errors stay until dismissed unless you pass a `ttl`. Info and success toasts last
  4s (was 3s), warnings 8s (was 5s).
- **ConfirmStore** — `pending` is a `ConfirmRequest` (the options plus an `id`) and no longer
  carries `resolve`. `confirm(id?)` / `cancel(id?)` ignore a stale id.
- **ListPage** — `class` is appended, as documented, instead of replacing the default `p-4`.
  Use `padded={false}` to set your own padding.
- **optionalColor** — now `v.nullish`, so the output type includes `null` (which clears a color).
- **createListUrl** — `search` is trimmed and capped at 100 characters.
- **Peer dependency** — `@sveltejs/kit` `^2.12.0` (the kit uses `$app/state`).
- **Sizes** — Pagination, ListSearch and the field controls (checkboxes, radios, the date input)
  use daisyUI's default sizes instead of `-xs` / `-sm`. Check layouts that relied on the smaller
  controls.

### Added

- **RecordEditor** (`/state`) — one record edited field by field on a `ChangeQueue` (manual mode
  by default): a bindable `draft` like `EditDraft`'s, but changes carry the value they started
  from, so the server applies only changed fields and reports conflicts. `sameFieldValue` is the
  shared comparison (blank, `null` and empty lists are equal; text is trimmed). It exposes
  `failed`, `problems` and `blocksLeaving`, so it works directly as a `SaveGroup` source and with
  `useUnsavedGuard`.
- **FormModal** — a `Modal` holding a form, with Cancel and a submit button; busy (and not
  dismissible) while `onsubmit` runs.
- **Per-type field defaults** — `setFieldDefaults` also takes `select` (label placement, empty
  option, placeholder), `radio` (label placement, inline, clearable) and `readonly` (the empty
  text), so an app sets its house style once instead of on every field.
- **SaveActions**, **PendingRemovals**, **UnsavedHint** — navbar Save / Discard / status for a
  `ChangeQueue` page, "will be removed when you save" notes with Undo, and a "Not saved yet"
  note; every label is overridable, and `notify` / `confirmDiscard` turn off SaveActions' toasts
  and Discard confirmation. In autosave, SaveActions says "retrying" only while a retry is
  scheduled, and "Couldn't save" for a refused save. `ChangeQueue.blocksLeaving` and
  `changeQueueLabel` cover the unsaved-changes guard and the status text.
- **PanelBoundary** — keeps a panel's rendering error from taking down the page, with Try again;
  message, retry label, error handler and the whole failure UI are overridable.
- **RowButton** — the button version of `RowLink`, for `DataTable` rows that open a dialog.
- **TokenSelect** (`/fields`) — a chip multi-select with an "add" dropdown; a `chip` snippet
  renders custom chip content. Focus stays on the control when a chip is added or removed.
- **EdgeShadow** — the shared edge shadow behind the navbar and `ScrollArea`.
- **errorMessage / reportError** and **reload** (`/state`) — show a refused request's message or a
  fallback while logging the cause; rerun `load`s by `depends` key after a command.
- **`/theme`** — `createThemes({ light, dark })`: light / dark / system with a cookie, so the
  server can stamp `data-theme` before paint (`forRequest`) and the client follows the system
  (`apply`). `defaultPreference` (default "system") covers users who haven't chosen.
- **ChangeQueue** — keyed, compare-and-set edits for records several people edit: conflicts,
  refused values and removed records collect in `problems` for `keepMine` / `useTheirs`, with an
  optional `merge` (e.g. text) and `rebase`; manual or autosave timing, one request at a time,
  retry with backoff (`retrying` says whether one is scheduled), `onError` for every failed Save,
  and `SaveSource` for `SaveGroup`.
- **ChangeProblems** — lists a `ChangeQueue`'s problems with Use theirs / Keep mine per item and
  for all; every label is overridable and `level` sets the heading level.
- **Modal** — a daisyUI modal on a native `<dialog>`: bindable `open`, `title`, `description`,
  `busy` (not dismissible while true), `children` and `actions` snippets, `onclosed` after the
  exit animation, focus return, nested-dialog closing and an entry animation when created open.
- **ScrollArea** — a vertical scroller with edge shadows while there's more to scroll; `label`
  makes it a focusable named region.
- **RowLink** — the row link for `DataTable` (see above).
- **DataTable** — `rowKey` keys rows by id; sorted headers get `aria-sort`; the sort button's
  name includes the direction.
- **SaveGroup** (`/state`) — aggregates save sources (`dirty`, `saving`, `failed`, optional
  `flush`) with reactive membership, `register(source)` and `flushAll()`. Works with
  `saveIndicatorLabel` and `useUnsavedGuard`.
- **useShellSlots** (`/state`) — sets the navbar `actions` / `search` slots for the calling
  component and clears them on unmount only if it still owns them. Accepts an object or a getter.
- **parseListParams** (`/list`) — framework-free URL parser for page, size, sort, direction and
  search, shared by server loads and `createListUrl`. Also `SEARCH_MAX_LENGTH`.
- **Save engines** — retries back off exponentially (`retryMaxMs`, default 30s) and skip errors
  with a 4xx `status` other than 408 and 429 (`shouldRetry`, `isRetryableError`). New `failed`
  and `error` state; `SaveTracker` gains `saving` and `isFailed(key)`. `saveIndicatorLabel`
  accepts `failed` and shows "Couldn't save".
- **ConfirmModal** — `kind: 'warning' | 'neutral'`.
- **ToastStore** — `pause()` / `resume()`; the Toaster pauses while hovered or focused.
- **Fields** — options may be plain strings (`FieldOptionInput`, `toFieldOption`);
  `SelectField` gains `groups` (optgroups) and `allowEmpty`; `ReadonlyField` gains `empty`;
  `RadioGroup` accepts `name`.
- **Section** — `level` sets the title's heading level.
- `defaultResolveParent` is exported from `/state`; `SaveMode` lives in a types module (the old
  import path still works).

### Fixed

- **AppShell scroll on Back / Forward** — `<main>` is the page's scroller, but only the window's
  scroll is restored by the browser, so Back kept the previous page's offset: a short page
  rendered with empty space below it. The shell now resets `<main>` before a new page renders
  and restores each page's position (by URL) on Back / Forward.
- **Shadows in dark themes** — the navbar's scroll shadow (`shadow-md`, 10% black) didn't show
  on dark backgrounds, and `ScrollArea`'s edges used the text color, which turns white. Both now
  use `EdgeShadow`: black, stronger in dark themes, and gentler than `ScrollArea`'s old edges. The
  navbar keeps its bottom border while scrolled, so the page no longer shifts by a pixel.
- **AppShell** — leaving a route clears the navbar `actions` and `search` before the new page
  renders. Kit hands the old page the new page's `data` before unmounting it, so its navbar
  snippets re-rendered with the wrong data (one reading a field the new data lacks threw, and the
  navigation failed). Slots set by a layout that stays mounted come back after the navigation.
  `ShellState.clearSlots()` and `restoreSlots()` are the new methods behind it.
- **isActiveLink** — a malformed `%` escape in the URL no longer throws (it crashed every
  `NavItem` / `NavGroup` during SSR).
- **DataTable** — Space and Enter in a row's inputs and buttons are no longer hijacked; the size
  modifier uses literal `table-*` classes.
- **Save engines** — `flush()` / `commit()` during a save wait for it, then send newer changes;
  failures no longer retry every debounce forever.
- **NavItem** — modified clicks (new tab or window) don't clear the back trail; the active link
  has `aria-current="page"`.
- **NavGroup** — long item labels wrap instead of overflowing the sidebar. Saved open/closed
  state is applied after mount, so hydration matches the server render (a group whose saved
  state differs from its default still flips after a reload).
- **AppShell** — after navigating to another path, the `<main>` scroller resets to the top and
  takes focus, so Space and Page Down scroll the page. Uses `h-dvh`.
- **Navbar** — the menu control is a keyboard-reachable button with `aria-expanded`; Esc closes
  the drawer and returns focus. The title falls back to `page.data.title`.
- **useUnsavedGuard** — discarding on Back/Forward replays the move with `history.go`, instead
  of a `goto` that overwrote the current history entry.
- **Pagination** — an out-of-range page is clamped; Prev/Next keep focus at the ends; the
  ellipsis isn't a focusable button.
- **ConfirmModal** — keeps its content while closing, can't be canceled by a late close of an
  earlier request, is labeled and described for screen readers, and returns focus to the opener.
- **Toaster** — renders in the top layer, above open modals; uses `role="status"` for success and
  info and `role="alert"` for errors and warnings.
- **ListSearch** — follows `initial` when it changes (no `{#key}` needed) without losing text
  typed while the URL catches up; the input has an accessible name.
- **Fields** — removed daisyUI 4's `label-text`; `FieldLabel`'s top placement and `FieldBox`'s
  left placement now name their controls; the floating legend is at least `text-xs`;
  `FieldGrid cols={4}` is two columns until `lg`.
- **Section** — the title is a heading.
- **Main entry** — no longer pulls in valibot (`NavItem` / `NavGroup` import the matcher
  directly).
- Docs: `id` accepts numbers only; `optionalDate` checks the format only; `createListUrl`
  recommends a server `load` for URL-tied data.

### Known issues

Planned improvements, not yet fixed:

- **Toaster** — the toast regions are created along with the first toast, so some screen readers
  skip announcing it (most often a success or info toast). They should stay mounted.
- **Fixed English text** — Pagination, DataTable, Modal, Navbar, Toaster and ListSearch have
  built-in labels ("Per page", "Sort by", "Close", "Menu", "Dismiss", "Clear search") that can't
  be overridden yet, unlike `SaveActions` and `ChangeProblems`.
- **`RecordEditor.draft` types** — fields are typed as the stored value, but read as the control
  value (`null` reads as `''`, or whatever `toControl` returns).
- **`class` props** — older components take `class` as a string; newer ones take `ClassValue`.
- **useUnsavedGuard** — after "Discard", a canceled `goto` is replayed without its original
  options (`replaceState`, `state`, `invalidate`).
- **Toaster under a later modal** — a sticky toast shown before a modal opens sits under the modal
  until the next toast arrives.
- **ChangeProblems** — "Yours (not saved)" shows the change as it was when the conflict appeared,
  not edits made since (Keep mine sends the current one).
- **`setFieldDefaults`** — `readonly` defaults have no `labelPlacement`, unlike `select` and
  `radio`.

## 0.2.0

### Added

- **saveIndicatorLabel** (`/state`) — maps a save engine's `saving` / `dirty` to the standard
  label (Saving… / Unsaved changes / Waiting to save / All changes saved).
- **AutosaveController.destroy()** — cancels the pending debounce timer on unmount.

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
