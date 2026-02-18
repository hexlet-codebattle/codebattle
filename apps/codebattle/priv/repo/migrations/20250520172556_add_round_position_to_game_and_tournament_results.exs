defmodule Codebattle.Repo.Migrations.AddRoundPositionToGameAndTournamentResults do
  use Ecto.Migration

  def change do
    alter table(:games) do
      add(:round_position, :integer)
      add(:was_cheated, :boolean)
    end

    alter table(:tournament_results) do
      add(:round_position, :integer)
      add(:was_cheated, :boolean)
    end

  end
end
