import React from 'react';

import { getPageProp } from '@/inertia/pageProps';
import { useSelector } from 'react-redux';

import { selectDefaultAvatarUrl } from '@/selectors';

import i18n from '../../../i18n';
import LanguageIcon from '../../components/LanguageIcon';

const defaultPreviewAvatarUrl = 'https://avatars.githubusercontent.com/u/35539033?v=4';
const fightSvg = '/assets/images/fight.svg';

interface PreviewPlayer {
  name: string;
  avatar_url?: string;
  lang: string;
  rating: string;
}

const players = getPageProp<PreviewPlayer[]>('players', []);

interface GameRoomPreviewProps {
  pageName?: string;
}

// TODO : user user.avatarUrl
function GameRoomPreview({ pageName }: GameRoomPreviewProps) {
  const defaultAvatarUrl = useSelector(selectDefaultAvatarUrl);

  if (pageName === 'builder') {
    return (
      <div className="preview container-fluid slideInLeft">
        <div className="preview__container w-100 d-flex align-items-center">
          <span className="preview__info">{i18n.t('Template Task is Loading')}</span>
        </div>
      </div>
    );
  }

  const defaultPlayer = {
    name: 'John Doe',
    avatar_url: defaultAvatarUrl,
    lang: 'js',
    rating: '0',
  };

  const player1 = players[0] || defaultPlayer;
  const player2 = players[1] || defaultPlayer;

  return (
    <div className="preview container-fluid slideInLeft">
      <div className="preview__container w-100 d-flex align-items-center">
        <div className="player1">
          <img
            src={player1.avatar_url || defaultPreviewAvatarUrl}
            alt={i18n.t('avatar')}
            className="player1__avatar"
          />
          <p className="player1__name">{player1.name}</p>
          <div className="player1__status">
            <LanguageIcon className="preview__icon" lang={player1.lang} />
            <span className="preview__info">{player1.lang}</span>
            <img className="preview__icon" src="/assets/images/rating.svg" alt={i18n.t('rating')} />
            <span className="preview__info">{player1.rating}</span>
          </div>
        </div>

        <div className="preview__middle">
          <img src={fightSvg} alt={i18n.t('fight')} className="preview__fight" />
        </div>

        <div className="player2">
          <img
            src={player2.avatar_url || defaultPreviewAvatarUrl}
            alt={i18n.t('avatar')}
            className="player2__avatar"
          />
          <p className="player2__name">{player2.name}</p>
          <div className="player2__status">
            <LanguageIcon className="preview__icon" lang={player2.lang} />
            <span className="preview__info">{player2.lang}</span>
            <img className="preview__icon" src="/assets/images/rating.svg" alt={i18n.t('rating')} />
            <span className="preview__info">{player2.rating}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameRoomPreview;
