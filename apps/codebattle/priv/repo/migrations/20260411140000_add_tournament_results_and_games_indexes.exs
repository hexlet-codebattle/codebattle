defmodule Codebattle.Repo.Migrations.AddTournamentResultsAndGamesIndexes do
  @moduledoc false
  use Ecto.Migration

  def change do
    create_if_not_exists(index(:tournament_results, [:tournament_id, :user_id]))
    create_if_not_exists(index(:tournament_results, [:tournament_id, :round_position]))
    create_if_not_exists(index(:tournament_results, [:game_id]))
    create_if_not_exists(index(:games, [:tournament_id]))
  end
end
