defmodule Codebattle.Repo.Migrations.AddExcludeBannedPlayersToTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:exclude_banned_players, :boolean, default: false, null: false)
    end
  end
end
