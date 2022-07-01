defmodule Codebattle.Bot.Server do
  @moduledoc """
  Process for playing playbooks of tasks and working with chat
  """
  use GenServer

  require Logger

  alias Codebattle.Bot
  alias Codebattle.Game
  alias PhoenixClient.Message

  @port Application.compile_env(:codebattle, :ws_port, 4000)

  @spec start_link(%{game: Game.t(), bot_id: integer()}) :: GenServer.on_start()
  def start_link(%{game: game, bot_id: bot_id} = params) do
    GenServer.start_link(__MODULE__, params, name: server_name(game.id, bot_id))
  end

  # SERVER

  @impl GenServer
  def init(params) do
    send(self(), :after_init)

    {:ok,
     %{
       # :initial | :playing | :stop
       state: :initial,
       game: params.game,
       bot_id: params.bot_id,
       game_channel: nil,
       chat_channel: nil,
       playbook_params: nil
     }}
  end

  def handle_info(:after_init, state) do
    state = init_socket(state)
    state = init_playbook_player(state)
    send_init_chat_message(state)
    # TODO: add gracefully terminate if there is no playbook

    Logger.error("""
    Start bot playbook player for game_id: #{inspect(state.game.id)},
    with playbook_params: #{inspect(Map.drop(state.playbook_params, [:actions]))}
    """)

    {:noreply, state}
  end

  def handle_info(event = %{event: "editor:data"}, state = %{playbook_params: {}}) do
    {:noreply, state}
  end

  def handle_info(%{event: "editor:data"}, state = %{state: :initial}),
    do: do_playbook_step(state)

  def handle_info(:next_bot_step, state), do: do_playbook_step(state)

  defp do_playbook_step(state) do
    playbook_params = Bot.PlaybookPlayer.next_step(state.playbook_params)
    {document, lang} = playbook_params.editor_state
    editor_text = Bot.PlaybookPlayer.get_editor_text(document)
    send_game_message(state.game_channel, playbook_params.step_command, {editor_text, lang})
    Process.send_after(self(), :next_bot_step, playbook_params.step_timeout_ms)
    {:noreply, %{state | state: :playing, playbook_params: playbook_params}}
  end

  # def playing(:info, :update_solution, state) do
  #   case PlaybookPlayer.update_solution(state) do
  #     {new_playbook_params, timeout} ->
  #       Process.send_after(self(), :update_solution, timeout)
  #       new_state = Map.put(state, :playbook_params, new_playbook_params)

  #       {:keep_state, new_state}

  #     :stop ->
  #       {:next_state, :stop, state}
  #   end
  # end

  # def playing(:info, %Message{event: "user:check_complete", payload: payload}, state) do
  #   case payload do
  #     %{"solution_status" => true} ->
  #       send_chat_message(state, :send_congrats)
  #       {:next_state, :stop, state}

  #     _ ->
  #       {:keep_state, state}
  #   end
  # end

  # def handle_info(:info, %Message{event: "user:give_up"}, state) do
  #   send_chat_message(state, :send_advice)
  #   {:keep_state, state}
  # end

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
        Logger.error("#{__MODULE__} cannot connect to game: #{inspect(reason)}")
        state

      {_, {:error, reason}} ->
        Logger.error("#{__MODULE__} cannot connect to chat: #{inspect(reason)}")
        state
    end
  end

  defp init_playbook_player(state) do
    case Bot.PlaybookPlayer.init(state.game) do
      {:ok, playbook_params} -> new_state = Map.put(state, :playbook_params, playbook_params)
      {:error, :no_playbook} -> state
    end
  end

  def handle_info(event = %{event: "chat:new_msg", payload: payload}, state) do
    Logger.error("#{inspect(payload)} payload")
    {:noreply, state}
  end

  def handle_info(event, state) do
    Logger.error("#{__MODULE__}, unexpected event: #{inspect(event)}")
    {:noreply, state}
  end

  defp send_game_message(nil, _type, _editor_params), do: :noop
  defp send_game_message(_game_channel, _type, {nil, _lang}), do: :noop

  defp send_game_message(game_channel, :update_editor, editor_params),
    do: Bot.GameClient.send(game_channel, :update_editor, editor_params)

  defp send_game_message(game_channel, :check_result, editor_params),
    do: Bot.GameClient.send(game_channel, :check_result, editor_params)

  defp send_init_chat_message(state = %{playbook_params: %{}}),
    do: send_chat_message(state, :excuse)

  defp send_init_chat_message(state),
    do: send_chat_message(state, :greet_opponent)

  defp send_chat_message(%{chat_channel: nil}, _type), do: :noop
  defp send_chat_message(%{game: %Game{is_tournament: true}}, _type), do: :noop

  defp send_chat_message(%{chat_channel: chat_channel}, type),
    do: Bot.ChatClient.send(chat_channel, type)

  defp server_name(game_id, bot_id),
    do: {:via, Registry, {Codebattle.Registry, "bot:#{game_id}:#{bot_id}"}}

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
        :timer.sleep(237)
        Logger.error("#{__MODULE__} cannot connect to #{topic}, #{n} attempt")
        do_join_channel(socket, topic, n + 1)
    end
  end
end
