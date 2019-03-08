defmodule Codebattle.Bot.PlaybookAsyncRunner do
  @moduledoc """
  Process for playing playbooks of tasks
  """
  use GenServer

  require Logger

  alias Codebattle.Bot.{Builder, Playbook}
  alias Codebattle.GameProcess.Play

  @timeout Application.get_env(:codebattle, Codebattle.Bot)[:timeout]

  # API
  def start(%{game_id: game_id}) do
    try do
      GenServer.start(__MODULE__, %{game_id: game_id}, name: server_name(game_id))
    rescue
      e in FunctionClauseError ->
        e
        Logger.error(inspect(e))
    end
  end

  def call(params) do
    GenServer.cast(server_name(params.game_id), {:run, params})
  end

  # SERVER

  def init(params) do
    Logger.info("Start bot palyer server for game_id: #{inspect(params.game_id)}")
    {:ok, params}
  end

  def handle_cast({:run, params}, state) do
    port = CodebattleWeb.Endpoint.struct_url().port

    schema =
      case port do
        # dev
        4000 ->
          "wss"

        # test
        4001 ->
          "ws"

        # prod
        _ ->
          "ws"
      end

    socket_opts = [url: "#{schema}://localhost:#{port}/ws/websocket?vsn=2.0.0&token=#{bot_token}"]
    {:ok, socket} = PhoenixClient.Socket.start_link(socket_opts)

    game_topic = "game:#{params.game_id}"
    :timer.sleep(400)
    {:ok, _response, channel} = PhoenixClient.Channel.join(socket, game_topic)
    new_params = Map.merge(params, %{channel: channel})
    Codebattle.Bot.PlaybookPlayerRunner.call(new_params)

    {:noreply, state}
  end

  # HELPERS

  defp server_name(game_id) do
    {:via, :gproc, game_key(game_id)}
  end

  defp game_key(game_id) do
    {:n, :l, {:bot_player, "#{game_id}"}}
  end

  defp bot_token do
    Phoenix.Token.sign(%Phoenix.Socket{endpoint: CodebattleWeb.Endpoint}, "user_token", "bot")
  end
end
