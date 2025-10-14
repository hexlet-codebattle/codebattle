defmodule Codebattle.Tournament.UpcomingRunner do
  @moduledoc """
  This module is responsible for running every minute tournaments from schedule
  """
  use GenServer

  alias Codebattle.Tournament

  @tournament_run_upcoming Application.compile_env(:codebattle, :tournament_run_upcoming)
  @worker_timeout to_timeout(second: 30)

  @upcoming_time_before_live_mins 5

  @spec start_link([]) :: GenServer.on_start()
  def start_link(_) do
    GenServer.start_link(__MODULE__, :noop, name: __MODULE__)
  end

  @impl GenServer
  def init(_state) do
    if @tournament_run_upcoming do
      Process.send_after(self(), :run_upcoming, @worker_timeout)
    end

    {:ok, :noop}
  end

  @impl GenServer
  def handle_info(:run_upcoming, state) do
    run_upcoming()
    start_or_cancel_waiting_participants()

    Process.send_after(self(), :run_upcoming, @worker_timeout)

    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}

  def run_upcoming do
    case Tournament.Context.get_upcoming_to_live_candidate(@upcoming_time_before_live_mins) do
      %Tournament{} = tournament ->
        Tournament.Context.move_upcoming_to_live(tournament)
        :ok

      _ ->
        :noop
    end
  end

  def start_or_cancel_waiting_participants do
    case Tournament.Context.get_waiting_participants_to_start_candidates() do
      tournaments when is_list(tournaments) ->
        Enum.each(
          tournaments,
          fn
            %{players_count: pc} = t when pc > 0 ->
              Tournament.Context.handle_event(t.id, :start, %{})

            %{players_count: 0} = t ->
              Tournament.Context.handle_event(t.id, :cancel, %{})
          end
        )

        :ok
    end
  end
end
