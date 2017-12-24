defmodule Codebattle.Repo.Migrations.ChangeLangInPlaybooks do
  use Ecto.Migration

  def change do
    alter table(:bot_playbooks) do
      modify :language_id, :text
    end
      rename table(:bot_playbooks), :language_id, to: :lang
  end
end
