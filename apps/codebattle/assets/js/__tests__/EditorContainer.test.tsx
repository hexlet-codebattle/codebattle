import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createActor } from 'xstate';

import RoomContext from '../widgets/components/RoomContext';
import machines from '../widgets/machines';
import EditorContainer from '../widgets/pages/game/EditorContainer';

const { state, dispatch, checkSolution, editorMode } = vi.hoisted(() => ({
  state: {
    user: { currentUserId: 1, users: { 1: { subscriptionType: 'premium' } } },
    game: {
      players: { 1: { id: 1, result: 'lost', isBanned: false } },
      gameStatus: { gameId: 10, state: 'playing', mode: 'standard' },
    },
    editor: { meta: { 1: { currentLangSlug: 'js' } } },
  },
  dispatch: vi.fn(),
  checkSolution: vi.fn(),
  editorMode: { value: 'load_active_editor' },
}));

vi.mock('react-redux', () => ({
  useDispatch: () => dispatch,
  useSelector: (selector: (value: unknown) => unknown) => selector(state),
}));

vi.mock('../widgets/middlewares/Room', () => ({
  checkGameSolution: checkSolution,
  connectToEditor: (service: ReturnType<typeof createActor>) => () => {
    service.send({ type: editorMode.value });
    return () => {};
  },
}));

vi.mock('../widgets/pages/game/EditorToolbar', () => ({
  default: ({ actionBtnsProps }: any) => (
    <button
      disabled={actionBtnsProps.checkBtnStatus !== 'enabled'}
      onClick={actionBtnsProps.checkResult}
    >
      Check
    </button>
  ),
}));

describe('game editor solution checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.game.gameStatus.state = 'playing';
    state.game.players[1].isBanned = false;
    editorMode.value = 'load_active_editor';
  });

  const renderEditor = (mainService: ReturnType<typeof createActor>) =>
    render(
      <RoomContext.Provider value={{ mainService, taskService: mainService }}>
        <EditorContainer id={1} type="current_user" editorMachine={machines.editor}>
          {() => null}
        </EditorContainer>
      </RoomContext.Provider>,
    );

  test('keeps checking available when an active game finishes', () => {
    const mainService = createActor(machines.game);
    mainService.start();
    mainService.send({ type: 'LOAD_GAME', payload: { state: 'playing' } });
    renderEditor(mainService);

    act(() => {
      state.game.gameStatus.state = 'game_over';
      mainService.send({ type: 'user:check_complete', payload: { state: 'game_over' } });
    });

    expect(screen.getByRole('button', { name: 'Check' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(checkSolution).toHaveBeenCalledOnce();
    act(() => mainService.stop());
  });

  test('allows Ctrl+Enter when reopening a live finished game', () => {
    state.game.gameStatus.state = 'game_over';
    const mainService = createActor(machines.game);
    mainService.start();
    mainService.send({ type: 'LOAD_GAME', payload: { state: 'game_over' } });
    renderEditor(mainService);

    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    expect(checkSolution).toHaveBeenCalledOnce();
    act(() => mainService.stop());
  });

  test.each(['timeout', 'stored', 'replay', 'banned'])('disables checking for %s', (mode) => {
    state.game.gameStatus.state = mode === 'timeout' ? 'timeout' : 'game_over';
    if (mode === 'stored') editorMode.value = 'load_stored_editor';
    if (mode === 'banned') editorMode.value = 'load_banned_editor';
    const mainService = createActor(machines.game, {
      input: { subscriptionType: 'premium' },
    });
    mainService.start();
    mainService.send({ type: 'LOAD_GAME', payload: { state: state.game.gameStatus.state } });
    if (mode === 'replay') {
      mainService.send({ type: 'START_LOADING_PLAYBOOK' });
      mainService.send({ type: 'LOAD_PLAYBOOK', payload: {} });
    }
    renderEditor(mainService);

    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    expect(checkSolution).not.toHaveBeenCalled();
    act(() => mainService.stop());
  });
});
