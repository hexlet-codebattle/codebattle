defmodule Codebattle.Repo.Migrations.ImproveGames do
  use Ecto.Migration

  def change do
    alter table(:user_games) do
      add(:creator, :boolean, default: false)
    end

    alter table(:games) do
      add(:task_id, :integer)
      add(:task_level, :string)
      add(:duration_in_seconds, :integer)
    end
  end
end
