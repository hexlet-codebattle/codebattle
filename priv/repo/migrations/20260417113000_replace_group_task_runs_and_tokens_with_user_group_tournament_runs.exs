defmodule Codebattle.Repo.Migrations.ReplaceGroupTaskRunsAndTokensWithUserGroupTournamentRuns do
  @moduledoc false
  use Ecto.Migration

  def up do
    drop_if_exists(table(:group_task_tokens))
    drop_if_exists(table(:group_task_runs))

    create table(:user_group_tournament_runs) do
      add(:user_group_tournament_id, references(:user_group_tournaments, on_delete: :delete_all), null: false)
      add(:group_task_id, references(:group_tasks, on_delete: :delete_all), null: false)
      add(:group_tournament_id, references(:group_tournaments, on_delete: :delete_all), null: false)
      add(:run_key, :uuid, null: false)
      add(:player_ids, {:array, :integer}, null: false, default: [])
      add(:status, :string, null: false)
      add(:result, :map, null: false, default: %{})

      timestamps()
    end

    create(index(:user_group_tournament_runs, [:user_group_tournament_id]))
    create(index(:user_group_tournament_runs, [:group_task_id]))
    create(index(:user_group_tournament_runs, [:group_tournament_id]))
    create(index(:user_group_tournament_runs, [:status]))
    create(unique_index(:user_group_tournament_runs, [:user_group_tournament_id, :run_key]))
  end

  def down do
    drop_if_exists(table(:user_group_tournament_runs))

    create table(:group_task_tokens) do
      add(:user_id, references(:users), null: false)
      add(:group_task_id, references(:group_tasks, on_delete: :delete_all), null: false)
      add(:token, :string, null: false)

      timestamps()
    end

    create(unique_index(:group_task_tokens, [:token]))
    create(unique_index(:group_task_tokens, [:user_id, :group_task_id]))
    create(index(:group_task_tokens, [:group_task_id]))

    create table(:group_task_runs) do
      add(:group_task_id, references(:group_tasks, on_delete: :delete_all), null: false)
      add(:player_ids, {:array, :integer}, null: false, default: [])
      add(:status, :string, null: false)
      add(:result, :map, null: false, default: %{})
      add(:group_tournament_id, references(:group_tournaments, on_delete: :nilify_all))

      timestamps()
    end

    create(index(:group_task_runs, [:group_task_id]))
    create(index(:group_task_runs, [:status]))
    create(index(:group_task_runs, [:group_tournament_id]))
  end
end
