defmodule Codebattle.Repo.Migrations.CreateUserGameReports do
  use Ecto.Migration

  def change do
    create table(:user_game_reports) do
      add :reported_user_id, references(:users)
      add :reporter_id, references(:users)
      add :game_id, references(:games)
      add :reason, :string
      add :comment, :text
      add :state, :string

      timestamps()
    end
  end

end
