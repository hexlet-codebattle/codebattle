import React, {
  memo,
  useEffect,
} from 'react';

import NiceModal, { unregister } from '@ebay/nice-modal-react';
import cn from 'classnames';
import { useSelector } from 'react-redux';

// import useSearchParams from '../../utils/useSearchParams';

import Loading from '../../components/Loading';
import loadingStatuses from '../../config/loadingStatuses';
import ModalCodes from '../../config/modalCodes';
import {
  currentUserClanIdSelector,
  currentUserIdSelector,
  eventSelector,
} from '../../selectors';
import TournamentDescriptionModal from '../tournament/TournamentDescriptionModal';

import EventCalendarPanel from './EventCalendarPanel';
import EventRatingPanel from './EventRatingPanel';
import TopLeaderboardPanel from './TopLeaderboardPanel';

const useEventWidgetModals = () => {
  useEffect(() => {
    NiceModal.register(ModalCodes.tournamentDescriptionModal, TournamentDescriptionModal);

    const unregisterModals = () => {
      unregister(ModalCodes.tournamentDescriptionModal);
    };

    return unregisterModals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

function EventWidget() {
  // const searchParams = useSearchParams();
  useEventWidgetModals();

  const {
    id,
    loading,
    tournaments,
    topLeaderboard,
    commonLeaderboard,
  } = useSelector(eventSelector);
  const currentUserId = useSelector(currentUserIdSelector);
  const currentUserClanId = useSelector(currentUserClanIdSelector);

  const contentClassName = cn(
    'd-flex flex-column-reverse flex-lg-row',
    'flex-md-column-reverse flex-sm-column-reverse',
    {
      'cb-opacity-50': loading === loadingStatuses.LOADING,
    },
  );
  const loadingClassName = cn(
    'justify-content-center align-items-center',
    'position-absolute w-100',
    {
      'd-flex': loading === loadingStatuses.LOADING,
      hidden: loading !== loadingStatuses.LOADING,
    },
  );

  return (
    <div className="d-flex flex-column position-relative container-lg">
      <div className={contentClassName}>
        <div className="d-flex col-12 col-lg-7  flex-column m-2 p-1 py-3">
          {topLeaderboard.length > 0 && (
            <TopLeaderboardPanel topLeaderboard={topLeaderboard} />
          )}
          <EventRatingPanel
            currentUserId={currentUserId}
            currentUserClanId={currentUserClanId}
            commonLeaderboard={commonLeaderboard}
            eventId={id}
          />
        </div>
        <div className="col-12 col-lg-5">
          <div className="rounded-lg border-0 bg-white m-1 py-3">
            <EventCalendarPanel tournaments={tournaments} />
          </div>
        </div>
      </div>
      <div className={loadingClassName}>
        <Loading large />
      </div>
    </div>
  );
}

export default memo(EventWidget);
