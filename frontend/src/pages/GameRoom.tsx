import { Center, Loader, Text, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type ChatApi, useChat } from '@/features/chat/useChat';
import { ChatDrawer } from '@/features/game/components/ChatDrawer';
import { EditorPane } from '@/features/game/components/EditorPane';
import { GameCanceled } from '@/features/game/components/GameCanceled';
import { GameResultModal } from '@/features/game/components/GameResultModal';
import { LockScreen } from '@/features/game/components/LockScreen';
import { MiniChat } from '@/features/game/components/MiniChat';
import { PlaybookReview } from '@/features/game/components/PlaybookReview';
import { PracticeGuide } from '@/features/game/components/PracticeGuide';
import { RematchBanner } from '@/features/game/components/RematchControls';
import { ReplayBar } from '@/features/game/components/ReplayBar';
import { type BriefTab, TaskBrief } from '@/features/game/components/TaskBrief';
import { TopBar } from '@/features/game/components/TopBar';
import { TournamentBox } from '@/features/game/components/TournamentBox';
import { WaitingOpponent } from '@/features/game/components/WaitingOpponent';
import classes from '@/features/game/GameRoom.module.css';
import { usePlaybook } from '@/features/game/history';
import { isAbandoned, isGameOver, useGameStore } from '@/features/game/store';
import type { Game, GamePageProps, GamePlayer } from '@/features/game/types';
import { type GameApi, useGame } from '@/features/game/useGame';
import { InviteDialog } from '@/features/invites/InviteDialog';
import { useInvitesChannel } from '@/features/invites/useInvitesChannel';
import { useMainChannel } from '@/features/main/useMainChannel';
import { CookieNotice } from '@/features/privacy/CookieNotice';
import { useSyncSoundMute } from '@/features/settings/useSoundMute';
import { useUnread } from '@/features/tournament/components/SidePanels';
import type { SharedProps } from '@/shared/types';
import { useSharedProps } from '@/shared/useSharedProps';

type PageProps = GamePageProps &
  SharedProps & { is_record?: boolean; has_playbook?: boolean; is_live?: boolean; tournament_name?: string | null };

/** Me on the left when I play; otherwise the players in their order. */
function seats(game: Game, meId: number): [GamePlayer | undefined, GamePlayer | undefined] {
  const mine = game.players.find((player) => player.id === meId);
  if (!mine) return [game.players[0], game.players[1]];
  return [mine, game.players.find((player) => player.id !== meId)];
}

interface LayoutProps {
  game: Game;
  api: GameApi | null;
  history?: boolean;
  /** Beside the task (tournament clock and standings). */
  aside?: ReactNode;
  withChat: boolean;
  /** Under the editors (the replay controls). */
  footer?: ReactNode;
  editable: boolean;
  allowClipboard: boolean;
  /** Admins / moderators: may open the history while the game is played. */
  canManage?: boolean;
  /** History of a game that still runs: offer the way back. */
  liveGame?: boolean;
}

// Stand-in for games without a chat, so the unread hook keeps its call order.
const NO_CHAT = { messages: [], online: false } as unknown as ChatApi;

/**
 * Top to bottom: the bar, the task strip (collapsible; the tournament box or the chat beside it),
 * then both editors at full width with their results under them. The chat peeks from the strip
 * (latest messages, spectators) and opens in full in a drawer.
 */
function RoomBody({ game, api, history = false, aside, chat, footer, editable, allowClipboard, canManage = false, liveGame = false }: Omit<LayoutProps, 'withChat'> & { chat: ChatApi | null }) {
  const { current_user: me } = useSharedProps();
  // The task is open on every visit; collapsing it lasts for this page only.
  const [brief, setBrief] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRoom, setChatRoom] = useState<number | null>(null);
  const theme = useMantineTheme();
  const showMiniChat = useMediaQuery(`(min-width: ${theme.breakpoints.md})`);
  // Standings and spectators follow the editors when the page stacks vertically.
  const stacked = useMediaQuery(`(max-width: ${theme.breakpoints.md})`);
  // The open strip shows the chat too, so what it shows counts as read.
  const miniChat =
    chat && brief && showMiniChat ? (
      <MiniChat
        chat={chat}
        gameId={game.id}
        playerIds={game.players.map((player) => player.id)}
        onExpand={() => setChatOpen(true)}
        onDirectMessage={(user) => {
          chat.openRoom(user);
          setChatRoom(user.id);
          setChatOpen(true);
        }}
      />
    ) : null;
  const unread = useUnread(chat ?? NO_CHAT, chatOpen || miniChat != null);
  const [left, right] = seats(game, me.id);
  const [tab, setTab] = useState<BriefTab>('task');
  const showTests = useCallback(() => {
    setBrief(true);
    setTab('tests');
  }, [setBrief]);
  // Top-bar Task / Tests: show that pane, or hide the strip when it is the one already shown.
  const togglePane = (pane: BriefTab) => {
    if (brief && tab === pane) {
      setBrief(false);
    } else {
      setBrief(true);
      setTab(pane);
    }
  };

  // A run of the left seat (mine when I play) starts: switch the open task strip to its tests.
  // A hidden strip stays hidden. Only the start counts; the game reloading on join (with the
  // last results) must not take the page off the task.
  const leftId = left?.id ?? null;
  const leftChecking = useGameStore((state) => (leftId == null ? false : Boolean(state.checking[leftId])));
  const wasChecking = useRef(leftChecking);
  useEffect(() => {
    const started = leftChecking && !wasChecking.current;
    wasChecking.current = leftChecking;
    if (started && !history && brief) setTab('tests');
  }, [leftChecking, history, brief]);

  // The tab: the tournament for tournament games (players switch between them), else the task.
  const { tournament_name: tournamentName } = useSharedProps<{ tournament_name?: string | null }>();
  const tabTitle = tournamentName || game.task?.name;
  useEffect(() => {
    document.title = tabTitle ? `${tabTitle} · Codebattle` : 'Codebattle';
  }, [tabTitle]);

  return (
    <div className={classes.room}>
      <TopBar
        game={game}
        api={api}
        left={left}
        right={right}
        history={history}
        strip={{ open: brief, tab, testsOf: leftId, onTask: () => togglePane('task'), onTests: () => togglePane('tests'), onToggle: () => setBrief(!brief) }}
        chat={chat ? { unread, open: () => setChatOpen(true) } : null}
        // Everyone once the game is over; admins also during play, to check for cheating.
        historyHref={!history && (isGameOver(game.state) || canManage) ? `/games/${game.id}?history=1` : null}
        liveHref={history && liveGame ? `/games/${game.id}` : null}
        canManage={canManage}
      />

      <div className={classes.body}>
        {!history && game.mode === 'training' && game.players.some((player) => player.id === me.id) && <PracticeGuide />}
        {!history && api && isGameOver(game.state) && !game.tournament_id && game.mode !== 'training' && left?.id === me.id && right && (
          <RematchBanner game={game} api={api} me={me.id} />
        )}
        {brief && (
          <TaskBrief
            tab={tab}
            testsOf={leftId}
            opponentId={right?.id ?? null}
            aside={
              (!stacked && aside) || miniChat ? (
                <>
                  {!stacked && aside}
                  {miniChat}
                </>
              ) : null
            }
          />
        )}

        <main className={classes.editors} data-single={!right || undefined}>
          {left && <EditorPane player={left} editable={editable} api={api} allowClipboard={allowClipboard} onShowTests={showTests} withSettings />}
          {right && <EditorPane player={right} editable={false} api={api} allowClipboard={allowClipboard} />}
        </main>
        {stacked && aside}
        {footer}
      </div>

      {chat && <ChatDrawer chat={chat} opened={chatOpen} onClose={() => setChatOpen(false)} room={chatRoom} onRoomChange={setChatRoom} />}
    </div>
  );
}

function WithChat({ topic, ...props }: Omit<LayoutProps, 'withChat'> & { topic: string }) {
  const chat = useChat(topic);
  return <RoomBody {...props} chat={chat} />;
}

function RoomLayout({ withChat, ...props }: LayoutProps) {
  // Tournament games have no chat: the tournament box (round, standings, spectators) takes its place.
  return withChat && !props.game.tournament_id ? <WithChat {...props} topic={`chat:g_${props.game.id}`} /> : <RoomBody {...props} chat={null} />;
}

function LiveRoom({ props }: { props: PageProps }) {
  const { t } = useTranslation();
  const { current_user: me } = props;
  const api = useGame(props.game_id);
  const game = useGameStore((state) => state.game) ?? props.game;
  const tournament = useGameStore((state) => state.tournament);
  const isPlayer = game.players.some((player) => player.id === me.id);

  if (game.state === 'waiting_opponent') return <WaitingOpponent game={game} />;
  if (game.locked && !props.can_manage_game) return <LockScreen api={api} />;

  if (!game.task) {
    return (
      <Center h="100dvh">
        <Loader />
      </Center>
    );
  }

  return (
    <>
      <RoomLayout
        game={game}
        api={api}
        aside={tournament ? <TournamentBox info={tournament} /> : null}
        withChat={game.use_chat && !me.is_guest}
        // Players keep editing and checking after the end while the game lives (the server
        // accepts it: a win stays a win, after a timeout the check doesn't count).
        editable={isPlayer && (!me.is_guest || game.mode === 'training')}
        allowClipboard={props.can_manage_game}
        canManage={props.can_manage_game}
      />
      {isPlayer && <GameResultModal api={api} />}
      {/* Guests may arrive straight from a shared game link, never passing an AppLayout page. */}
      {me.is_guest && <CookieNotice />}
      {api.status === 'error' && (
        <div className={classes.offline} role="status">
          <Text size="xs" fw={700}>
            {t('Connection lost, reconnecting…')}
          </Text>
        </div>
      )}
    </>
  );
}

/** A finished game: its final code, replayable from the playbook when there is one. */
function HistoryRoom({ props }: { props: PageProps }) {
  const { t } = useTranslation();
  const game = useGameStore((state) => state.game) ?? props.game;
  const playbook = usePlaybook(props.game_id, Boolean(props.has_playbook));
  const steps = playbook.data?.steps;
  const [chosen, setChosen] = useState<number | null>(null);
  // Open on the final position; play rewinds to the start.
  const index = chosen ?? (steps ? steps.length - 1 : null);

  // Show the chosen step in the editors and the output tab.
  useEffect(() => {
    const step = steps && index != null ? steps[index] : null;
    if (!step) return;
    const store = useGameStore.getState();
    Object.entries(step.players).forEach(([id, player]) => {
      store.setEditor(Number(id), { text: player.text, lang: player.lang });
      store.setChecking(Number(id), player.checking);
      if (player.output) store.setOutput(Number(id), player.output);
    });
  }, [steps, index]);

  const onIndex = useCallback((value: number) => setChosen(value), []);
  // Nobody touched the code (e.g. both idle until the timeout): the bar would only jump to the end.
  const unchanged = useMemo(
    () => steps?.every((step) => Object.entries(step.players).every(([id, player]) => player.text === steps[0].players[Number(id)]?.text)) ?? false,
    [steps],
  );
  const review = props.current_user.is_admin ? <PlaybookReview gameId={props.game_id} initial={playbook.data?.solutionType ?? null} /> : null;

  const footer = props.has_playbook ? (
    steps && index != null && !unchanged ? (
      <ReplayBar steps={steps} index={index} onIndex={onIndex} extra={review} />
    ) : steps && unchanged ? (
      <div className={classes.replayBar}>
        <Text size="xs" c="dimmed">
          {t('Nobody changed the code during this game, so there is nothing to replay.')}
        </Text>
        {review}
      </div>
    ) : (
      <div className={classes.replayBar}>
        {playbook.isError ? (
          <Text size="xs" c="dimmed">
            {t('The replay of this game is not available')}
          </Text>
        ) : (
          <Loader size="xs" />
        )}
      </div>
    )
  ) : null;

  return (
    <RoomLayout
      game={game}
      api={null}
      history
      liveGame={Boolean(props.is_live)}
      withChat={false}
      footer={footer}
      editable={false}
      allowClipboard={props.can_manage_game}
      canManage={props.can_manage_game}
    />
  );
}

/**
 * Every game page, full-screen without the site header: live battles (and the
 * join / waiting / pass-code screens before them) and finished games with their replay.
 */
export default function GameRoom() {
  const props = useSharedProps<PageProps>();
  const isPlayer = props.game.players.some((player) => player.id === props.current_user.id);

  useMainChannel(isPlayer && !props.is_record ? 'playing' : 'watching');
  useSyncSoundMute();

  // Render from the page props at once; the channel join (live games) then takes over.
  useState(() => useGameStore.getState().load(props.game));
  const game = useGameStore((state) => state.game) ?? props.game;

  // Invites (the header menu, the dialog from player cards) work here as on other pages, but a
  // player mid-game gets no invite toasts: incoming ones only show on the header menu.
  const playing = isPlayer && !props.is_record && !isGameOver(game.state);
  const invites = !props.current_user.is_guest;
  useInvitesChannel(invites, { quiet: playing });

  // Nobody joined: no task or editors to show. Also replaces the waiting room when the creator cancels.
  if (isAbandoned(game)) return <GameCanceled game={game} />;

  return (
    <>
      {props.is_record ? <HistoryRoom props={props} /> : <LiveRoom props={props} />}
      {invites && <InviteDialog />}
    </>
  );
}
