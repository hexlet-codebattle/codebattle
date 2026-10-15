defmodule Codebattle.Tournament.UpcomingRunner do
  @moduledoc """
  This module is responsible for running every minute tournaments from schedule
  and for canceling tournaments that stayed in waiting_participants for too long
  """
  use GenServer

  alias Codebattle.Tournament

  require Logger

  @tournament_run_upcoming Application.compile_env(:codebattle, :tournament_run_upcoming)
  @worker_timeout to_timeout(second: 15)

  @upcoming_time_before_live_mins 10

  @stale_check_timeout to_timeout(minute: 10)
  @stale_waiting_after_hours 12

  @spec start_link([]) :: GenServer.on_start()
  def start_link(_) do
    GenServer.start_link(__MODULE__, :noop, name: __MODULE__)
  end

  @impl GenServer
  def init(_state) do
    if @tournament_run_upcoming do
      Process.send_after(self(), :run_upcoming, @worker_timeout)
      Process.send_after(self(), :cancel_stale_waiting, @stale_check_timeout)
    end

    {:ok, :noop}
  end

  @impl GenServer
  def handle_info(:run_upcoming, state) do
    run_upcoming()

    Process.send_after(self(), :run_upcoming, @worker_timeout)

    {:noreply, state}
  end

  def handle_info(:cancel_stale_waiting, state) do
    cancel_stale_waiting()

    Process.send_after(self(), :cancel_stale_waiting, @stale_check_timeout)

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

  def cancel_stale_waiting do
    cutoff = DateTime.add(DateTime.utc_now(:second), -@stale_waiting_after_hours, :hour)

    cutoff
    |> Tournament.Context.get_stale_waiting_tournaments()
    |> Enum.map(fn tournament ->
      Tournament.Context.cancel_stale_tournament(tournament)
      Logger.info("Tournament #{tournament.id} canceled: waiting for participants too long")
      tournament.id
    end)
  end
end
