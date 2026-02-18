defmodule Codebattle.Repo.Migrations.AddBotReports do
  use Ecto.Migration

  def change do
    alter table(:user_game_reports) do
      add :tournament_id, :integer
      add :offender_id, :integer
      remove :reported_user_id
    end

    create index(:user_game_reports, [:tournament_id])
    create index(:user_game_reports, [:game_id])
  end
end
