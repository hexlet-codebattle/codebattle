defmodule Codebattle.Repo.Migrations.AddFairPlayReviews do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:game_bot_detection_reports) do
      add :evidence, {:array, :map}, null: false, default: []
    end

    create table(:game_fair_play_reviews) do
      add :game_id, references(:games), null: false
      add :user_id, references(:users), null: false
      add :reviewer_id, references(:users), null: false
      add :outcome, :string, null: false
      add :reason, :text, null: false
      add :replay_offset_ms, :bigint
      add :report_version, :integer, null: false
      add :report_snapshot, :map, null: false
      timestamps(updated_at: false)
    end

    create index(:game_fair_play_reviews, [:game_id, :user_id])

    create unique_index(
             :game_editor_event_batches,
             [:game_id, :user_id, "(summary->>'collector_session')", "(summary->>'batch_sequence')"],
             name: :editor_batch_session_sequence
           )
  end
end
