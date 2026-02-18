defmodule Codebattle.Repo.Migrations.RemoveForeignKeyRoundsFromTournaments do
  use Ecto.Migration

  def change do
    drop_if_exists(constraint(:tournaments, :rounds_tournament_id_fkey))
    drop_if_exists(constraint(:tournaments, :rounds_current_round_id_fkey))
    drop_if_exists(constraint(:tournaments, :tournaments_current_round_id_fkey))
    drop_if_exists(constraint(:games, :games_round_id_fkey))
  end
end
