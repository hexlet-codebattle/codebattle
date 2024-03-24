defmodule Codebattle.Repo.Migrations.AddScoreStrategyToTournaments do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:score_strategy, :string, null: false, default: "time_and_tests")
    end
  end
end
