defmodule Codebattle.Repo.Migrations.UpdatePlaybook do
  use Ecto.Migration

  def change do
    rename table("bot_playbooks"), :user_id, to: :winner_id
    rename table("bot_playbooks"), :lang, to: :winner_lang
    rename table("bot_playbooks"), to: table(:playbooks)

    alter table(:playbooks) do
      add :is_complete_solution, :boolean
    end
  end
end
