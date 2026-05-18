defmodule Codebattle.Repo.Migrations.WidenSliceRankingToBigint do
  @moduledoc false
  use Ecto.Migration

  def up do
    alter table(:group_tournament_players) do
      modify(:slice_ranking, :bigint)
    end
  end

  def down do
    alter table(:group_tournament_players) do
      modify(:slice_ranking, :integer)
    end
  end
end
