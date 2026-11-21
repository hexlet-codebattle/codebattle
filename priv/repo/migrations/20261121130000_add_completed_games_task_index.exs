defmodule Codebattle.Repo.Migrations.AddCompletedGamesTaskIndex do
  @moduledoc false
  use Ecto.Migration

  @disable_ddl_transaction true
  @disable_migration_lock true

  def change do
    create index(:games, [:task_id, :duration_sec],
             name: :games_completed_task_duration_idx,
             where: "state = 'game_over'",
             include: [:id],
             concurrently: true
           )
  end
end
