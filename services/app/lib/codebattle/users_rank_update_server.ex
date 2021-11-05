defmodule Codebattle.UsersRankUpdateServer do
  @moduledoc "Gen server for collect actions from users"

  use GenServer

  require Logger

  # API
  def start_link(_) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def update() do
    GenServer.cast(__MODULE__, :update)
  end

  # SERVER
  def init(_) do
    Codebattle.PubSub.subscribe("main")
    Logger.info("Start UsersRankServer")
    {:ok, true}
  end

  def handle_cast(:update, state) do
    Codebattle.RankUpdate.call()
    Logger.info("Rank has been recalculated")

    {:noreply, state}
  end
end
