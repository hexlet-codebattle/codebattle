defmodule Codebattle.Repo.Migrations.AddSeedRoundTimeoutToGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_tournaments) do
      add(:seed_round_timeout_seconds, :integer)
    end
  end
end
