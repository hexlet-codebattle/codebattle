defmodule Codebattle.Play do
  @moduledoc """
  The Play context.
  """

  import Ecto.Query, warn: false

  alias Codebattle.Repo
  alias Codebattle.Game

  def list_games do
    Repo.all(Game)
  end

  def get_game!(id), do: Repo.get!(Game, id)

  def create_game(attrs \\ %{}) do
    game = %Game{}
    |> Game.changeset(attrs)
    |> Repo.insert!()

    Play.Supervisor.start_game(game.id)
  end

  def update_game(%Game{} = game, attrs) do
    game
    |> Game.changeset(attrs)
    |> Repo.update()
  end
end
