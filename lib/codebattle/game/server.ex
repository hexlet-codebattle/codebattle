defmodule Game.Server do
  @moduledoc false

  use GenServer

  #API
  def start_link(game) do
    GenServer.start_link(__MODULE__, game, name: game_name(game.id))
  end

  def fire_event(game_id, user, event) do
    GenServer.cast(game_name(game_id), {:fire_event, user, event})
  end

  def game(game_id) do
    GenServer.call(game_name(game_id), :game)
  end

  def game_name(game_id) do
    {:via, :gproc, {:n, :l, {:game, game_id}}}
  end

  # SERVER
  def init(game) do
    {:ok, game}
  end

  def handle_cast({:fire_event, user, event}, game) do
    new_game = apply(CodebattleWeb.Game, event, [game])
    Codebattle.Repo.update!(new_game)
    {:noreply, new_game}
  end

  def handle_call(:game, _from, game) do
    {:reply, game, game}
  end
end
