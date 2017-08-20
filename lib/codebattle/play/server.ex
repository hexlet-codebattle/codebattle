defmodule Play.Server do
  @moduledoc false

  use GenServer
  require Logger
  alias Codebattle.UserGame
  alias Codebattle.Repo

  #API
  def start_link(game_id, state) do
    GenServer.start_link(__MODULE__, state, name: game_key(game_id))
  end

  def join(game_id, user), do: GenServer.call(game_key(game_id), {:join, user})

  def transition(game_id, event, params) do
    GenServer.cast(game_key(game_id), {:transition, event, params})
  end

  def state(game_id) do
    GenServer.call(game_key(game_id), :state)
  end

  def game_key(game_id) do
    {:via, :gproc, {:n, :l, {:game, game_id}}}
  end

  # SERVER
  def init(state) do
    {:ok, state}
  end

  def handle_cast({:transition, event, params}, state) do
    new_state = Play.Fsm.transition(state, event, params)
    {:noreply, new_state}
  end

  def handle_call(:state, _from, state) do
    {:reply, state, state}
  end

  def handle_call({:join, player}, _from, game) do
    data = game.data
    cond do
      data.first_player != nil and data.second_player != nil ->
        {:reply, {:error, "No more players allowed"}, game}
      Enum.member?([data.first_player, data.second_player], player) ->
        {:reply, {:ok, self()}, game}
      true ->
        new_state = add_player(game, player)
        Repo.insert!(%UserGame{game_id: data.id, user_id: player.id})
        {:reply, {:ok, self()}, new_state}
    end
  end

  defp add_player(game, player) do
    data = game |> Play.Fsm.data
    case data do
      %{first_player: nil} ->
        game |> Play.Fsm.add_first_player(%{first_player: player})
      %{second_player: nil} ->
        game |> Play.Fsm.add_second_player(%{second_player: player})
      true ->
        game
    end
  end
end
