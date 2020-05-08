defmodule Codebattle.Bot.PlayerServer do
  @moduledoc """
  Process for playing playbooks of tasks and working with chat
  """
  use GenStateMachine, callback_mode: :state_functions

  require Logger

  alias Codebattle.Bot.{ChatClient, PlaybookPlayer}
  alias PhoenixClient.Message

  @timeout_start_playbook Application.get_env(:codebattle, Codebattle.Bot)[
                            :timeout_start_playbook
                          ]

  def start_link(%{game_id: game_id, bot_id: bot_id} = params) do
    GenStateMachine.start(__MODULE__, params, name: server_name(game_id, bot_id))
  end

  # SERVER

  def init(params) do
    Logger.info(
      "Start bot player server for game_id: #{inspect(params.game_id)}, and bot_id: #{
        inspect(params.bot_id)
      }"
    )

    state =
      Map.merge(params, %{
        playbook_params: %{},
        chat_params: %{
          messages: [:hello, :announce, :about_code]
        }
      })

    send(self(), :after_init)

    {:ok, :initial, state}
  end

  def initial(:info, :after_init, state) do
    port = Application.get_env(:codebattle, :ws_port, 4000)

    socket_opts = [
      url: "ws://localhost:#{port}/ws/websocket?vsn=2.0.0&token=#{bot_token(state.bot_id)}"
    ]

    {:ok, socket} = PhoenixClient.Socket.start_link(socket_opts)

    game_topic = "game:#{state.game_id}"
    chat_topic = "chat:#{state.game_id}"
    :timer.sleep(1_500)
    game_channel_data = PhoenixClient.Channel.join(socket, game_topic)
    chat_channel_data = PhoenixClient.Channel.join(socket, chat_topic)

    case {game_channel_data, chat_channel_data} do
      {{:ok, game_state, game_channel}, {:ok, chat_state, chat_channel}} ->
        new_state =
          Map.merge(state, %{
            game_channel: game_channel,
            chat_channel: chat_channel,
            game_state: game_state,
            chat_state: chat_state
          })

        Process.send_after(self(), :send_hello_message, 500)
        Process.send_after(self(), :send_message, 500)
        Process.send_after(self(), :init_playbook, @timeout_start_playbook)

        {:keep_state, new_state}

      # TODO: add more pretty error handling
      {{:error, reason}, _} ->
        Logger.error(reason)
        {:error, reason}
        {:keep_state, state}

      {_, {:error, reason}} ->
        Logger.error(reason)
        {:error, reason}
        {:keep_state, state}
    end
  end

  def initial(:info, :init_playbook, state) do
    case PlaybookPlayer.call(state) do
      :no_playbook ->
        ChatClient.say_some_excuse(state.chat_channel)
        {:next_state, :stop, state}

      playbook_params ->
        send(self(), :update_solution)
        new_state = Map.put(state, :playbook_params, playbook_params)

        {:next_state, :ready_to_play, new_state}
    end
  end

  def initial(:info, :send_hello_message, state) do
    handle_event(:info, :send_message, state)
  end

  def initial(:info, :send_message, state) do
    Logger.info("init state state_message")
    Process.send_after(self(), :send_message, 300)
    {:keep_state, state}
  end

  def initial(event_type, payload, state) do
    handle_event(event_type, payload, state)
  end

  def ready_to_play(:info, :update_solution, state) do
    Process.send_after(self(), :update_solution, 300)
    {:keep_state, state}
  end

  def ready_to_play(:info, %Message{event: "editor:data"}, state) do
    Logger.error("Bot start codding")
    {:next_state, :playing, state}
  end

  def ready_to_play(:info, :send_message, state) do
    Process.send_after(self(), :send_message, 300)
    {:keep_state, state}
  end

  def ready_to_play(event_type, payload, state) do
    handle_event(event_type, payload, state)
  end

  def playing(:info, :update_solution, state) do
    case PlaybookPlayer.update_solution(state) do
      {new_playbook_params, timeout} ->
        Process.send_after(self(), :update_solution, timeout)
        new_state = Map.put(state, :playbook_params, new_playbook_params)

        {:keep_state, new_state}

      :stop ->
        {:next_state, :stop, state}
    end
  end

  def playing(:info, :send_message, state) do
    handle_event(:info, :send_message, state)
  end

  def playing(:info, %Message{event: "user:check_complete", payload: payload}, state) do
    case payload do
      %{"solution_status" => true} ->
        Logger.error("Bot ending codding")
        ChatClient.send_congrats(state.chat_channel)
        {:next_state, :stop, state}

      _ ->
        {:keep_state, state}
    end
  end

  def playing(event_type, payload, state) do
    handle_event(event_type, payload, state)
  end

  def stop(event_type, payload, state) do
    handle_event(event_type, payload, state)
  end

  def handle_event(:info, :send_message, state) do
    messages = state.chat_params.messages
    case ChatClient.call(messages, state) do
      {new_messages, timeout} ->
        Process.send_after(self(), :send_message, timeout)
        new_state = update_messages(state, new_messages)

        {:keep_state, new_state}

      :stop ->
        {:keep_state, state}
    end
  end

  def handle_event(event_type, payload, state) do
    Logger.info("#{event_type} state")
    Logger.info(inspect(payload))
    case payload do
      %Message{event: "user:give_up", payload: %{"need_advice" => true}} ->
        ChatClient.send_advice(state.chat_channel)
        {:keep_state, state}
        _ ->
        {:keep_state, state}
    end
  end

  defp update_messages(state, messages) do
    new_chat_params = Map.put(state.chat_params, :messages, messages)
    Map.put(state, :chat_params, new_chat_params)
  end

  defp server_name(game_id, bot_id) do
    {:via, :gproc, game_key(game_id, bot_id)}
  end

  defp game_key(game_id, bot_id) do
    {:n, :l, {:bot_player, "#{game_id}__#{bot_id}"}}
  end

  defp bot_token(bot_id) do
    Phoenix.Token.sign(%Phoenix.Socket{endpoint: CodebattleWeb.Endpoint}, "user_token", bot_id)
  end
end
