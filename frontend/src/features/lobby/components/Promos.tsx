import { ActionIcon, Group } from '@mantine/core';
import { useHover } from '@mantine/hooks';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { type CSSProperties, type FocusEvent, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LeagueCard, useLeaguePromo } from './LeagueBanner';
import { McpBanner } from './McpBanner';
import classes from './Promos.module.css';

/**
 * Lobby promo cards sharing one sidebar slot. They rotate on their own: the active dot fills up
 * (Promos.module.css sets the pace) and its animationend moves on, so pausing the fill pauses the
 * rotation. Arrows and dots switch by hand.
 */
export function Promos() {
  const { t } = useTranslation();
  const league = useLeaguePromo();
  const { hovered, ref } = useHover<HTMLElement>();
  const [focused, setFocused] = useState(false);
  // dir: 1 = forward, -1 = back, 0 = first render (no entrance animation).
  const [{ index, previous, dir }, setPosition] = useState({ index: 0, previous: -1, dir: 0 });

  const slides: { key: string; card: ReactNode }[] = [
    ...(league.visible ? [{ key: 'league', card: <LeagueCard tournament={league.tournament} /> }] : []),
    { key: 'mcp', card: <McpBanner /> },
  ];
  const count = slides.length;
  // The league card comes and goes with its event, so the index can outlive a slide.
  const active = index % count;
  const show = (next: number, step: 1 | -1) =>
    setPosition({ index: (next + count) % count, previous: active, dir: step });

  // Hold the slide while it's read with the keyboard or its dialog is open (React focus events
  // bubble out of portals), not just because an arrow kept focus after a click.
  const onFocus = (event: FocusEvent<HTMLElement>) =>
    setFocused(event.target.matches(':focus-visible') || event.target.closest('[role="dialog"]') !== null);
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };

  return (
    // Focus doesn't make the carousel interactive; it only holds the current slide.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      ref={ref}
      className={classes.carousel}
      aria-roledescription="carousel"
      aria-label={t('What’s new')}
      style={count > 1 ? ({ '--promo-controls-space': '84px', '--promo-dir': dir } as CSSProperties) : undefined}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div className={classes.track}>
        {slides.map(({ key, card }, i) => (
          <div
            key={key}
            role="group"
            aria-roledescription="slide"
            aria-label={t('%{index} of %{count}', { index: i + 1, count })}
            className={classes.slide}
            data-state={i === active ? 'active' : i === previous && dir !== 0 ? 'leaving' : undefined}
            data-animate={dir !== 0 || undefined}
            inert={i !== active}
          >
            {card}
          </div>
        ))}
      </div>
      {count > 1 && (
        <Group gap={0} wrap="nowrap" className={classes.controls}>
          <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('Previous')} onClick={() => show(active - 1, -1)}>
            <IconChevronLeft size={14} />
          </ActionIcon>
          {slides.map(({ key }, i) => (
            <button
              key={key}
              type="button"
              className={classes.dot}
              data-active={i === active || undefined}
              aria-label={t('Slide %{index}', { index: i + 1 })}
              aria-current={i === active}
              onClick={() => i !== active && show(i, i > active ? 1 : -1)}
            >
              {i === active && (
                <span
                  className={classes.progress}
                  data-paused={hovered || focused || undefined}
                  onAnimationEnd={() => show(active + 1, 1)}
                />
              )}
            </button>
          ))}
          <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('Next')} onClick={() => show(active + 1, 1)}>
            <IconChevronRight size={14} />
          </ActionIcon>
        </Group>
      )}
    </section>
  );
}
