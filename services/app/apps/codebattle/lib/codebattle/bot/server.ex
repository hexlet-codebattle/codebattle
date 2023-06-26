defmodule Codebattle.Bot.Server do
  @moduledoc """
  Process for playing playbooks of tasks and working with chat
  """
  use GenServer

  require Logger

  alias Codebattle.Bot
  alias Codebattle.Game

  @port Application.compile_env(:codebattle, :ws_port, 4000)

  @spec start_link(%{game: Game.t(), bot_id: integer()}) :: GenServer.on_start()
  def start_link(params = %{game: game, bot_id: bot_id}) do
    GenServer.start_link(__MODULE__, params, name: server_name(game.id, bot_id))
  end

  # SERVER

  @impl GenServer
  def init(params) do
    send(self(), :after_init)

    {:ok,
     %{
       # :initial | :playing | :finished
       state: :initial,
       game: params.game,
       bot_id: params.bot_id,
       game_channel: nil,
       chat_channel: nil,
       playbook_params: nil
     }}
  end

  @impl GenServer
  def handle_info(:after_init, state) do
    :timer.sleep(1000)
    state = init_socket(state)
    state = init_playbook_player(state)

    send_init_chat_message(state)
    prepare_to_commenting_code()

    # TODO: add gracefully terminate if there is no playbook
    case state.playbook_params do
      nil ->
        Logger.warning("There are no playbook for game: #{state.game.id}")
        {:noreply, %{state | state: :finished}}

      params ->
        Logger.debug("""
        Start bot playbook player for game_id: #{inspect(state.game.id)},
        with playbook_params: #{inspect(Map.drop(params, [:actions]))}
        """)

        {:noreply, state}
    end
  end

  @impl GenServer
  def handle_info(:next_bot_step, state), do: do_playbook_step(state)

  @impl GenServer
  def handle_info(%{event: "editor:data"}, state = %{state: :initial}) do
    send_start_chat_message(state)
    do_playbook_step(state)
  end

  @impl GenServer
  def handle_info(%{event: "editor:data"}, state), do: {:noreply, state}

  @impl GenServer
  def handle_info(%{event: "user:give_up"}, state) do
    send_chat_message(state, :advice_on_give_up)

    {:noreply, %{state | state: :finished}}
  end

  @impl GenServer
  def handle_info(%{event: "user:check_complete", payload: %{"solution_status" => true}}, state) do
    send_chat_message(state, :advice_on_win)

    {:noreply, state}
  end

  @impl GenServer
  def handle_info(
        %{event: "user:check_complete", payload: %{"check_result" => %{"status" => "ok"}}},
        state
      ) do
    send_chat_message(state, :advice_on_check_complete_success)

    {:noreply, state}
  end

  @impl GenServer
  def handle_info(%{event: "user:check_complete"}, state) do
    send_chat_message(state, :advice_on_check_complete_failure)

    {:noreply, state}
  end

  @impl GenServer
  def handle_info(:say_about_code, state) do
    send_message_about_code(state)
    Process.send_after(self(), :say_about_code, :timer.minutes(Enum.random(7..10)))

    {:noreply, state}
  end

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
  def handle_info(event, state) do
    Logger.debug("#{__MODULE__}, unexpected bot server handle_info event: #{inspect(event)}")
    {:noreply, state}
  end

  defp do_playbook_step(state = %{state: :finished}), do: {:noreply, state}

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

  defp init_socket(state) do
    socket_opts = [
      url: "ws://localhost:#{@port}/ws/websocket?vsn=2.0.0&token=#{bot_token(state.bot_id)}"
    ]

    {:ok, socket} = PhoenixClient.Socket.start_link(socket_opts)

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

  defp init_playbook_player(state) do
    case Bot.PlaybookPlayer.init(state.game) do
      {:ok, playbook_params} -> Map.put(state, :playbook_params, playbook_params)
      {:error, :no_playbook} -> state
    end
  end

  defp send_game_message(nil, _type, _editor_params), do: :noop
  defp send_game_message(_game_channel, _type, {nil, _lang}), do: :noop

  defp send_game_message(game_channel, :update_editor, editor_params),
    do: Bot.GameClient.send(game_channel, :update_editor, editor_params)

  defp send_game_message(game_channel, :check_result, editor_params),
    do: Bot.GameClient.send(game_channel, :check_result, editor_params)

  defp send_init_chat_message(state = %{playbook_params: nil}) do
    send_chat_message(state, :excuse)
  end

  defp send_init_chat_message(state) do
    send_chat_message(state, :greet_opponent)
  end

  defp send_start_chat_message(state) do
    total_time_min = div(state.playbook_params.bot_time_ms, 60_000)
    send_chat_message(state, :start_code, %{total_time_min: total_time_min})
  end

  defp send_message_about_code(state) do
    send_chat_message(state, :say_about_code)
  end

  defp send_chat_message(state, type, params \\ %{})
  defp send_chat_message(%{chat_channel: nil}, _type, _params), do: :noop
  defp send_chat_message(%{game: %Game{is_tournament: true}}, _type, _params), do: :noop

  defp send_chat_message(%{chat_channel: chat_channel}, type, params) do
    Bot.ChatClient.send(chat_channel, type, params)
  end

  defp server_name(game_id, bot_id) do
    {:via, Registry, {Codebattle.Registry, "bot:#{game_id}:#{bot_id}"}}
  end

  defp bot_token(bot_id) do
    Phoenix.Token.sign(%Phoenix.Socket{endpoint: CodebattleWeb.Endpoint}, "user_token", bot_id)
  end

  defp join_channel(socket, topic), do: do_join_channel(socket, topic, 0)

  defp do_join_channel(_socket, _topic, 7), do: {:error, :to_many_attempts}

  defp do_join_channel(socket, topic, n) do
    case PhoenixClient.Channel.join(socket, topic) do
      {:ok, _response, pid} ->
        {:ok, pid}

      _ ->
        :timer.sleep(1000)
        Logger.warning("#{__MODULE__} cannot connect to #{topic}, #{n} attempt")
        do_join_channel(socket, topic, n + 1)
    end
  end

  defp prepare_to_commenting_code() do
    Process.send_after(self(), :say_about_code, :timer.minutes(1))
  end
end
