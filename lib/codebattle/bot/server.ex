defmodule Codebattle.Bot.Server do
  @moduledoc """
  Process for playing playbooks of tasks and working with chat
  """
  use GenServer

  alias Codebattle.Bot
  alias Codebattle.Game
  alias Codebattle.Tournament
  alias Codebattle.Tournament.TournamentUserResult
  alias Codebattle.User

  require Logger

  @port Application.compile_env(:codebattle, :ws_port, 4000)

  # Invite players who skipped season tournaments this long, at most once per cooldown.
  @tournament_absence_days 7
  @tournament_invite_cooldown to_timeout(hour: 6)
  @invite_cache :bot_chat_cache

  @type status :: :initial | :playing | :finished
  @type channel :: Bot.Socket.channel() | nil
  @type state :: %{
          required(:state) => status(),
          required(:game) => Game.t(),
          required(:bot_id) => integer(),
          # SERVER
          required(:game_channel) => channel(),
          required(:chat_channel) => channel(),
          required(:playbook_params) => Bot.PlaybookPlayer.Params.t() | nil,
          optional(:locale) => String.t(),
          optional(:opponent_id) => integer() | nil,
          optional(:tournament_invite) => %{tournament_id: integer(), starts_at: DateTime.t()} | nil,
          optional(:said_goodbye) => boolean()
        }

  @spec start_link(%{game: Game.t(), bot_id: integer()}) :: GenServer.on_start()
  def start_link(%{game: game, bot_id: bot_id} = params) do
    GenServer.start_link(__MODULE__, params, name: server_name(game.id, bot_id))
  end

  @impl GenServer
  def init(params) do
    Codebattle.PubSub.subscribe("game:#{params.game.id}")
    send(self(), :after_init)

    {:ok,
     %{
       # :initial | :playing | :finished
       state: :initial,
       game: params.game,
       bot_id: params.bot_id,
       game_channel: nil,
       chat_channel: nil,
       playbook_params: nil,
       locale: default_locale(),
       opponent_id: nil,
       tournament_invite: nil,
       said_goodbye: false
     }}
  end

  @impl GenServer
  def handle_info(:after_init, state) do
    :timer.sleep(1000)
    state = init_socket(state)
    state = init_playbook_player(state)
    state = init_chat_context(state)

    send_init_chat_message(state)

    if not is_nil(state.playbook_params) do
      do_playbook_step(state)
    end

    # TODO: only for loadTests on prod
    # TODO: add gracefully terminate if there is no playbook
    case state.playbook_params do
      nil ->
        Logger.warning("There are no playbook for game: #{state.game.id}")
        {:noreply, %{state | state: :finished}}

      params ->
        Logger.debug("""
        Start bot playbook player for game_id: #{inspect(state.game.id)},
        with playbook_params: #{inspect(Map.delete(params, :steps))}
        """)

        {:noreply, state}
    end
  end

  @impl GenServer
  def handle_info(:next_bot_step, state), do: do_playbook_step(state)

  @impl GenServer
  def handle_info(%{event: "game:finished", payload: %{winner_id: winner_id}}, %{bot_id: bot_id} = state) do
    opponent_won = not is_nil(winner_id) and winner_id != bot_id
    farewell = if opponent_won, do: {:congratulate_opponent, %{game_mode: state.game.mode}}

    # TODO: only for loadTests on prod
    # @impl GenServer
    # def handle_info(%{event: "editor:data"}, state = %{state: :initial}) do
    #   send_start_chat_message(state)
    #   do_playbook_step(state)
    # end

    {:noreply, %{say_goodbye(state, farewell, opponent_won) | state: :finished}}
  end

  @impl GenServer
  def handle_info(%{event: "editor:data"}, state), do: {:noreply, state}

  @impl GenServer
  def handle_info(%{event: "user:give_up"}, state) do
    {:noreply, %{say_goodbye(state, {:advice_on_give_up, %{}}, false) | state: :finished}}
  end

  @impl GenServer
  def handle_info(%{event: "user:check_complete", payload: %{"solution_status" => true}}, state) do
    {:noreply, %{state | state: :finished}}
  end

  @impl GenServer
  def handle_info(%{event: "user:check_complete"}, state), do: {:noreply, state}

  @impl GenServer
  def handle_info(%{event: "chat:user_joined"}, state) do
    # just to skip logs
    {:noreply, state}
  end

  @impl GenServer
  def handle_info(%{event: "chat:user_left"}, state) do
    # just to skip logs
    {:noreply, state}
  end

  @impl GenServer
  def handle_info(%{event: event}, state)
      when event in ["editor:cursor_position", "editor:cursor_selection", "editor:scroll_position"] do
    # just to skip logs
    {:noreply, state}
  end

  @impl GenServer
  def handle_info(event, state) do
    Logger.debug("#{__MODULE__}, unexpected bot server handle_info event: #{inspect(event)}")
    {:noreply, state}
  end

  @spec do_playbook_step(state()) :: {:noreply, state()}
  defp do_playbook_step(%{state: :finished} = state), do: {:noreply, state}

  defp do_playbook_step(state) do
    playbook_params = Bot.PlaybookPlayer.next_step(state.playbook_params)

    case playbook_params do
      %{state: :playing} ->
        {document, lang} = playbook_params.editor_state
        editor_text = Bot.PlaybookPlayer.get_editor_text(document)
        send_game_message(state.game_channel, playbook_params.step_command, {editor_text, lang})
        Process.send_after(self(), :next_bot_step, playbook_params.step_timeout_ms)
        {:noreply, %{state | state: :playing, playbook_params: playbook_params}}

      %{state: :finished} ->
        {:noreply, %{state | state: :finished, playbook_params: playbook_params}}
    end
  end

  @spec init_socket(state()) :: state()
  defp init_socket(state) do
    socket_opts = [
      url: "ws://localhost:#{@port}/ws/websocket?vsn=2.0.0&token=#{bot_token(state.bot_id)}"
    ]

    {:ok, socket} = Bot.Socket.start_link(socket_opts)

    game_topic = "game:#{state.game.id}"

    chat_topic =
      case state.game.tournament_id do
        nil -> "chat:g_#{state.game.id}"
        tournament_id -> "chat:t_#{tournament_id}"
      end

    case {join_channel(socket, game_topic), join_channel(socket, chat_topic)} do
      {{:ok, game_channel}, {:ok, chat_channel}} ->
        Map.merge(state, %{game_channel: game_channel, chat_channel: chat_channel})

      {{:error, reason}, _} ->
        Logger.warning("#{__MODULE__} cannot connect to game: #{inspect(reason)}")
        state

      {_, {:error, reason}} ->
        Logger.warning("#{__MODULE__} cannot connect to chat: #{inspect(reason)}")
        state
    end
  end

  @spec init_playbook_player(state()) :: state()
  defp init_playbook_player(%{game: game, bot_id: bot_id} = state) do
    case Bot.PlaybookPlayer.init(%{game: game, bot_id: bot_id}) do
      {:ok, playbook_params} -> Map.put(state, :playbook_params, playbook_params)
      {:error, _reason} -> state
    end
  end

  defp send_game_message(nil, _type, _editor_params), do: :noop

  defp send_game_message(game_channel, :update_editor, editor_params),
    do: Bot.GameClient.send(game_channel, :update_editor, editor_params)

  defp send_game_message(game_channel, :check_result, editor_params),
    do: Bot.GameClient.send(game_channel, :check_result, editor_params)

  # The opponent's locale for everything the bot says, and a tournament invite when
  # they haven't played a season tournament lately. Tournament games have no bot chat.
  @spec init_chat_context(state()) :: state()
  defp init_chat_context(%{game: %Game{is_tournament: true}} = state), do: state

  defp init_chat_context(%{game: game, bot_id: bot_id} = state) do
    case Enum.find(game.players || [], &(&1.id != bot_id and not &1.is_bot)) do
      %{is_guest: false, id: user_id} ->
        user = User.get(user_id)

        %{
          state
          | locale: (user && user.locale) || default_locale(),
            opponent_id: user_id,
            tournament_invite: tournament_invite(user_id)
        }

      _guest_or_nobody ->
        state
    end
  end

  defp tournament_invite(user_id) do
    since = DateTime.add(DateTime.utc_now(), -@tournament_absence_days, :day)

    with {:ok, nil} <- Cachex.get(@invite_cache, user_id),
         false <- TournamentUserResult.played_season_tournament_since?(user_id, since),
         %Tournament{id: id, starts_at: starts_at} = next <- Tournament.Context.get_next_season_tournament(),
         false <- already_joined?(next, user_id) do
      %{tournament_id: id, starts_at: starts_at}
    else
      _ -> nil
    end
  end

  # Only a live (waiting_participants) tournament takes registrations.
  defp already_joined?(%Tournament{state: "waiting_participants", id: id}, user_id) do
    id |> Tournament.Context.get_tournament_info() |> Tournament.Helpers.player?(user_id)
  end

  defp already_joined?(_tournament, _user_id), do: false

  defp send_init_chat_message(%{playbook_params: nil} = state) do
    send_chat_message(state, :excuse)
  end

  defp send_init_chat_message(state) do
    total_time_min = max(div(state.playbook_params.bot_time_ms || 60_000, 60_000), 1)
    send_chat_message(state, :greet_opponent, %{total_time_min: total_time_min})
  end

  # One closing message per game: the tournament invite when there is one, the usual
  # farewell (if any) otherwise.
  defp say_goodbye(%{said_goodbye: true} = state, _farewell, _opponent_won), do: state

  defp say_goodbye(%{tournament_invite: %{} = invite} = state, _farewell, opponent_won) do
    if state[:opponent_id], do: Cachex.put(@invite_cache, state.opponent_id, true, expire: @tournament_invite_cooldown)
    send_chat_message(state, :invite_to_tournament, Map.put(invite, :opponent_won, opponent_won))
    Map.put(state, :said_goodbye, true)
  end

  defp say_goodbye(state, nil, _opponent_won), do: Map.put(state, :said_goodbye, true)

  defp say_goodbye(state, {type, params}, _opponent_won) do
    send_chat_message(state, type, params)
    Map.put(state, :said_goodbye, true)
  end

  defp send_chat_message(state, type, params \\ %{})
  defp send_chat_message(%{chat_channel: nil}, _type, _params), do: :noop
  defp send_chat_message(%{game: %Game{is_tournament: true}}, _type, _params), do: :noop

  defp send_chat_message(%{chat_channel: chat_channel} = state, type, params) do
    Bot.ChatClient.send(chat_channel, type, Map.get(state, :locale, default_locale()), params)
  end

  defp default_locale, do: Application.get_env(:codebattle, :default_locale, "en")

  defp server_name(game_id, bot_id) do
    {:via, Registry, {Codebattle.Registry, "bot:#{game_id}_#{bot_id}"}}
  end

  defp bot_token(bot_id) do
    bot = User.get!(bot_id)
    {:ok, token} = Codebattle.UserSession.create_socket_token(bot, %{user_agent: "Codebattle bot"})
    token
  end

  defp join_channel(socket, topic), do: do_join_channel(socket, topic, 0)

  defp do_join_channel(_socket, _topic, 7), do: {:error, :to_many_attempts}

  defp do_join_channel(socket, topic, n) do
    case Bot.Socket.join(socket, topic) do
      {:ok, _response, pid} ->
        {:ok, pid}

      _ ->
        :timer.sleep(1000)
        Logger.warning("#{__MODULE__} cannot connect to #{topic}, #{n} attempt")
        do_join_channel(socket, topic, n + 1)
    end
  end
end
