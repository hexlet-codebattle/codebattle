defmodule Codebattle.Repo.Migrations.CreateBotPlaybooks do
  use Ecto.Migration

  def change do
    create table(:bot_playbooks) do
      add :data, :map
      add :user_id, :integer
      add :game_id, :integer
      add :task_id, :integer
      add :language_id, :integer

      timestamps()
    end

  end
end
