defmodule Codebattle.Repo.Migrations.AddGroupTournamentScoreToUserEventStages do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:user_event_stages) do
      add(:group_tournament_score, :integer)
    end
  end
end
