# Bootstrap → Mantine migration

Living spec for moving the React frontend off Bootstrap/react-bootstrap onto
Mantine. Phases 0–1 are **done**; Phase 2 is **in progress** (shared leaf
components converted — see the progress log under Phase 2); Phase 3 is
**planned**. Described here in enough detail to resume without re-discovery.

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
| 2 | Convert Bootstrap **utility classes** in the ~244 React files to idiomatic Mantine | 🔄 in progress — shared leaf components done |
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
  Also exports **`cssVariablesResolver`** (Phase 2) that sets
  `--mantine-color-default-border` = `#4c4c5a` (`$cb-border-color`) in the dark
  scheme, so `<Paper/Card withBorder>` matches the legacy `.cb-border-color`
  panels. It is passed to `MantineProvider` in **both** `withMantine.tsx` and the
  test provider `helpers/mantine.tsx`. `cb-rounded` (`$cb-border-radius` 0.5rem)
  → Mantine `radius="md"` (md = 0.5rem).
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
7. **Unlayered Bootstrap beats Mantine — watch `border-radius` on buttons.**
   Bootstrap is imported unlayered (`style.scss` `@import 'bootstrap/scss/bootstrap'`)
   while Mantine is in `@layer mantine`, so **any** unlayered rule wins over
   Mantine regardless of specificity. Concretely, `style.scss` has
   `.btn { border-radius: unset }` and utilities like `rounded-top`. A Mantine
   `<Button radius="…">` that still carries Bootstrap classes (e.g. `Rooms`'
   `rounded-top cb-btn-secondary`) will **ignore** the Mantine `radius` — the
   unlayered rule overrides it. Fix = drop the Bootstrap button classes and port
   `cb-btn-secondary` to the theme (button-theming pass). Pure Mantine buttons
   (no leftover BS classes) round correctly.
8. **`grep` over-counts Phase-2 targets.** Substring matches inflate the count:
   `card` matches the `Card` component, `badge` matches `cb-achievement-badge`,
   etc. Filter to whole-word Bootstrap tokens. Also: the *remaining* leaves are
   rarely plain spacing swaps — they're coupled to custom `cb-*` design classes
   (need theme/CSS-module homes) or to non-Mantine libs (react-select, native
   `<select>`), so budget per-component judgement, not a blanket sweep.

---

## Phase 2 — Utility classes → idiomatic Mantine (the big one)

**Goal:** remove Bootstrap utility classes from React components, replacing them
with Mantine primitives + style props. ~244 files; work per-widget.

### Progress (updated 2026-08-07)

Working in small per-slice commits (convert → wrap affected tests in
`MantineTestProvider` → typecheck + vitest + build + lint). Started with the
shared leaf components in `widgets/components/`.

**Done (35 leaf components):** `Card`, `InfoMessage`, `SystemMessage`, `Loading`,
`MessageTimestamp`, `ResultIcon`, `OnlineContainer`, `Editor` (Vim status bar),
`GamesHeatmap`, `TournamentPreviewPanel`, `PlayerLoading`, `EditorLoading`,
`UserAchievements`, `MessageTag`, `TournamentTimer`, `GameLevelBadge`,
`ChatHeader`, `Message`, `Messages`, `TournamentDescription` (layout only —
its `.card.cb-card` ranking panel is left as Bootstrap; see below),
`SideScrollControls` (positioning/overflow utilities → `Box`/`Flex` +
`pos`/`top`/`left`/`right`/`display` style props; icon `btn`s → `UnstyledButton`;
gradient `cb-*-scroll-control` design classes kept),
`ScheduleNavigationBar` (`d-flex`→`Flex`, `pr-2`/`pl-2`→`Group gap`; the
`div role="button" .btn-link` prev/next controls → real `UnstyledButton c="white"`,
dropping the manual `role`/`tabIndex`/`onKeyPress` a11y shims and the custom
`.btn-link{color:white}` override), and the
`UserInfo` / `UserName` / `UserLabel` / `UserStats` cluster. Plus the
theme border-token work (gotcha #7 / `theme.ts`) and the first slice of the
**button-theming pass**: `.cb-btn-secondary`'s lighten-on-hover
(`$cb-secondary-hover-background` #4c5369) is ported into the theme via
`components.Button = Button.extend({ vars })` keyed on `color="cbSecondary"`
(Mantine's `--button-hover` var). `cbSuccess` needs no override — its tuple
index 7 already equals `$cb-hovered-success`. With that in place `Rooms` is now
**pure Mantine**: dropped `rounded-top` + `cb-btn-secondary` from the target
`Button` (radius now comes from `defaultRadius`, hover from the theme), removed
the pointless `mr-2` span wrapper, and dropped `h-auto` from the dropdown. The
chat cluster is effectively done.

> Blast radius of the theme `vars` override: it only changes buttons that carry
> `color="cbSecondary"` **and** have already dropped the `cb-btn-secondary`
> class (unlayered Bootstrap still wins where the class remains). Today that is
> only `Rooms`; the other ~9 `cb-btn-secondary` consumers are unaffected until
> their class is dropped in later slices.

Also done: the **Invites cluster** (`InvitesList` + `InvitesContainer`) —
layout → `Flex`/`Group`, native `btn`s → Mantine `<Button variant="outline">`
(`size="compact-sm"`; keeping `cb-btn-outline-secondary` so the secondary
buttons' look is preserved, `btn-outline-danger` → `color="red"`), the
`d-none`/`sr-only` a11y spans → `<VisuallyHidden>`, and the two absolutely-
positioned `badge badge-danger` notification overlays → Mantine `<Badge
color="red" pos="absolute">` (size/shape differs from the BS badge — flag in QA).
Icons moved to `leftSection`. `DropdownMenuDefault` deleted as dead code.

Also done: **`AccordeonBox`** (the game test-output panel, consumed by
`pages/game/Output.tsx`). Only `SubMenu` + `Item` were actually rendered, so
the dead root `.accordion` component, `Menu`, `renderFirstAssert`, and
`getMessage` were **deleted** and the export collapsed to a plain
`{ Item, SubMenu }` namespace. The live parts went to Mantine: `list-group-item`
→ `Box` (dark `cb-bg-highlight-panel` kept, top/bottom borders via
`--mantine-color-default-border`), `d-flex` → `Flex`, `badge badge-*` →
`<Badge>` (status→Mantine color map), the STDOUT toggle `btn` → `<Button
variant="outline">` driving a Mantine `<Collapse>` (⚠️ this Mantine build's
`Collapse` prop is **`expanded`**, not `in`), and the Bootstrap `h1`–`h5` font
zoom → a numeric-`fontSize`→rem map applied via `fz` / `--badge-fz` (replayer
zoom fidelity is the main thing to eyeball in QA).

Also done: **`FeedbackWidget`** — the floating trigger `btn` and the Type
`btn`/`btn-outline` radios → Mantine `<Button>` (filled vs `variant="outline"`,
`color="cbSecondary"`; the outline keeps `cb-btn-outline-secondary`), the
`form-group`/`label`/`textarea` → `<Text component="label">` + `<Textarea>`
(dark look now comes from the forced-dark theme, not `cb-bg-panel`/`text-white`).
Note: the ARIA `role="radio"` buttons needed an explicit `tabIndex={0}` —
oxlint's `interactive-supports-focus` can't see that a Mantine `<Button>`
renders a focusable `<button>`, so a custom component with a role + handler
trips the rule (native `<button>` didn't).

Also done: **`FeedbackAlertNotification`**. The shared `.alert-dark-theme`
gradient design (used by 4 React alerts + 3 heex) now has a **real home in TS**:
`ui/alert.ts` exports `darkThemeAlertStyles(status)` returning the Mantine
`<Alert>` `styles` (per-variant gradient bg, colored `border-left`, blurred
backdrop, text color) — no CSS module needed. `FeedbackAlertNotification` drops
`row mb-0 rounded-0 alert alert-${status} show alert-dark-theme` for
`radius={0} mb={0} styles={darkThemeAlertStyles(...)}`. The other three alerts
(`UserSettings`, `EditTournament`, `GameResult`) can adopt the same helper and
drop `alert-dark-theme` when their pages convert.

Also done: **`ChatInput`** (the chat message composer, both `default` and
`tournament` variants). The Bootstrap `input-group`/`input-group-append` form →
`<Flex component="form" pos="relative">` (relative so the emoji tooltip/picker
and the length-error overlay still anchor to it); native `<input>` → Mantine
`<TextInput flex={1}>`; the two native `btn`s → Mantine `<Button>` (emoji =
`variant="default"`/`subtle`, send = `color="cbSecondary"` — dropping
`cb-btn-secondary` now that the hover lives in the theme, so the default send
button is pure Mantine). The `is-invalid` + Bootstrap `invalid-tooltip` became
`<TextInput error>` (red border, no message node → no layout shift) plus an
absolutely-positioned Mantine `<Text bg="red.7">` overlay above the field. Both
variants keep their `cb-tournament-chat-*` design classes (routed to the input
via `classNames={{ input }}`); default-variant corner-joining is done with
per-corner `borderRadius` in `styles` and buttons stretch via `h="100%"`.
⚠️ QA: the tournament input is 44px tall (design class) — confirm the buttons
line up; and the default-variant joined-pill look (input rounded-left, send
rounded-right, square emoji in the middle). `TournamentChatInput.test` now wraps
in `MantineTestProvider`.

Also done: **`SeasonLeaderboard`** (the seasons/hall-of-fame leaderboard;
consumed by `SeasonShowPage` + `HallOfFamePage`). The Bootstrap
`table table-dark table-striped table-hover` → Mantine `<Table striped
highlightOnHover>` inside `<Table.ScrollContainer>` (thead/tbody/tr/th/td →
`Table.*`); the hand-rolled `pagination` `<ul>` (first/prev/window/next/last +
ellipsis) → a single Mantine `<Pagination withEdges>`; native `form-select`s →
Mantine `<NativeSelect>` (kept native so the `cb-season-filter-control` design
class still styles them); the `input-group` search field → `<Flex>` +
`<TextInput>` + `<UnstyledButton>` clear, keeping the `cb-season-filter-*`
pill design classes; `row`/`col-*` → `<Grid>`/`<Grid.Col>`. **Icon-font
decision:** the `bi bi-*` Bootstrap-Icons were **dead** (no `bootstrap-icons`
package/CSS is imported anywhere — they rendered as empty `<i>`), so `bi-search`
/ `bi-bar-chart-line` became FontAwesome `faMagnifyingGlass` / `faChartLine`
(the app's icon system). Kept all `cb-custom-event-*` / `cb-table` /
`cb-gold|silver|bronze-place-bg` design classes (routed to `Table.Td` via a
shared `cellProps`). The exported helper functions (`getPlaceBadgeClass` etc.)
still return Bootstrap classes — untouched, since `PlayerInsightsModal` (still
Bootstrap) consumes them. ⚠️ QA: Mantine `NativeSelect` may add its own chevron
on top of the native one; the Mantine pagination window/ellipsis differs
slightly from the old fixed 5-page window; and confirm `striped` doesn't fight
the top-3 place-bg rows (place-bg is unlayered → should win).

Also done: **`PlayerInsightsModal`** (the ~1135-line season player-stats modal;
opened from `SeasonLeaderboard`'s Stats button). All Bootstrap layout/utility
markup → Mantine: `row`/`col-md-*` → `<Grid>`/`<Grid.Col>`; the stat/comparison
`card cb-bg-panel border-0` panels → `<Card className="cb-bg-panel">` (design
class kept); the two inner `table table-dark table-sm` → `<Table>` in
`Table.ScrollContainer`; `badge` + `getPlaceBadgeClass` → Mantine `<Badge>` via
a **local** `placeBadgeColor` map (gold/silver/bronze/blue); the 4 tab
`btn btn-info`/`btn-outline-secondary` → a Mantine `<Button>` toggle group
(`variant` filled/default); `alert alert-warning` → `<Alert color="yellow">`;
`Loader`, all Recharts charts, and the fetch/median logic are unchanged. The
Bootstrap semantic text colors (`text-warning`/`success`/`info`/`danger`/
`muted`) map to Mantine named colors (`yellow`/`green`/`cyan`/`red`/`dimmed`).
The dead `modal-90w`/`text-light` classes were dropped — `modal-90w` had no CSS,
so its 90%-width intent is now honoured by Mantine `size="90%"`. **Left the
exported `getPlaceBadgeClass` / `getMedalEmoji` helpers in `SeasonLeaderboard`
untouched** — the still-Bootstrap `HallOfFamePage` consumes them. ⚠️ QA: the
gold/bronze `<Badge>` text contrast, the sticky tab bar's `bg="dark.7"` against
the modal body, and that the semantic-color remap reads the same as the charts.

Note: `AchievementBadge` is **not** a Phase-2 target — it only carries
`cb-achievement-badge*` design classes (a `grep` false positive per gotcha #8).

The `User*` cluster keeps the string `className`/`linkClassName` **passthrough
props** (used by ~12 page callers that still pass Bootstrap color classes like
`text-white`/`text-secondary`/`text-decoration-none`); those leftovers get
cleaned when the pages convert. Only the components' own internal utility
classes were swapped to Mantine (`Group`/`Stack`/`Text`/`ActionIcon` + style
props). Design classes `cb-user-online`, `cb-user-dark-offline`, `cb-text`,
`cb-rounded`, `x-username-truncated`, `cb-opacity-50` are kept.

**Remaining leaves: 2** (audited 2026-08-07 with a whole-word Bootstrap-token
grep over `widgets/components/**/*.tsx`, filtering out kept `cb-*` design
classes and `User*` passthrough props). Both need a decision or belong to
Phase 3 — the "just do the work" leaves are done, and the two lib-backed leaves
that only needed their Bootstrap *classes* stripped are done too (see below):

- **Blocked on a lib swap / behavior change (1):**
  - `LanguagePickerView` — react-select. Leave until all react-select sites
    (`TaskChoice`, `PlayerPicker`, `ReportsPanel`) convert together, so the
    dependency can be dropped in one PR. Still carries Bootstrap classes.
- **Really Phase 3 (1):** `SoundToggle` — its `menu` variant renders a Bootstrap
  `dropdown-item` **inside a server heex dropdown**, so it can't be a pure
  React-side swap.

Bootstrap-classes-stripped, non-Mantine lib kept on purpose (Phase-2 complete
for these two — the eventual lib swap is tracked as future work, not a class
migration):

- **`EmojiTooltip`** — the emoji-autocomplete listbox in `ChatInput`. Kept the
  native `<select size={4}>` and its hand-wired arrow/enter/escape keyboard nav
  (`useKey`) **untouched**; only replaced the Bootstrap classes (`d-flex
  flex-column position-absolute border rounded w-50 custom-select mb-2` + the
  one-off `x-bottom-75`) with an inline `style`. Gave it an explicit dark
  `backgroundColor` (`--mantine-color-dark-6`) so it no longer falls back to a
  light native listbox on the dark chat — ⚠️ QA this looks right.
- **`ChatContextMenu`** — the right-click username menu (`react-contexify`).
  Kept `react-contexify` and the `cb-bg-panel`/`cb-border-color`/`cb-rounded`
  design classes; stripped the Bootstrap `text-white`/`mr-2`/`text-muted`
  utilities. `text-white` was load-bearing (items sit on a dark panel), so it
  was replaced 1:1 with inline `color`/`marginRight` tokens at the same
  elements (inline wins over react-contexify's own item-color rule — a
  Menu-level color would not). No Mantine components added, so no test-provider
  change needed.

Plus one small **design leftover** (not a whole leaf): the `.card.cb-card`
ranking panel inside the already-converted `TournamentDescription`, and the
`cb-card` / `cb-bg-highlight-panel` card-theming leftovers generally. (`Rooms`
done above; remaining `cb-btn-secondary` call sites drop their class as their
pages convert, now that the hover is in the theme.)

Audit false positives (already done — do **not** re-open): `EditorGameBar`,
`Messages` (only a commented-out line matched), `InvitesList`/`InvitesContainer`,
`FeedbackWidget`, `PictureInPicture`, `UserInfo` — their remaining `className`
hits are kept `cb-*` design classes or passthrough props. `DropdownMenuDefault`
was **dead code** and was **deleted**, not converted.

**Verification gap:** slices are toolchain-verified only. Headless browser
verification isn't feasible here (auth + live game/tournament state), so all
Phase 2 UI still needs a **manual browser QA pass** — especially buttons
(gotcha #7), bordered panels/cards, and chat layout (flex spacing, scroll
button, username truncation).

**Note:** icon-only Bootstrap `btn`s convert to Mantine `<ActionIcon>` (keep the
custom `cb-*` class, drop `btn`); this preserves the click behavior that tests
assert (see `ChatMessageDelete` / `TournamentChatMessage`).

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
