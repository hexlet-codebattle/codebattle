defmodule Codebattle.Bot.Server do
  @moduledoc """
  Process for playing playbooks of tasks
  """
  use GenServer

  require Logger

  alias Codebattle.Bot.{ChatClient, PlaybookPlayer}

  @timeout_start_playbook Application.get_env(:codebattle, Codebattle.Bot.Server)[:timeout_start_playbook]

  # API
  # Starts GenServer for bot for every game. When GenServer receives :run, bot starts play
  def start_link(game_id) do
    GenServer.start(__MODULE__, %{game_id: game_id},
      name: server_name(game_id)
    )
  end

  def ping(game_id) do
    GenServer.call(server_name(game_id), :ping)
  end

  # Bot strats play and chat
  def run!(params) do
    GenServer.cast(server_name(params.game_id), {:run, params})
  end

  # SERVER

  def init(params) do
    Logger.info("Start bot palyer server for game_id: #{inspect(params.game_id)}")
    {:ok, %{}}
  end

  def handle_call(:ping, _from, state), do:
    {:reply, state, state}

  def handle_cast({:run, params}, state) do
    port = Application.get_env(:codebattle, :ws_port, 4000)

    socket_opts = [
      url: "ws://localhost:#{port}/ws/websocket?vsn=2.0.0&token=#{bot_token(params.bot_id)}"
    ]

    {:ok, socket} = PhoenixClient.Socket.start_link(socket_opts)

    game_topic = "game:#{params.game_id}"
    chat_topic = "chat:#{params.game_id}"
    :timer.sleep(5_000)
    game_channel_data = PhoenixClient.Channel.join(socket, game_topic)
    chat_channel_data = PhoenixClient.Channel.join(socket, chat_topic)

    case {game_channel_data, chat_channel_data} do
      {{:ok, game_state, game_channel}, {:ok, chat_state, chat_channel}} ->
        new_params =
          Map.merge(params, %{
            game_channel: game_channel,
            chat_channel: chat_channel,
            game_state: game_state,
            chat_state: chat_state
          })

        Process.send_after(self(), {:send_message, :hello, new_params}, 500)
        Process.send_after(self(), {:init_playbook, new_params}, @timeout_start_playbook)
      {{:error, reason}, _} ->
        {:error, reason}

      {_, {:error, reason}} ->
        {:error, reason}
    end

    {:noreply, state}
  end


  def handle_info({:init_playbook, opts}, state) do
    IO.inspect("Init playbook runner")
    case PlaybookPlayer.call(opts) do
      :no_playbook ->
        ChatClient.say_some_excuse(opts.chat_channel)
      payload ->
        send(self(), {:update_solution, payload})
    end

    {:noreply, state}
  end

  def handle_info({:send_message, type, opts}, state) do
    case ChatClient.call(type, opts) do
      {next_type, timeout} ->
        IO.inspect("Send message after #{timeout} ms")
        Process.send_after(self(), {:send_message, next_type, opts}, timeout)
      :stop -> nil
    end

    {:noreply, state}
  end

  def handle_info({:update_solution, payload}, state) do
    {editor_state, playbook, opts} = payload
    case PlaybookPlayer.update_solution(editor_state, playbook, opts) do
      {new_editor_state, new_playbook, timeout} ->
        IO.inspect("Update playbook after #{timeout} ms")
        new_payload = {new_editor_state, new_playbook, opts}
        Process.send_after(self(), {:update_solution, new_payload}, timeout)
      :stop -> nil
    end

    {:noreply, state}
  end

  # HELPERS

  def handle_info(_message, state) do
    {:noreply, state}
  end


  defp server_name(game_id) do
    {:via, :gproc, game_key(game_id)}
  end

  defp game_key(game_id) do
    {:n, :l, {:bot, "#{game_id}"}}
  end

  defp bot_token(bot_id) do
    Phoenix.Token.sign(%Phoenix.Socket{endpoint: CodebattleWeb.Endpoint}, "user_token", bot_id)
  end
end
