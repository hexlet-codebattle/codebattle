defmodule Codebattle.Repo.Migrations.AddLastRoundEndedAtToTournaments do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:last_round_ended_at, :utc_datetime)
      add(:break_duration_seconds, :integer)
      add(:break_state, :string)
    end
  end
end
