defmodule Codebattle.Repo.Migrations.AddUserGamePlaybook do
  use Ecto.Migration

  def change do
    alter table(:user_games) do
      add :playbook_id, references(:playbooks, on_delete: :nothing)
    end
  end
end
