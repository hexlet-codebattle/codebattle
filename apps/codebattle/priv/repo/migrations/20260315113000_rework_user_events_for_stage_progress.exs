defmodule Codebattle.Repo.Migrations.ReworkUserEventsForStageProgress do
  use Ecto.Migration

  def change do
    drop_if_exists(table(:user_event_stages))
    drop_if_exists(table(:user_events))

    create table(:user_events) do
      add(:user_id, references(:users, on_delete: :delete_all), null: false)
      add(:event_id, references(:events, on_delete: :delete_all), null: false)
      add(:status, :string, null: false, default: "pending")
      add(:current_stage_slug, :string)
      add(:started_at, :utc_datetime)
      add(:finished_at, :utc_datetime)

      timestamps()
    end

    create unique_index(:user_events, [:user_id, :event_id])

    create table(:user_event_stages) do
      add(:user_event_id, references(:user_events, on_delete: :delete_all), null: false)
      add(:slug, :string, null: false)
      add(:status, :string, null: false)
      add(:tournament_id, :integer)
      add(:entrance_result, :string)
      add(:place_in_total_rank, :integer)
      add(:place_in_category_rank, :integer)
      add(:games_count, :integer)
      add(:score, :integer)
      add(:time_spent_in_seconds, :integer)
      add(:wins_count, :integer)
      add(:started_at, :utc_datetime)
      add(:finished_at, :utc_datetime)

      timestamps()
    end

    create unique_index(:user_event_stages, [:user_event_id, :slug])
  end
end
