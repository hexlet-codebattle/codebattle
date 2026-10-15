defmodule Codebattle.Repo.Migrations.AddVisibleToUsersToGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_tournaments) do
      add(:visible_to_users, :boolean, default: true, null: false)
    end
  end
end
