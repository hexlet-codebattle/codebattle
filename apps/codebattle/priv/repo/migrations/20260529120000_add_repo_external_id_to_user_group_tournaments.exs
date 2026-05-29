defmodule Codebattle.Repo.Migrations.AddRepoExternalIdToUserGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:user_group_tournaments) do
      add(:repo_external_id, :string)
    end
  end
end
