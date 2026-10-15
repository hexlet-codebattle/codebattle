defmodule Codebattle.Repo.Migrations.AddRankingTypeToTournament do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:ranking_type, :string)
    end
  end
end
