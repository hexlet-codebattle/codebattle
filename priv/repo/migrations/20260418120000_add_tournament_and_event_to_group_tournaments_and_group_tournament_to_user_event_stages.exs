defmodule Codebattle.Repo.Migrations.AddTournamentAndEventToGroupTournamentsAndGroupTournamentToUserEventStages do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_tournaments) do
      add(:tournament_id, references(:tournaments, on_delete: :nilify_all))
      add(:event_id, references(:events, on_delete: :nilify_all))
    end

    alter table(:user_event_stages) do
      add(:group_tournament_id, references(:group_tournaments, on_delete: :nilify_all))
    end

    create(index(:group_tournaments, [:tournament_id]))
    create(index(:group_tournaments, [:event_id]))
    create(index(:user_event_stages, [:group_tournament_id]))
  end
end
