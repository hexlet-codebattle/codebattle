import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Gon from 'gon';

import { connectToTournament } from '../middlewares/Tournament';
import { connectToChat } from '../middlewares/Chat';

import { actions } from '../slices';
import * as selectors from '../selectors';

const Tournament = () => {
  const dispatch = useDispatch();

  const { statistics, tournament } = useSelector(selectors.tournamentSelector);
  const messages = useSelector(selectors.chatMessagesSelector);

  useEffect(() => {
    const currentUser = Gon.getAsset('current_user');

    dispatch(actions.setCurrentUser({ user: { ...currentUser } }));
    dispatch(connectToTournament());
    dispatch(connectToChat());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tournament.type === "individual";
  // tournament.type === "team";

  // ToDO: Use React.memo to avoid unnecessary rerenders of components
  //
  // Components:
  //   Chat
  //  ---- Individual Game ----
  //   Participants
  //   Matches
  //  ---- Team Game -----
  //   Panel with tournament info
  //     Participants
  //     Statistics
  //   Matches

  return (
    <div />
  );
};

export default Tournament;
