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
| 2 | Convert Bootstrap **utility classes** in the ~244 React files to idiomatic Mantine | 🔄 in progress — shared leaf components done; pages: `settings`, `profile`, `lobby` (React markup), `registration`, `game`, `tournament`, `tournamentPlayer`, `groupTournament` done |
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

### Pages progress

Sequencing stage 2 (pages, leaf → container). First page done:

Done: **`settings`** page (`UserSettings` container + `UserSettingsForm` +
`EmailSettingsForm`, one slice).
- Formik text inputs (the shared `TextInput` in `UserSettingsForm`, the
  `FormikTextInput` in `EmailSettingsForm`, and the archive-confirm field) →
  Mantine `<TextInput>` wired to Formik via `useField`; `invalid-feedback` →
  the `error` prop. **Dropped** `form-control cb-bg-panel cb-border-color
  text-white` entirely rather than routing the design classes: `.cb-bg-panel`
  is coupled to `.form-control` in SCSS (`&.form-control { background: … }`),
  so keeping only `cb-bg-panel` would change the bg. The forced-dark theme +
  the `--mantine-color-default-border` resolver already give the right dark
  input look, so plain Mantine inputs are the idiomatic home.
- `LanguageSelect` / `LocaleSelect` Menu triggers → `<Button variant="default"
  fullWidth justify="flex-start">` with the `LanguageIcon` in `leftSection`
  (dropped `btn cb-bg-panel cb-border-color text-white w-100 d-flex
  align-items-center` / `text-left`); kept the `cb-dropdown-item` /
  `cb-bg-highlight-panel` design classes. `d-none` view-toggle → `Box display`.
- `RangeInput` stays a **native `<input type="range">`** + `cb-range` design
  class — the sound tests `fireEvent.input(…)` a real range and the `onInput`
  handler drives autosave, so a Mantine `<Slider>` would break both. Only
  dropped `form-range w-100` (→ `width:100%` in style).
- **Primary submit buttons** (`Update profile` / `Change password` / `Send
  verification`) → plain Mantine `<Button>` = **brand orange**, per the standing
  decision (see below). `loading={isSubmitting}` replaces the hand-rolled
  `spinner-border` + `sr-only`.
- `Notification` `<Alert>` adopted `darkThemeAlertStyles(variant)` and dropped
  `alert alert-${variant} alert-dark-theme rounded shadow-sm mb-2` (now the 4th
  React consumer of the shared helper; `radius="md" mb="sm"`). The two
  `UserSettings.test` assertions that keyed on `.alert-success` / `.alert-danger`
  now assert message **text** (the classes are gone).
- `SocialButtons` rows `d-flex mb-2 align-items-center` → `<Group>`; **the SCSS
  `.cb-settings-social-links > .d-flex` card style was retargeted to `> *`** so
  it no longer depends on the Bootstrap utility class. Kept the `bind-social`
  design/behavior class (Phoenix `data-method` unlink).
- Device-remove / archive / cancel / confirm buttons → Mantine `<Button>`
  (`variant="outline" color="red" size="compact-sm"`, `variant="outline"
  color="red"`, `variant="default"`, `color="red"`). `badge badge-success` →
  `<Badge color="green">`. Sessions `text-muted`/`<small>` → `<Text c="dimmed"
  size="xs">`. `border-danger` / `text-danger` → inline `#dc3545` (exact BS
  danger). The page root `container` class was **dropped** — `cb-settings-page`
  already sets `max-width:1120px; margin:0 auto`, so `container` was redundant;
  `py-4 px-3 px-md-4` → `py="lg" px={{ base: 'md', md: 'lg' }}`.

**Standing decision (applies to all pages):** Bootstrap `btn-primary` →
plain Mantine `<Button>` (theme `primaryColor="brand"`, orange #ee3737), **not**
an explicit `color="blue"` to preserve the old Bootstrap-blue look. The app brand
is orange; the old blue was incidental (Bootstrap default, no app override).

⚠️ QA (settings): primary submit buttons recolor **blue→orange**; input dark look
now comes from the theme, not `cb-bg-panel` (confirm bg/border match the panels);
the two volume range sliders fill/spacing (`Flex gap="md"` replaced `mx-3`); the
social-link card padding/border still renders (now via `> *`); the archive
section's red border/icon.

Done: **`profile`** page (`UserProfile` container + `UserStatCharts` +
`UserTournaments` + `Heatmap`; `Achievement` was already clean). Split into two
commits (leaves, then container).
- Leaves: `UserStatCharts` `row`/`col-*` → `<Grid>`; `UserTournaments`
  `table table-striped` → `<Table striped stickyHeader>` (Mantine's row borders
  already use the resolved `--mantine-color-default-border` = `cb-border-color`,
  so the per-cell `cb-border-color` classes were dropped) inside the original
  scroll `<Box>` (infinite-scroll listener + `mvh-100`/`cb-overflow-y-scroll`
  kept); `Heatmap` responsive header → `<Flex>` with responsive `direction`/
  `justify`/`mb`, native `custom-select` → `<NativeSelect>` keeping the
  `cb-profile-heatmap-select` design class via `classNames={{ input }}`.
- Container: sidebar `row`/`col-md-*` → `<Grid>`; the **Bootstrap-JS tab system**
  (`nav-tabs` + `tab-pane` + `data-toggle="tab"` + `.active`/`.show`) was
  rewritten as a controlled Mantine `<Tabs value={activeTab}>` — this removes the
  page's dependency on Bootstrap's JS tab plugin. All three `Tabs.Panel`s use
  `keepMounted` to preserve the old always-in-DOM behavior (so `UserTournaments`'
  `isActive` fetch-gate and `CompletedGames` still mount as before). The bordered
  tab-content box is reproduced with a `<Box>` wrapper (`border` + `borderTop:0` +
  bottom radius). Pills/links → `<Anchor>`/`<Box>` + style props; `hr` colored
  dividers keep `cb-border-color`. `UserProfile.test` now wraps in
  `MantineTestProvider` (the container gained Mantine components — gotcha #1).
- **Intentional Bootstrap leftovers (kept):** the typography-size classes `.h1`
  (stat numbers, github icon) and `.lead` (stat captions) are **coupled to
  responsive `cb-*` overrides** — base size comes from `.h1`/`.lead`, then
  `.cb-stats-number` / `.lead` shrink them inside `@media` queries. Inlining the
  base size would beat the media-query override (inline wins), breaking the
  responsive shrink, and these aren't in the Phase-2 DoD grep. Also kept the
  `fab fa-github` icon-font span. Port these to CSS (self-sufficient
  `.cb-stats-number`) in a later pass if the size classes must go.

⚠️ QA (profile): the **tab bar restyle** is the big one — Mantine `<Tabs>` uses an
underline indicator vs the old bordered `nav-tabs`; confirm the tabs still read as
uppercase/bold, fill the width (`grow`), and join the bordered content box below.
Also: heatmap `NativeSelect` may add a chevron over the native arrow (as in
`SeasonLeaderboard`); the avatar corner radius (was `rounded`, now inline `sm`).

Done (React markup): **`lobby`** page (large — ~26 files, converted per-leaf).
All lobby React components are on Mantine; the **only** remaining lobby work is
the deferred react-select lib swap (`TaskChoice` + `CreateGameDialog`'s
`OpponentSelect`). Per-leaf log below.
- Done: `LiveTournaments` + `CompletedTournaments` (twin tournament-list
  sections) — `table table-striped` → `<Table striped>` in a `<Box>` that keeps
  the responsive `d-none d-md-block` as `display={{ base:'none', md:'block' }}`;
  the mobile `<HorizontalScrollControls>` (already Mantine) wrapped in a
  `<Box hiddenFrom="md">` (was `d-md-none`); empty-state → `<Flex>`/`<Text>`/
  `<Anchor>`.
- Done: `ShowButton` (shared "Show" anchor) → `<Button component="a"
  color="cbSecondary" size="sm" radius="md">` (the `type==='table'` variant adds
  `px="lg" ml="xs"`). Safe as a standalone leaf — no test renders it
  provider-less (`GameActionButton.test` hits the `ContinueButton` branch, not
  `ShowButton`).
- Done: `GameActionButton` + `GameCard` + `TournamentCard` (the shared-button
  cluster). `ContinueButton` → `<Button component="a" color="cbSuccess">`
  (`w-100` on the card variant → `fullWidth`); the waiting-opponent `btn-group`s →
  `<Group gap="xs" wrap="nowrap">` with a `<ContinueButton>` + two
  tooltip-wrapped `<ActionIcon variant="subtle">` (copy / cancel) — the
  Bootstrap-JS tooltips (`data-toggle="tooltip"`) became Mantine `<Tooltip>`, and
  the **cancel icon keeps `className="btn-hover"`** so the `.game-item:hover
  .btn-hover { visibility:visible }` reveal-on-hover still works. `Fight`
  (`btn-orange` = brand orange) → default `<Button>`; the guest `Sign in`
  (`btn-outline-success`) → `<Button variant="outline" color="cbSuccess">`. Both
  keep their Phoenix `data-method`/`data-to`/`data-csrf` attrs (native
  `<button>`). Icon-font `<i class="far fa-copy" / "fas fa-times">` spans kept
  inside the ActionIcons. `GameCard` layout → `<Flex>` keeping
  `game-item`/`cb-bg-panel`/`bg-gray`/`cb-border-color`/`cb-rounded` design
  classes (and `game-item` for the hover selector + games-table row border);
  `UserSimpleStats` buttons → `<Button color="cbSecondary|cbSuccess|red">`;
  completed-card `Show` link → `<Button component="a" color="cbSecondary">`.
  `TournamentCard` (mobile white card) → `<Paper bg="white" withBorder
  shadow="sm">`. `GameActionButton.test` wrapped in `MantineTestProvider`; its
  `w-100` assertion → `data-block="true"` (Mantine `fullWidth`).
- Done: `ActiveGames` + `CompletedGames` + `Players` (the games-table cluster).
  Both tables → `<Table striped>` (desktop, `display={{base:'none',md:'block'}}`;
  mobile `<HorizontalScrollControls>` cards wrapped in `<Box hiddenFrom="md">`).
  `Players` now emits `<Table.Td>` (renders inside `ActiveGames`' `<Table>` via
  Mantine's Table context) keeping `cb-username-td`; `ActiveGames` keeps
  `game-item` on `<Table.Tr>` (for the `tr.game-item td` border + the
  `.game-item:hover .btn-hover` cancel-reveal) and `bg-gray`/`cb-level-badge`/
  `cb-rounded` on the level/state cells. `CompletedGames` keeps its scroll `<Box>`
  + infinite-scroll listener + `className`/`tableClassName` passthrough props;
  per-cell `cb-border-color` dropped (Mantine row borders already resolve to it);
  `Show` link → `<Button component="a" color="cbSecondary">`; footer → `<Box>`.
  `UserProfile.test` still passes (it mocks `CompletedGames`); no test renders
  `ActiveGames`/`Players` directly.
- Done: `Leaderboard` — raw `thead/tr/th/td` → `Table.*`; the Bootstrap-JS
  `nav-tabs` period selector (`data-toggle="tab"`, hardcoded `active` on Weekly)
  → a controlled Mantine `<SegmentedControl>` bound to the Redux `period` (also
  fixes the active state to reflect the real period). Kept `cb-bg-panel`/
  `cb-border-color`; dropped per-row `cb-border-color` (Mantine row border
  resolves to it). `Announcement` returns `null` (all Bootstrap dead-commented) —
  nothing to convert.
- Done: `GameRoomPreview` (dropped `container-fluid` / `w-100 d-flex
  align-items-center` → `<Box w="100%" px="md">` / `<Flex align="center">`, kept
  all `preview`/`player*` BEM design classes) and `LobbyLoading` (skeleton — the
  `col-*`-in-flex responsive grid → `<Flex>`/`<Box>` with responsive `w`/`p`/`m`
  props, `sr-only` → `<VisuallyHidden>`, all `cb-lobby-loading-*` /
  `cb-text-skeleton` design classes kept).
- Done: `ChatActionModal` (player-select modal) — the `div role="button"` +
  a11y shims (`tabIndex`/`onKeyPress`) player rows → native Mantine `<Button
  color="cbSecondary" fullWidth justify="flex-start" h="auto" p="md">` (the
  `data-user-id`/`data-user-name` + `onClick` reading `currentTarget.dataset`
  survive on the real `<button>`); `d-flex flex-column` → `<Stack gap="sm">`.
  Renders inside `CbModal` (already Mantine). No test.
- Done: `TournamentListItem` (season/live tournament card) — layout utilities →
  `Flex`/`Box` + style props; root `border cb-border-color cb-rounded` box →
  `<Paper withBorder radius="md">` (theme resolves the border color); the main
  action `<a>` → `<Button component="a" color="cbSecondary">` (still role=link,
  test's `getByRole('link')` passes); the info `<button>` → `<ActionIcon
  variant="transparent">` keeping `cb-tournament-info-icon-btn` (30×30 sizing +
  `padding:0!important`) and `cb-btn-outline-secondary` (icon color, unlayered
  wins over `--ai-color`); `text-white` → `c="white"`. Kept all `cb-tournament-*`
  design classes, Bootstrap typography (`h5`) and `text-warning` icon color
  (neither in the DoD grep). Test already wrapped in `MantineTestProvider`.
- Done: `SeasonProfilePanel` (+ its `OpponentInfo` / `SeasonNearbyUsers` /
  `UserLogo` sub-parts) — two-column responsive layout: `d-flex
  flex-column-reverse flex-lg-row` → `<Flex direction={{ base:
  'column-reverse', lg: 'row' }}>`, `col-12 col-lg-8`/`-4` → responsive `w`
  percentages (`{ base: '100%', lg: '66.6667%' }`); the 3 action-link buttons →
  `<Button component="a" color="cbSecondary" fullWidth>`; avatar `rounded-circle`
  → inline `borderRadius:'50%'`; `text-white` → `c="white"`. **Kept the stat
  internals untouched** (`stat-item`/`stat-value`/`stat-label`/`cb-text-*`/
  `d-block`/`text-uppercase` carry no DoD-grep token) — only the `d-flex`
  containers around them were converted. Kept all `cb-*`/`clan-*` design classes,
  Bootstrap typography (`h1`/`h4`), `User*` passthrough props, and the `cn`
  skeleton toggles. The `text-primary` "add clan" link → `<Anchor>` (brand
  orange, per the standing decision). `SeasonProfilePanel.test` (renders only
  `SeasonNearbyUsers`) now wraps in `MantineTestProvider`.
- Done: `CodebattleLeagueDescription` (the league rules panel) — **rewrote the
  Bootstrap-JS collapse + accordion** (`data-toggle="collapse"` /
  `data-parent="#leagueAccordion"`) as a controlled Mantine `<Collapse
  expanded={opened}>` (outer "See Rules & Details" toggle) wrapping a single-open
  `<Accordion variant="separated" defaultValue="overview">` (7 items).
  `card`/`card-header`/`card-body` → `Accordion.Item`/`Control`/`Panel`;
  `row`/`col-md-6` → `Grid`/`Grid.Col span={{ base:12, md:6 }}`; `text-white` →
  `c="white"` on each `Accordion.Panel`; `btn btn-secondary` → `Button
  color="cbSecondary"`; `<h2>` → `<Title order={2}>`. ⚠️ this Mantine build's
  `Collapse` prop is **`expanded`**, not `in` (same as `AccordeonBox`). Removes
  this component's dependency on Bootstrap's JS collapse plugin; Mantine adds a
  chevron the Bootstrap accordion didn't have (QA). No test.
- Done: `TournamentModal` — title/body/footer → `Flex`/`Text`/`Title` + style
  props; the footer "Open Tournament" anchor (`btn` + an invalid `disabled`-attr
  hack + `cn`) → `<Button component="a" color="cbSecondary" disabled={isUpcoming}>`
  (proper Mantine disabled state); body `position-relative` → `style` prop. Left
  the `TournamentPreviewPanel` / `TournamentDescription` **passthrough classNames**
  (`d-flex … w-100 h-100 p-3`) as documented leftovers — both already-converted
  leaves only accept `className`, applied to a `Box`.
- Done: `LobbyChat` — card/columns/sidebar → `Flex`/`Box` + style props
  (responsive `direction` for the column→row breakpoint); the two icon-only
  action `btn`s → `<ActionIcon variant="transparent">` (envelope gets `c="white"`
  in place of the FontAwesome `text-white`); online-count `<p>` → `<Text>`. Kept
  all `cb-lobby-*`/`cb-players-container`/`cb-border-color` design classes and the
  responsive `rounded-*`/`h-sm-100`/`pb-sm-4` utilities. `ChatUserInfo`'s `mb-1`
  passthrough removed by wrapping each row in `<Box mb="xs">`; **left `Messages`'
  `text-white` passthrough** (theme default text isn't pure white — clean when
  `Messages`/`ChatUserInfo` are handled).
- Done: `CreateGameDialog` (**layout only**) — `row`/`col` grids → `Grid`/
  `Grid.Col` (⚠️ this build's `Grid` gap prop is **`gap`**, not `gutter`); the
  Level/GameType toggle `<button>`s → Mantine `<Button>` keeping the
  `bg-orange`/`btn-outline-orange`/`bg-gray` design colors via conditional
  `className` (dropped `btn`/`border-0`/`cb-rounded`/`w-100`; level buttons keep
  `title` for the test's `getByTitle`, dropped the Bootstrap-JS `data-toggle`
  tooltip); footer `btn` → `<Button color="cbSecondary">`; `h5` → `<Title
  order={5}>`. **Kept the native range input** (+ `cb-range`, same reason as
  settings `RangeInput`) and **both react-select widgets** — `OpponentSelect`'s
  `AsyncSelect` and `TaskChoice` — untouched for the one-PR lib swap.
  `CreateGameDialog.test` (10 tests) now wraps in `MantineTestProvider`.
- Done: `LobbyWidget` (container) — Create/Join/Continue/experimental game
  buttons → `<Button color="cbSecondary">` (removed the module-level `cn`
  className consts); controls `Stack` + bottom two-column layout → `Flex`/`Box`
  with responsive `direction`/`w`/`p` (`col-12 col-lg-8`/`-4` → responsive `w`
  percentages); dropped the `text-white` passthrough on the forced-dark `CbModal`
  headers/bodies (kept `cb-border-color`). No test.
- **Deferred (react-select) — the only lobby work left:** `TaskChoice` **and**
  `CreateGameDialog`'s `OpponentSelect` (`AsyncSelect`) both use react-select —
  swap together with `LanguagePickerView` / `PlayerPicker` / `ReportsPanel` in
  the one-PR lib swap. **All other lobby React markup is converted.**

⚠️ QA (lobby cluster): the games-table Continue/copy/cancel row (Group vs the old
attached `btn-group`); the **cancel button still hidden until you hover the game
row/card** (`btn-hover`); the `TournamentCard` white card's text stays dark on
white (elements inherit color — no explicit dark text was set); Fight button is
now brand orange (was `btn-orange`, same orange). Also new this pass: the
`CodebattleLeagueDescription` accordion now shows a Mantine chevron (was none);
the `CreateGameDialog` Level/GameType button tiles are Mantine `<Button>`s
carrying the orange design classes (confirm active/inactive states + level-icon
tile sizing); the season-panel action buttons + `TournamentListItem` info icon.

Done: **`registration`** page (`Registration.tsx` — the Sign In / Sign Up /
Reset Password forms, all three routes off one file). The `.card.cb-card` wrapper
(`container-fluid`/`row justify-content-center`/`col-lg-5…`/`card…`) → `<Flex
justify="center">` + a responsive-width `<Box w={{ base:'100%', sm:'41.6667%' }}>`
+ `<Paper withBorder radius="md" shadow="sm" bg="transparent">` (border color from
the resolver; `overflow:hidden` so the footer bg respects the corners). `card-body`
→ `<Box p={{ base:'md', lg:'lg', xl:'xl' }}>`; `card-footer py-2` + `text-center`
→ a `<Box className="cb-bg-highlight-panel" py="sm" px="md" ta="center" c="white">`
with a `--mantine-color-default-border` top border (kept the highlight-panel
design class — the `.card.cb-card` header/footer bg had no other home). The Formik
`form-control custom-control cb-bg-panel cb-border-color text-white` inputs →
Mantine `<TextInput>` wired via the existing `formik.getFieldProps(id)` spread
(**dropped** all four Bootstrap classes, same rationale as `settings`: the forced-
dark theme + border resolver give the right dark input look, and `cb-bg-panel` is
SCSS-coupled to `.form-control`); `invalid-feedback` → the `error` prop; the
hidden `base` field stays a native `<input type="hidden">` + a `<Text c="red">`
for server base-errors. **The password reveal** dropped the hand-positioned
`cb-password-input`/`cb-password-toggle`(`-invalid`) absolute-overlay button for
Mantine's `rightSection={<ActionIcon>}` (keeps the `aria-label`/`aria-pressed`/
`title` the test asserts). Submit `input[type=submit]` (`btn btn-secondary
cb-btn-secondary btn-block cb-rounded`) → `<Button type="submit" color="cbSecondary"
fullWidth>` (kept `aria-label="Submit form"`; dropped the Rails-UJS
`data-disable-with`, dead here — this is a fetch form). Social `<a class="btn …
btn-outline-secondary cb-btn-outline-secondary">` → `<Button component="a"
variant="outline" color="cbSecondary" className="cb-btn-outline-secondary">` in a
`<Stack>`; `alert alert-info` → `<Alert color={bootstrapAlertColor('info')}>`; the
`small` invitations → `<Text size="sm" className="cb-text">` + `<Anchor>` (Sign In
= `c="white"`, Sign Up / forgot-password = brand-orange default per the standing
decision, was `text-primary`). `Registration.test` now wraps `setup()` in
`MantineTestProvider`; the reset-password assertion keyed on `.text-white` → a
plain `toBeInTheDocument()` (the class is gone). ⚠️ QA: the card is now
`bg="transparent"` (was `.cb-card` transparent — same intent); the password
eye now sits in a Mantine `rightSection` (not overlapping the field);
primary/submit + social button hover; the highlight-panel footer border radius.

Done: **`game`** page (large — 42 files, converted in one parallel pass across 6
clusters). All game React markup is on Mantine except the documented leftovers
below. Cluster log:
- **Buttons (13 files)** — `ApprovePlaybookButtons`, `BackToEvent/Home/Tournament
  Button`, `DarkModeButton`, `EditorHeightButtons`, `GameActionButtons`,
  `GoToNextGame`, `NewGameButton`, `RematchButton`, `ReplayerControlButton`,
  `SignUpButton`, `StartTrainingButton`. The pervasive `btn btn-secondary
  cb-btn-secondary btn-block cb-rounded` → `<Button color="cbSecondary"
  radius="md" fullWidth>` (class dropped — hover is in the theme); link-buttons →
  `<Button component="a">` (stays role=link for tests); icon-only → `<ActionIcon>`.
  `CheckResultButton` dropped `cb-btn-outline-success` and the dead Bootstrap-JS
  `data-toggle="tooltip"`, keeping `data-guide-id`. All Phoenix
  `data-method`/`data-csrf`/`data-to` preserved.
- **Modals (6)** — `AnimationModal`, `NextStageGroupTournamentModal`,
  `PremiumRestrictionModal`, `TaskDescriptionModal`, `TournamentAwardModal`,
  `TournamentStatisticsModal`. All still render through `CbModal`; the now-default
  `contentClassName="cb-text"` made the `text-white` passthroughs redundant, so
  they were dropped. Two `color="blue"` CTAs → plain `<Button>` (brand orange) per
  the standing decision.
- **Widgets/containers (5)** — `ChatWidget`, `ControlPanel`, `GameWidget`,
  `InfoWidget`, `PanelSplitPane`. `GameWidget`'s and `InfoWidget`'s Bootstrap-JS
  `nav-tabs` (`data-toggle="tab"`/`tab-pane`) → controlled Mantine `<Tabs>`,
  removing another Bootstrap-JS dependency. `ControlPanel` (replayer) kept its
  **native `<input type="range">`** — `ReplayControlPanel.test` fires real range
  events (same trap as settings `RangeInput`). `PanelSplitPane` kept all
  split-pane sizing math, moving layout classes into its existing inline `style`.
- **Info panels (8)** — `ContributorsList`, `CssBattleInfoPanel`,
  `GameRoomLockPanel`, `InfoPanel`, `SideInfoPanel`, `TimeoutGameInfo`,
  `UserHeadToHead`, `WaitingOpponentInfo`. `InfoPanel`'s Bootstrap-JS tabs → a
  `keepMounted` Mantine `<Tabs>`; `GameRoomLockPanel`'s `form-control is-invalid`
  → `<TextInput error>`; `jumbotron` → `Flex`/`Box`.
- **Editor/output (6)** — `EditorContainer`, `EditorToolbar`, `Output`,
  `OutputTab`, `TaskAssignment`, `TaskLanguageSelection`. `EditorToolbar`'s three
  `*ClassNames` string props were deleted in favour of internal Mantine layout.
  `TaskLanguageSelection` was a live **gotcha #7** case — a Mantine `<Button>`
  still carrying `btn btn-sm btn-outline-secondary` that was being silently
  overridden; the Bootstrap classes are now gone.
- **Tournament panels (2)** + `ThreejsGamePage` — ranking `table table-striped` →
  `<Table striped>` in a `Table.ScrollContainer`, keeping the
  `cb-gold|silver|bronze-place-bg` classes; `ThreejsGamePage`'s arena card header
  (its only 9 hits in 2188 lines) → `Paper`/`Flex`/`Group`/`Badge`/`Button`.

**Intentional game leftovers (kept, documented):**
- The `col-12 col-lg-6 p-1` / `col-12 col-xl-8 col-lg-6` wrappers in `InfoPanel`,
  `InfoWidget`, `GameWidget`, `SideInfoPanel` — these are children of the
  Bootstrap `row no-gutters cb-game` in **`RoomWidget`**. Convert the row and its
  children together in a later slice; converting either side alone breaks the grid.
- `WaitingOpponentInfo`'s `CopyButton` keeps `btn btn-secondary cb-btn-secondary`
  — `CopyButton` is **shared with the still-Bootstrap `TournamentHeader`**, so its
  swap belongs to the tournament slice. Its sibling Cancel button did convert.
- `TaskAssignment`'s `h1`–`h5` task-zoom classes (same responsive-coupling
  rationale as the profile page) and the `fas`/`fab` icon-font spans.

⚠️ QA (game): the **replayer control bar** and split-pane sizing (highest risk —
live game UI); the three rewritten tab bars (`GameWidget` right side, `InfoPanel`,
`InfoWidget` CSS-battle) now use Mantine's underline indicator instead of
`nav-tabs`; the Run/Check button lost its `cb-btn-outline-success` override;
`DarkModeButton` lost `rounded-right` (its `SpectatorEditor` button-group join is
resolved — that toolbar is now Mantine, see `tournamentPlayer` below);
`bg-warning` → `yellow-4` on the checking state; and the
`WaitingOpponentInfo` URL/Copy/Cancel pill join (Copy is still a Bootstrap button
between two Mantine ones).

Done: **`tournamentPlayer`** page (`TournamentPlayer` container + `SpectatorEditor`
— the OBS/stream spectator view, reached via `?editor` / `?timer` search params).
- `SpectatorEditor`: the `panelClassName` prop is now **layout-free** — it only
  carries the `spectator` design class (the Monaco `margin-top` fix); the old
  `h-100 p-1 overflow-hidden` part of the string moved into the component as
  `h="100%" p="xs"` + a new optional `style` prop. `bg-warning` (the is-checking
  flash) → `bg="yellow.4"`, matching the game page's checking state. `card
  shadow-sm h-100` → `<Paper shadow="sm" radius="sm" h="100%">`; the
  `rounded-top border-bottom` toolbar → a `<Box>` with inline top radii + a
  `--mantine-color-default-border` bottom border (same shape as `EditorToolbar`).
  `btn-toolbar` → `<Group role="toolbar">`; the font-size `btn-group`
  (`btn-light` +/- with `rounded-left`/`rounded-right`) → a Mantine
  `<Button.Group>` of two `variant="default" size="compact-sm"` buttons (the
  attached-pill join now comes from `Button.Group`, not the Bootstrap radius
  utilities — a live **gotcha #7** case, since those `rounded-*` classes were
  beating any Mantine radius). The `form-control custom-select rounded-lg` Monaco
  theme picker → `<NativeSelect radius="md" data={[...]}>` (the hand-rolled
  `<option>` list collapsed into the `data` prop; kept native so the existing
  `onChange` handler signature is unchanged). The eye/hide-controls `btn btn-sm
  rounded-lg` with its `btn-primary`/`btn-light` active toggle → `<ActionIcon
  variant={!hidingControls ? 'filled' : 'default'}>` — **note this recolors the
  active state blue→brand orange** per the standing decision. `<h5>` → `<Title
  order={5}>`.
- `TournamentPlayer`: both `cn()` layout consts were deleted — the
  `spectatorDisplayClassName` row/row-reverse branches and the
  `spectatorGameStatusClassName` `flex-row-reverse` branch were **both entirely
  commented out upstream**, so they were static strings pretending to be
  conditional; replaced with a plain `<Flex direction="column" h="100vh">` and an
  inline `<Flex justify="space-around" align="center" w="100%" p="sm">`, and the
  now-pointless `spectatorGameStatusClassName` prop was dropped from `GamePanel`.
  `container-fluid` → `<Box w="100%" px="md">` (same as `GameRoomPreview`).
- **`cb-card` dropped, not kept:** all three `GamePanel` cards were `card cb-card
  border-0`, and the `.card.cb-card` rule needs **both** classes — with `card`
  gone the class is inert. Its only live contribution here was
  `background: transparent` (the `border-color` was cancelled by `border-0`, and
  none of these cards render a `card-header`/`card-footer`), which is now
  `bg="transparent"` on the `<Paper>`. Kept `cb-overflow-y-auto` and `spectator`.

⚠️ QA (tournamentPlayer): this is a **stream/OBS view** — verify at capture size,
not just a desktop window. The font-size +/- pair is now a Mantine
`Button.Group` (confirm the two buttons still read as one attached control), the
eye toggle's active state is **orange, was blue**, and the Monaco theme
`NativeSelect` may add a chevron over the native arrow (same as
`SeasonLeaderboard` / heatmap). Also confirm the toolbar bottom border and the
transparent card backgrounds still match now that `cb-card` is gone.

Done: **`groupTournament`** page (28 files, one pass across 5 clusters; no tests
mount any of these components, so no `MantineTestProvider` changes were needed).
Cluster log:
- **Leaderboard cluster (9)** — `LeaderboardRatingTable` / `RatingTableRow` /
  `RatingRoundCell` raw `<table>`/`tr`/`td` → Mantine `<Table striped>` in
  `Table.Thead/Tbody/Tr/Th/Td` (rows are emitted into the table via Mantine's
  Table context). The old `tdClassName` string is gone — replaced by an exported
  **`tdCellProps`** in `utils/groupTournament.ts` (SeasonLeaderboard-style:
  `className: 'cb-custom-event-td'` + `p="xs" pl="lg"` + inline
  position-relative/verticalAlign/nowrap/border-0, for the `::after` column
  dividers and rounded first/last cells). `trClassName` kept but
  `font-weight-bold` moved out (`fw={700}` on `<Table.Tr>`), place-bg / border
  design classes intact. `badge badge-warning text-dark` → `<Badge
  color="yellow" c="black">` ("You" pill in `LeaderboardSliceItem`),
  `badge badge-secondary` → `<Badge color="gray">` ("Left"). `text-muted`
  rows → `c="dimmed"`. `LeaderboardSlicePlayerRow`'s **dead `cb-current-user-row`
  class was dropped** — it has no CSS definition anywhere (the yellow outline is
  inline already). `LeaderboardSliceRoundView` `btn btn-sm btn-outline-light`
  (Show all/less) → `<Button size="compact-sm" variant="default">`;
  `text-center`/`text-muted` → props. `LeaderboardTabs` → the shared
  `TabButton` (below). `Leaderboard` container `row/col` utilities →
  `Box`/`px`/`py` props, `rounded-left`/`mh-100` inlined.
- **The tab pills** (`tabBtnClass`/`tabBtnStyle` deleted from utils) are now a
  shared **`TabButton`** component in the page folder: a Mantine `<Button
  variant="subtle" size="sm" radius="xl" px="lg" py="sm">` keeping the
  `cb-tab-btn` / `cb-tab-btn--active` design classes (the unlayered `!important`
  bg still wins). The inactive 50%-white text is inlined
  (`rgba(255,255,255,0.5)`) so the unlayered `cb-tab-btn:hover { color:#fff !
  important }` still beats it on hover; the blue active underline style is kept
  inline. Used by `LeaderboardTabs` + `MainPanelTabs` (whose settings
  `badge badge-*` → `<Badge color={ready?'green':'yellow'}>`).
- **Run/Evolution cluster (2)** — `RunItem` keeps the fully-styled native
  `<button className="cb-run-item">` (dropped the redundant `d-flex
  flex-column align-items-start w-100` — the CSS already sets those); inner
  utilities → `Flex`/`Text` props (`text-white-50`/`text-muted` → inline
  50%-white / `c="dimmed"`; `text-nowrap` inlined; dead
  `cb-run-item__title--*` classes dropped — no CSS). `EvolutionPanel` header →
  `Flex` + `<Title order={5}>`, panel boxes → `Box`; the three Add Solution
  links/button → `<Button className="cb-evolution-panel-add-solution btn-yellow"
  w="100%" h="auto" radius="xl">` (dropped `btn`, `rounded-pill`, `text-center`
  — `btn-yellow` is a **standalone custom class**, not coupled to `.btn`).
  The commented-out stub `RunItem` block and the now-unused
  `getStubRoundPosition` were **deleted** as dead code.
- **MainPanel cluster (7)** — `MainPanelRunActions`'s `span role="button"` +
  `tabIndex`/`onKeyPress` a11y shims → `<UnstyledButton c="white" underline
  style>` (the `d-flex` wrapper was redundant with one child). `MainPanelRunViewer`
  spinners → `<Loader color="yellow"/"cyan" size="lg">` (per the
  `text-warning→yellow`, `text-info→cyan` semantic map), `h5` → `<Title
  order={5}>`, `text-white-50` → inline 50%-white. `MainPanelDescription` dropped
  the dead `cb-markdown` class (no CSS definition; `text-white` → `c="white"`).
  `MainPanelSettings`/`AdminExternalSetupPanel` — `mb-1` rows → `<Box mb="xs">`
  inside `<Text size="sm">`, `text-danger` pre → `c="#dc3545"` (exact BS danger,
  per settings precedent). `MainPanel` container `d-flex … flex-wrap w-100 py-1`
  → `Flex` props on the kept `cb-custom-event-profile` class.
- **Header (1)** — status pill (`border-success/`secondary + `text-white` +
  `font-weight-bold`) → `<Badge color="green"/"gray" radius="xl" px="lg"
  py="sm" c="white">` (waiting/loading keep their exact inline `#fffb47` style);
  `text-muted`/monospace timer pills keep their inline colors, dropping
  `text-monospace` for `style.fontFamily: 'var(--mantine-font-family-monospace)'`
  and `rounded-pill px-4 py-2` for inline `padding: 0.5rem 1.5rem`,
  `borderRadius: '999px'`. Support / Back to event
  (`btn btn-outline-light rounded-pill px-4`) → `<Button component="a"
  variant="default" radius="xl" px="lg">` — ⚠️ the outline-light look is
  approximated with the default variant (gray border/text instead of white).
  The Pip timer pills (`border border-secondary bg-secondary text-white` /
  `border border-warning text-warning`) keep exact inline colors. `h4` →
  `<Title order={4}>`, `d-flex` rows → `Flex`, centered timer wrapper keeps its
  inline `left/top/transform`.
- **InvitationPanel** — `container-fluid`/`row`/`col-*` → `Box`/`Flex` +
  responsive `w` (`col-lg-9` → `w={{base:'100%', lg:'75%'}}`); the `h1` keeps
  the `cb-custom-event-title` design class (font-family/size), `text-white` →
  `c="white"`, the details link → `<Anchor underline="always">`; step buttons
  (`btn btn-yellow rounded-pill px-4`, incl. the anchor variant) → `<Button
  className="btn-yellow" radius="xl" px="lg" h="auto">` with the Phoenix-style
  `disabled` states preserved.
- **EditorPanel** — `.card.cb-card` → `<Paper withBorder radius="md"
  shadow="sm" bg="transparent">` (`cb-card` dropped — inert without `.card`;
  the transparent bg is now explicit); `card-header`/`card-footer` →
  `cb-bg-highlight-panel` `Group`/`Box` with
  `--mantine-color-default-border` separators; `btn btn-sm btn-success` →
  `<Button size="compact-sm" color="cbSuccess">` (both headers reuse one
  `submitButton`; the fullscreen one keeps `mr="sm"`); the `span role="button"`
  Fullscreen link → `<UnstyledButton>`; the lang `<select>` stays **native**
  (dropped `form-control form-control-sm d-inline-block w-auto ml-2`, kept the
  dark inline style + `marginLeft:8`); the fullscreen overlay (`position-fixed
  d-flex flex-column`, `zIndex:1050`) → `<Flex pos="fixed">` with the same
  inline insets/bg; `text-danger` → `c="red"`.
- **ExternalPlatformErrorPanel / FullscreenGroupBattleViewer** —
  `container-fluid row col-*` centering → `Flex justify="center" align="center"`
  + responsive `w`; the panel → `<Paper className="cb-bg-panel" shadow="sm"
  radius="md" p="xl">`; Retry keeps `cb-btn-outline-secondary` (`variant="outline"
  color="cbSecondary" radius="md"`); Close Fullscreen → `<Button variant="default"
  radius="md">`; `position-fixed d-flex flex-column` → `Flex pos="fixed"`.
- **Container `GroupTournamentPage`** — both `row`s and the `col-*` split →
  `Box`/`Flex` + responsive `w` (`col-lg-2 col-md-3` → `w={{base:'100%',
  md:'25%', lg:'16.6667%'}}`, counterpart 83.3333%), `mt-3` → `mt="md"`,
  `p-1 pb-4` → `p="xs" pb="lg"`, `h-100` → `h="100%"`.

⚠️ QA (groupTournament): the **live-game views** (editor card + fullscreen
overlay, run viewer center column) are the highest-risk; the `btn-yellow` Add
Solution / step pills must read as pills (Mantine `Button` `h="auto"` +
`classNames` interplay with the unlayered `padding: 12px 24px`); the tab pills
now show the Mantine subtle-button hover shape under `cb-tab-btn`; the Header
status badge is now a Mantine Badge (circle-ish shape vs the old square pill);
the Support/Back `outline-light` approximation; `Loader` vs the old
`spinner-border`; the leaderboard `Table` striping/padding vs the old
`table-sm` cells; and `InvitationPanel`'s `cb-custom-event-title` h1 centering.

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
2. Pages, roughly by risk: `settings` ✅, `profile` ✅, `lobby` ✅ (React markup),
   `registration` ✅, `game` ✅, `tournament` ✅, `tournamentPlayer` ✅,
   `groupTournament` ✅, then `gameMl`, `admin`, `event`, then `schedule`,
   `seasonsPage`, `hallOfFamePage`, `headToHeadPage`, `taskPreview`.
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
