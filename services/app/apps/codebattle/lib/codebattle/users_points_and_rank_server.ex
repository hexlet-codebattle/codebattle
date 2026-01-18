defmodule Codebattle.UsersPointsAndRankServer do
  @moduledoc """
  Gen server for updating user points and season results.

  This server:
  - Subscribes to tournament events
  - Triggers season results aggregation when tournaments finish
  - Maintains backward compatibility with legacy user points/rank system
  """

  use GenServer

  require Logger

  @work_timeout to_timeout(day: 1)

  # API
  def start_link(_) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def update do
    GenServer.cast(__MODULE__, :update)
  end

  # SERVER
  def init(_) do
    Process.send_after(self(), :subscribe, 200)
    Process.send_after(self(), :work, to_timeout(minute: 5))

    Logger.debug("Start UsersPointsAndRankServer")

    {:ok, true}
  end

  def handle_cast(:update, state) do
    do_work()
    {:noreply, state}
  end

  def handle_info(:subscribe, state) do
    Codebattle.PubSub.subscribe("tournaments")
    {:noreply, state}
  end

  def handle_info(:work, state) do
    if FunWithFlags.enabled?(:skip_user_points_server) do
      :noop
      {:noreply, state}
    else
      do_work()
      Process.send_after(self(), :work, @work_timeout)
      {:noreply, state}
    end
  end

  # Recalculate user points when a non-open tournament finishes
  # Open tournaments are excluded from point recalculation as they don't affect user ratings
  def handle_info(%{event: "tournament:finished", payload: %{grade: grade}}, state) when grade != "open" do
    :timer.sleep(to_timeout(second: 1))
    do_work()
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}

  defp do_work do
    season =
      case Codebattle.Season.get_current_season() do
        nil ->
          Logger.warning("No current season found, skipping season results update")
          nil

        season ->
          case Codebattle.SeasonResult.aggregate_season_results(season.id) do
            {:ok, num_rows} ->
              Logger.debug("Season results aggregated: #{num_rows} users updated")

            {:error, error} ->
              Logger.error("Error aggregating season results: #{inspect(error)}")
          end

          season
      end

    # Keep updating user points/ranks for backward compatibility
    Codebattle.User.PointsAndRankUpdate.update(season)
    Logger.debug("Points has been recalculated")
  end
end
