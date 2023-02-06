defmodule Codebattle.Repo.Migrations.AddIsCompleteFieldToPlaybooks do
  use Ecto.Migration

  def change do
    alter table(:playbooks) do
      add :is_complete_solution, :boolean
    end
  end
end
