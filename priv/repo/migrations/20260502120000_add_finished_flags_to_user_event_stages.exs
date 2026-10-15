defmodule Codebattle.Repo.Migrations.AddFinishedFlagsToUserEventStages do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:user_event_stages) do
      add(:tournament_finished, :boolean, default: false, null: false)
      add(:group_tournament_finished, :boolean, default: false, null: false)
    end
  end
end
