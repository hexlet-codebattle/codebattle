defmodule Codebattle.Repo.Migrations.AddRankingToTournament do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:ranking, :jsonb, null: false, default: "[]")
    end
  end
end
