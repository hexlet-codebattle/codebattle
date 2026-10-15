defmodule Codebattle.Repo.Migrations.AddMaxScoreToGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_tournaments) do
      add(:max_score, :integer)
    end
  end
end
