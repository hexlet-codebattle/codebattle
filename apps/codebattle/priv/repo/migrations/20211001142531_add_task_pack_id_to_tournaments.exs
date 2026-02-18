defmodule Codebattle.Repo.Migrations.AddTaskPackIdToTournaments do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:task_pack_id, :integer)
    end
  end
end
