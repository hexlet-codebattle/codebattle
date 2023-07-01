defmodule Codebattle.Repo.Migrations.CreatePlayerReport do
  use Ecto.Migration

  def change do
    create table(:player_reports) do
      add :user_id, :integer
      add :game_id, :integer
      add :reason, :string
      add :comment, :text

      timestamps()
    end
  end

end
