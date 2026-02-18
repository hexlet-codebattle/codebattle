defmodule Codebattle.Repo.Migrations.AddRoundTimeoutSecToTournament do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:round_timeout_seconds, :integer)
    end
  end
end
