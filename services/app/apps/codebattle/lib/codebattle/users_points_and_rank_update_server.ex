defmodule Codebattle.UsersPointsAndRankUpdateServer do
  @moduledoc "Gen server for collect actions from users"

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
    Process.send_after(self(), :subscribe, to_timeout(second: 15))
    Process.send_after(self(), :work, @work_timeout)

    Logger.debug("Start UsersPointsServer")

    {:ok, true}
  end

  def handle_cast(:update, state) do
    do_work()
    {:noreply, state}
  end

  def handle_info(:subscribe, state) do
    if FunWithFlags.enabled?(:skip_user_points_server) do
      :noop
    else
      Codebattle.PubSub.subscribe("tournaments")
    end

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
    Logger.debug("Points has been recalculated")
  end
end
