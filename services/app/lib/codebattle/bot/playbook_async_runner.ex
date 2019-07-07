defmodule Codebattle.Bot.PlaybookAsyncRunner do
  @moduledoc """
  Process for playing playbooks of tasks
  """
  use GenServer

  require Logger

  alias Codebattle.Bot.Playbook
  alias Codebattle.GameProcess.Play

  # API
  # Starts GenServer for bot for every game. When GenServer receives :run, bot starts play
  def create_server(%{game_id: game_id, bot: bot}) do
    try do
      GenServer.start(__MODULE__, %{game_id: game_id, bot: bot}, name: server_name(game_id))
    rescue
      e in FunctionClauseError ->
        e
        Logger.error(inspect(e))
    end
  end

  # Bot strats play and chat
  def run!(params) do
    GenServer.cast(server_name(params.game_id), {:run, params})
  end

  # SERVER

  def init(params) do
    Logger.info("Start bot palyer server for game_id: #{inspect(params.game_id)}")
    {:ok, params}
  end

  def handle_cast({:run, params}, state) do
    port = CodebattleWeb.Endpoint.struct_url().port

    # TODO: FIXME move to config
    {schema, new_port} =
      case port do
        # dev
        4000 ->
          {"wss", port}

        # test
        4001 ->
          {"ws", port}

        # prod
        _ ->
          {"ws", 8080}
      end

    socket_opts = [
      url:
        "#{schema}://localhost:#{new_port}/ws/websocket?vsn=2.0.0&token=#{bot_token(state.bot.id)}"
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

        Task.async(fn -> Codebattle.Bot.PlaybookPlayerRunner.call(new_params) end)
        Task.async(fn -> Codebattle.Bot.ChatClientRunner.call(new_params) end)

      {{:error, reason}, _} ->
        {:error, reason}

      {_, {:error, reason}} ->
        {:error, reason}
    end

    {:noreply, state}
  end

  # HELPERS

  def handle_info(message, state) do
    {:noreply, state}
  end

  defp server_name(game_id) do
    {:via, :gproc, game_key(game_id)}
  end

  defp game_key(game_id) do
    {:n, :l, {:bot_player, "#{game_id}"}}
  end

  defp bot_token(bot_id) do
    Phoenix.Token.sign(%Phoenix.Socket{endpoint: CodebattleWeb.Endpoint}, "user_token", bot_id)
  end
end
