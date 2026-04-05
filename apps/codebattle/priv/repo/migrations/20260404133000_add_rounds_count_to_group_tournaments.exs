defmodule Codebattle.Repo.Migrations.AddRoundsCountToGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def up do
    alter table(:group_tournaments) do
      add(:rounds_count, :integer, null: false, default: 1)
    end

    alter table(:group_tournaments) do
      remove(:break_duration_seconds)
    end
  end

  def down do
    alter table(:group_tournaments) do
      add(:break_duration_seconds, :integer, null: false, default: 0)
    end

    alter table(:group_tournaments) do
      remove(:rounds_count)
    end
  end
end
