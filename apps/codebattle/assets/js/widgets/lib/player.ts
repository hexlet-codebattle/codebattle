import find from 'lodash/find';
import partition from 'lodash/partition';
import Delta from 'quill-delta';

import PlaybookStatusCodes from '../config/playbookStatusCodes';

const snapshotStep = 400;

// The playbook records are heavily polymorphic (per `type`) and the surrounding
// redux store is still untyped JS, so we keep these structural shapes loose.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Player = Record<string, any>;

interface ChatState {
  users: any[];
  messages: any[];
}

interface PlaybookRecord {
  type?: string;
  [key: string]: any;
}

interface PlaybookState {
  type?: string;
  players: Player[];
  records: string[];
  chat: ChatState;
  [key: string]: any;
}

const updatePlayers = (players: Player[], params: Player): Player[] =>
  players.map((player) => (player.id === params.id ? { ...player, ...params } : player));

const updatePlayersGameResult = (
  players: Player[],
  firstPlayer: Player,
  secondPlayer: Player,
): Player[] =>
  players.map((player) =>
    player.id === firstPlayer.id ? { ...player, ...firstPlayer } : { ...player, ...secondPlayer },
  );

export const { parse } = JSON;

export const minify = JSON.stringify;

export const getText = (text: string, { delta: d }: { delta: any }): string => {
  const textDelta = new Delta().insert(text);
  const delta = new Delta(d);
  const finalDelta = textDelta.compose(delta);
  return (finalDelta.ops[0]?.insert as string) || '';
};

export const getDiff = (prevText: string, nextText: string) => {
  const a = new Delta().insert(prevText);
  const b = new Delta().insert(nextText);
  const delta = a.diff(b).ops;
  return { delta };
};

const collectFinalRecord = (acc: PlaybookState, strRecord: string): PlaybookState => {
  const record = parse(strRecord);
  const { players } = acc;

  let player;
  let editorText;
  let newPlayers;
  switch (record.type) {
    case 'update_editor_data':
      player = find(players, { id: record.userId })!;
      editorText = getText(player.editorText, record.diff);
      newPlayers = updatePlayers(players, {
        id: record.userId,
        editorText,
        editorLang: record.diff.nextLang || player.editorLang,
      });

      return { ...acc, players: newPlayers };
    case 'check_complete':
      newPlayers = updatePlayers(players, {
        id: record.userId,
        checkResult: record.checkResult,
        editorText: record.editorText,
        editorLang: record.editorLang,
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

const createFinalRecord = (index: number, record: PlaybookRecord, params: Player): string => {
  if (index % snapshotStep === 0) {
    return minify({ ...record, ...params });
  }

  return minify(record);
};

const reduceOriginalRecords = (
  acc: PlaybookState,
  record: PlaybookRecord,
  index: number,
): PlaybookState => {
  const { players, records, chat: chatState, type: playbookType } = acc;
  const { messages, users } = chatState;

  const { type } = record;

  if (type === 'update_editor_data' && playbookType === PlaybookStatusCodes.active) {
    const { editorText: prevEditorText } = find(players, { id: record.id })!;

    const diff = getDiff(prevEditorText, record.editorText);
    const newPlayers = updatePlayers(players, {
      id: record.id,
      editorText: record.editorText,
      editorLang: record.editorLang,
    });
    const data = {
      type,
      userId: record.id,
      diff,
    };
    const newRecord = createFinalRecord(index, data, {
      players: newPlayers,
      chat: chatState,
    });

    return { ...acc, players: newPlayers, records: [...records, newRecord] };
  }

  if (type === 'update_editor_data' && playbookType === PlaybookStatusCodes.stored) {
    const { editorText, editorLang: prevEditorLang } = find(players, { id: record.id })!;
    const { diff } = record;

    const newEditorText = getText(editorText, diff);
    const editorLang = diff.nextLang || prevEditorLang;
    const newPlayers = updatePlayers(players, {
      id: record.id,
      editorText: newEditorText,
      editorLang,
    });
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
    const { checkResult, editorText, editorLang } = record;

    const newPlayers = updatePlayers(players, {
      id: record.id,
      checkResult,
      editorText,
      editorLang,
    });
    const userName = find(players, { id: record.id })!.name;
    const data = {
      type,
      userId: record.id,
      checkResult,
      userName,
      recordId: record.recordId,
      editorText,
      editorLang,
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
      time: record.time,
      name: record.name,
      text: record.text || record.message,
    };

    const newMessages = [...messages, message];
    const newChatState = { users, messages: newMessages };
    const data = {
      type,
      chat: newChatState,
    };
    const newRecord = createFinalRecord(index, data, { players });

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
    const newRecord = createFinalRecord(index, data, { players });

    return { ...acc, chat: newChatState, records: [...records, newRecord] };
  }

  if (type === 'leave_chat') {
    const newUsers = users.filter((user) => user.id !== record.id);
    const newChatState = { users: newUsers, messages };
    const data = {
      type,
      chat: newChatState,
    };
    const newRecord = createFinalRecord(index, data, { players });

    return { ...acc, chat: newChatState, records: [...records, newRecord] };
  }

  if (type === 'give_up') {
    const newPlayers = updatePlayersGameResult(
      players,
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
      players,
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
    players,
    chat: chatState,
  });

  return { ...acc, records: [...records, newRecord] };
};

export const addRecord = ({
  records,
  players,
  type,
  payload,
}: {
  records: string[];
  players: Player[];
  type: string;
  payload: any;
}) => {
  if (!records) {
    return { records, players };
  }

  const recordId = records.length;

  switch (type) {
    case 'update_editor_data': {
      const { userId, langSlug, editorText } = payload;
      const { editorText: prevEditorText } = find(players, { id: userId })!;

      const diff = getDiff(prevEditorText, editorText);

      const newPlayers = updatePlayers(players, { id: userId, editorText, editorLang: langSlug });
      const data = {
        type,
        userId,
        diff,
      };
      const newRecord = createFinalRecord(recordId, data, {
        players: newPlayers,
        chat: [], // we don't need show chat history for active game
      });

      return {
        records: [...records, newRecord],
        players: newPlayers,
      };
    }
    case 'check_complete': {
      const { userId, ...checkResult } = payload;

      const newPlayers = updatePlayers(players, { id: userId, checkResult });
      const data = {
        type,
        userId,
        checkResult,
      };
      const newRecord = createFinalRecord(recordId, data, {
        players: newPlayers,
        chat: [], // we don't need show chat history for active game
      });

      return {
        records: [...records, newRecord],
        players: newPlayers,
      };
    }
    default:
      return { records, players };
  }
};

export const getFinalState = ({
  recordId,
  records,
  initRecords,
}: {
  recordId: number;
  records: string[];
  initRecords: Player[];
}) => {
  const gameInitialState = {
    players: initRecords,
    chat: {
      users: [],
      messages: [],
    },
    nextRecordId: 0,
  };

  const closestFullRecordId = Math.floor(recordId / snapshotStep) * snapshotStep;
  const closestFullRecord = parse(records[closestFullRecordId]);
  const finalRecord = records
    .slice(closestFullRecordId + 1, recordId)
    .reduce(collectFinalRecord, closestFullRecord);

  const nextRecordId = recordId !== records.length ? recordId : recordId - 1;
  return nextRecordId === 0 ? gameInitialState : { ...finalRecord, nextRecordId };
};

export const reduceRealtimeOriginalRecords = (
  acc: PlaybookState,
  record: PlaybookRecord,
  index: number,
): PlaybookState => {
  const { players, records, chat: chatState, type: playbookType } = acc;
  const { messages, users } = chatState;

  const { type } = record;

  if (type === 'update_editor_data' && playbookType === PlaybookStatusCodes.active) {
    const { editorText: prevEditorText } = find(players, { id: record.id })!;

    const diff = getDiff(prevEditorText, record.editorText);
    const newPlayers = updatePlayers(players, {
      id: record.id,
      editorText: record.editorText,
      editorLang: record.editorLang,
    });
    const data = {
      type,
      userId: record.id,
      diff,
      time: record.time,
    };
    const newRecord = createFinalRecord(index, data, {
      players: newPlayers,
      chat: chatState,
    });

    return { ...acc, players: newPlayers, records: [...records, newRecord] };
  }

  if (type === 'update_editor_data' && playbookType === PlaybookStatusCodes.stored) {
    const { editorText, editorLang: prevEditorLang } = find(players, { id: record.id })!;
    const { diff } = record;

    const newEditorText = getText(editorText, diff);
    const editorLang = diff.nextLang || prevEditorLang;
    const newPlayers = updatePlayers(players, {
      id: record.id,
      editorText: newEditorText,
      editorLang,
    });
    const data = {
      type,
      userId: record.id,
      diff: record.diff,
      time: record.time,
    };
    const newRecord = createFinalRecord(index, data, {
      players: newPlayers,
      chat: chatState,
    });

    return { ...acc, players: newPlayers, records: [...records, newRecord] };
  }

  if (type === 'check_complete') {
    const { checkResult, editorText, editorLang } = record;

    const newPlayers = updatePlayers(players, {
      id: record.id,
      checkResult,
      editorText,
      editorLang,
    });
    const userName = find(players, { id: record.id })!.name;
    const data = {
      type,
      userId: record.id,
      checkResult,
      userName,
      recordId: record.recordId,
      editorText,
      editorLang,
      time: record.time,
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
      time: record.time,
      name: record.name,
      text: record.text || record.message,
    };

    const newMessages = [...messages, message];
    const newChatState = { users, messages: newMessages };
    const data = {
      type,
      chat: newChatState,
      time: record.time,
    };
    const newRecord = createFinalRecord(index, data, { players });

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
      time: record.time,
    };
    const newRecord = createFinalRecord(index, data, { players });

    return { ...acc, chat: newChatState, records: [...records, newRecord] };
  }

  if (type === 'leave_chat') {
    const newUsers = users.filter((user) => user.id !== record.id);
    const newChatState = { users: newUsers, messages };
    const data = {
      type,
      chat: newChatState,
      time: record.time,
    };
    const newRecord = createFinalRecord(index, data, { players });

    return { ...acc, chat: newChatState, records: [...records, newRecord] };
  }

  if (type === 'give_up') {
    const newPlayers = updatePlayersGameResult(
      players,
      { id: record.id, gameResult: 'gave_up' },
      { gameResult: 'won' },
    );
    const data = { type: record.type, time: record.time };
    const newRecord = createFinalRecord(index, data, {
      players: newPlayers,
      chat: chatState,
    });

    return { ...acc, players: newPlayers, records: [...records, newRecord] };
  }

  if (type === 'game_over') {
    const newPlayers = updatePlayersGameResult(
      players,
      { id: record.id, gameResult: 'won' },
      { gameResult: 'lost' },
    );
    const data = { type: record.type, time: record.time };
    const newRecord = createFinalRecord(index, data, {
      players: newPlayers,
      chat: chatState,
    });

    return { ...acc, players: newPlayers, records: [...records, newRecord] };
  }

  const newRecord = createFinalRecord(
    index,
    { ...record, time: record.time },
    {
      players,
      chat: chatState,
    },
  );

  return { ...acc, records: [...records, newRecord] };
};

export const resolveRealtimeDiffs = (
  playbook: { records: PlaybookRecord[]; [key: string]: any },
  type?: string,
) => {
  const [initRecords, restRecords] = partition(
    playbook.records,
    (record) => record.type === 'init',
  );

  // record types "init"
  const initGameState: PlaybookState = {
    type,
    players: initRecords,
    records: [],
    chat: {
      messages: [],
      users: [],
    },
  };

  const finalGameState = restRecords.reduce(reduceRealtimeOriginalRecords, initGameState);

  const finalPlaybook = {
    ...playbook,
    initRecords,
    ...finalGameState,
  };
  return finalPlaybook;
};

export const resolveDiffs = (
  playbook: { records: PlaybookRecord[]; [key: string]: any },
  type?: string,
) => {
  const [initRecords, restRecords] = partition(
    playbook.records,
    (record) => record.type === 'init',
  );

  // record types "init"
  const initGameState: PlaybookState = {
    type,
    players: initRecords,
    records: [],
    chat: {
      messages: [],
      users: [],
    },
  };

  const finalGameState = restRecords.reduce(reduceOriginalRecords, initGameState);

  const finalPlaybook = {
    ...playbook,
    initRecords,
    ...finalGameState,
  };
  return finalPlaybook;
};

export default resolveDiffs;
