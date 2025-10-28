defmodule Codebattle.UsersPointsAndRankServer do
  @moduledoc "Gen server for collect actions from users"

  use GenServer

  require Logger

  @user_ranking :user_ranking

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
    create_table()
    Process.send_after(self(), :subscribe, 200)
    Process.send_after(self(), :work, to_timeout(minute: 5))

    Logger.debug("Start UsersPointsAndRankServer")

    {:ok, true}
  end

  def create_table do
    :ets.new(
      @user_ranking,
      [
        :ordered_set,
        :public,
        :named_table,
        {:write_concurrency, true},
        {:read_concurrency, true}
      ]
    )
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
    Codebattle.User.PointsAndRankUpdate.update()
    update_ets()
    Logger.debug("Points has been recalculated")
  end

  defp update_ets do
    data = Codebattle.User.get_user_places_and_ids()
    :ets.insert(@user_ranking, data)
  end

  defp ensure_ets_populated do
    case :ets.info(@user_ranking, :size) do
      0 -> update_ets()
      _ -> :ok
    end
  end

  def get_nearby_user_ids(rank, limit \\ 2) do
    ensure_ets_populated()

    :ets.select(@user_ranking, [
      {{:"$1", :"$2"}, [{:>=, :"$1", rank - limit}, {:"=<", :"$1", rank + limit}], [:"$2"]}
    ])
  rescue
    _e ->
      Logger.error("Error getting nearby user_ids")
      []
  end

  def get_top_user_ids(limit) do
    ensure_ets_populated()

    :ets.select(@user_ranking, [
      {{:"$1", :"$2"}, [{:>=, :"$1", 1}, {:"=<", :"$1", limit}], [:"$2"]}
    ])
  rescue
    _e ->
      Logger.error("Error getting top ranking user_ids")
      []
  end
end
