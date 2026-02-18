defmodule Codebattle.Repo.Migrations.AddClanNameToTournamentUserResults do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tournament_user_results) do
      add(:clan_name, :string)
    end
  end
end
