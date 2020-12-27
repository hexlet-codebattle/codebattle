defmodule Codebattle.Bot.PlayerServer do
  @moduledoc """
  Process for playing playbooks of tasks and working with chat
  """
  use GenStateMachine, callback_mode: :state_functions

  require Logger

  alias Codebattle.Bot.{ChatClient, PlaybookPlayer}
  alias Codebattle.GameProcess.FsmHelpers
  alias Codebattle.GameProcess.Play
  alias PhoenixClient.Message

  @timeout_start_playbook Application.compile_env(:codebattle, Codebattle.Bot)[
                            :timeout_start_playbook
                          ]
  @prep_time Application.compile_env(:codebattle, Codebattle.Bot)[:prep_time]

  def start_link(%{game_id: game_id, bot_id: bot_id} = params) do
    GenStateMachine.start(__MODULE__, params, name: server_name(game_id, bot_id))
  end

  # SERVER

  def init(params) do
    params.game_type

    Logger.info(
      "Start bot player server for game_id: #{inspect(params.game_id)}, and bot_id: #{
        inspect(params.bot_id)
      }"
    )

    state =
      Map.merge(params, %{
        playbook_params: %{},
        chat_params: %{
          messages: get_messages(params)
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

    {:ok, fsm} = Play.get_fsm(state.game_id)

    chat_topic =
      case FsmHelpers.get_tournament_id(fsm) do
        nil -> "chat:g_#{state.game_id}"
        tournament_id -> "chat:t_#{tournament_id}"
      end

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

        Process.send_after(self(), :send_hello_message, 100)
        Process.send_after(self(), :init_playbook, @timeout_start_playbook)
        Process.send_after(self(), :prep_time_is_over, @prep_time)

        {:keep_state, new_state}

      # TODO: add more pretty error handling
      {{:error, reason}, _} ->
        Logger.error("#{inspect(reason)}")
        {:keep_state, state}

      {_, {:error, reason}} ->
        Logger.error("#{inspect(reason)}")
        {:keep_state, state}
    end
  end

  def initial(:info, :init_playbook, state) do
    handle_event(:info, {:init_playbook, :ready_to_play}, state)
  end

  def initial(:info, %Message{event: "editor:data"}, state) do
    {:next_state, :playing, state}
  end

  def initial(:info, :send_hello_message, state) do
    handle_event(:info, :send, state)
  end

  def initial(:info, :send_message, state) do
    handle_event(:info, :keep_sending_message, state)
  end

  def initial(event_type, payload, state) do
    handle_event(event_type, payload, state)
  end

  def ready_to_play(:info, :update_solution, state) do
    Process.send_after(self(), :update_solution, 300)
    {:keep_state, state}
  end

  def ready_to_play(:info, %Message{event: "editor:data"}, state) do
    {:next_state, :playing, state}
  end

  def ready_to_play(:info, :prep_time_is_over, state) do
    {:next_state, :playing, state}
  end

  def ready_to_play(:info, :send_message, state) do
    handle_event(:info, :keep_sending_message, state)
  end

  def ready_to_play(event_type, payload, state) do
    handle_event(event_type, payload, state)
  end

  def playing(:info, :init_playbook, state) do
    handle_event(:info, {:init_playbook, :playing}, state)
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
    handle_event(:info, :send, state)
  end

  def playing(:info, %Message{event: "user:check_complete", payload: payload}, state) do
    case payload do
      %{"solution_status" => true} ->
        send_chat_message(state, :send_congrats)
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

  def handle_event(:info, {:init_playbook, next_state}, state) do
    case PlaybookPlayer.call(state) do
      :no_playbook ->
        send_chat_message(state, :say_some_excuse)
        {:next_state, :stop, state}

      playbook_params ->
        send(self(), :update_solution)
        new_state = Map.put(state, :playbook_params, playbook_params)

        {:next_state, next_state, new_state}
    end
  end

  def handle_event(:info, :send, state) do
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

  def handle_event(:info, %Message{event: "user:give_up"}, state) do
    send_chat_message(state, :send_advice)
    {:keep_state, state}
  end

  def handle_event(:info, :keep_sending_message, state) do
    Process.send_after(self(), :send_message, 60 * 1000)
    {:keep_state, state}
  end

  def handle_event(event_type, payload, state) do
    Logger.info("#{event_type} state")
    Logger.info(inspect(payload))
    {:keep_state, state}
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

  defp send_chat_message(%{game_type: "tournament"}, _type), do: nil
  defp send_chat_message(state, type), do: apply(ChatClient, type, [state])

  defp get_messages(%{game_type: "tournament"}), do: []
  defp get_messages(%{game_type: "training"}), do: [:hello]
  defp get_messages(_), do: [:hello, :announce, :about_code]
end
