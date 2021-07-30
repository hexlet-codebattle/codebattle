import { camelizeKeys } from 'humps';
import React from 'react';
import LanguageIcon from '../LanguageIcon';
import { getGravatarURL } from '../../utils/urlBuilders';

const getUserAvatarUrl = ({
  githubId, discordId, discordAvatar, email,
}) => {
  if (githubId) {
    return `https://avatars0.githubusercontent.com/u/${githubId}`;
  }

  if (discordId) {
    return `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}`;
  }

  if (email) {
    return getGravatarURL(email);
  }

  return 'https://avatars0.githubusercontent.com/u/35539033';
};

const GamePreview = ({ player1, player2 }) => {
  const playerStats1 = camelizeKeys(player1);
  const playerStats2 = camelizeKeys(player2);

  return (
    <div className="preview container-fluid slideInLeft">
      <div className="preview__container w-100 d-flex align-items-center">
        <div className="player1">
          <img src={getUserAvatarUrl(playerStats1)} alt="avatar" className="player1__avatar" />
          <p className="player1__name">{playerStats1.name}</p>
          <div className="player1__status">
            <LanguageIcon className="preview__icon" lang={playerStats1.lang} />
            <span className="preview__info">{playerStats1.lang}</span>
            <img className="preview__icon" src="/assets/images/rating.svg" alt="rating" />
            <span className="preview__info">{playerStats1.rating}</span>
          </div>
        </div>

        <div className="preview__middle">
          <img src="/assets/images/fight.svg" alt="fight" className="preview__fight" />
        </div>

        <div className="player2">
          <img src={getUserAvatarUrl(playerStats2)} alt="avatar" className="player2__avatar" />
          <p className="player2__name">{playerStats2.name}</p>
          <div className="player2__status">
            <LanguageIcon className="preview__icon" lang={playerStats2.lang} />
            <span className="preview__info">{playerStats2.lang}</span>
            <img className="preview__icon" src="/assets/images/rating.svg" alt="rating" />
            <span className="preview__info">{playerStats2.rating}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePreview;
