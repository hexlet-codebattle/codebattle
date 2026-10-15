defmodule Codebattle.Repo.Migrations.CreateGameEditorEventBatches do
  @moduledoc false
  use Ecto.Migration

  def change do
    create table(:game_editor_event_batches) do
      add(:user_id, references(:users, on_delete: :delete_all), null: false)
      add(:game_id, references(:games, on_delete: :delete_all), null: false)
      add(:tournament_id, references(:tournaments, on_delete: :nilify_all))
      add(:lang, :string, null: false)
      add(:event_count, :integer, null: false)
      add(:batch_started_at, :utc_datetime_usec, null: false)
      add(:batch_ended_at, :utc_datetime_usec, null: false)
      add(:events, {:array, :map}, null: false, default: [])

      timestamps(updated_at: false)
    end

    create(index(:game_editor_event_batches, [:game_id, :user_id, :inserted_at]))
    create(index(:game_editor_event_batches, [:tournament_id]))
  end
end
