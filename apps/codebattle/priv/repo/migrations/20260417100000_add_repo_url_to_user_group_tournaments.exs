defmodule Codebattle.Repo.Migrations.AddRepoUrlToUserGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def up do
    execute("ALTER TABLE user_group_tournaments ADD COLUMN IF NOT EXISTS repo_url text")
  end

  def down do
    alter table(:user_group_tournaments) do
      remove(:repo_url)
    end
  end
end
