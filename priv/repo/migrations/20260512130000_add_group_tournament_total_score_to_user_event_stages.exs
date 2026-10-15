defmodule Codebattle.Repo.Migrations.AddGroupTournamentTotalScoreToUserEventStages do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:user_event_stages) do
      add(:group_tournament_total_score, :integer)
    end
  end
end
