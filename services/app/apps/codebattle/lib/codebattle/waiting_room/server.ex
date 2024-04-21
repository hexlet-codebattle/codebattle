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

  def get_state(name), do: GenServer.call(wr_name(name), :get_state)
  def match_players(name), do: GenServer.call(wr_name(name), :match_players)
  def pause(name), do: GenServer.call(wr_name(name), :pause)
  def update_state(name, params), do: GenServer.call(wr_name(name), {:update_state, params})
  def ban_player(name, player_id), do: GenServer.call(wr_name(name), {:ban_player, player_id})

  def put_players(name, players) do
    GenServer.cast(
      wr_name(name),
      {:put_players,
       players
       |> Enum.filter(&(!&1.is_bot))
       |> Enum.map(&prepare_player/1)}
    )
  end

  def put_player(name, player) do
    GenServer.cast(wr_name(name), {:put_player, prepare_player(player)})
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
  def handle_cast({:put_player, player}, state) do
    PubSub.broadcast("waiting_room:matchmaking_started", %{
      name: state.name,
      player_ids: [player.id]
    })

    {:noreply, %{state | players: [player | state.players]}}
  end

  @impl GenServer
  def handle_call(:get_state, _from, state) do
    {:reply, state, state}
  end

  def handle_call({:start, played_pair_ids}, _from, state) do
    {:reply, :ok, %{state | played_pair_ids: played_pair_ids, state: "active"}}
  end

  @impl GenServer
  def handle_call(:match_players, _from, state) do
    new_state = do_match_players(state)
    {:reply, new_state, new_state}
  end

  @impl GenServer
  def handle_call(:pause, _from, state) do
    new_state = %{
      state
      | unmatched: [],
        state: "paused",
        players: [],
        played_pair_ids: MapSet.new(),
        pairs: [],
        groups: [],
        matched_with_bot: []
    }

    {:reply, new_state, new_state}
  end

  @impl GenServer
  def handle_call({:update_state, params}, _from, state) do
    new_state = Map.merge(state, params)
    {:reply, new_state, new_state}
  end

  @impl GenServer
  def handle_call({:ban_player, player_id}, _from, state) do
    new_state = %{state | players: Enum.reject(state.players, &(&1.id == player_id))}
    {:reply, new_state, new_state}
  end

  @impl GenServer
  def handle_info(:match_players, state) do
    new_state = do_match_players(state)

    schedule_matching(state)

    {:noreply, new_state}
  end

  defp do_match_players(state = %{state: "paused"}) do
    Logger.debug("WR #{state.name} paused")
    state
  end

  defp do_match_players(state = %{players: []}) do
    Logger.debug("WR #{state.name} idle")
    state
  end

  defp do_match_players(state) do
    new_state = Engine.call(state)

    Logger.debug("
    WR match_result:
    pairs:  #{Enum.count(new_state.pairs)}
    players:  #{Enum.count(new_state.players)}
    unmatched: #{Enum.count(new_state.unmatched)}
    played_pair_ids: #{MapSet.size(new_state.played_pair_ids)}
    matched_with_bot: #{Enum.count(new_state.matched_with_bot)}
    ")

    maybe_broadcast_pairs(new_state)

    %{new_state | pairs: []}
  end

  defp schedule_matching(state) do
    Process.send_after(self(), :match_players, state.time_step_ms)
  end

  defp maybe_broadcast_pairs(%{pairs: [], matched_with_bot: []}), do: :noop

  defp maybe_broadcast_pairs(state) do
    PubSub.broadcast("waiting_room:matched", %{
      name: state.name,
      pairs: state.pairs,
      matched_with_bot: state.matched_with_bot
    })
  end

  defp wr_name(name), do: {:via, Registry, {Codebattle.Registry, "wr:#{name}"}}

  defp prepare_player(player) do
    player
    |> Map.take([:id, :clan_id, :score])
    |> Map.put(:tasks, Enum.count(player.task_ids))
    |> Map.put(:joined, :os.system_time(:second))
  end
end
