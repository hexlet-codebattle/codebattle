import Gon from 'gon';
import { Socket } from 'phoenix';

const socket = new Socket('/ws', {
  params: { token: Gon.getAsset('user_token') },
});

export const channelTopics = {
  editorDataTopic: 'editor:data',
  userStartCheckTopic: 'user:start_check',
  userCheckCompleteTopic: 'user:check_complete',
  userWonTopic: 'user:won',
  userGiveUpTopic: 'user:give_up',
  userBanned: 'user:banned',
  userUnbanned: 'user:unbanned',

  editorCursorPositionTopic: 'editor:cursor_position',
  editorCursorSelectionTopic: 'editor:cursor_selection',

  rematchStatusUpdatedTopic: 'rematch:status_updated',
  rematchAcceptedTopic: 'rematch:accepted',

  gameCreatedTopic: 'game:created',
  gameUserJoinedTopic: 'game:user_joined',
  gameTimeoutTopic: 'game:timeout',
  gameToggleVisibleTopic: 'game:toggle_visible',
  gameUnlockedTopic: 'game:unlocked',

  chatUserJoinedTopic: 'chat:user_joined',
  chatUserLeftTopic: 'chat:user_left',
  chatUserNewMsgTopic: 'chat:new_msg',
  chatUserBannedTopic: 'chat:user_banned',

  lobbyGameUpsertTopic: 'game:upsert',
  lobbyGameEditorLangChangedTopic: 'game:editor_lang_changed',
  lobbyGameCheckStartedTopic: 'game:check_started',
  lobbyGameCheckCompletedTopic: 'game:check_completed',
  lobbyGameRemoveTopic: 'game:remove',
  lobbyGameFinishedTopic: 'game:finished',

  invitesInitTopic: 'invites:init',
  invitesCreatedTopic: 'invites:created',
  invitesCanceledTopic: 'invites:canceled',
  invitesAcceptedTopic: 'invites:accepted',
  invitesExpiredTopic: 'invites:expired',
  invitesDroppedTopic: 'invites:dropped',

  tournamentUpdateTopic: 'tournament:update',
  tournamentGameCreatedTopic: 'tournament:game:created',
  tournamentRoundCreatedTopic: 'tournament:round_created',
  tournamentRoundFinishedTopic: 'tournament:round_finished',
  tournamentRankingUpdate: 'tournament:ranking_update',
  tournamentResultsUpdated: 'tournament:results_updated',
  tournamentGameWaitTopic: 'tournament:game:wait',
  tournamentPlayerFinishedRoundTopic: 'tournament:player:finished_round',
  tournamentPlayerFinishedTopic: 'tournament:player:finished',
  tournamentActivated: 'tournament:activated',

  roundCreatedTopic: 'round:created',

  waitingRoomStartedTopic: 'waiting_room:started',
  waitingRoomEndedTopic: 'waiting_room:ended',
  waitingRoomPlayerBannedTopic: 'waiting_room:player:banned',
  waitingRoomPlayerUnbannedTopic: 'waiting_room:player:unbanned',
  waitingRoomPlayerMatchmakingStartedTopic: 'waiting_room:player:matchmaking_started',
  waitingRoomPlayerMatchmakingResumedTopic: 'waiting_room:player:matchmaking_resumed',
  waitingRoomPlayerMatchmakingStoppedTopic: 'waiting_room:player:matchmaking_stopped',
  waitingRoomPlayerMatchmakingPausedTopic: 'waiting_room:player:matchmaking_paused',
  waitingRoomPlayerMatchCreatedTopic: 'waiting_room:player:match_created',

  streamActiveGameSelectedTopic: 'stream:active_game_selected',
};

export const channelMethods = {
  gameScore: 'game:score',
  gameCancel: 'game:cancel',
  gameCreate: 'game:create',
  cssGameCreate: 'game:css:create',
  gameCreateInvite: 'game:create_invite',
  gameAcceptInvite: 'game:accept_invite',
  gameDeclineInvite: 'game:decline_invite',
  gameCancelInvite: 'game:cancel_invite',

  reportOnPlayer: 'game:report',

  chatAddMsg: 'chat:add_msg',
  chatCommand: 'chat:command',

  checkResult: 'check_result',
  giveUp: 'give_up',

  editorData: 'editor:data',
  editorLang: 'editor:lang',
  editorCursorPosition: channelTopics.editorCursorPositionTopic,
  editorCursorSelection: channelTopics.editorCursorSelectionTopic,

  enterPassCode: 'enter_pass_code',

  rematchSendOffer: 'rematch:send_offer',
  rematchRejectOffer: 'rematch:reject_offer',
  rematchAcceptOffer: 'rematch:accept_offer',

  invitesCreate: 'invites:create',
  invitesAccept: 'invites:accept',
  invitesCancel: 'invites:cancel',

  matchmakingPause: 'matchmaking:pause',
  matchmakingResume: 'matchmaking:resume',
  matchmakingRestart: 'matchmaking:restart',

};

socket.connect();

export default socket;
