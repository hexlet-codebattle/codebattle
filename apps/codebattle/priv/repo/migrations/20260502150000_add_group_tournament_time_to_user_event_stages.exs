defmodule Codebattle.Repo.Migrations.AddGroupTournamentTimeToUserEventStages do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:user_event_stages) do
      add(:group_tournament_time_spent_in_seconds, :integer)
    end
  end
end
