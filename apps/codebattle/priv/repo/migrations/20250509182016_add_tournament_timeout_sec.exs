defmodule Codebattle.Repo.Migrations.AddTournamentTimeoutSec do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:tournament_timeout_seconds, :integer)
    end
  end
end
