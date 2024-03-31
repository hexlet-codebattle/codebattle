defmodule Codebattle.WaitingRoom.Server do
  @moduledoc """
  Process for match people with games
  """
  use GenServer

  alias Codebattle.PubSub
  alias Codebattle.WaitingRoom.State

  require Logger

  def start_link(params = %{name: name}) do
    GenServer.start_link(__MODULE__, [params], name: wr_name(name))
  end

  def start(name) do
    PubSub.broadcast("waiting_room:started", %{name: name})
  end

  def put_players(name, players) do
    GenServer.cast(name, {:put_players, players})
  end

  @impl GenServer
  def handle_cast({:put_players, _players}, state) do
    # new_players = [players | state.players]
    # broadcast("waiting_room:matchmaking_started", %{player_ids: Enum.map(players, & &1.id)})

    {:noreply, state}
  end

  # SERVER

  @impl GenServer
  def init([params]) do
    state = Map.merge(%State{}, params)
    schedule_matching(state)
    {:ok, state}
  end

  @impl GenServer
  def handle_info(:match_players, state) do
    match_players(state)

    schedule_matching(state)

    {:noreply, state}
  end

  defp match_players(state) do
    state
  end

  defp schedule_matching(state) do
    Process.send_after(self(), :match_players, :timer.seconds(state.time_step_ms))
  end

  defp wr_name(name), do: {:via, Registry, {Codebattle.Registry, "wr:#{name}"}}
end
