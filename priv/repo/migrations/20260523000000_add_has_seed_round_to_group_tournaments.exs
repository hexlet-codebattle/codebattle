defmodule Codebattle.Repo.Migrations.AddHasSeedRoundToGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_tournaments) do
      add(:has_seed_round, :boolean, default: false, null: false)
    end
  end
end
