defmodule Codebattle.UsersRankUpdateServer do
  @moduledoc "Gen server for collect actions from users"

  use GenServer

  require Logger

  @timeout to_timeout(minute: 57)

  # API
  def start_link(_) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def update do
    GenServer.cast(__MODULE__, :update)
  end

  # SERVER
  def init(_) do
    Process.send_after(self(), :work, @timeout)
    Process.send_after(self(), :subscribe, @timeout)

    Logger.debug("Start UsersRankServer")

    {:ok, true}
  end

  def handle_cast(:update, state) do
    do_work()
    {:noreply, state}
  end

  def handle_info(:subscribe, state) do
    if FunWithFlags.enabled?(:skip_user_rank_server) do
      :noop
    else
      Codebattle.PubSub.subscribe("games")
    end

    {:noreply, state}
  end

  def handle_info(:work, state) do
    if FunWithFlags.enabled?(:skip_user_rank_server) do
      :noop
      {:noreply, state}
    else
      do_work()
      Process.send_after(self(), :work, @timeout)
      {:noreply, state}
    end
  end

  def handle_info(%{event: "game:finished", payload: %{tournament_id: nil}}, state) do
    do_work()
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}

  defp do_work do
    Codebattle.User.RankUpdate.call()
    Logger.debug("Rank has been recalculated")
  end
end
