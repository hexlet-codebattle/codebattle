defmodule Codebattle.Repo.Migrations.AddShowLeaderboardToGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_tournaments) do
      add(:show_leaderboard, :boolean, default: true, null: false)
    end
  end
end
