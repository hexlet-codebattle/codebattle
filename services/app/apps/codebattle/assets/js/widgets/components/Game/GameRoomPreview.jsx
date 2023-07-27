import React from 'react';
import Gon from 'gon';
import LanguageIcon from '../LanguageIcon';

const defaultAvatarUrl = 'https://avatars.githubusercontent.com/u/35539033?v=4';

const players = Gon.getAsset('players');

// TODO : user user.avatarUrl
const GameRoomPreview = ({ pageName }) => {
  if (pageName === 'builder') {
    return (
      <div className="preview container-fluid slideInLeft">
        <div className="preview__container w-100 d-flex align-items-center">
          <span className="preview__info">Template Task is Loading</span>
        </div>
      </div>
    );
  }

  const defaultPlayer = {
    name: 'John Doe',
    avatar_url: '/assets/images/logo.svg',
    lang: 'js',
    rating: '0',
  };

  const player1 = players[0] || defaultPlayer;
  const player2 = players[1] || defaultPlayer;

  return (
    <div className="preview container-fluid slideInLeft">
      <div className="preview__container w-100 d-flex align-items-center">
        <div className="player1">
          <img src={player1.avatar_url || defaultAvatarUrl} alt="avatar" className="player1__avatar" />
          <p className="player1__name">{player1.name}</p>
          <div className="player1__status">
            <LanguageIcon className="preview__icon" lang={player1.lang} />
            <span className="preview__info">{player1.lang}</span>
            <img className="preview__icon" src="/assets/images/rating.svg" alt="rating" />
            <span className="preview__info">{player1.rating}</span>
          </div>
        </div>

        <div className="preview__middle">
          <img src="/assets/images/fight.svg" alt="fight" className="preview__fight" />
        </div>

        <div className="player2">
          <img src={player2.avatar_url || defaultAvatarUrl} alt="avatar" className="player2__avatar" />
          <p className="player2__name">{player2.name}</p>
          <div className="player2__status">
            <LanguageIcon className="preview__icon" lang={player2.lang} />
            <span className="preview__info">{player2.lang}</span>
            <img className="preview__icon" src="/assets/images/rating.svg" alt="rating" />
            <span className="preview__info">{player2.rating}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoomPreview;
