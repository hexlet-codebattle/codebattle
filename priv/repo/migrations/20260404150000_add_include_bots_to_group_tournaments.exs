defmodule Codebattle.Repo.Migrations.AddIncludeBotsToGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_tournaments) do
      add(:include_bots, :boolean, null: false, default: false)
    end
  end
end
