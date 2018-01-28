defmodule Codebattle.Repo.Migrations.CreateUserGame do
  use Ecto.Migration

  def change do
    create table(:user_games) do
      add :user_id, :integer
      add :game_id, :integer
      add :result, :string

      timestamps()
    end

  end
end
