defmodule Codebattle.UsersRankUpdateServer do
  @moduledoc "Gen server for collect actions from users"

  use GenServer

  require Logger

  @timeout :timer.minutes(15)

  # API
  def start_link(_) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def update() do
    GenServer.cast(__MODULE__, :update)
  end

  # SERVER
  def init(_) do
    Process.send_after(self(), :work, @timeout)

    Codebattle.PubSub.subscribe("main")
    Codebattle.PubSub.subscribe("games")
    Logger.info("Start UsersRankServer")
    {:ok, true}
  end

  def handle_cast(:update, state) do
    do_work()
    {:noreply, state}
  end

  def handle_info(:work, state) do
    do_work()
    Process.send_after(self(), :work, @timeout)
    {:noreply, state}
  end

  def handle_info(%{event: "game:finished"}, state) do
    do_work()
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}

  defp do_work do
    Codebattle.User.RankUpdate.call()
    Logger.info("Rank has been recalculated")
  end
end
