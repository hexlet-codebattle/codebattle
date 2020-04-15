defmodule Codebattle.Bot.PlayersSupervisor do
  @moduledoc false

  require Logger

  use DynamicSupervisor

  alias Codebattle.Bot.PlayerServer

  def start_link(game_id) do
    DynamicSupervisor.start_link(__MODULE__, %{game_id: game_id}, name: supervisor_name(game_id))
  end

  def create_player(params) do
    spec = {PlayerServer, params}
    DynamicSupervisor.start_child(supervisor_name(params.game_id), spec)
  end

  @impl true
  def init(%{game_id: game_id}) do
    Logger.info("Create PlayersSupervisor for game_id #{game_id}")
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  defp supervisor_name(game_id) do
    {:via, :gproc, game_key(game_id)}
  end

  defp game_key(game_id) do
    {:n, :l, {:bot_players, "#{game_id}"}}
  end
end
