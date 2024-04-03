defmodule Codebattle.WaitingRoom.Server do
  @moduledoc """
  Process for match people with games
  """
  use GenServer

  alias Codebattle.PubSub
  alias Codebattle.WaitingRoom.Engine
  alias Codebattle.WaitingRoom.State

  require Logger

  def start_link(params = %{name: name}) do
    GenServer.start_link(__MODULE__, [params], name: wr_name(name))
  end

  def start(name, played_pair_ids) do
    PubSub.broadcast("waiting_room:started", %{name: name})
    GenServer.call(wr_name(name), {:start, played_pair_ids})
  end

  def get_state(name) do
    GenServer.call(wr_name(name), :get_state)
  end

  def match_players(name) do
    GenServer.call(wr_name(name), :match_players)
  end

  def put_players(name, players) do
    GenServer.cast(
      wr_name(name),
      {:put_players,
       players
       |> Enum.filter(&(!&1.is_bot))
       |> Enum.map(fn player ->
         player
         |> Map.take([:id, :clan_id, :score])
         |> Map.put(:tasks, Enum.count(player.task_ids))
         |> Map.put(:joined, :os.system_time(:second))
       end)}
    )
  end

  # SERVER

  @impl GenServer
  def init([params]) do
    state = Map.merge(%State{}, params)
    schedule_matching(state)
    {:ok, state}
  end

  @impl GenServer
  def handle_cast({:put_players, players}, state) do
    PubSub.broadcast("waiting_room:matchmaking_started", %{
      name: state.name,
      player_ids: Enum.map(players, & &1.id)
    })

    {:noreply, %{state | players: Enum.concat(players, state.players)}}
  end

  @impl GenServer
  def handle_call(:get_state, _from, state) do
    {:reply, state, state}
  end

  def handle_call({:start, played_pair_ids}, _from, state) do
    {:reply, :ok, %{state | played_pair_ids: played_pair_ids}}
  end

  @impl GenServer
  def handle_call(:match_players, _from, state) do
    new_state = do_match_players(state)
    {:reply, new_state, new_state}
  end

  @impl GenServer
  def handle_info(:match_players, state) do
    new_state = do_match_players(state)

    schedule_matching(state)

    {:noreply, new_state}
  end

  defp do_match_players(state = %{players: []}) do
    Logger.debug("WR idle")
    state
  end

  defp do_match_players(state) do
    {pairs, unmatched} = Engine.call(state)

    Logger.debug("WR match pairs: " <> inspect(pairs))
    Logger.debug("WR match unmatched: " <> inspect(unmatched))
    PubSub.broadcast("waiting_room:matched", %{name: state.name, pairs: pairs})

    %{
      state
      | players: unmatched,
        played_pair_ids: MapSet.union(state.played_pair_ids, MapSet.new([pairs]))
    }
  end

  defp schedule_matching(state) do
    Process.send_after(self(), :match_players, state.time_step_ms)
  end

  defp wr_name(name), do: {:via, Registry, {Codebattle.Registry, "wr:#{name}"}}
end
