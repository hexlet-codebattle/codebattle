defmodule Codebattle.Play do
  @moduledoc """
  The Play context.
  """

  import Ecto.Query, warn: false

  alias Codebattle.Repo
  alias Codebattle.Game
  alias Codebattle.UserGame

  def list_games do
    Repo.all from p in Game,
            preload: [:users]
  end

  def get_game!(id) do
    Game
    |> where([game], game.id == ^id)
    |> preload([game], [:users])
    |> Repo.one
  end

  def create_game(user) do
    game = Repo.insert!(%Game{state: "waiting_opponent"})
    Repo.insert!(%UserGame{game_id: game.id, user_id: user.id})

    state = Play.Fsm.new |> Play.Fsm.create(%{id: game.id})

    Play.Supervisor.start_game(game.id, state)
    game.id
  end

  def update_game(%Game{} = game, attrs) do
    game
    |> Game.changeset(attrs)
    |> Repo.update()
  end
end
