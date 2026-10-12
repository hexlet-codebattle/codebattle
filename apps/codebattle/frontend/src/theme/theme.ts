import {
  ActionIcon,
  Anchor,
  Avatar,
  Badge,
  Button,
  Card,
  Combobox,
  createTheme,
  defaultVariantColorsResolver,
  Input,
  InputWrapper,
  Menu,
  Modal,
  Paper,
  Popover,
  SegmentedControl,
  Table,
  Tabs,
  Title,
  Tooltip,
  type VariantColorsResolver,
} from '@mantine/core';

import { blue, dark, grades, green, orange, red, slate, violet, yellow } from './colors';
import classes from './components.module.css';

// Legacy slate buttons lighten on hover; Mantine's default darkens.
const variantColorResolver: VariantColorsResolver = (input) => {
  const resolved = defaultVariantColorsResolver(input);
  const color = input.color ?? input.theme.primaryColor;

  // Legacy slate buttons lighten on hover; Mantine's default darkens.
  if (color === 'slate' && input.variant === 'filled') {
    return { ...resolved, hover: 'var(--mantine-color-slate-5)' };
  }

  // Mantine derives the dark-scheme tint from shade 9, which is near-black for
  // slate; use per-scheme tokens (cssVariables.ts) instead.
  if (color === 'slate' && input.variant === 'light') {
    return {
      ...resolved,
      background: 'var(--cb-slate-tint)',
      hover: 'var(--cb-slate-tint-hover)',
      color: 'var(--cb-slate-tint-text)',
      hoverColor: 'var(--cb-slate-tint-text)',
    };
  }

  return resolved;
};

export const theme = createTheme({
  primaryColor: 'slate',
  // Light uses one shade darker so filled colours and status text keep contrast on white.
  primaryShade: { light: 7, dark: 6 },
  colors: { dark, slate, green, red, orange, blue, violet, yellow },
  variantColorResolver,
  white: '#ffffff',
  black: '#1c1c1c',

  // Body copy matched the legacy `.cb-text` (Arial); headings, buttons and
  // numbers keep the Source Code Pro "code" voice of the old base font.
  fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
  fontFamilyMonospace: "'Source Code Pro', ui-monospace, SFMono-Regular, Menlo, monospace",
  headings: {
    fontFamily: "'Source Code Pro', ui-monospace, SFMono-Regular, Menlo, monospace",
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '2rem', lineHeight: '1.09' },
      h2: { fontSize: '1.625rem', lineHeight: '1.15' },
      h3: { fontSize: '1.375rem', lineHeight: '1.2' },
      h4: { fontSize: '1.125rem', lineHeight: '1.25' },
      h5: { fontSize: '1rem', lineHeight: '1.3' },
      h6: { fontSize: '0.875rem', lineHeight: '1.3' },
    },
  },
  defaultRadius: 'md',
  focusRing: 'auto',
  cursorType: 'pointer',
  shadows: {
    md: '0 8px 18px rgba(0, 0, 0, 0.25)',
  },
  other: { grades },

  components: {
    ActionIcon: ActionIcon.extend({ defaultProps: { variant: 'subtle', color: 'gray' } }),
    Anchor: Anchor.extend({ classNames: { root: classes.anchor } }),
    // Avatars are slightly rounded squares, never circles.
    Avatar: Avatar.extend({ defaultProps: { radius: 'sm', color: 'slate' }, classNames: { root: classes.avatar } }),
    Badge: Badge.extend({ defaultProps: { radius: 'xl', variant: 'light' } }),
    // Neutral by default (white/outlined on light, slate on dark); colours are opt-in.
    Button: Button.extend({ defaultProps: { variant: 'default' }, classNames: { root: classes.button } }),
    Card: Card.extend({
      defaultProps: { withBorder: true, padding: 'md' },
      classNames: { root: classes.panel, section: classes.cardSection },
    }),
    Combobox: Combobox.extend({ classNames: { dropdown: classes.dropdown } }),
    Input: Input.extend({ classNames: { input: classes.input } }),
    InputWrapper: InputWrapper.extend({ classNames: { label: classes.label } }),
    Menu: Menu.extend({ classNames: { dropdown: classes.dropdown, item: classes.menuItem } }),
    Modal: Modal.extend({
      defaultProps: { centered: true, overlayProps: { backgroundOpacity: 0.6, blur: 2 } },
      classNames: { content: classes.modalContent, header: classes.modalHeader, title: classes.modalTitle },
    }),
    Paper: Paper.extend({ defaultProps: { withBorder: true }, classNames: { root: classes.panel } }),
    Popover: Popover.extend({ classNames: { dropdown: classes.dropdown } }),
    SegmentedControl: SegmentedControl.extend({
      classNames: { root: classes.segmentedRoot, indicator: classes.segmentedIndicator, label: classes.segmentedLabel },
    }),
    Table: Table.extend({
      defaultProps: { highlightOnHover: true, verticalSpacing: 'xs' },
      classNames: { table: classes.table, th: classes.th },
    }),
    Tabs: Tabs.extend({ classNames: { list: classes.tabsList, tab: classes.tab } }),
    Title: Title.extend({ classNames: { root: classes.title } }),
    Tooltip: Tooltip.extend({ defaultProps: { withArrow: true }, classNames: { tooltip: classes.tooltip } }),
  },
});
