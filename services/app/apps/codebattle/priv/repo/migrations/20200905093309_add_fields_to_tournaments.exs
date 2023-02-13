defmodule Codebattle.Repo.Migrations.AddFieldsToTournaments do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:match_timeout_seconds, :integer)
      add(:last_round_started_at, :naive_datetime)
    end
  end
end
