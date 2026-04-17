defmodule Codebattle.Repo.Migrations.AddGroupTournamentIdToGroupTaskSolutions do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_task_solutions) do
      add(:group_tournament_id, references(:group_tournaments, on_delete: :delete_all))
    end

    create(index(:group_task_solutions, [:group_tournament_id]))

    execute("""
    CREATE INDEX group_task_solutions_latest_per_user_and_tournament_index
    ON group_task_solutions (group_tournament_id, user_id, id DESC)
    WHERE group_tournament_id IS NOT NULL
    """)
  end
end
