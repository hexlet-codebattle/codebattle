import logo from '@/assets/logo.svg?raw';
import { LangIcon } from '@/shared/LangIcon';

import { customEmoji } from '../emoji';

import classes from './Chat.module.css';

/** Unicode emoji or one of the chat's custom image, logo or language shortcodes. */
export function Emoji({ value }: { value: string }) {
  const emoji = customEmoji(value);

  if (!emoji) return <>{value}</>;

  switch (emoji.kind) {
    case 'image':
      return <img src={emoji.src} alt={value} className={classes.customEmoji} />;
    case 'language':
      return <LangIcon lang={emoji.lang} size="1em" withTooltip={false} />;
    case 'logo':
      return (
        <span
          role="img"
          aria-label="Codebattle"
          className={classes.logoEmoji}
          dangerouslySetInnerHTML={{ __html: logo }}
        />
      );
  }
}
