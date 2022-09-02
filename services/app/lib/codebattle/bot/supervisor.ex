
defmodule Codebattle.Bot.Supervisor do
  @moduledoc false

  use Supervisor

  require Logger

  def start_link(game_id) do
    Supervisor.start_link(__MODULE__, game_id, name: supervisor_name(game_id))
  end

  @impl Supervisor
  def init(game_id) do
    Logger.info("Start bot supervisor for game_id: #{game_id}")
    Supervisor.init([], strategy: :one_for_one)
  end

  defp supervisor_name(game_id),
    do: {:via, Registry, {Codebattle.Registry, "bot_sup:#{game_id}"}}
end
