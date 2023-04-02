defmodule Codebattle.Repo.Migrations.AddTaskPackProviderToTournaments do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      remove(:task_pack_id)
      add(:task_provider, :text)
    end
  end
end
