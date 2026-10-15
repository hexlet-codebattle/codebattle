defmodule Codebattle.Repo.Migrations.AddRunnerUrlToGroupTasksAndCreateGroupTaskRuns do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_tasks) do
      add(:runner_url, :string)
    end

    create table(:group_task_runs) do
      add(:group_task_id, references(:group_tasks, on_delete: :delete_all), null: false)
      add(:player_ids, {:array, :integer}, null: false, default: [])
      add(:status, :string, null: false)
      add(:result, :map, null: false, default: %{})

      timestamps()
    end

    create(index(:group_task_runs, [:group_task_id]))
    create(index(:group_task_runs, [:status]))
  end
end
