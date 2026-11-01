defmodule Codebattle.Tournament.UpcomingRunner do
  @moduledoc """
  Polls scheduled tournaments every 15 seconds, opening registration 10 minutes
  before starts_at and recovering starts missed by up to 10 minutes. Also cancels
  tournaments that stayed in waiting_participants for too long, and active ones
  abandoned long ago (their server died and was never restored).
  """
  use GenServer

  alias Codebattle.Tournament

  require Logger

  @tournament_run_upcoming Application.compile_env(:codebattle, :tournament_run_upcoming)
  @worker_timeout to_timeout(second: 15)

  @upcoming_time_before_live_mins 10

  @stale_check_timeout to_timeout(minute: 10)
  @stale_waiting_after_hours 12
  # Far longer than any tournament runs.
  @stale_active_after_days 7

  @spec start_link([]) :: GenServer.on_start()
  def start_link(_) do
    GenServer.start_link(__MODULE__, :noop, name: __MODULE__)
  end

  @impl GenServer
  def init(_state) do
    if @tournament_run_upcoming do
      Process.send_after(self(), :run_upcoming, @worker_timeout)
      Process.send_after(self(), :cancel_stale, @stale_check_timeout)
    end

    {:ok, :noop}
  end

  @impl GenServer
  def handle_info(:run_upcoming, state) do
    run_upcoming()

    Process.send_after(self(), :run_upcoming, @worker_timeout)

    {:noreply, state}
  end

  def handle_info(:cancel_stale, state) do
    cancel_stale()

    Process.send_after(self(), :cancel_stale, @stale_check_timeout)

    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}

  def run_upcoming do
    case Tournament.Context.get_upcoming_to_live_candidate(@upcoming_time_before_live_mins) do
      %Tournament{} = tournament ->
        Tournament.Context.move_upcoming_to_live(tournament)
        Logger.info("Tournament #{tournament.name}  moved to live from upcoming")
        :ok

      _ ->
        :noop
    end
  end

  def cancel_stale do
    now = DateTime.utc_now(:second)

    [
      {"waiting_participants", DateTime.add(now, -@stale_waiting_after_hours, :hour)},
      {"active", DateTime.add(now, -@stale_active_after_days, :day)}
    ]
    |> Enum.flat_map(fn {state, cutoff} -> Tournament.Context.get_stale_tournaments(state, cutoff) end)
    |> Enum.map(fn tournament ->
      Tournament.Context.cancel_stale_tournament(tournament)
      Logger.info("Tournament #{tournament.id} canceled: stale in #{tournament.state}")
      tournament.id
    end)
  end
end
