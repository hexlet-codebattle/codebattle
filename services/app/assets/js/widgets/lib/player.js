import Delta from 'quill-delta';
import _ from 'lodash';

const snapshotStep = 400;

const updatePlayers = (players, params) => (
  players.map(player => (player.id === params.id
    ? { ...player, ...params }
    : player))
);

const updatePlayersGameResult = (players, firstPlayer, secondPlayer) => (
  players.map(player => ((player.id === firstPlayer.id)
    ? { ...player, ...firstPlayer }
    : { ...player, ...secondPlayer }))
);

export const { parse } = JSON;

export const minify = JSON.stringify;

export const getText = (text, { delta: d }) => {
  const textDelta = new Delta().insert(text);
  const delta = new Delta(d);
  const finalDelta = textDelta.compose(delta);
  return finalDelta.ops[0].insert;
};

const collectFinalRecord = (acc, strRecord) => {
  const record = parse(strRecord);
  const { players } = acc;

  let player;
  let editorText;
  let newPlayers;
  switch (record.type) {
    case 'update_editor_data':
      player = _.find(players, { id: record.userId });
      editorText = getText(player.editorText, record.diff);
      newPlayers = updatePlayers(players, {
        id: record.userId,
        editorText,
        editorLang: record.diff.nextLang,
      });

      return { ...acc, players: newPlayers };
    case 'check_complete':
      newPlayers = updatePlayers(players, {
        id: record.userId,
        checkResult: record.checkResult,
      });

      return { ...acc, players: newPlayers };
    case 'chat_message':
    case 'join_chat':
    case 'leave_chat':
      return { ...acc, chat: record.chat };
    default:
      return acc;
  }
};

const createFinalRecord = (index, record, params) => {
  if (index % snapshotStep === 0) {
    return minify({ ...record, ...params });
  }

  return minify(record);
};

const reduceOriginalRecords = (acc, record, index) => {
  const { players: playersState, records, chat: chatState } = acc;
  const { messages, users } = chatState;
  const { editorText } = _.find(playersState, { id: record.id });

  const { type } = record;

  if (type === 'update_editor_data') {
    const { diff } = record;

    const newEditorText = getText(editorText, diff);
    const editorLang = diff.nextLang;
    const newPlayers = updatePlayers(
      playersState,
      { id: record.id, editorText: newEditorText, editorLang },
    );
    const data = {
      type,
      userId: record.id,
      diff: record.diff,
    };
    const newRecord = createFinalRecord(index, data, {
      players: newPlayers,
      chat: chatState,
    });

    return { ...acc, players: newPlayers, records: [...records, newRecord] };
  }

  if (type === 'check_complete') {
    const { checkResult } = record;

    const newPlayers = updatePlayers(playersState, { id: record.id, checkResult });
    const data = {
      type,
      userId: record.id,
      checkResult,
    };
    const newRecord = createFinalRecord(index, data, {
      players: newPlayers,
      chat: chatState,
    });

    return { ...acc, players: newPlayers, records: [...records, newRecord] };
  }

  if (type === 'chat_message') {
    const message = {
      id: record.id,
      user: record.name,
      message: record.message,
    };

    const newMessages = [...messages, message];
    const newChatState = { users, messages: newMessages };
    const data = {
      type,
      chat: newChatState,
    };
    const newRecord = createFinalRecord(index, data, { players: playersState });

    return { ...acc, chat: newChatState, records: [...records, newRecord] };
  }

  if (type === 'join_chat') {
    const user = {
      id: record.id,
      name: record.name,
    };

    const newChatUsers = [...users, user];
    const newChatState = { users: newChatUsers, messages };
    const data = {
      type,
      chat: newChatState,
    };
    const newRecord = createFinalRecord(index, data, { players: playersState });

    return { ...acc, chat: newChatState, records: [...records, newRecord] };
  }

  if (type === 'leave_chat') {
    const newUsers = users.filter(user => user.id !== record.id);
    const newChatState = { users: newUsers, messages };
    const data = {
      type,
      chat: newChatState,
    };
    const newRecord = createFinalRecord(index, data, { players: playersState });

    return { ...acc, chat: newChatState, records: [...records, newRecord] };
  }

  if (type === 'give_up') {
    const newPlayers = updatePlayersGameResult(
      playersState,
      { id: record.id, gameResult: 'gave_up' },
      { gameResult: 'won' },
    );
    const data = { type: record.type };
    const newRecord = createFinalRecord(index, data, {
      players: newPlayers,
      chat: chatState,
    });

    return { ...acc, players: newPlayers, records: [...records, newRecord] };
  }

  if (type === 'game_over') {
    const newPlayers = updatePlayersGameResult(
      playersState,
      { id: record.id, gameResult: 'won' },
      { gameResult: 'lost' },
    );
    const data = { type: record.type };
    const newRecord = createFinalRecord(index, data, {
      players: newPlayers,
      chat: chatState,
    });

    return { ...acc, players: newPlayers, records: [...records, newRecord] };
  }

  const newRecord = createFinalRecord(index, record, {
    players: playersState,
    chat: chatState,
  });

  return { ...acc, records: [...records, newRecord] };
};

export const getFinalState = ({ recordId, records, gameInitialState }) => {
  const closestFullRecordId = Math.floor(recordId / snapshotStep) * snapshotStep;
  const closestFullRecord = parse(records[closestFullRecordId]);
  const finalRecord = records
    .slice(closestFullRecordId + 1, recordId)
    .reduce(collectFinalRecord, closestFullRecord);

  const nextRecordId = recordId !== records.length ? recordId : recordId - 1;
  return nextRecordId === 0 ? gameInitialState : { ...finalRecord, nextRecordId };
};

export const resolveDiffs = playbook => {
  const [initRecords, restRecords] = _.partition(
    playbook.records,
    record => record.type === 'init',
  );
  const initGameState = {
    players: initRecords,
    records: [],
    chat: {
      messages: [],
      users: [],
    },
  };

  const finalGameState = restRecords
    .reduce(reduceOriginalRecords, initGameState);

  const finalPlaybook = {
    ...playbook, initRecords, ...finalGameState,
  };
  return finalPlaybook;
};

export default resolveDiffs;
