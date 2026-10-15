defmodule Codebattle.Repo.Migrations.CreateGroupTasks do
  @moduledoc false
  use Ecto.Migration

  def change do
    create table(:group_tasks) do
      add(:slug, :string, null: false)
      add(:time_to_solve_sec, :integer, null: false)

      timestamps()
    end

    create(unique_index(:group_tasks, [:slug]))

    create table(:group_task_solutions) do
      add(:user_id, references(:users), null: false)
      add(:group_task_id, references(:group_tasks, on_delete: :delete_all), null: false)
      add(:solution, :text, null: false)
      add(:lang, :string, null: false)

      timestamps(updated_at: false)
    end

    create(index(:group_task_solutions, [:user_id]))

    execute("""
    CREATE INDEX group_task_solutions_latest_per_user_index
    ON group_task_solutions (group_task_id, user_id, id DESC)
    """)

    create table(:group_task_tokens) do
      add(:user_id, references(:users), null: false)
      add(:group_task_id, references(:group_tasks, on_delete: :delete_all), null: false)
      add(:token, :string, null: false)

      timestamps()
    end

    create(unique_index(:group_task_tokens, [:token]))
    create(unique_index(:group_task_tokens, [:user_id, :group_task_id]))
    create(index(:group_task_tokens, [:group_task_id]))
  end
end
