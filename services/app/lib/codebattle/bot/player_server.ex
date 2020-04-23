defmodule Codebattle.Bot.PlayerServer do
  @moduledoc """
  Process for playing playbooks of tasks and working with chat
  """
  use GenServer

  require Logger

  alias Codebattle.Bot.{ChatClient, PlaybookPlayer}
  alias PhoenixClient.Message

  @timeout_start_playbook Application.get_env(:codebattle, Codebattle.Bot)[
                            :timeout_start_playbook
                          ]

  def start_link(%{game_id: game_id, bot_id: bot_id} = params) do
    GenServer.start(__MODULE__, params, name: server_name(game_id, bot_id))
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
        is_playbook_running: false,
        playbook_params: %{},
        chat_params: %{
          messages: [:hello, :announce, :about_code]
        }
      })

    send(self(), :after_init)

    {:ok, state}
  end

  def handle_info(:after_init, state) do
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

        Process.send_after(self(), :send_message, 500)
        Process.send_after(self(), :init_playbook, @timeout_start_playbook)

        {:noreply, new_state}

      # TODO: add more pretty error handling
      {{:error, reason}, _} ->
        Logger.error(reason)
        {:error, reason}
        {:noreply, state}

      {_, {:error, reason}} ->
        Logger.error(reason)
        {:error, reason}
        {:noreply, state}
    end
  end

  def handle_info(:init_playbook, state) do
    case PlaybookPlayer.call(state) do
      :no_playbook ->
        ChatClient.say_some_excuse(state.chat_channel)
        {:noreply, state}

      playbook_params ->
        send(self(), :update_solution)
        new_state = Map.put(state, :playbook_params, playbook_params)

        {:noreply, new_state}
    end
  end

  def handle_info(:send_message, state) do
    messages = state.chat_params.messages

    case ChatClient.call(messages, state) do
      {new_messages, timeout} ->
        Process.send_after(self(), :send_message, timeout)
        new_state = update_messages(state, new_messages)

        {:noreply, new_state}

      :stop ->
        {:noreply, state}
    end
  end

  def handle_info(:update_solution, %{is_playbook_running: false} = state) do
    Process.send_after(self(), :update_solution, 300)
    {:noreply, state}
  end

  def handle_info(:update_solution, state) do
    case PlaybookPlayer.update_solution(state) do
      {new_playbook_params, timeout} ->
        Process.send_after(self(), :update_solution, timeout)
        new_state = Map.put(state, :playbook_params, new_playbook_params)

        {:noreply, new_state}

      :stop ->
        {:noreply, state}
    end
  end

  def handle_info(%Message{event: "editor:data"}, %{is_playbook_running: false} = state) do
    Logger.error("Bot start codding")
    {:noreply, Map.put(state, :is_playbook_running, true)}
  end

  def handle_info(message, state) do
    Logger.info(inspect(message))
    {:noreply, state}
  end

  def update_messages(state, messages) do
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
