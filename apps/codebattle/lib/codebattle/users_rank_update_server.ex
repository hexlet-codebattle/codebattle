defmodule Codebattle.UsersRankUpdateServer do
  @moduledoc """
  GenServer for updating user rankings periodically and in response to game events.

  This server:
  - Runs user rank calculations every 57 minutes
  - Subscribes to game events and recalculates ranks when games finish
  - Can be manually triggered to update ranks
  - Respects the :skip_user_rank_server feature flag to disable functionality
  """

  use GenServer

  require Logger

  @timeout to_timeout(minute: 57)

  # API

  @doc """
  Starts the UsersRankUpdateServer GenServer.
  """
  def start_link(_) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  @doc """
  Manually triggers a user rank update.
  """
  def update do
    GenServer.cast(__MODULE__, :update)
  end

  # SERVER

  @doc false
  def init(_) do
    Process.send_after(self(), :work, @timeout)
    Process.send_after(self(), :subscribe, @timeout)

    Logger.debug("Start UsersRankServer")

    {:ok, true}
  end

  @doc false
  def handle_cast(:update, state) do
    do_work()
    {:noreply, state}
  end

  @doc false
  def handle_info(:subscribe, state) do
    if FunWithFlags.enabled?(:skip_user_rank_server) do
      :noop
    else
      Codebattle.PubSub.subscribe("games")
    end

    {:noreply, state}
  end

  @doc false
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

  @doc false
  def handle_info(%{event: "game:finished", payload: %{tournament_id: nil}}, state) do
    do_work()
    {:noreply, state}
  end

  @doc false
  def handle_info(_, state), do: {:noreply, state}

  defp do_work do
    Codebattle.User.RankUpdate.call()
    Logger.debug("Rank has been recalculated")
  end
end
