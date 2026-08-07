# Bootstrap → Mantine migration

Living spec for moving the React frontend off Bootstrap/react-bootstrap onto
Mantine. Phases 0–1 are **done**; Phases 2–3 are **planned** and described here
in enough detail to resume without re-discovery.

## Scope & standing decisions

- **React only.** Global Bootstrap CSS (`bootstrap@4.6.2`, imported in
  `assets/css/style.scss` and `assets/js/app.ts`) **stays** — 53 `.heex` server
  templates still use Bootstrap utility classes. Do **not** remove the
  `bootstrap` dependency or its CSS until the heex templates are migrated
  (Phase 3, out of current scope).
- **Idiomatic Mantine.** Prefer Mantine layout primitives (`Group`/`Stack`/
  `Flex`/`Box`) + style props (`mb`, `p`, `c`) over porting utility classes 1:1.
- **Incremental, per-widget.** One widget/page per PR, leaf → container, verify
  each in the browser before merging.
- **Mantine version:** `@mantine/core` + `@mantine/hooks` v9.

## Current status

| Phase | What | Status |
|------|------|--------|
| 0 | Infra: Mantine deps, PostCSS, CSS-layer coexistence, theme, `MantineProvider` on all roots | ✅ done |
| 1 | Replace `react-bootstrap` **components** with Mantine; remove `react-bootstrap` dep | ✅ done |
| 2 | Convert Bootstrap **utility classes** in the ~244 React files to idiomatic Mantine | ⬜ planned |
| 3 | Migrate `.heex` templates; fully remove Bootstrap CSS + `bootstrap` dep | ⬜ planned (out of current scope) |

## Coexistence model (how Bootstrap + Mantine live together)

- Mantine core styles are imported as **`@mantine/core/styles.layer.css`** (in
  `style.scss`), which wraps everything in `@layer mantine`. Unlayered Bootstrap
  always wins on conflicts, so existing Bootstrap-styled UI is unaffected.
- Because Bootstrap wins, Mantine components that also carry Bootstrap/custom
  classes (e.g. Alerts keeping `.alert-dark-theme`, Tables keeping `.table`) get
  their look from those classes. Phase 2 removes the classes and lets Mantine
  style them.

## Key files (Phase 0/1 infra)

- `assets/js/widgets/ui/theme.ts` — Mantine theme. Custom colors `cbSecondary`
  (#3a3f50), `cbSuccess` (#46a077), `brand` (orange #ee3737). **Spacing scale is
  matched to Bootstrap-4 spacers**: `xs=.25rem, sm=.5rem, md=1rem, lg=1.5rem,
  xl=3rem` — so `mb-2 → mb="sm"`, `p-3 → p="md"`, etc. keep the same rhythm.
- `assets/js/widgets/ui/withMantine.tsx` — provider wrapper; applied to every
  React root in `widgets/index.tsx` and the Inertia root in `inertia.tsx`.
  `forceColorScheme="dark"` (single baked-in dark look, no runtime toggle).
- `assets/js/widgets/ui/alert.ts` — `bootstrapAlertColor(variant)` maps BS alert
  variants → Mantine colors.
- `assets/js/widgets/components/CbModal.tsx` — app modal wrapper: keeps a compound
  API (`Modal` + `Modal.Header/Title/Body/Footer`) but renders a Mantine `Modal`
  underneath, so ~21 modal call sites are untouched. Default `size="lg"`
  (Bootstrap's `.modal-dialog { min-width: 700px }` no longer applies to Mantine's
  DOM).
- `assets/js/widgets/components/PopoverStickOnHover.tsx` — Mantine `HoverCard`
  behind the original API; exports `Placement` (= `FloatingPosition`).

## Gotchas / learnings (read before Phase 2)

1. **Mantine v9 components throw without `MantineProvider`.** Any test that
   mounts a Mantine component must wrap in `MantineTestProvider`
   (`assets/js/__tests__/helpers/mantine.tsx`). The app itself is fine — all
   roots use `withMantine`.
2. **jsdom polyfills** for Mantine are in `vitest.setup.ts`: `window.matchMedia`
   and `ResizeObserver`. Keep them.
3. **Portals in tests.** Mantine `Modal`/`Menu`/`HoverCard`/`Popover` render in a
   portal. Query with `screen.*` and use async `findBy*` for open-on-interaction
   content (modals/menus have mount transitions — sync `getByRole` races).
4. **`@/ui/*` path alias is broken in Vite's resolver** (only specific `@/`
   subpaths are aliased; `ui` isn't). Import theme/helpers via **relative paths**
   (`../ui/...`), not `@/ui/...`. tsc accepts `@/*` but Vite/vitest will fail to
   resolve.
5. **Custom-event button theming.** `cb-custom-event-btn-*` classes (in
   `external.scss`/`custom.scss`) are event-branded color overrides used across
   ~8 files, applied conditionally via `className` on Mantine `Button`s. They are
   pure color overrides and still win over Mantine's layer — handle them as a set
   in Phase 2, don't drop them piecemeal.
6. **Menu items only render when open.** react-bootstrap `Dropdown.Menu`
   rendered items always; Mantine `Menu.Dropdown` mounts on open. Use
   `keepMounted` if a test/behavior depends on items being in the DOM while
   closed (see `UserSettingsForm` language menu).

---

## Phase 2 — Utility classes → idiomatic Mantine (the big one)

**Goal:** remove Bootstrap utility classes from React components, replacing them
with Mantine primitives + style props. ~244 files; work per-widget.

### Conversion vocabulary

| Bootstrap | Mantine |
|-----------|---------|
| `d-flex` + `align-items-*`/`justify-content-*` | `<Group>` (row) / `<Flex>` with `align`/`justify` |
| `d-flex flex-column` | `<Stack>` (or `<Flex direction="column">`) |
| `row` / `col-*` / `col-md-4` | `<Grid>` + `<Grid.Col span={{ base: 12, md: 4 }}>` or `<SimpleGrid>` |
| spacing `mb-2 p-3 mr-2 px-1 py-2 …` | style props `mb="sm" p="md" mr="sm"` (scale already matched) |
| `text-center` / `text-white` / `text-muted` | `<Text ta="center" c="white">`, `c="dimmed"` |
| `font-weight-bold` | `fw={700}` |
| `card` / `card-body` / `card-header` | `<Card>` / `<Card.Section>` or `<Paper withBorder>` |
| `badge badge-*` | `<Badge color=…>` |
| `border` / `rounded` / `rounded-lg` / `shadow` | `withBorder`, `radius="md"`, `shadow="sm"` |
| `w-100` / `h-100` | `w="100%"` / `h="100%"` |
| `d-none` (responsive show/hide) | `visibleFrom`/`hiddenFrom` or `display` style prop |
| `btn btn-secondary cb-btn-secondary` (native buttons left from Phase 1) | `<Button color="cbSecondary">` |
| custom `bg-panel` / `cb-border-color` etc. | theme tokens or a small CSS module |

### Frequency (helps prioritize; from Phase-0 audit)

`d-flex` 436, `border` 201, `rounded` 200, `btn` 196, `align-items-center` 187,
`text-white` 175, `text-muted` 151, `flex-column` 151, `text-center` 138,
`w-100` 117, `p-3` 107, `mb-2` 106, `row` 94, `card` 89, `justify-content-between`
83, `col-12` 74, `h-100` 66 …

### Custom classes that need real homes (not just utility swaps)

Defined in `assets/css/style.scss` (~4.7k lines) and `external.scss`/`custom.scss`.
These are **design**, not utilities — port to the Mantine theme or CSS modules,
don't inline:
`cb-bg-panel`, `cb-bg-highlight-panel`, `cb-border-color`, `cb-btn-secondary`,
`cb-btn-success`, `cb-btn-outline-secondary`, `cb-custom-event-btn-*`,
`cb-rounded`, `cb-text`/`cb-text-light`, `alert-dark-theme`, the `cb-tournament-*`
/ `cb-schedule-*` / `cb-settings-*` / `cb-replayer-*` component styles.

### Sequencing (leaf → container, one PR each)

1. Shared leaf components in `widgets/components/` (buttons already Mantine;
   convert their surrounding layout, badges, cards).
2. Pages, roughly by risk: `settings`, `profile`, `lobby`, `registration`,
   `tournament` / `tournamentPlayer` / `groupTournament`, `game` / `gameMl`,
   `admin`, `event`, then `schedule`, `seasonsPage`, `hallOfFamePage`,
   `headToHeadPage`, `taskPreview`.
3. Per slice: convert → wrap affected tests in `MantineTestProvider` + fix
   portal/`findBy` queries → **verify in browser** (dev server) → merge.

### Definition of done (Phase 2)

- `grep -rE "className=.*(d-flex|btn|col-|row|mb-|text-white|card|badge)"` over
  `assets/js` returns only intentional leftovers (documented).
- All remaining Bootstrap-class consumers are `.heex` templates (Phase 3).

---

## Phase 3 — heex templates + full Bootstrap removal (out of current scope)

1. Migrate the 53 `.heex` templates off Bootstrap classes (Phoenix/Elixir side).
2. Remove `import 'bootstrap'` (`app.ts`) and `@import 'bootstrap/scss/bootstrap'`
   (`style.scss`); drop the `bootstrap` dependency.
3. Enable `postcss-simple-vars` (Mantine breakpoint vars) — deferred in Phase 0
   because it choked on the compiled Bootstrap bundle. Only needed once we author
   Mantine CSS modules with `$mantine-breakpoint-*` media queries; scope it so it
   doesn't process legacy CSS.
4. Delete dead custom SCSS once nothing references it.

## Dev/build notes

- Frontend deps + build run **inside the `codebattle-app-1` container**
  (`docker exec -w /app/apps/codebattle codebattle-app-1 …`). The pnpm store is at
  the container path `/app/.pnpm-store`; running `pnpm install`/`add`/`remove` on
  the host errors on a store-path mismatch and would purge `node_modules`.
- Verify a slice: `pnpm run typecheck`, `pnpm exec vitest run`, `pnpm run build`,
  `pnpm run lint-fix:js` (oxfmt + oxlint).
