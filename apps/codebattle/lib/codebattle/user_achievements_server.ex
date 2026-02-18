defmodule Codebattle.UserAchievementsServer do
  @moduledoc """
  Async achievements recalculation server.
  """

  use GenServer

  alias Codebattle.Tournament.TournamentUserResult
  alias Codebattle.User.Achievements

  require Logger

  @flush_interval to_timeout(second: 2)
  @batch_size 200

  def start_link(_) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  @spec recalculate_all_users() :: :ok
  def recalculate_all_users do
    GenServer.call(__MODULE__, :recalculate_all_users, :infinity)
  end

  @impl true
  def init(_) do
    Process.send_after(self(), :subscribe, 200)

    {:ok, %{queue: MapSet.new()}}
  end

  @impl true
  def handle_info(:subscribe, state) do
    Codebattle.PubSub.subscribe("games")
    Codebattle.PubSub.subscribe("tournaments")

    {:noreply, state}
  end

  def handle_info(%{event: "game:finished", payload: %{tournament_id: nil, game: %{players: players}}}, state) do
    state = enqueue_user_ids(state, Enum.map(players, & &1.id))
    schedule_flush()
    {:noreply, state}
  end

  def handle_info(%{event: "tournament:finished", payload: %{id: tournament_id, grade: grade}}, state)
      when grade != "open" do
    users = tournament_id |> TournamentUserResult.get_by() |> Enum.map(& &1.user_id)
    state = enqueue_user_ids(state, users)
    schedule_flush()
    {:noreply, state}
  end

  def handle_info(:flush, %{queue: queue} = state) do
    if FunWithFlags.enabled?(:skip_achievements_server) do
      {:noreply, %{state | queue: MapSet.new()}}
    else
      {to_process, rest} = queue |> MapSet.to_list() |> Enum.split(@batch_size)
      maybe_recalculate(to_process)
      maybe_schedule_next_flush(rest)
      {:noreply, %{state | queue: MapSet.new(rest)}}
    end
  end

  def handle_info(_, state), do: {:noreply, state}

  @impl true
  def handle_call(:recalculate_all_users, _from, state) do
    if FunWithFlags.enabled?(:skip_achievements_server) do
      {:reply, :ok, state}
    else
      result = Achievements.recalculate_all_users()
      Logger.info("Achievements recalculated for all users: #{result.processed_users}")
      {:reply, :ok, state}
    end
  end

  defp enqueue_user_ids(state, user_ids) do
    user_ids = Enum.reject(user_ids, &(&1 in [nil, 0]))

    %{state | queue: Enum.reduce(user_ids, state.queue, &MapSet.put(&2, &1))}
  end

  defp maybe_recalculate([]), do: :ok

  defp maybe_recalculate(user_ids) do
    Achievements.recalculate_many(user_ids)
  end

  defp maybe_schedule_next_flush([]), do: :ok

  defp maybe_schedule_next_flush(_rest) do
    Process.send_after(self(), :flush, @flush_interval)
  end

  defp schedule_flush do
    Process.send_after(self(), :flush, @flush_interval)
  end
end
