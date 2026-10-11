import React, { memo, useEffect } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import i18n from 'i18next';
import Button from 'react-bootstrap/Button';
import { useSelector } from 'react-redux';

import Modal from '@/components/BootstrapModal';
import Loading from '@/components/Loading';
import TournamentRoundClock from '@/components/TournamentRoundClock';
import { type RootState } from '@/slices';

import gifs from '../../config/gifs';
import ModalCodes from '../../config/modalCodes';
import TournamentStates from '../../config/tournament';
import { gamePlayersSelector, currentUserIdSelector, tournamentSelector } from '../../selectors';
import { type RoundClockInput } from '../../utils/tournamentRoundClock';

function TournamentInfoPanel() {
  const waitType = useSelector((state: RootState) => state.game.waitType);
  const tournament = useSelector(tournamentSelector) as unknown as RoundClockInput & {
    gameRoundPosition?: number | null;
  };
  const isTournamentActive = tournament?.state === TournamentStates.active;

  switch (waitType) {
    case 'tournament':
      // A ladder's last wave keeps running after this game; the tournament ends with it.
      if (isTournamentActive) {
        return (
          <div className="d-flex flex-column align-items-stretch w-100">
            <span className="py-2 h5">{i18n.t('That was your last game in this tournament')}</span>
            <TournamentRoundClock
              tournament={tournament}
              gameRoundPosition={tournament.gameRoundPosition}
              gameRoundLabel={i18n.t('Your round')}
            />
          </div>
        );
      }

      return <span className="py-2 h4">{i18n.t('Tournament finished')}</span>;
    case 'round':
      return (
        <div className="d-flex flex-column align-items-stretch w-100">
          <span className="py-2 h5">{i18n.t('Round is over, wait for the next round')}</span>
          {isTournamentActive && (
            <TournamentRoundClock
              tournament={tournament}
              gameRoundPosition={tournament.gameRoundPosition}
              gameRoundLabel={i18n.t('Your round')}
            />
          )}
        </div>
      );
    case 'rematch':
      return (
        <div className="d-flex flex-row py-2 h4">
          <Loading adaptive />
          <span className="pl-2">{i18n.t('Loading next game')}</span>
        </div>
      );
    default:
      return <></>;
  }
}

const AnimationModal = NiceModal.create(() => {
  const modal = useModal(ModalCodes.gameResultModal);

  const players = useSelector((state: RootState) => gamePlayersSelector(state));
  const currentUserId = useSelector((state: RootState) => currentUserIdSelector(state));
  const tournamentId = useSelector((state: RootState) => state.game.gameStatus.tournamentId);

  useEffect(() => {
    if (modal.visible) {
      NiceModal.hide(ModalCodes.premiumRestrictionModal);
      NiceModal.hide(ModalCodes.taskDescriptionModal);
    }
  }, [modal.visible]);

  const currentPlayer = currentUserId != null ? players[currentUserId] : undefined;

  if (!currentPlayer || currentPlayer.result === 'undefined') {
    return null;
  }

  const result = currentPlayer.result as keyof typeof gifs;

  const titleModal =
    result === 'won'
      ? i18n.t("Woohoo, you're Champion!!!!!")
      : i18n.t("If you read this you've lost the game");
  const buttonText = result === 'won' ? i18n.t('GG') : i18n.t("I'll be back");

  return (
    <Modal show={modal.visible} onHide={modal.hide} contentClassName="cb-bg-panel cb-text">
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title>{titleModal}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex justify-content-center">
          <img
            className="w-100 cb-rounded"
            style={{ maxWidth: '400px' }}
            src={gifs[result]}
            alt={i18n.t('animation')}
          />
        </div>
        {Boolean(tournamentId) && (
          <div className="d-flex text-center text-white justify-content-center">
            <TournamentInfoPanel />
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="cb-border-color">
        {/* {tournamentId && ( */}
        {/*   <a */}
        {/*     href={`/tournaments/${tournamentId}`} */}
        {/*     className="btn-link pr-2 cb-rounded" */}
        {/*   > */}
        {/*     Back to tournament */}
        {/*   </a> */}
        {/* )} */}
        <Button onClick={modal.hide} className="btn btn-secondary cb-btn-secondary cb-rounded">
          {buttonText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

export default memo(AnimationModal);
